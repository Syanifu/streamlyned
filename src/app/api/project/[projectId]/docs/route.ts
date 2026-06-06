import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await params;

    // Verify user membership in project
    const member = await db.projectMember.findFirst({
      where: {
        projectId,
        userId: session.user.id,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Forbidden: Not a project member" }, { status: 403 });
    }

    // Verify CLIENT role visibility
    if (session.role === "CLIENT") {
      const visibleTools = JSON.parse(member.visibleTools) as string[];
      if (!visibleTools.includes("docs")) {
        return NextResponse.json({ error: "Forbidden: Docs is not enabled" }, { status: 403 });
      }
    }

    const url = new URL(request.url);
    const docId = url.searchParams.get("id");

    if (docId) {
      // Fetch details of a single doc
      const doc = await db.doc.findFirst({
        where: {
          id: docId,
          projectId,
          workspaceId: session.workspace.id,
          ...(session.role === "CLIENT" ? { visibleToClients: true } : {}),
        },
        include: {
          versions: {
            orderBy: { version: "desc" },
          },
          comments: {
            orderBy: { createdAt: "desc" },
            include: {
              user: {
                select: {
                  name: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });

      if (!doc) {
        return NextResponse.json({ error: "Document not found" }, { status: 404 });
      }

      return NextResponse.json({ doc });
    } else {
      // Fetch all docs in the project
      const docs = await db.doc.findMany({
        where: {
          projectId,
          workspaceId: session.workspace.id,
          ...(session.role === "CLIENT" ? { visibleToClients: true } : {}),
        },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          updatedAt: true,
          visibleToClients: true,
        },
      });

      return NextResponse.json({ docs });
    }
  } catch (error: any) {
    console.error("Docs API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
