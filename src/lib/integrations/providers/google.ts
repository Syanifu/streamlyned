import "server-only";
import { google } from "googleapis";
import { createHash } from "crypto";
import type { ProviderAdapter, TokenSet, CallbackCtx, ImportCandidate, FetchedContent } from "../adapter";
import type { Connection } from "@prisma/client";
import { decryptSecret } from "@/lib/crypto";

const REDIRECT_URI = `${process.env.NEXT_PUBLIC_SITE_URL}/api/integrations/google/callback`;

function makeClient(accessToken: string, refreshToken?: string) {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
  );
  client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  return client;
}

const googleAdapter: ProviderAdapter = {
  key: "google",

  async getAuthUrl(state: string, scopes?: string[]): Promise<string> {
    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      REDIRECT_URI
    );
    return client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      state,
      scope: scopes ?? [
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
      ],
    });
  },

  async exchangeCode(code: string, _ctx: CallbackCtx): Promise<TokenSet> {
    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      REDIRECT_URI
    );
    const { tokens } = await client.getToken(code);

    // Get user email for account identification
    client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const { data: userInfo } = await oauth2.userinfo.get();

    return {
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token ?? undefined,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      scopes: tokens.scope?.split(" "),
      externalAccountId: userInfo.id ?? undefined,
      externalAccountName: userInfo.email ?? undefined,
    };
  },

  async refresh(conn: Connection): Promise<TokenSet | null> {
    if (!conn.refreshToken) return null;
    const refreshToken = decryptSecret(conn.refreshToken);
    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      REDIRECT_URI
    );
    client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await client.refreshAccessToken();
    return {
      accessToken: credentials.access_token!,
      refreshToken: credentials.refresh_token ?? undefined,
      expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : undefined,
    };
  },

  async listImportable(conn: Connection): Promise<ImportCandidate[]> {
    // Google Drive file listing — only files the user previously picked (drive.file scope)
    const accessToken = decryptSecret(conn.accessToken);
    const refreshToken = conn.refreshToken ? decryptSecret(conn.refreshToken) : undefined;
    const auth = makeClient(accessToken, refreshToken);

    const drive = google.drive({ version: "v3", auth });
    const res = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.document' and trashed=false",
      fields: "files(id,name,modifiedTime)",
      pageSize: 50,
    });

    return (res.data.files ?? []).map((f) => ({
      externalId: f.id!,
      externalType: "doc",
      title: f.name ?? "Untitled",
      contentHash: f.modifiedTime ?? undefined,
    }));
  },

  async fetchItem(conn: Connection, externalId: string, _externalType: string): Promise<FetchedContent> {
    const accessToken = decryptSecret(conn.accessToken);
    const refreshToken = conn.refreshToken ? decryptSecret(conn.refreshToken) : undefined;
    const auth = makeClient(accessToken, refreshToken);

    const drive = google.drive({ version: "v3", auth });
    // Export Google Doc as plain text (markdown not available, plain text is closest)
    const res = await drive.files.export(
      { fileId: externalId, mimeType: "text/plain" },
      { responseType: "text" }
    );

    const text = (res.data as string) ?? "";
    const contentHash = createHash("sha256").update(text).digest("hex");

    // Get file name
    const meta = await drive.files.get({ fileId: externalId, fields: "name" });

    return {
      externalId,
      externalType: "doc",
      title: meta.data.name ?? "Untitled",
      markdown: text,
      contentHash,
    };
  },
};

export default googleAdapter;
