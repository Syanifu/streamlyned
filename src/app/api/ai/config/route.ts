import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET: Fetch the current AI system prompt for the workspace.
 * Only accessible to super_admin.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "super_admin") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    let config = null;
    try {
      config = await db.aiConfig.findUnique({
        where: { orgId: session.workspace.id },
      });
    } catch (dbError) {
      console.warn("Database error reading ai_config:", dbError);
    }

    return NextResponse.json({
      systemPrompt: config?.systemPrompt || "You are a focused project management assistant. Be concise and direct.",
    });
  } catch (error: any) {
    console.error("AI Config GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST: Save or update the AI system prompt for the workspace.
 * Only accessible to super_admin.
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "super_admin") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { systemPrompt } = await request.json();

    if (systemPrompt === undefined || systemPrompt === null) {
      return NextResponse.json({ error: "systemPrompt is required" }, { status: 400 });
    }

    if (systemPrompt.length > 1000) {
      return NextResponse.json({ error: "System prompt exceeds 1000 character limit" }, { status: 400 });
    }

    try {
      const config = await db.aiConfig.upsert({
        where: { orgId: session.workspace.id },
        update: {
          systemPrompt,
          updatedBy: session.user.id,
        },
        create: {
          orgId: session.workspace.id,
          systemPrompt,
          updatedBy: session.user.id,
        },
      });

      return NextResponse.json({ success: true, systemPrompt: config.systemPrompt });
    } catch (dbError: any) {
      console.error("Database write error saving ai_config:", dbError);
      return NextResponse.json({ error: "Database write failed: " + (dbError.message || "Unknown error") }, { status: 500 });
    }
  } catch (error: any) {
    console.error("AI Config POST error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
