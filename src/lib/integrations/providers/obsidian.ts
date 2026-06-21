import "server-only";
import { createHash } from "crypto";
import type { ProviderAdapter, ImportCandidate, FetchedContent } from "../adapter";
import type { Connection } from "@prisma/client";

/**
 * Obsidian adapter — file/vault import only.
 * Obsidian has no cloud account or OAuth API (certain).
 * Files are submitted via a multipart upload endpoint; this adapter
 * processes already-uploaded content stored in the Connection metadata.
 */
const obsidianAdapter: ProviderAdapter = {
  key: "obsidian",

  // No OAuth — return null to signal file-based flow
  async getAuthUrl(_state: string): Promise<null> {
    return null;
  },

  async exchangeCode(_code: string): Promise<null> {
    return null;
  },

  async listImportable(conn: Connection): Promise<ImportCandidate[]> {
    // Files are stored in metadata after upload via /api/integrations/obsidian/upload
    const meta = conn.metadata ? JSON.parse(conn.metadata) : {};
    const files: Array<{ path: string; title: string; hash: string }> = meta.files ?? [];

    return files.map((f) => ({
      externalId: f.path,
      externalType: "file",
      title: f.title,
      contentHash: f.hash,
    }));
  },

  async fetchItem(conn: Connection, externalId: string, _externalType: string): Promise<FetchedContent> {
    const meta = conn.metadata ? JSON.parse(conn.metadata) : {};
    const files: Array<{ path: string; title: string; hash: string; content: string }> = meta.files ?? [];
    const file = files.find((f) => f.path === externalId);

    if (!file) throw new Error(`Obsidian file not found: ${externalId}`);

    // Resolve [[wikilinks]] to titles (simple replace — full resolution requires all file titles)
    const markdown = file.content.replace(/\[\[([^\]]+)\]\]/g, (_: string, link: string) => {
      const parts = link.split("|");
      return parts[parts.length - 1]; // use display text if pipe-alias, else link target
    });

    const contentHash = createHash("sha256").update(markdown).digest("hex");

    return {
      externalId,
      externalType: "file",
      title: file.title,
      markdown,
      contentHash,
    };
  },
};

export default obsidianAdapter;
