import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Client } from "@notionhq/client";

function blocksToMarkdown(blocks: any[]): string {
  return blocks
    .map((block) => {
      const type = block.type;
      const rich = (arr: any[]) => arr?.map((t: any) => t.plain_text).join("") ?? "";

      switch (type) {
        case "heading_1": return `# ${rich(block.heading_1.rich_text)}`;
        case "heading_2": return `## ${rich(block.heading_2.rich_text)}`;
        case "heading_3": return `### ${rich(block.heading_3.rich_text)}`;
        case "paragraph": return rich(block.paragraph.rich_text);
        case "bulleted_list_item": return `- ${rich(block.bulleted_list_item.rich_text)}`;
        case "numbered_list_item": return `1. ${rich(block.numbered_list_item.rich_text)}`;
        case "to_do": return `- [${block.to_do.checked ? "x" : " "}] ${rich(block.to_do.rich_text)}`;
        case "quote": return `> ${rich(block.quote.rich_text)}`;
        case "code": return `\`\`\`\n${rich(block.code.rich_text)}\n\`\`\``;
        case "divider": return "---";
        default: return "";
      }
    })
    .filter(Boolean)
    .join("\n\n");
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { items, targetProjectId } = body as {
    items: { id: string; type: "page" | "database"; title: string }[];
    targetProjectId?: string;
  };

  if (!items?.length) return NextResponse.json({ error: "No items selected" }, { status: 400 });

  const connection = await db.notionConnection.findUnique({
    where: { workspaceId: session.workspace.id },
  });
  if (!connection) return NextResponse.json({ error: "Notion not connected" }, { status: 400 });

  const notion = new Client({ auth: connection.accessToken });
  const results: { title: string; type: string; status: string }[] = [];

  for (const item of items) {
    try {
      if (item.type === "page") {
        // Resolve target project
        let projectId = targetProjectId;
        if (!projectId) {
          const firstProject = await db.project.findFirst({
            where: { workspaceId: session.workspace.id },
          });
          if (!firstProject) throw new Error("No project found to import into");
          projectId = firstProject.id;
        }

        // Fetch page blocks
        const blocksRes = await notion.blocks.children.list({ block_id: item.id, page_size: 100 });
        const content = blocksToMarkdown(blocksRes.results as any[]);

        const doc = await db.doc.create({
          data: {
            workspaceId: session.workspace.id,
            projectId,
            title: item.title,
            content,
          },
        });

        await db.docVersion.create({
          data: { docId: doc.id, title: doc.title, content: doc.content, version: 1, createdById: session.user.id },
        });

        results.push({ title: item.title, type: "page", status: "imported as doc" });
      } else {
        // Database → Project + Tasks
        const dbRows = await notion.dataSources.query({ data_source_id: item.id, page_size: 100 });

        const project = await db.project.create({
          data: {
            workspaceId: session.workspace.id,
            name: item.title,
            description: `Imported from Notion`,
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
        for (const row of dbRows.results as any[]) {
          const nameProp = Object.values(row.properties as Record<string, any>).find(
            (p: any) => p.type === "title"
          );
          const title = nameProp?.title?.[0]?.plain_text || "Untitled";
          await db.task.create({
            data: {
              workspaceId: session.workspace.id,
              taskListId: list.id,
              projectId: project.id,
              title,
              position,
            },
          });
          position += 1000;
        }

        results.push({ title: item.title, type: "database", status: `imported as project with ${dbRows.results.length} tasks` });
      }
    } catch (err: any) {
      results.push({ title: item.title, type: item.type, status: `error: ${err.message}` });
    }
  }

  return NextResponse.json({ success: true, results });
}
