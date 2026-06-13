import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? "",
});

async function getAiConfigPrompt(workspaceId: string) {
  try {
    const config = await db.aiConfig.findUnique({
      where: { orgId: workspaceId },
    });
    return config?.systemPrompt || "You are a focused project management assistant. Be concise and direct.";
  } catch (error) {
    console.warn("Failed to fetch ai_config, using default system prompt:", error);
    return "You are a focused project management assistant. Be concise and direct.";
  }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!process.env.INTERNAL_API_SECRET || authHeader !== `Bearer ${process.env.INTERNAL_API_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { documentId, projectId, documentText, authorId } = await req.json();

    if (!documentId || !projectId || !documentText || !authorId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Verify document and fetch workspace context
    const doc = await db.doc.findUnique({
      where: { id: documentId },
      include: { project: true },
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // 2. Check project settings toggle
    if (!doc.project || !doc.project.agenticEnabled) {
      return NextResponse.json({ skipped: true, reason: "Agentic features disabled for this project" });
    }

    // 3. Skip if fewer than 50 words
    const wordCount = documentText.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < 50) {
      return NextResponse.json({ skipped: true, reason: "Document has fewer than 50 words" });
    }

    // 4. Retrieve AI Custom Prompt
    const systemPrompt = await getAiConfigPrompt(doc.workspaceId);

    // 5. Query OpenAI GPT-4o
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "system",
          content: `You are a meeting notes parser. Extract any future dates, times, or scheduling language from the text. Return ONLY a JSON array. Each item: { "title": string, "date": "YYYY-MM-DD", "time": "HH:MM" or null, "confidence": "high" | "medium" | "low", "raw_text": string, "priority": number or null }. In the "priority" field, suggest an integer from 1 to 6 (1 is P1 - Critical, 2 is P2 - High, 3 is P3 - Medium, 4 is P4 - Normal, 5 is P5 - Low) if the document text contains urgency language for that item. If no urgency language is present, return null. If nothing found, return []. Never return prose.`,
        },
        { role: "user", content: documentText },
      ],
    });

    const completionContent = response.choices[0]?.message?.content || "[]";
    const cleanedJson = completionContent
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const candidates = JSON.parse(cleanedJson);

    if (!Array.isArray(candidates)) {
      throw new Error("Invalid format returned from AI model");
    }

    // 6. Filter to high or medium confidence only
    const validCandidates = candidates.filter(
      (c: any) => c.confidence === "high" || c.confidence === "medium"
    );

    // 7. Push confirm notifications to the document author
    for (const candidate of validCandidates) {
      const suggestedPriority = candidate.priority ? `P${candidate.priority}` : "P4";
      
      const payload = {
        title: candidate.title || "Untitled Note Event",
        date: candidate.date,
        time: candidate.time,
        confidence: candidate.confidence,
        rawText: candidate.raw_text,
        priority: suggestedPriority,
        documentId,
        projectId,
      };

      await db.notification.create({
        data: {
          workspaceId: doc.workspaceId,
          userId: authorId,
          type: "AGENT_CONFIRM",
          title: candidate.raw_text || `Extracted event: ${candidate.title}`,
          message: JSON.stringify(payload),
          targetUrl: `/dashboard/projects/${projectId}?tab=docs&id=${documentId}`,
          isRead: false,
          priority: suggestedPriority,
        },
      });
    }

    return NextResponse.json({ success: true, count: validCandidates.length });
  } catch (error: any) {
    console.error("Parse Notes agent error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
