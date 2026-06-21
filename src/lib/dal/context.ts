import "server-only";

export type Role = "OWNER" | "ADMIN" | "MEMBER" | "CLIENT" | "super_admin";

/** Caller context passed to every DAL function. Sourced from the verified session — never from client input. */
export interface Ctx {
  userId: string;
  workspaceId: string;
  role: Role;
}

/** Throws if the caller's role is not in the allowed set. */
export function assertRole(ctx: Ctx, allowed: Role[]): void {
  if (!allowed.includes(ctx.role)) {
    throw new Error("Forbidden");
  }
}

/** Returns true if the caller can manage workspace settings (OWNER or ADMIN). */
export function canManageWorkspace(ctx: Ctx): boolean {
  return ctx.role === "OWNER" || ctx.role === "ADMIN" || ctx.role === "super_admin";
}
