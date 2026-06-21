import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { requireSession } from "@/lib/auth";
import { upsertConnection } from "@/lib/dal/connections";
import type { Ctx } from "@/lib/dal/context";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB per file

/**
 * POST /api/integrations/obsidian/upload
 * Accepts a single .md / .txt file (or .zip in future).
 * Stores file content in the Connection.metadata so the obsidian adapter can read it.
 */
export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const ctx: Ctx = { userId: session.user.id, workspaceId: session.workspace.id, role: session.role };

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File exceeds 10 MB limit." }, { status: 413 });
    }

    const allowed = [".md", ".txt"];
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!allowed.includes(ext)) {
      return NextResponse.json({ error: "Only .md and .txt files are supported." }, { status: 415 });
    }

    const content = await file.text();
    const hash = createHash("sha256").update(content).digest("hex");
    const title = file.name.replace(/\.(md|txt)$/i, "");

    // Load existing metadata to append without overwriting previous files
    const { getConnection } = await import("@/lib/dal/connections");
    const existing = await getConnection(ctx, "obsidian", "USER");
    const existingMeta = existing?.metadata ? JSON.parse(existing.metadata) : {};
    const existingFiles: Array<{ path: string; title: string; hash: string; content: string }> =
      existingMeta.files ?? [];

    // Replace if same filename, otherwise append
    const files = [
      ...existingFiles.filter((f) => f.path !== file.name),
      { path: file.name, title, hash, content },
    ];

    await upsertConnection(ctx, "obsidian", "USER", {
      accessToken: "file-based",
      externalAccountName: `${files.length} file${files.length === 1 ? "" : "s"}`,
      metadata: { files },
    });

    return NextResponse.json({ success: true, filesCount: files.length });
  } catch (err: any) {
    console.error("Obsidian upload error:", err);
    return NextResponse.json({ error: err.message || "Upload failed." }, { status: 500 });
  }
}
