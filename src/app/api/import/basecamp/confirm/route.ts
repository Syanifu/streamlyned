import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import type { BasecampPreview } from "@/lib/basecamp-parser";
import { stripHtml } from "@/lib/basecamp-parser";

interface ImportRequest {
  preview: BasecampPreview;
  /** Basecamp email → workspace userId. Empty string = skip/unassigned. */
  peopleMapping: Record<string, string>;
}

export interface ImportResults {
  projectsCreated: number;
  taskListsCreated: number;
  tasksCreated: number;
  discussionsCreated: number;
  docsCreated: number;
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();

    if (session.role !== "OWNER" && session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only owners and admins can import data." },
        { status: 403 }
      );
    }

    const { preview, peopleMapping }: ImportRequest = await request.json();

    const results: ImportResults = {
      projectsCreated: 0,
      taskListsCreated: 0,
      tasksCreated: 0,
      discussionsCreated: 0,
      docsCreated: 0,
    };

    for (const bcProject of preview.projects) {
      // ── Create module (project) ──────────────────────────────────────
      const project = await db.project.create({
        data: {
          workspaceId: session.workspace.id,
          name: bcProject.name,
          description: bcProject.description || null,
          tools: JSON.stringify(["tasks", "chat", "docs", "calendar"]),
        },
      });
      results.projectsCreated++;

      await db.projectMember.create({
        data: {
          projectId: project.id,
          userId: session.user.id,
          visibleTools: JSON.stringify(["tasks", "chat", "docs", "calendar"]),
        },
      });

      // ── Task lists + tasks ───────────────────────────────────────────
      let listPosition = 1000;
      for (const bcList of bcProject.todoLists) {
        const taskList = await db.taskList.create({
          data: {
            projectId: project.id,
            name: bcList.name,
            position: listPosition,
          },
        });
        listPosition += 1000;
        results.taskListsCreated++;

        const allTodos = [
          ...bcList.todos.remaining,
          ...bcList.todos.completed,
        ];

        let taskPosition = 1000;
        for (const todo of allTodos) {
          const task = await db.task.create({
            data: {
              workspaceId: session.workspace.id,
              taskListId: taskList.id,
              projectId: project.id,
              title: todo.title,
              notes: todo.description ? stripHtml(todo.description) : null,
              dueDateStart: todo.due_on ? new Date(todo.due_on) : null,
              position: taskPosition,
              isCompleted: todo.completed,
              completedAt: todo.completed_at
                ? new Date(todo.completed_at)
                : null,
            },
          });
          taskPosition += 1000;
          results.tasksCreated++;

          // Assign to matched workspace members
          for (const assignee of todo.assignees || []) {
            const userId = peopleMapping[assignee.email_address];
            if (userId) {
              await db.taskAssignee
                .create({ data: { taskId: task.id, userId } })
                .catch(() => {}); // ignore if user no longer exists
            }
          }
        }
      }

      // ── Discussions from Basecamp messages ───────────────────────────
      for (const msg of bcProject.messages) {
        const authorLine =
          msg.creator?.name
            ? `\n\n---\n*Imported from Basecamp — originally posted by ${msg.creator.name}*`
            : "";

        const discussion = await db.discussion.create({
          data: {
            workspaceId: session.workspace.id,
            projectId: project.id,
            title: msg.subject || "Untitled Message",
            content: (msg.content || "") + authorLine,
            userId: session.user.id,
          },
        });
        results.discussionsCreated++;

        for (const comment of msg.comments || []) {
          const commenterLine =
            comment.creator?.name
              ? `\n\n*Originally by ${comment.creator.name}*`
              : "";

          await db.comment.create({
            data: {
              workspaceId: session.workspace.id,
              discussionId: discussion.id,
              userId: session.user.id,
              content: (comment.content || "") + commenterLine,
            },
          });
        }
      }

      // ── Docs from Basecamp vault ─────────────────────────────────────
      for (const doc of bcProject.docs) {
        const createdDoc = await db.doc.create({
          data: {
            workspaceId: session.workspace.id,
            projectId: project.id,
            title: doc.title || "Untitled Doc",
            content: doc.content || "",
          },
        });

        await db.docVersion.create({
          data: {
            docId: createdDoc.id,
            title: createdDoc.title,
            content: createdDoc.content,
            version: 1,
            createdById: session.user.id,
          },
        });
        results.docsCreated++;
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error("Basecamp import error:", error);
    return NextResponse.json(
      { error: error.message || "Import failed." },
      { status: 500 }
    );
  }
}
