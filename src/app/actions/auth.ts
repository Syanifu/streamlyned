"use server";

import { db } from "@/lib/db";
import { setSession, clearSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/**
 * Switch active user session for developer testing
 */
export async function switchUserAction(email: string, workspaceSlug: string) {
  try {
    // Verify user exists and belongs to workspace
    const workspace = await db.workspace.findUnique({
      where: { slug: workspaceSlug },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!workspace) {
      return { success: false, error: `Workspace slug "${workspaceSlug}" not found.` };
    }

    const targetRole = email.includes("superadmin")
      ? "super_admin"
      : email.includes("owner")
      ? "OWNER"
      : email.includes("admin")
      ? "ADMIN"
      : email.includes("client")
      ? "CLIENT"
      : "MEMBER";

    const member = workspace.members.find((m) => m.user.email === email);
    if (member) {
      if (member.role !== targetRole) {
        await db.workspaceMember.update({
          where: { id: member.id },
          data: { role: targetRole },
        });
      }
    } else {
      // User is not in workspace, let's see if they exist generally
      let user = await db.user.findUnique({ where: { email } });
      if (!user) {
        // Create user on the fly if needed
        const name = email.split("@")[0];
        const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
        user = await db.user.create({
          data: {
            email,
            name: formattedName,
            avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${name}`,
          },
        });
      }
      
      // Associate them with target role
      await db.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          role: targetRole,
        },
      });
    }

    await setSession(email, workspaceSlug);
  } catch (error: any) {
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Log out and clear session cookies
 */
export async function logoutAction() {
  await clearSession();
  redirect("/");
}

/**
 * Setup a brand new workspace and owner user in under 5 minutes
 */
export async function createWorkspaceAction(formData: {
  workspaceName: string;
  workspaceSlug: string;
  email: string;
  name: string;
}) {
  const { workspaceName, workspaceSlug, email, name } = formData;

  if (!workspaceName || !workspaceSlug || !email || !name) {
    return { success: false, error: "All fields are required." };
  }

  const cleanSlug = workspaceSlug.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-");

  try {
    // Check if slug exists
    const existing = await db.workspace.findUnique({ where: { slug: cleanSlug } });
    if (existing) {
      return { success: false, error: `Workspace slug "${cleanSlug}" is already taken.` };
    }

    // Find or create user
    let user = await db.user.findUnique({ where: { email: email.trim() } });
    if (!user) {
      user = await db.user.create({
        data: {
          email: email.trim(),
          name: name.trim(),
          avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${name.replace(/\s+/g, "")}`,
        },
      });
    }

    // Create workspace
    const workspace = await db.workspace.create({
      data: {
        name: workspaceName.trim(),
        slug: cleanSlug,
      },
    });

    // Create Owner membership
    await db.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        role: "OWNER",
      },
    });

    // Seed default project for the new workspace
    const project = await db.project.create({
      data: {
        workspaceId: workspace.id,
        name: "First Project",
        description: "Welcome to your new workspace! Here is your first project.",
        tools: JSON.stringify(["tasks", "discussions", "chat", "docs", "calendar"]),
      },
    });

    // Add user as project member
    await db.projectMember.create({
      data: {
        projectId: project.id,
        userId: user.id,
        visibleTools: JSON.stringify(["tasks", "discussions", "chat", "docs", "calendar"]),
      },
    });

    // Add default Task List
    const list = await db.taskList.create({
      data: {
        projectId: project.id,
        name: "General Tasks",
        position: 1000,
      },
    });

    // Add default Task
    await db.task.create({
      data: {
        workspaceId: workspace.id,
        taskListId: list.id,
        projectId: project.id,
        title: "Explore Streamlyned features",
        notes: "Welcome! Toggle between roles using the developer banner below, and test discussions, chat, documents, and search.",
        position: 1000,
      },
    });

    // Create default AI Settings
    await db.aiSettings.create({
      data: {
        workspaceId: workspace.id,
        provider: "openai",
      },
    });

    // Log the action
    await db.auditLog.create({
      data: {
        workspaceId: workspace.id,
        entityType: "WORKSPACE",
        entityId: workspace.id,
        userId: user.id,
        action: "CREATE",
        description: `Created workspace ${workspace.name} with slug ${workspace.slug}`,
      },
    });

    // Set active session
    await setSession(user.email, workspace.slug);

  } catch (error: any) {
    console.error("Workspace creation failed:", error);
    return { success: false, error: error.message || "An unexpected error occurred." };
  }

  // Redirect to dashboard page
  redirect("/dashboard");
}
