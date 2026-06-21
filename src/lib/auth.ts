import "server-only";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { db } from "./db";
import { sha256 } from "./crypto";

const COOKIE_NAME = "streamlyned_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

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

const COOKIE_OPTS = {
  path: "/",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: SESSION_TTL_MS / 1000,
};

/** Creates a new opaque session. Call after successful authentication. */
export async function setSession(userId: string, workspaceId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.session.create({
    data: { userId, workspaceId, tokenHash, expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, COOKIE_OPTS);
}

/** Loads the session from the cookie. Returns null if absent, expired, or revoked. */
export async function getSession(): Promise<SessionContext | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const tokenHash = sha256(token);
    const session = await db.session.findUnique({
      where: { tokenHash },
      include: {
        user: true,
        workspace: true,
      },
    });

    if (!session) return null;
    if (session.revokedAt) return null;
    if (session.expiresAt < new Date()) {
      await db.session.delete({ where: { tokenHash } });
      return null;
    }

    // Sliding expiry — update lastUsedAt
    await db.session.update({
      where: { tokenHash },
      data: { lastUsedAt: new Date() },
    });

    // Resolve role from workspace membership
    const member = await db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: session.workspaceId, userId: session.userId } },
    });
    if (!member) return null;

    return {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        avatarUrl: session.user.avatarUrl,
        coverUrl: session.user.coverUrl,
        planTier: session.user.planTier || "standard",
      },
      workspace: {
        id: session.workspace.id,
        name: session.workspace.name,
        slug: session.workspace.slug,
      },
      role: member.role as SessionContext["role"],
    };
  } catch (error) {
    console.error("getSession error:", error);
    return null;
  }
}

/** Asserts a valid session exists. Throws if not. Use in Server Actions and Route Handlers. */
export async function requireSession(): Promise<SessionContext> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}

/** Revokes the current session cookie (logout). */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) {
    const tokenHash = sha256(token);
    await db.session.updateMany({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    }).catch(() => {}); // best-effort
  }
  cookieStore.delete(COOKIE_NAME);
  // Also clear legacy cookies from the old model
  cookieStore.delete("streamlyned_user_email");
  cookieStore.delete("streamlyned_workspace_slug");
}

/** Revokes ALL sessions for a user (logout-everywhere). */
export async function revokeAllSessions(userId: string): Promise<void> {
  await db.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// --- Onboarding helpers (unchanged) ---

const AUX_COOKIE_OPTS = (maxAge: number) => ({
  path: "/",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge,
});

export async function setOnboardedCookie(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set("streamlyned_onboarded", userId, AUX_COOKIE_OPTS(60 * 60 * 24 * 365));
}

export async function setPendingOnboardingEmail(email: string) {
  const cookieStore = await cookies();
  cookieStore.set("streamlyned_pending_email", email, AUX_COOKIE_OPTS(60 * 60));
}

export async function getPendingOnboardingEmail(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("streamlyned_pending_email")?.value || null;
}

export async function clearPendingOnboardingEmail() {
  const cookieStore = await cookies();
  cookieStore.delete("streamlyned_pending_email");
}
