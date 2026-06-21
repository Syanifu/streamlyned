import "server-only";
import type { ProviderAdapter } from "./adapter";

export type OwnerType = "USER" | "WORKSPACE";
export type AuthKind = "oauth2" | "oauth1" | "file";

export interface ProviderConfig {
  key: string;
  displayName: string;
  ownerType: OwnerType;
  authKind: AuthKind;
  defaultScopes: string[];
  supportsRefresh: boolean;
  supportsWriteback: boolean;
  /** If true, provider requires manual API key approval (e.g. Evernote). */
  manualApprovalRequired?: boolean;
}

export const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  google: {
    key: "google",
    displayName: "Google",
    ownerType: "USER",
    authKind: "oauth2",
    defaultScopes: [
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    supportsRefresh: true,
    supportsWriteback: false,
  },
  notion: {
    key: "notion",
    displayName: "Notion",
    ownerType: "WORKSPACE",
    authKind: "oauth2",
    defaultScopes: [],
    supportsRefresh: false,
    supportsWriteback: false,
  },
  airtable: {
    key: "airtable",
    displayName: "Airtable",
    ownerType: "WORKSPACE",
    authKind: "oauth2",
    defaultScopes: ["data.records:read", "schema.bases:read"],
    supportsRefresh: true,
    supportsWriteback: false,
  },
  obsidian: {
    key: "obsidian",
    displayName: "Obsidian",
    ownerType: "USER",
    authKind: "file",
    defaultScopes: [],
    supportsRefresh: false,
    supportsWriteback: false,
  },
  evernote: {
    key: "evernote",
    displayName: "Evernote",
    ownerType: "USER",
    authKind: "oauth1",
    defaultScopes: [],
    supportsRefresh: false,
    supportsWriteback: false,
    manualApprovalRequired: true,
  },
};

// Lazy provider registry — adapters are loaded only when needed to avoid bundle bloat.
const adapterCache = new Map<string, ProviderAdapter>();

export async function getAdapter(provider: string): Promise<ProviderAdapter> {
  if (adapterCache.has(provider)) return adapterCache.get(provider)!;

  let adapter: ProviderAdapter;
  switch (provider) {
    case "google":
      adapter = (await import("./providers/google")).default;
      break;
    case "notion":
      adapter = (await import("./providers/notion")).default;
      break;
    case "airtable":
      adapter = (await import("./providers/airtable")).default;
      break;
    case "obsidian":
      adapter = (await import("./providers/obsidian")).default;
      break;
    case "evernote":
      adapter = (await import("./providers/evernote")).default;
      break;
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }

  adapterCache.set(provider, adapter);
  return adapter;
}

export function getProviderConfig(provider: string): ProviderConfig {
  const config = PROVIDER_CONFIGS[provider];
  if (!config) throw new Error(`Unknown provider: ${provider}`);
  return config;
}
