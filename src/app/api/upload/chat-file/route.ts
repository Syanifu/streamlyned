import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getSession } from "@/lib/auth";
import { claimStorage } from "@/lib/storage-quota";

const MAX_SIZE = 100 * 1024 * 1024; // 100 MB per file

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File exceeds the 100 MB limit" }, { status: 413 });
    }

    try {
      await claimStorage(session.user.id, file.size);
    } catch (quotaErr: any) {
      return NextResponse.json({ error: quotaErr.message }, { status: 413 });
    }

    // Sanitise the file name so it's safe as a blob path
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const blobPath = `chat-files/${session.workspace.id}/${Date.now()}_${safeName}`;

    const blob = await put(blobPath, file, {
      access: "public",
      contentType: file.type || "application/octet-stream",
    });

    return NextResponse.json({
      url: blob.url,
      fileName: file.name,
      fileSize: file.size,
    });
  } catch (error: any) {
    console.error("File upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

// Vercel Blob uploads can be large — raise the body size limit
export const config = {
  api: {
    bodyParser: false,
  },
};
