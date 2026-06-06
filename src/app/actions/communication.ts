"use server";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { indexEntity } from "@/lib/ai/search";

/**
 * Create a new project Discussion thread
 */
export async function createDiscussionAction(
  projectId: string,
  title: string,
  content: string
) {
  try {
    const session = await requireSession();

    // Verify membership
    const projectMember = await db.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: session.user.id } },
    });
    if (!projectMember) throw new Error("Access Denied.");

    const discussion = await db.discussion.create({
      data: {
        workspaceId: session.workspace.id,
        projectId,
        title: title.trim(),
        content: content.trim(),
        userId: session.user.id,
      },
    });

    // Index discussion in vector search
    await indexEntity(session.workspace.id, "DISCUSSION", discussion.id, projectId, discussion.title + " " + discussion.content);

    // Auto-subscribe the author
    await db.discussionSubscription.create({
      data: {
        discussionId: discussion.id,
        userId: session.user.id,
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        workspaceId: session.workspace.id,
        projectId,
        entityType: "DISCUSSION",
        entityId: discussion.id,
        userId: session.user.id,
        action: "CREATE",
        description: `started discussion thread "${discussion.title}"`,
      },
    });

    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true, discussion };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Add a comment to a Discussion thread
 */
export async function addDiscussionCommentAction(
  projectId: string,
  discussionId: string,
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
        discussionId,
        userId: session.user.id,
        content: content.trim(),
        isClientComment: session.role === "CLIENT",
      },
    });

    // Check if the user is subscribed; if not, subscribe them
    const isSubscribed = await db.discussionSubscription.findUnique({
      where: { discussionId_userId: { discussionId, userId: session.user.id } },
    });
    if (!isSubscribed) {
      await db.discussionSubscription.create({
        data: {
          discussionId,
          userId: session.user.id,
        },
      });
    }

    // Audit log
    await db.auditLog.create({
      data: {
        workspaceId: session.workspace.id,
        projectId,
        entityType: "COMMENT",
        entityId: comment.id,
        userId: session.user.id,
        action: "CREATE",
        description: `replied to discussion thread`,
      },
    });

    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true, comment };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Sends a chat message in a project chat room or a DM group
 */
export async function sendChatMessageAction(
  projectId: string | null,
  dmGroupId: string | null,
  content: string
) {
  try {
    const session = await requireSession();

    if (!projectId && !dmGroupId) {
      throw new Error("Must specify a destination (project or DM group).");
    }

    // If project chat, verify membership
    if (projectId) {
      const projectMember = await db.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: session.user.id } },
      });
      if (!projectMember) throw new Error("Access Denied.");
      
      // Clients can only post if they have visibility flag for chat (which is checked in UI, but check here too)
      if (session.role === "CLIENT") {
        const visibleTools = JSON.parse(projectMember.visibleTools) as string[];
        if (!visibleTools.includes("chat")) {
          throw new Error("Access Denied: Chat is not enabled for your account.");
        }
      }
    }

    // If DM chat, verify membership
    if (dmGroupId) {
      const dmGroupMember = await db.dmGroupMember.findUnique({
        where: { dmGroupId_userId: { dmGroupId, userId: session.user.id } },
      });
      if (!dmGroupMember) throw new Error("Access Denied: You are not a member of this chat group.");
    }

    const message = await db.chatMessage.create({
      data: {
        workspaceId: session.workspace.id,
        projectId,
        dmGroupId,
        userId: session.user.id,
        content: content.trim(),
      },
    });

    // Index chat message in vector search (projectId is null for DMs)
    await indexEntity(session.workspace.id, "CHAT", message.id, projectId, message.content);

    if (projectId) {
      revalidatePath(`/dashboard/projects/${projectId}`);
    } else {
      revalidatePath("/dashboard/dm");
    }

    return { success: true, message };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Adds an emoji reaction to a chat message
 */
export async function addChatReactionAction(
  messageId: string,
  emoji: string,
  projectId: string | null
) {
  try {
    const session = await requireSession();

    // Verify message exists and belongs to this workspace
    const message = await db.chatMessage.findUnique({
      where: { id: messageId },
    });
    if (!message || message.workspaceId !== session.workspace.id) {
      throw new Error("Message not found.");
    }

    // If DM message, check group membership
    if (message.dmGroupId) {
      const dmMember = await db.dmGroupMember.findUnique({
        where: { dmGroupId_userId: { dmGroupId: message.dmGroupId, userId: session.user.id } },
      });
      if (!dmMember) throw new Error("Access Denied.");
    }

    // If Project message, check project membership
    if (message.projectId) {
      const projectMember = await db.projectMember.findUnique({
        where: { projectId_userId: { projectId: message.projectId, userId: session.user.id } },
      });
      if (!projectMember) throw new Error("Access Denied.");
    }

    // Toggle reaction
    const existing = await db.chatMessageReaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId: session.user.id,
          emoji,
        },
      },
    });

    if (existing) {
      await db.chatMessageReaction.delete({
        where: { id: existing.id },
      });
    } else {
      await db.chatMessageReaction.create({
        data: {
          messageId,
          userId: session.user.id,
          emoji,
        },
      });
    }

    if (projectId) {
      revalidatePath(`/dashboard/projects/${projectId}`);
    } else {
      revalidatePath("/dashboard/dm");
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Creates a direct message group between users
 */
export async function createDmGroupAction(recipientEmails: string[]) {
  try {
    const session = await requireSession();

    // Clients cannot create DMs
    if (session.role === "CLIENT") {
      throw new Error("Clients are not permitted to start Direct Messages.");
    }

    // Find recipient users
    const users = await db.user.findMany({
      where: {
        email: { in: recipientEmails },
        memberships: {
          some: {
            workspaceId: session.workspace.id,
          },
        },
      },
    });

    if (users.length === 0) {
      throw new Error("No valid users found to start DM.");
    }

    // Include the sender
    const allUserIds = Array.from(new Set([session.user.id, ...users.map((u) => u.id)]));

    // Verify group does not exist (for 1:1, check if DM group between the same two users already exists)
    if (allUserIds.length === 2) {
      const existingGroup = await db.dmGroup.findFirst({
        where: {
          workspaceId: session.workspace.id,
          members: {
            every: {
              userId: { in: allUserIds },
            },
          },
        },
        include: {
          members: true,
        },
      });

      // Filter groups that have exactly 2 members
      const exactMatch = existingGroup?.members.length === 2 ? existingGroup : null;
      if (exactMatch) {
        return { success: true, dmGroupId: exactMatch.id };
      }
    }

    // Create new DM group
    const dmGroup = await db.dmGroup.create({
      data: {
        workspaceId: session.workspace.id,
      },
    });

    // Add members
    await db.dmGroupMember.createMany({
      data: allUserIds.map((uid) => ({
        dmGroupId: dmGroup.id,
        userId: uid,
      })),
    });

    revalidatePath("/dashboard/dm");
    return { success: true, dmGroupId: dmGroup.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
