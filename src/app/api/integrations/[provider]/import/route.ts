import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { getAdapter, getProviderConfig } from "@/lib/integrations/registry";
import { getConnection, upsertExternalItem, findExternalItem } from "@/lib/dal/connections";
import { db } from "@/lib/db";
import type { Ctx } from "@/lib/dal/context";

const importSchema = z.object({
  items: z.array(
    z.object({
      externalId: z.string().min(1),
      externalType: z.string().min(1),
      title: z.string(),
    })
  ).min(1).max(100),
  targetProjectId: z.string().uuid().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const session = await requireSession();
    const { provider } = await params;

    const body = await request.json();
    const parsed = importSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const { items, targetProjectId } = parsed.data;
    const config = getProviderConfig(provider);
    const ctx: Ctx = { userId: session.user.id, workspaceId: session.workspace.id, role: session.role };
    const conn = await getConnection(ctx, provider as any, config.ownerType);

    if (!conn) {
      return NextResponse.json({ error: `${provider} not connected` }, { status: 400 });
    }

    const adapter = await getAdapter(provider);
    const results: { title: string; type: string; status: string }[] = [];

    for (const item of items) {
      try {
        const content = await adapter.fetchItem(conn, item.externalId, item.externalType);

        // Check if previously imported (dedup)
        const existing = await findExternalItem(conn.id, item.externalId);
        const isUnchanged = existing && existing.contentHash === content.contentHash;

        if (item.externalType === "page" || item.externalType === "file" || item.externalType === "doc" || item.externalType === "note") {
          // Import as Doc
          let projectId = targetProjectId;
          if (!projectId) {
            const firstProject = await db.project.findFirst({
              where: { workspaceId: session.workspace.id, deletedAt: null },
            });
            if (!firstProject) throw new Error("No project found to import into");
            projectId = firstProject.id;
          }

          if (existing && !isUnchanged) {
            // Update existing doc
            await db.doc.update({
              where: { id: existing.localEntityId },
              data: { title: content.title, content: content.markdown, updatedAt: new Date() },
            });
            const versionCount = await db.docVersion.count({ where: { docId: existing.localEntityId } });
            await db.docVersion.create({
              data: {
                docId: existing.localEntityId,
                title: content.title,
                content: content.markdown,
                version: versionCount + 1,
                createdById: session.user.id,
              },
            });
            await upsertExternalItem({
              connectionId: conn.id,
              provider,
              externalId: item.externalId,
              externalType: item.externalType,
              localEntityType: "DOC",
              localEntityId: existing.localEntityId,
              contentHash: content.contentHash,
            });
            results.push({ title: item.title, type: item.externalType, status: "updated" });
          } else if (!existing) {
            const doc = await db.doc.create({
              data: {
                workspaceId: session.workspace.id,
                projectId,
                title: content.title,
                content: content.markdown,
              },
            });
            await db.docVersion.create({
              data: { docId: doc.id, title: doc.title, content: doc.content, version: 1, createdById: session.user.id },
            });
            await upsertExternalItem({
              connectionId: conn.id,
              provider,
              externalId: item.externalId,
              externalType: item.externalType,
              localEntityType: "DOC",
              localEntityId: doc.id,
              contentHash: content.contentHash,
            });
            results.push({ title: item.title, type: item.externalType, status: "imported as doc" });
          } else {
            results.push({ title: item.title, type: item.externalType, status: "skipped (unchanged)" });
          }
        } else {
          // Import as Project + Tasks (database/table)
          const records = content.records ?? [];

          if (existing && !isUnchanged) {
            // Update existing tasks
            const project = await db.project.findFirst({
              where: { id: existing.localEntityId, workspaceId: session.workspace.id },
            });
            if (project) {
              const list = await db.taskList.findFirst({ where: { projectId: project.id } });
              if (list) {
                let position = 1000;
                for (const record of records) {
                  await db.task.upsert({
                    where: {
                      // Use title as a stable key within this list (best effort without external row IDs)
                      id: (await db.task.findFirst({ where: { taskListId: list.id, title: record.title } }))?.id ?? "nonexistent",
                    },
                    create: {
                      workspaceId: session.workspace.id,
                      taskListId: list.id,
                      projectId: project.id,
                      title: record.title,
                      position,
                    },
                    update: { title: record.title },
                  });
                  position += 1000;
                }
              }
            }
            await upsertExternalItem({
              connectionId: conn.id,
              provider,
              externalId: item.externalId,
              externalType: item.externalType,
              localEntityType: "PROJECT",
              localEntityId: existing.localEntityId,
              contentHash: content.contentHash,
            });
            results.push({ title: item.title, type: item.externalType, status: "synced" });
          } else if (!existing) {
            const project = await db.project.create({
              data: {
                workspaceId: session.workspace.id,
                name: content.title,
                description: `Imported from ${provider}`,
                tools: JSON.stringify(["tasks", "docs", "chat"]),
              },
            });

            await db.projectMember.create({
              data: {
                projectId: project.id,
                userId: session.user.id,
                visibleTools: JSON.stringify(["tasks", "docs", "chat"]),
              },
            });

            const list = await db.taskList.create({
              data: { projectId: project.id, name: "Imported Tasks", position: 1000 },
            });

            let position = 1000;
            for (const record of records) {
              await db.task.create({
                data: {
                  workspaceId: session.workspace.id,
                  taskListId: list.id,
                  projectId: project.id,
                  title: record.title,
                  position,
                },
              });
              position += 1000;
            }

            await upsertExternalItem({
              connectionId: conn.id,
              provider,
              externalId: item.externalId,
              externalType: item.externalType,
              localEntityType: "PROJECT",
              localEntityId: project.id,
              contentHash: content.contentHash,
            });

            results.push({
              title: item.title,
              type: item.externalType,
              status: `imported as project with ${records.length} tasks`,
            });
          } else {
            results.push({ title: item.title, type: item.externalType, status: "skipped (unchanged)" });
          }
        }
      } catch (err: any) {
        results.push({ title: item.title, type: item.externalType, status: `error: ${err.message}` });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.message === "Unauthorized" ? 401 : 500 });
  }
}
