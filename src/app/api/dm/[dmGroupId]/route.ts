import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ dmGroupId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { dmGroupId } = await params;

    // Verify user is a member of this DM group
    const membership = await db.dmGroupMember.findUnique({
      where: {
        dmGroupId_userId: {
          dmGroupId,
          userId: session.user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Query messages
    const messages = await db.chatMessage.findMany({
      where: {
        dmGroupId,
        workspaceId: session.workspace.id,
      },
      orderBy: {
        createdAt: "asc",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            memberships: {
              where: {
                workspaceId: session.workspace.id,
              },
              select: {
                role: true,
              },
            },
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        files: true,
      },
    });

    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error("DM API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
