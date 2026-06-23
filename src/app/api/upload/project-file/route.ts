import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { claimStorage, releaseStorage } from "@/lib/storage-quota";
import path from "path";
import fs from "fs";

const MAX_SIZE = 100 * 1024 * 1024; // 100 MB per file

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const projectId = formData.get("projectId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!projectId) {
      return NextResponse.json({ error: "projectId required" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File exceeds the 100 MB limit" }, { status: 413 });
    }

    // Quota check — throws with a user-friendly message if over 200 MB
    try {
      await claimStorage(session.user.id, file.size);
    } catch (quotaErr: any) {
      return NextResponse.json({ error: quotaErr.message }, { status: 413 });
    }

    // Verify project membership — release quota if access denied
    const member = await db.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: session.user.id } },
    });
    if (!member) {
      await releaseStorage(session.user.id, file.size);
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueName = `${Date.now()}_${safeName}`;
    let fileUrl: string;

    // Use Vercel Blob when token available, else local filesystem
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { put } = await import("@vercel/blob");
      const blob = await put(`project-files/${session.workspace.id}/${projectId}/${uniqueName}`, file, {
        access: "public",
        contentType: file.type || "application/octet-stream",
      });
      fileUrl = blob.url;
    } else {
      // Local filesystem fallback (dev only)
      const uploadsDir = path.join(process.cwd(), "public", "uploads", session.workspace.id, projectId);
      fs.mkdirSync(uploadsDir, { recursive: true });
      const filePath = path.join(uploadsDir, uniqueName);
      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(filePath, buffer);
      fileUrl = `/uploads/${session.workspace.id}/${projectId}/${uniqueName}`;
    }

    const projectFile = await db.projectFile.create({
      data: {
        workspaceId: session.workspace.id,
        projectId,
        fileName: file.name,
        fileUrl,
        fileSize: file.size,
        mimeType: file.type || "application/octet-stream",
        uploadedById: session.user.id,
      },
      include: {
        uploadedBy: { select: { name: true } },
      },
    });

    return NextResponse.json({ success: true, file: projectFile });
  } catch (error: any) {
    console.error("Project file upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export const config = {
  api: { bodyParser: false },
};
