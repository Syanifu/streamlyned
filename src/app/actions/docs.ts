"use server";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { indexEntity } from "@/lib/ai/search";

/**
 * Creates a new document in a project
 */
export async function createDocAction(
  projectId: string,
  title: string,
  content: string
) {
  try {
    const session = await requireSession();

    // Verify project membership
    const projectMember = await db.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: session.user.id } },
    });
    if (!projectMember) throw new Error("Access Denied.");

    // Create doc
    const doc = await db.doc.create({
      data: {
        workspaceId: session.workspace.id,
        projectId,
        title: title.trim() || "Untitled Document",
        content: content || "",
      },
    });

    // Index document in vector search
    await indexEntity(session.workspace.id, "DOC", doc.id, projectId, doc.title + " " + doc.content);

    // Create version 1
    await db.docVersion.create({
      data: {
        docId: doc.id,
        title: doc.title,
        content: doc.content,
        version: 1,
        createdById: session.user.id,
      },
    });

    // Write to audit log
    await db.auditLog.create({
      data: {
        workspaceId: session.workspace.id,
        projectId,
        entityType: "DOC",
        entityId: doc.id,
        userId: session.user.id,
        action: "CREATE",
        description: `created document "${doc.title}"`,
      },
    });

    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true, doc };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Updates a document's contents and stores a new history version
 */
export async function updateDocAction(
  projectId: string,
  docId: string,
  title: string,
  content: string
) {
  try {
    const session = await requireSession();

    // Verify project membership
    const projectMember = await db.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: session.user.id } },
    });
    if (!projectMember) throw new Error("Access Denied.");

    // Fetch existing doc
    const existingDoc = await db.doc.findUnique({
      where: { id: docId },
      include: { versions: { orderBy: { version: "desc" }, take: 1 } },
    });
    if (!existingDoc || existingDoc.workspaceId !== session.workspace.id) {
      throw new Error("Document not found.");
    }

    const nextVersionNum = existingDoc.versions[0] ? existingDoc.versions[0].version + 1 : 1;

    // Update Doc
    const updatedDoc = await db.doc.update({
      where: { id: docId },
      data: {
        title: title.trim() || "Untitled Document",
        content: content || "",
      },
    });

    // Index updated document in vector search
    await indexEntity(session.workspace.id, "DOC", docId, projectId, updatedDoc.title + " " + updatedDoc.content);

    // Write new version snapshot
    await db.docVersion.create({
      data: {
        docId,
        title: updatedDoc.title,
        content: updatedDoc.content,
        version: nextVersionNum,
        createdById: session.user.id,
      },
    });

    // Write to audit log
    await db.auditLog.create({
      data: {
        workspaceId: session.workspace.id,
        projectId,
        entityType: "DOC",
        entityId: docId,
        userId: session.user.id,
        action: "UPDATE",
        description: `updated document to version ${nextVersionNum}`,
      },
    });

    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true, doc: updatedDoc };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Restores a document to a specific historical version
 */
export async function restoreDocVersionAction(
  projectId: string,
  docId: string,
  versionId: string
) {
  try {
    const session = await requireSession();

    // Verify project membership
    const projectMember = await db.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: session.user.id } },
    });
    if (!projectMember) throw new Error("Access Denied.");

    // Fetch snapshot version
    const snapshot = await db.docVersion.findFirst({
      where: { id: versionId, docId },
    });
    if (!snapshot) throw new Error("Version not found.");

    // Fetch doc to verify workspace
    const doc = await db.doc.findUnique({ where: { id: docId } });
    if (!doc || doc.workspaceId !== session.workspace.id) {
      throw new Error("Document not found.");
    }

    // Get current max version
    const latestVersion = await db.docVersion.findFirst({
      where: { docId },
      orderBy: { version: "desc" },
    });
    const nextVersionNum = latestVersion ? latestVersion.version + 1 : 1;

    // Update Doc
    const restoredDoc = await db.doc.update({
      where: { id: docId },
      data: {
        title: snapshot.title,
        content: snapshot.content,
      },
    });

    // Index restored document in vector search
    await indexEntity(session.workspace.id, "DOC", docId, projectId, restoredDoc.title + " " + restoredDoc.content);

    // Create new version representing the restore
    await db.docVersion.create({
      data: {
        docId,
        title: snapshot.title,
        content: snapshot.content,
        version: nextVersionNum,
        createdById: session.user.id,
      },
    });

    // Write to audit log
    await db.auditLog.create({
      data: {
        workspaceId: session.workspace.id,
        projectId,
        entityType: "DOC",
        entityId: docId,
        userId: session.user.id,
        action: "UPDATE",
        description: `restored document to version ${snapshot.version} (new version is ${nextVersionNum})`,
      },
    });

    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true, doc: restoredDoc };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Adds comment to a Doc
 */
export async function addDocCommentAction(
  projectId: string,
  docId: string,
  content: string
) {
  try {
    const session = await requireSession();

    // Verify membership
    const projectMember = await db.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: session.user.id } },
    });
    if (!projectMember) throw new Error("Access Denied.");

    const comment = await db.comment.create({
      data: {
        workspaceId: session.workspace.id,
        docId,
        userId: session.user.id,
        content: content.trim(),
        isClientComment: session.role === "CLIENT",
      },
    });

    // Write to audit log
    await db.auditLog.create({
      data: {
        workspaceId: session.workspace.id,
        projectId,
        entityType: "COMMENT",
        entityId: comment.id,
        userId: session.user.id,
        action: "CREATE",
        description: `commented on document`,
      },
    });

    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true, comment };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
