import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { executeHybridSearch } from "@/lib/ai/search";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const query = body.q || "";

    if (!query.trim()) {
      return NextResponse.json({ error: "Query cannot be empty" }, { status: 400 });
    }

    // Run hybrid search with permission controls built in
    const searchResult = await executeHybridSearch(
      session.workspace.id,
      session.user.id,
      session.role,
      query
    );

    // Check if provider API key is set for this workspace
    const settings = await db.aiSettings.findUnique({
      where: { workspaceId: session.workspace.id },
    });

    const hasKey = !!(settings?.apiKey);

    return NextResponse.json({
      answer: searchResult.answer,
      results: searchResult.results,
      hasKey,
    });
  } catch (error: any) {
    console.error("Context Chat API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
