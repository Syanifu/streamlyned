import OpenAI from "openai";

export interface GatewayResponse {
  text: string;
  citations?: string[];
  usage?: { promptTokens: number; completionTokens: number };
}

class AiGateway {
  private getConfig() {
    return {
      apiKey: process.env.OPENAI_API_KEY || "",
      completionModel: "gpt-4o-mini",
      embeddingsModel: "text-embedding-3-small",
    };
  }

  async complete(
    _workspaceId: string,
    prompt: string,
    schema?: any
  ): Promise<GatewayResponse> {
    const { apiKey, completionModel } = this.getConfig();

    if (!apiKey) {
      return this.mockComplete(prompt, schema);
    }

    try {
      const client = new OpenAI({ apiKey });
      const response = await client.chat.completions.create({
        model: completionModel,
        messages: [{ role: "user", content: prompt }],
        response_format: schema ? { type: "json_object" } : undefined,
      });

      const text = response.choices[0]?.message?.content || "";
      return {
        text,
        usage: {
          promptTokens: response.usage?.prompt_tokens ?? 0,
          completionTokens: response.usage?.completion_tokens ?? 0,
        },
      };
    } catch (e: any) {
      console.error("AI Gateway Completion Error:", e);
      return this.mockComplete(prompt, schema);
    }
  }

  async stream(_workspaceId: string, prompt: string): Promise<ReadableStream> {
    const { apiKey, completionModel } = this.getConfig();
    const encoder = new TextEncoder();

    if (!apiKey) {
      const mock = this.mockComplete(prompt);
      return new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(mock.text));
          controller.close();
        },
      });
    }

    try {
      const client = new OpenAI({ apiKey });
      const stream = await client.chat.completions.create({
        model: completionModel,
        messages: [{ role: "user", content: prompt }],
        stream: true,
      });

      return new ReadableStream({
        async start(controller) {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) controller.enqueue(encoder.encode(delta));
          }
          controller.close();
        },
      });
    } catch (e) {
      console.error("AI Gateway Stream Error:", e);
      const mock = this.mockComplete(prompt);
      return new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(mock.text));
          controller.close();
        },
      });
    }
  }

  async embed(_workspaceId: string, text: string): Promise<number[]> {
    const { apiKey, embeddingsModel } = this.getConfig();

    if (!apiKey) return this.mockEmbed(text);

    try {
      const client = new OpenAI({ apiKey });
      const response = await client.embeddings.create({
        model: embeddingsModel,
        input: text,
      });
      return response.data[0].embedding || this.mockEmbed(text);
    } catch (e) {
      console.error("AI Gateway Embedding Error:", e);
      return this.mockEmbed(text);
    }
  }

  async classify(_workspaceId: string, text: string, labels: string[]): Promise<string> {
    const prompt = `Classify the following text into exactly one of these labels: [${labels.join(", ")}]. Respond ONLY with the exact label.\n\nText: "${text}"`;
    const res = await this.complete(_workspaceId, prompt);
    const label = res.text.trim();
    const match = labels.find((l) => label.toLowerCase().includes(l.toLowerCase()));
    return match || labels[0];
  }

  async rerank(
    _workspaceId: string,
    query: string,
    candidates: { id: string; text: string }[]
  ): Promise<{ id: string; score: number }[]> {
    const scored = candidates.map((c) => {
      const qWords = query.toLowerCase().split(/\s+/);
      const cText = c.text.toLowerCase();
      let matchCount = 0;
      qWords.forEach((word) => { if (cText.includes(word)) matchCount++; });
      return { id: c.id, score: matchCount / Math.max(qWords.length, 1) };
    });
    return scored.sort((a, b) => b.score - a.score);
  }

  async summarize(
    workspaceId: string,
    text: string,
    requireCitations = true
  ): Promise<GatewayResponse> {
    const prompt = `Summarize the following project context in a calm, concise manner. ${
      requireCitations ? "Ensure you cite dates and specific authors where appropriate." : ""
    }\n\nContext:\n${text}`;
    return this.complete(workspaceId, prompt);
  }

  private mockComplete(prompt: string, schema?: any): GatewayResponse {
    if (schema) {
      if (prompt.includes('"events"') || prompt.includes("meeting notes") || prompt.includes("calendar")) {
        return { text: JSON.stringify({ events: [] }) };
      }
      return {
        text: JSON.stringify({
          answer: "Here is what I found in the project guidelines.",
          citations: ["Brand Guidelines"],
        }),
      };
    }
    return {
      text: "Based on the workspace records, the team is currently working on the project.",
    };
  }

  private mockEmbed(text: string): number[] {
    const words = text.toLowerCase().split(/\W+/).filter(Boolean);
    const dims = 128;
    const vector = new Array(dims).fill(0);

    if (words.length === 0) return new Array(dims).fill(0);

    const getWordVector = (word: string): number[] => {
      let seed = 5381;
      for (let i = 0; i < word.length; i++) {
        seed = (seed * 33 + word.charCodeAt(i)) & 0xffffffff;
      }
      const vec = [];
      for (let i = 0; i < dims; i++) {
        seed = (seed * 1664525 + 1013904223) & 0xffffffff;
        vec.push((seed & 0xffff) / 0xffff - 0.5);
      }
      const sumSq = vec.reduce((sum, v) => sum + v * v, 0);
      const norm = Math.sqrt(sumSq);
      return vec.map((v) => (norm === 0 ? 0 : v / norm));
    };

    words.forEach((word) => {
      const wordVec = getWordVector(word);
      for (let i = 0; i < dims; i++) vector[i] += wordVec[i];
    });

    const sumSq = vector.reduce((sum, v) => sum + v * v, 0);
    const docNorm = Math.sqrt(sumSq);
    return vector.map((v) => (docNorm === 0 ? 0 : v / docNorm));
  }
}

export const aiGateway = new AiGateway();
export default aiGateway;
