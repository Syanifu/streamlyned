import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import OpenAI from "openai";



async function getAiConfig(workspaceId: string) {
  try {
    const config = await db.aiConfig.findUnique({
      where: { orgId: workspaceId },
    });
    return {
      system_prompt: config?.systemPrompt || "You are a focused project management assistant. Be concise and direct.",
    };
  } catch (error) {
    console.warn("Failed to fetch ai_config from database, using fallback:", error);
    return {
      system_prompt: "You are a focused project management assistant. Be concise and direct.",
    };
  }
}

export async function POST(req: Request) {
  try {
    // 1. Authorisation boundary check
    const session = await getSession();
    if (!session || session.role !== "super_admin") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { userMessage, featurePrompt } = await req.json();

    if (!userMessage) {
      return NextResponse.json({ error: "userMessage is required" }, { status: 400 });
    }

    // 2. Fetch AI personality configuration (Supabase / Prisma)
    const config = await getAiConfig(session.workspace.id);

    // 3. Request OpenAI completion with gpt-4o
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY ?? "",
    });
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: config.system_prompt },
        { role: "system", content: featurePrompt || "" },
        { role: "user", content: userMessage },
      ],
    });

    return NextResponse.json({
      result: response.choices[0]?.message?.content || "",
    });
  } catch (error: any) {
    console.error("AI Completion route error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
