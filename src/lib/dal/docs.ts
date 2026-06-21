import "server-only";
import { db } from "@/lib/db";
import type { Ctx } from "./context";

/** Returns a doc, enforcing workspace scope and CLIENT visibility. */
export async function getDoc(ctx: Ctx, docId: string) {
  const doc = await db.doc.findFirst({
    where: { id: docId, workspaceId: ctx.workspaceId },
    include: { versions: { orderBy: { version: "desc" } } },
  });
  if (!doc) return null;
  if (ctx.role === "CLIENT" && !doc.visibleToClients) return null;
  return doc;
}

/** Lists docs for a project with CLIENT filter. */
export async function listDocs(ctx: Ctx, projectId: string) {
  const docs = await db.doc.findMany({
    where: { projectId, workspaceId: ctx.workspaceId },
    orderBy: { updatedAt: "desc" },
  });
  if (ctx.role === "CLIENT") return docs.filter((d) => d.visibleToClients);
  return docs;
}

/** Creates a doc + initial version. */
export async function createDoc(
  ctx: Ctx,
  data: { projectId: string; title: string; content: string; visibleToClients?: boolean }
) {
  const doc = await db.doc.create({
    data: {
      workspaceId: ctx.workspaceId,
      projectId: data.projectId,
      title: data.title,
      content: data.content,
      visibleToClients: data.visibleToClients ?? true,
    },
  });

  await db.docVersion.create({
    data: { docId: doc.id, title: doc.title, content: doc.content, version: 1, createdById: ctx.userId },
  });

  return doc;
}

/** Updates a doc and saves a new version. */
export async function updateDoc(ctx: Ctx, docId: string, data: { title?: string; content?: string }) {
  const doc = await getDoc(ctx, docId);
  if (!doc) throw new Error("Doc not found");

  const latest = doc.versions[0];
  const nextVersion = (latest?.version ?? 0) + 1;

  const updated = await db.doc.update({
    where: { id: docId },
    data: { title: data.title ?? doc.title, content: data.content ?? doc.content },
  });

  await db.docVersion.create({
    data: {
      docId: doc.id,
      title: updated.title,
      content: updated.content,
      version: nextVersion,
      createdById: ctx.userId,
    },
  });

  return updated;
}
