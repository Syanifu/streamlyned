import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { syncProjectProgress } from "@/lib/agents/progress-sync";

export async function GET(req: Request) {
  return handleSync(req);
}

export async function POST(req: Request) {
  return handleSync(req);
}

async function handleSync(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Find all active projects with end dates and agentic features enabled
    const projects = await db.project.findMany({
      where: {
        isArchived: false,
        deletedAt: null,
        endDate: { not: null },
        agenticEnabled: true,
      },
    });

    const results = [];
    for (const project of projects) {
      const res = await syncProjectProgress(project.id);
      results.push({ projectId: project.id, ...res });
    }

    return NextResponse.json({ success: true, count: projects.length, results });
  } catch (error: any) {
    console.error("Progress sync cron error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
