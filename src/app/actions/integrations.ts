"use server";

import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { getProviderConfig } from "@/lib/integrations/registry";
import { getConnection, revokeConnection } from "@/lib/dal/connections";
import type { Ctx } from "@/lib/dal/context";

const providerSchema = z.enum(["google", "notion", "airtable", "obsidian", "evernote"]);

/**
 * Returns the auth URL for initiating an OAuth flow for a provider.
 * Client calls this to get the URL, then redirects the browser.
 */
export async function connectIntegrationAction(provider: string) {
  const parsed = providerSchema.safeParse(provider);
  if (!parsed.success) return { success: false, error: "Unknown provider" };

  await requireSession();
  return { success: true, url: `/api/integrations/${parsed.data}/auth` };
}

/**
 * Revokes the integration connection for a provider.
 * Only OWNER / ADMIN can disconnect workspace-owned connections.
 */
export async function disconnectIntegrationAction(provider: string) {
  const parsed = providerSchema.safeParse(provider);
  if (!parsed.success) return { success: false, error: "Unknown provider" };

  const session = await requireSession();

  if (session.role === "CLIENT" || session.role === "MEMBER") {
    return { success: false, error: "Insufficient permissions" };
  }

  const ctx: Ctx = { userId: session.user.id, workspaceId: session.workspace.id, role: session.role };
  const config = getProviderConfig(parsed.data);
  await revokeConnection(ctx, parsed.data, config.ownerType);

  return { success: true };
}

/**
 * Returns connection status for a provider without exposing tokens.
 */
export async function getConnectionStatusAction(provider: string) {
  const parsed = providerSchema.safeParse(provider);
  if (!parsed.success) return { connected: false };

  const session = await requireSession();
  const ctx: Ctx = { userId: session.user.id, workspaceId: session.workspace.id, role: session.role };
  const config = getProviderConfig(parsed.data);
  const conn = await getConnection(ctx, parsed.data, config.ownerType);

  return {
    connected: !!conn,
    status: conn?.status ?? null,
    externalAccountName: conn?.externalAccountName ?? null,
    lastSyncedAt: conn?.lastSyncedAt ?? null,
  };
}

const importItemsSchema = z.object({
  provider: providerSchema,
  items: z.array(
    z.object({
      externalId: z.string().min(1),
      externalType: z.string().min(1),
      title: z.string(),
    })
  ).min(1).max(100),
  targetProjectId: z.string().uuid().optional(),
});

/**
 * Triggers an import via the generic import route.
 * Returns the per-item results array.
 */
export async function importItemsAction(input: unknown) {
  const parsed = importItemsSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input", details: parsed.error.flatten() };

  await requireSession();

  const { provider, items, targetProjectId } = parsed.data;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const res = await fetch(`${siteUrl}/api/integrations/${provider}/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items, targetProjectId }),
  });

  const data = await res.json();
  return data;
}
