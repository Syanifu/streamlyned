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

  // 1, 2 & 3. Fetch DM groups, workspace users, selected group, and messages in parallel
  const [dmGroups, workspaceUsers, selectedGroup, messages] = await Promise.all([
    db.dmGroup.findMany({
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
    }),
    db.user.findMany({
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
    }),
    selectedGroupId
      ? db.dmGroup.findFirst({
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
        })
      : Promise.resolve(null),
    selectedGroupId
      ? db.chatMessage.findMany({
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
        })
      : Promise.resolve([])
  ]);

  const finalMessages = selectedGroup ? messages : [];

  return (
    <DmView
      currentUser={session.user}
      workspaceSlug={session.workspace.slug}
      dmGroups={dmGroups}
      workspaceUsers={workspaceUsers}
      selectedGroup={selectedGroup}
      initialMessages={finalMessages}
    />
  );
}
