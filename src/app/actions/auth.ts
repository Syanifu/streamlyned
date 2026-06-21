"use server";

import { db } from "@/lib/db";
import { setSession, clearSession, getPendingOnboardingEmail, clearPendingOnboardingEmail, setOnboardedCookie } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/hash";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/**
 * Switch active user session for developer testing
 */
export async function switchUserAction(email: string, workspaceSlug: string) {
  try {
    const workspace = await db.workspace.findUnique({
      where: { slug: workspaceSlug },
      include: { members: { include: { user: true } } },
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
    let userId: string;

    if (member) {
      if (member.role !== targetRole) {
        await db.workspaceMember.update({ where: { id: member.id }, data: { role: targetRole } });
      }
      userId = member.userId;
    } else {
      let user = await db.user.findUnique({ where: { email } });
      if (!user) {
        const name = email.split("@")[0];
        user = await db.user.create({
          data: {
            email,
            name: name.charAt(0).toUpperCase() + name.slice(1),
            avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${name}`,
          },
        });
      }
      await db.workspaceMember.create({
        data: { workspaceId: workspace.id, userId: user.id, role: targetRole },
      });
      userId = user.id;
    }

    await setSession(userId, workspace.id);
  } catch (error: any) {
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Log out and revoke the current session
 */
export async function logoutAction() {
  await clearSession();
  redirect("/");
}

/**
 * Setup a brand new workspace and owner user
 */
export async function createWorkspaceAction(formData: {
  workspaceName: string;
  workspaceSlug: string;
  email: string;
  name: string;
  password?: string;
}) {
  const { workspaceName, workspaceSlug, email, name, password } = formData;

  if (!workspaceName || !workspaceSlug || !email || !name || !password) {
    return { success: false, error: "All fields are required." };
  }

  const cleanSlug = workspaceSlug.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-");

  try {
    const existing = await db.workspace.findUnique({ where: { slug: cleanSlug } });
    if (existing) return { success: false, error: `Workspace slug "${cleanSlug}" is already taken.` };

    let user = await db.user.findUnique({ where: { email: email.trim() } });
    if (!user) {
      user = await db.user.create({
        data: {
          email: email.trim(),
          name: name.trim(),
          passwordHash: hashPassword(password),
          avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${name.replace(/\s+/g, "")}`,
        },
      });
    } else {
      if (!user.passwordHash) {
        await db.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(password) } });
      }
    }

    const workspace = await db.workspace.create({
      data: { name: workspaceName.trim(), slug: cleanSlug },
    });

    await db.workspaceMember.create({
      data: { workspaceId: workspace.id, userId: user.id, role: "OWNER" },
    });

    const project = await db.project.create({
      data: {
        workspaceId: workspace.id,
        name: "First Project",
        description: "Welcome to your new workspace! Here is your first project.",
        tools: JSON.stringify(["tasks", "discussions", "chat", "docs", "calendar"]),
      },
    });

    await db.projectMember.create({
      data: {
        projectId: project.id,
        userId: user.id,
        visibleTools: JSON.stringify(["tasks", "discussions", "chat", "docs", "calendar"]),
      },
    });

    const list = await db.taskList.create({
      data: { projectId: project.id, name: "General Tasks", position: 1000 },
    });

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

    await db.aiSettings.create({ data: { workspaceId: workspace.id, provider: "openai" } });

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

    await setSession(user.id, workspace.id);
  } catch (error: any) {
    console.error("Workspace creation failed:", error);
    return { success: false, error: error.message || "An unexpected error occurred." };
  }

  redirect("/dashboard");
}

/**
 * Log into an existing workspace with email and password
 */
export async function loginAction(formData: {
  email: string;
  password?: string;
  workspaceSlug: string;
}) {
  const { email, password, workspaceSlug } = formData;

  if (!email || !password || !workspaceSlug) {
    return { success: false, error: "All fields are required." };
  }

  const cleanSlug = workspaceSlug.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-");

  try {
    const workspace = await db.workspace.findUnique({
      where: { slug: cleanSlug },
      include: { members: { include: { user: true } } },
    });

    if (!workspace) return { success: false, error: `Workspace slug "${cleanSlug}" not found.` };

    const member = workspace.members.find((m) => m.user.email === email.trim());
    if (!member) return { success: false, error: `User with email "${email}" is not a member of this workspace.` };

    const user = member.user;
    if (user.passwordHash) {
      const isMatch = verifyPassword(password, user.passwordHash);
      if (!isMatch) return { success: false, error: "Incorrect password." };
    } else {
      await db.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(password) } });
    }

    await setSession(user.id, workspace.id);
  } catch (error: any) {
    console.error("Login failed:", error);
    return { success: false, error: error.message || "An unexpected error occurred." };
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

/**
 * Onboarding: join an existing workspace the user was invited to.
 */
export async function joinWorkspaceAction(workspaceSlug: string) {
  const email = await getPendingOnboardingEmail();
  if (!email) return { success: false, error: "Session expired. Please sign in again." };

  try {
    const member = await db.workspaceMember.findFirst({
      where: { workspace: { slug: workspaceSlug }, user: { email } },
      include: { user: true, workspace: true },
    });

    if (!member) return { success: false, error: "You are not a member of this workspace." };

    await setSession(member.userId, member.workspaceId);
    await setOnboardedCookie(member.user.id);
    await clearPendingOnboardingEmail();
  } catch (error: any) {
    return { success: false, error: error.message };
  }

  redirect("/dashboard");
}

/**
 * Onboarding: create a brand-new workspace for an invited user.
 */
export async function createOwnWorkspaceAction(workspaceName: string, workspaceSlug: string) {
  const email = await getPendingOnboardingEmail();
  if (!email) return { success: false, error: "Session expired. Please sign in again." };

  const cleanSlug = workspaceSlug.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-");

  try {
    const existing = await db.workspace.findUnique({ where: { slug: cleanSlug } });
    if (existing) return { success: false, error: `Workspace slug "${cleanSlug}" is already taken.` };

    const user = await db.user.findUnique({ where: { email } });
    if (!user) return { success: false, error: "User not found." };

    const workspace = await db.workspace.create({ data: { name: workspaceName.trim(), slug: cleanSlug } });

    await db.workspaceMember.create({
      data: { workspaceId: workspace.id, userId: user.id, role: "OWNER" },
    });

    const project = await db.project.create({
      data: {
        workspaceId: workspace.id,
        name: "First Project",
        description: "Welcome to your new workspace! Here is your first project.",
        tools: JSON.stringify(["tasks", "discussions", "chat", "docs", "calendar"]),
      },
    });

    await db.projectMember.create({
      data: {
        projectId: project.id,
        userId: user.id,
        visibleTools: JSON.stringify(["tasks", "discussions", "chat", "docs", "calendar"]),
      },
    });

    const list = await db.taskList.create({
      data: { projectId: project.id, name: "General Tasks", position: 1000 },
    });

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

    await db.aiSettings.create({ data: { workspaceId: workspace.id, provider: "openai" } });

    await db.auditLog.create({
      data: {
        workspaceId: workspace.id,
        entityType: "WORKSPACE",
        entityId: workspace.id,
        userId: user.id,
        action: "CREATE",
        description: `Created workspace ${workspace.name} from onboarding`,
      },
    });

    await setSession(user.id, workspace.id);
    await setOnboardedCookie(user.id);
    await clearPendingOnboardingEmail();
  } catch (error: any) {
    return { success: false, error: error.message };
  }

  redirect("/dashboard");
}
