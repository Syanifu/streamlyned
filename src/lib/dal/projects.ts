import "server-only";
import { db } from "@/lib/db";
import type { Ctx } from "./context";

/** Returns all non-deleted projects visible to the caller in their workspace. */
export async function listProjects(ctx: Ctx) {
  const where =
    ctx.role === "CLIENT" || ctx.role === "MEMBER"
      ? {
          workspaceId: ctx.workspaceId,
          deletedAt: null,
          members: { some: { userId: ctx.userId } },
        }
      : { workspaceId: ctx.workspaceId, deletedAt: null };

  return db.project.findMany({ where, orderBy: { createdAt: "desc" } });
}

/** Returns a single project, enforcing workspace + membership scope. */
export async function getProject(ctx: Ctx, projectId: string) {
  const project = await db.project.findFirst({
    where: { id: projectId, workspaceId: ctx.workspaceId, deletedAt: null },
    include: { members: true },
  });
  if (!project) return null;

  if (ctx.role === "CLIENT" || ctx.role === "MEMBER") {
    const isMember = project.members.some((m) => m.userId === ctx.userId);
    if (!isMember) return null;
  }
  return project;
}

/** Creates a project. Caller is automatically added as a member. */
export async function createProject(
  ctx: Ctx,
  data: { name: string; description?: string; tools?: string[] }
) {
  const tools = JSON.stringify(data.tools ?? ["tasks", "discussions", "chat", "docs", "calendar"]);

  const project = await db.project.create({
    data: {
      workspaceId: ctx.workspaceId,
      name: data.name,
      description: data.description,
      tools,
    },
  });

  await db.projectMember.create({
    data: { projectId: project.id, userId: ctx.userId, visibleTools: tools },
  });

  return project;
}

/** Archives a project. Only OWNER / ADMIN. */
export async function archiveProject(ctx: Ctx, projectId: string) {
  if (ctx.role === "MEMBER" || ctx.role === "CLIENT") throw new Error("Forbidden");

  return db.project.update({
    where: { id: projectId, workspaceId: ctx.workspaceId },
    data: { isArchived: true, archivedAt: new Date() },
  });
}
