import "server-only";
import { db } from "@/lib/db";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import type { Ctx } from "./context";
import type { Connection } from "@prisma/client";

export type Provider = "google" | "notion" | "airtable" | "obsidian" | "evernote";
export type OwnerType = "USER" | "WORKSPACE";
export type ConnectionStatus = "active" | "expired" | "revoked" | "error";

export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  tokenSecret?: string;
  expiresAt?: Date;
  scopes?: string[];
  externalAccountId?: string;
  externalAccountName?: string;
  metadata?: Record<string, unknown>;
}

function buildOwnerWhere(ctx: Ctx, ownerType: OwnerType) {
  return ownerType === "USER"
    ? { userId: ctx.userId }
    : { workspaceId: ctx.workspaceId };
}

/** Creates or replaces a connection for a provider+owner pair. Tokens are encrypted at rest. */
export async function upsertConnection(
  ctx: Ctx,
  provider: Provider,
  ownerType: OwnerType,
  tokens: TokenSet
): Promise<Connection> {
  const ownerWhere = buildOwnerWhere(ctx, ownerType);

  const data = {
    provider,
    ownerType,
    ...ownerWhere,
    accessToken: encryptSecret(tokens.accessToken),
    refreshToken: tokens.refreshToken ? encryptSecret(tokens.refreshToken) : null,
    tokenSecret: tokens.tokenSecret ? encryptSecret(tokens.tokenSecret) : null,
    expiresAt: tokens.expiresAt ?? null,
    scopes: JSON.stringify(tokens.scopes ?? []),
    externalAccountId: tokens.externalAccountId ?? null,
    externalAccountName: tokens.externalAccountName ?? null,
    metadata: tokens.metadata ? JSON.stringify(tokens.metadata) : null,
    status: "active" as ConnectionStatus,
    lastError: null,
  };

  const updatePayload = {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    tokenSecret: data.tokenSecret,
    expiresAt: data.expiresAt,
    scopes: data.scopes,
    externalAccountId: data.externalAccountId,
    externalAccountName: data.externalAccountName,
    metadata: data.metadata,
    status: "active" as ConnectionStatus,
    lastError: null,
  };

  const existing = await db.connection.findFirst({
    where: { provider, ...ownerWhere },
  });

  if (existing) {
    return db.connection.update({ where: { id: existing.id }, data: updatePayload });
  }
  return db.connection.create({ data });
}

/** Returns the connection for a provider (with decrypted tokens). Returns null if not connected. */
export async function getConnection(
  ctx: Ctx,
  provider: Provider,
  ownerType: OwnerType
): Promise<(Connection & { accessTokenDecrypted: string; refreshTokenDecrypted?: string }) | null> {
  const ownerWhere = buildOwnerWhere(ctx, ownerType);

  const conn = await db.connection.findFirst({
    where: { provider, ...ownerWhere, status: "active" },
  });

  if (!conn) return null;

  return {
    ...conn,
    accessTokenDecrypted: decryptSecret(conn.accessToken),
    refreshTokenDecrypted: conn.refreshToken ? decryptSecret(conn.refreshToken) : undefined,
  };
}

/** Marks a connection as revoked. */
export async function revokeConnection(ctx: Ctx, provider: Provider, ownerType: OwnerType): Promise<void> {
  const ownerWhere = buildOwnerWhere(ctx, ownerType);
  await db.connection.updateMany({
    where: { provider, ...ownerWhere },
    data: { status: "revoked", revokedAt: new Date() } as any,
  });
}

/** Persists an updated token set after a token refresh. */
export async function updateConnectionTokens(
  connectionId: string,
  tokens: Pick<TokenSet, "accessToken" | "refreshToken" | "expiresAt">
): Promise<void> {
  await db.connection.update({
    where: { id: connectionId },
    data: {
      accessToken: encryptSecret(tokens.accessToken),
      refreshToken: tokens.refreshToken ? encryptSecret(tokens.refreshToken) : undefined,
      expiresAt: tokens.expiresAt ?? null,
      status: "active",
      lastError: null,
    },
  });
}

/** Records an error against a connection without disrupting data. */
export async function markConnectionError(connectionId: string, message: string): Promise<void> {
  await db.connection.update({
    where: { id: connectionId },
    data: { status: "error", lastError: message.slice(0, 500) },
  });
}

// --- ExternalItem (dedup tracking) ---

export interface ExternalItemInput {
  connectionId: string;
  provider: string;
  externalId: string;
  externalType: string;
  localEntityType: string;
  localEntityId: string;
  contentHash?: string;
}

/** Upserts an ExternalItem record for dedup. Returns true if this is a new item (first import). */
export async function upsertExternalItem(input: ExternalItemInput): Promise<{ isNew: boolean }> {
  const existing = await db.externalItem.findUnique({
    where: { connectionId_externalId: { connectionId: input.connectionId, externalId: input.externalId } },
  });

  await db.externalItem.upsert({
    where: { connectionId_externalId: { connectionId: input.connectionId, externalId: input.externalId } },
    create: { ...input, lastSyncedAt: new Date() },
    update: { localEntityId: input.localEntityId, contentHash: input.contentHash, lastSyncedAt: new Date() },
  });

  return { isNew: !existing };
}

/** Returns the local entity ID for an external item, if previously imported. */
export async function findExternalItem(
  connectionId: string,
  externalId: string
): Promise<{ localEntityId: string; localEntityType: string; contentHash?: string | null } | null> {
  const item = await db.externalItem.findUnique({
    where: { connectionId_externalId: { connectionId, externalId } },
  });
  if (!item) return null;
  return { localEntityId: item.localEntityId, localEntityType: item.localEntityType, contentHash: item.contentHash };
}
