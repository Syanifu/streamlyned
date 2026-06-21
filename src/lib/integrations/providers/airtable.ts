import "server-only";
import { createHash } from "crypto";
import type { ProviderAdapter, TokenSet, CallbackCtx, ImportCandidate, FetchedContent } from "../adapter";
import type { Connection } from "@prisma/client";
import { decryptSecret } from "@/lib/crypto";

const REDIRECT_URI = `${process.env.NEXT_PUBLIC_SITE_URL}/api/integrations/airtable/callback`;
const API_BASE = "https://api.airtable.com/v0";

async function airtableFetch(accessToken: string, path: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Airtable API error ${res.status}: ${await res.text()}`);
  return res.json();
}

const airtableAdapter: ProviderAdapter = {
  key: "airtable",

  async getAuthUrl(state: string, scopes?: string[]): Promise<string> {
    const params = new URLSearchParams({
      client_id: process.env.AIRTABLE_CLIENT_ID!,
      redirect_uri: REDIRECT_URI,
      response_type: "code",
      scope: (scopes ?? ["data.records:read", "schema.bases:read"]).join(" "),
      state,
      code_challenge_method: "S256",
      // PKCE: in production generate a real code_challenge; this is a stub
      code_challenge: "placeholder_challenge",
    });
    return `https://airtable.com/oauth2/v1/authorize?${params}`;
  },

  async exchangeCode(code: string, _ctx: CallbackCtx): Promise<TokenSet> {
    const res = await fetch("https://airtable.com/oauth2/v1/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${process.env.AIRTABLE_CLIENT_ID}:${process.env.AIRTABLE_CLIENT_SECRET}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        code,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
        code_verifier: "placeholder_verifier",
      }),
    });

    if (!res.ok) throw new Error(`Airtable token exchange failed: ${await res.text()}`);
    const data = await res.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
      scopes: data.scope?.split(" "),
    };
  },

  async refresh(conn: Connection): Promise<TokenSet | null> {
    if (!conn.refreshToken) return null;
    const refreshToken = decryptSecret(conn.refreshToken);

    const res = await fetch("https://airtable.com/oauth2/v1/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${process.env.AIRTABLE_CLIENT_ID}:${process.env.AIRTABLE_CLIENT_SECRET}`).toString("base64")}`,
      },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
    };
  },

  async listImportable(conn: Connection): Promise<ImportCandidate[]> {
    const accessToken = decryptSecret(conn.accessToken);
    const data = await airtableFetch(accessToken, "/meta/bases");
    const candidates: ImportCandidate[] = [];

    for (const base of data.bases ?? []) {
      const tablesData = await airtableFetch(accessToken, `/meta/bases/${base.id}/tables`);
      for (const table of tablesData.tables ?? []) {
        candidates.push({
          externalId: `${base.id}::${table.id}`,
          externalType: "table",
          title: `${base.name} / ${table.name}`,
          description: `Airtable table in base "${base.name}"`,
        });
      }
    }

    return candidates;
  },

  async fetchItem(conn: Connection, externalId: string, _externalType: string): Promise<FetchedContent> {
    const accessToken = decryptSecret(conn.accessToken);
    const [baseId, tableId] = externalId.split("::");

    const data = await airtableFetch(accessToken, `/${baseId}/${tableId}?maxRecords=200`);
    const records = (data.records ?? []).map((r: any) => {
      const firstTextField = Object.values(r.fields as Record<string, unknown>).find(
        (v) => typeof v === "string"
      ) as string | undefined;
      return { title: firstTextField ?? "Untitled", fields: r.fields, id: r.id };
    });

    const contentHash = createHash("sha256")
      .update(JSON.stringify(records.map((r: any) => r.id)))
      .digest("hex");

    // Get table name from meta
    const tableMeta = await airtableFetch(accessToken, `/meta/bases/${baseId}/tables`);
    const table = tableMeta.tables?.find((t: any) => t.id === tableId);

    return {
      externalId,
      externalType: "table",
      title: table?.name ?? "Airtable Table",
      markdown: "",
      records,
      contentHash,
    };
  },
};

export default airtableAdapter;
