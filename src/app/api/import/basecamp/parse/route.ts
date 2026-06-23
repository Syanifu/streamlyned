import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseBasecampZip } from "@/lib/basecamp-parser";

const MAX_ZIP_SIZE = 200 * 1024 * 1024; // 200 MB

export async function POST(request: Request) {
  try {
    const session = await requireSession();

    if (session.role !== "OWNER" && session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only owners and admins can import data." },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (file.size > MAX_ZIP_SIZE) {
      return NextResponse.json(
        { error: "File exceeds 200 MB limit." },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const preview = await parseBasecampZip(buffer);

    if (preview.projects.length === 0) {
      return NextResponse.json(
        {
          error:
            "No projects found. Make sure you're uploading a Basecamp 3 data export .zip file.",
        },
        { status: 400 }
      );
    }

    // Fetch workspace members so the client can build a people-matching UI
    const members = await db.workspaceMember.findMany({
      where: { workspaceId: session.workspace.id },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    const workspaceMembers = members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
    }));

    return NextResponse.json({ preview, workspaceMembers });
  } catch (error: any) {
    console.error("Basecamp parse error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to parse export file." },
      { status: 500 }
    );
  }
}
