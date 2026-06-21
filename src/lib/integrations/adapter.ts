import "server-only";
import type { Connection } from "@prisma/client";

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

export interface CallbackCtx {
  /** Verified session context (userId + workspaceId) passed from the callback route. */
  userId: string;
  workspaceId: string;
}

export interface ImportCandidate {
  externalId: string;
  externalType: string;  // page | database | record | file | doc | note
  title: string;
  description?: string;
  /** Stable hash of content — used to skip unchanged items on re-import. */
  contentHash?: string;
}

export interface FetchedContent {
  externalId: string;
  externalType: string;
  title: string;
  /** Markdown representation of the content. */
  markdown: string;
  /** For database/table types — structured records that map to Tasks. */
  records?: Array<{ title: string; [k: string]: unknown }>;
  contentHash: string;
  metadata?: Record<string, unknown>;
}

/**
 * Every integration provider implements this interface.
 * File-based providers (Obsidian) return no-ops for OAuth methods.
 */
export interface ProviderAdapter {
  key: string;

  /** Returns the OAuth authorization URL. File providers return null. */
  getAuthUrl(state: string, scopes?: string[]): Promise<string | null>;

  /** Exchanges an OAuth code for a TokenSet. File providers return null. */
  exchangeCode(code: string, ctx: CallbackCtx): Promise<TokenSet | null>;

  /** Refreshes an access token. Providers that don't support refresh return null. */
  refresh?(conn: Connection): Promise<TokenSet | null>;

  /** Lists importable items from the connected account. */
  listImportable(conn: Connection): Promise<ImportCandidate[]>;

  /** Fetches the full content of a single item by its external ID. */
  fetchItem(conn: Connection, externalId: string, externalType: string): Promise<FetchedContent>;

  /** Optional: pushes a local change back to the provider. Default = unsupported. */
  pushItem?(conn: Connection, localEntityId: string): Promise<void>;
}
