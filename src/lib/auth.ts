import { cookies } from "next/headers";
import { db } from "./db";

export interface SessionContext {
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    coverUrl: string | null;
    planTier: string;
  };
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
  role: "OWNER" | "ADMIN" | "MEMBER" | "CLIENT" | "super_admin";
}

/**
 * Retrieves the current session (user, workspace, role) from cookies.
 * This is usable in Server Components, Server Actions, and Route Handlers.
 */
export async function getSession(): Promise<SessionContext | null> {
  try {
    const cookieStore = await cookies();
    const email = cookieStore.get("streamlyned_user_email")?.value;
    const workspaceSlug = cookieStore.get("streamlyned_workspace_slug")?.value;

    if (!email || !workspaceSlug) {
      return null;
    }

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
      return null;
    }

    const member = workspace.members.find((m) => m.user.email === email);
    if (!member) {
      return null;
    }

    return {
      user: {
        id: member.user.id,
        email: member.user.email,
        name: member.user.name,
        avatarUrl: member.user.avatarUrl,
        coverUrl: member.user.coverUrl,
        planTier: member.user.planTier || "standard",
      },
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
      },
      role: member.role as "OWNER" | "ADMIN" | "MEMBER" | "CLIENT" | "super_admin",
    };
  } catch (error) {
    console.error("Error getting session:", error);
    return null;
  }
}

/**
 * Sets the session cookies for the specified user and workspace.
 */
export async function setSession(email: string, workspaceSlug: string) {
  const cookieStore = await cookies();
  cookieStore.set("streamlyned_user_email", email, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });
  cookieStore.set("streamlyned_workspace_slug", workspaceSlug, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });
}

/**
 * Clears the session cookies.
 */
export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete("streamlyned_user_email");
  cookieStore.delete("streamlyned_workspace_slug");
}

/**
 * Asserts that the current session is valid and throws/returns error if not.
 * Ensures workspace isolation.
 */
export async function requireSession(): Promise<SessionContext> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized: No active session found.");
  }
  return session;
}
