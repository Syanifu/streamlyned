import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import DmView from "@/components/dm-view";

interface DmPageProps {
  searchParams: Promise<{
    id?: string; // selected DM group ID
  }>;
}

export default async function DmPage({ searchParams }: DmPageProps) {
  const session = await getSession();

  if (!session) {
    redirect("/");
  }

  // Clients cannot access DMs
  if (session.role === "CLIENT") {
    redirect("/dashboard");
  }

  const { id: selectedGroupId } = await searchParams;

  // 1. Fetch all DM groups user is part of
  const dmGroups = await db.dmGroup.findMany({
    where: {
      workspaceId: session.workspace.id,
      members: {
        some: {
          userId: session.user.id,
        },
      },
    },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // 2. Fetch all other workspace users for creating new DMs
  const workspaceUsers = await db.user.findMany({
    where: {
      id: { not: session.user.id },
      memberships: {
        some: {
          workspaceId: session.workspace.id,
          // Exclude clients from DM list
          role: { not: "CLIENT" },
        },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
    },
  });

  // 3. Fetch selected group details and messages if selectedGroupId is provided
  let selectedGroup = null;
  let messages: any[] = [];

  if (selectedGroupId) {
    selectedGroup = await db.dmGroup.findFirst({
      where: {
        id: selectedGroupId,
        workspaceId: session.workspace.id,
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (selectedGroup) {
      messages = await db.chatMessage.findMany({
        where: {
          dmGroupId: selectedGroupId,
          workspaceId: session.workspace.id,
        },
        orderBy: { createdAt: "asc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
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
    }
  }

  return (
    <DmView
      currentUser={session.user}
      workspaceSlug={session.workspace.slug}
      dmGroups={dmGroups}
      workspaceUsers={workspaceUsers}
      selectedGroup={selectedGroup}
      initialMessages={messages}
    />
  );
}
