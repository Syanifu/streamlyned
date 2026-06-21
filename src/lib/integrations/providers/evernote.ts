import "server-only";
import { createHash } from "crypto";
import type { ProviderAdapter, TokenSet, CallbackCtx, ImportCandidate, FetchedContent } from "../adapter";
import type { Connection } from "@prisma/client";
import { decryptSecret } from "@/lib/crypto";

/**
 * Evernote adapter — OAuth 1.0a + Thrift API.
 *
 * IMPORTANT: Evernote API keys require manual review (~5 business days).
 * "Full access" (reading existing notes) requires separate manual approval.
 * Do not ship this adapter until both approvals are received.
 *
 * This is a stub that provides the correct interface; the Thrift client
 * import should be added once the evernote npm package is installed.
 */
const evernoteAdapter: ProviderAdapter = {
  key: "evernote",

  async getAuthUrl(_state: string): Promise<string> {
    if (!process.env.EVERNOTE_CONSUMER_KEY) {
      throw new Error("Evernote API keys not configured. Manual approval required before use.");
    }
    // OAuth 1.0a request-token → authorize flow
    // Full implementation requires the `evernote` npm package + Thrift setup.
    throw new Error("Evernote OAuth flow not yet implemented. Awaiting API key approval.");
  },

  async exchangeCode(_code: string, _ctx: CallbackCtx): Promise<TokenSet> {
    throw new Error("Evernote OAuth exchange not yet implemented.");
  },

  async listImportable(conn: Connection): Promise<ImportCandidate[]> {
    const _accessToken = decryptSecret(conn.accessToken);
    // Stub: would use Evernote Thrift NoteStore.listNotebooks() + NoteStore.findNotes()
    throw new Error("Evernote note listing not yet implemented.");
  },

  async fetchItem(conn: Connection, externalId: string, _externalType: string): Promise<FetchedContent> {
    const _accessToken = decryptSecret(conn.accessToken);
    // Stub: would use NoteStore.getNote() + ENML → markdown conversion
    const contentHash = createHash("sha256").update(externalId).digest("hex");
    throw new Error("Evernote note fetch not yet implemented.");
    return { externalId, externalType: "note", title: "", markdown: "", contentHash };
  },
};

export default evernoteAdapter;
