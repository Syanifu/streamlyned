import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { claimStorage, releaseStorage } from "@/lib/storage-quota";
import { indexEntity } from "@/lib/ai/search";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const TEXT_MIME_TYPES = [
  "text/plain",
  "text/markdown",
  "text/csv",
  "text/html",
  "application/json",
  "application/xml",
  "text/xml",
];

export async function POST(request: Request) {
  try {
    const session = await requireSession();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const description = (formData.get("description") as string | null) || "";

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const MAX_SIZE = 100 * 1024 * 1024; // 100 MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File exceeds 100 MB limit." }, { status: 413 });
    }

    const fileName = file.name;
    const mimeType = file.type || "application/octet-stream";
    try {
      await claimStorage(session.user.id, file.size);
    } catch (quotaErr: any) {
      return NextResponse.json({ error: quotaErr.message }, { status: 413 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Extract text content for AI indexing (text-based files only)
    let textContent: string | null = null;
    const isTextType = TEXT_MIME_TYPES.some(
      (t) => mimeType === t || mimeType.startsWith("text/")
    );
    if (isTextType) {
      textContent = buffer.toString("utf-8").substring(0, 100000); // cap at 100k chars
    }

    // Store file — use Vercel Blob in production, local filesystem in dev
    let fileUrl: string;
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

    if (blobToken) {
      const { put } = await import("@vercel/blob");
      const blob = await put(
        `knowledge/${session.workspace.id}/${Date.now()}-${fileName}`,
        buffer,
        { access: "public", token: blobToken }
      );
      fileUrl = blob.url;
    } else {
      const uploadDir = path.join(
        process.cwd(),
        "public",
        "uploads",
        "knowledge",
        session.workspace.id
      );
      await mkdir(uploadDir, { recursive: true });
      const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      await writeFile(path.join(uploadDir, safeName), buffer);
      fileUrl = `/uploads/knowledge/${session.workspace.id}/${safeName}`;
    }

    // Persist to DB
    const knowledge = await db.workspaceKnowledge.create({
      data: {
        workspaceId: session.workspace.id,
        name: fileName,
        description: description.trim() || null,
        fileUrl,
        fileSize: file.size,
        mimeType,
        textContent,
        uploadedById: session.user.id,
      },
      include: { uploadedBy: { select: { name: true } } },
    });

    // Build the text to index: description + extracted text + filename
    const indexText = [
      description.trim(),
      `File: ${fileName}`,
      textContent,
    ]
      .filter(Boolean)
      .join("\n\n");

    // Index for AI hybrid search (non-blocking — fire and forget)
    indexEntity(
      session.workspace.id,
      "FILE",
      knowledge.id,
      null,
      indexText
    ).catch((e) => console.error("Failed to index knowledge file:", e));

    return NextResponse.json({
      success: true,
      file: {
        ...knowledge,
        createdAt: knowledge.createdAt.toISOString(),
        textContent: undefined, // don't send raw text back to client
      },
    });
  } catch (error: any) {
    console.error("Workspace knowledge upload error:", error);
    return NextResponse.json({ error: error.message || "Upload failed." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireSession();
    const { id } = await request.json();

    const file = await db.workspaceKnowledge.findUnique({ where: { id } });
    if (!file) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    if (file.workspaceId !== session.workspace.id) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    await db.workspaceKnowledge.delete({ where: { id } });
    await releaseStorage(file.uploadedById, file.fileSize);

    // Remove embedding
    await db.embedding.deleteMany({
      where: { workspaceId: session.workspace.id, entityType: "FILE", entityId: id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
