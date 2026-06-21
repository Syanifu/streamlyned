import "server-only";
import { Client } from "@notionhq/client";
import { createHash } from "crypto";
import type { ProviderAdapter, TokenSet, CallbackCtx, ImportCandidate, FetchedContent } from "../adapter";
import type { Connection } from "@prisma/client";
import { decryptSecret } from "@/lib/crypto";

const REDIRECT_URI = `${process.env.NEXT_PUBLIC_SITE_URL}/api/integrations/notion/callback`;

function blocksToMarkdown(blocks: any[]): string {
  return blocks
    .map((block) => {
      const type = block.type;
      const rich = (arr: any[]) => arr?.map((t: any) => t.plain_text).join("") ?? "";
      switch (type) {
        case "heading_1": return `# ${rich(block.heading_1.rich_text)}`;
        case "heading_2": return `## ${rich(block.heading_2.rich_text)}`;
        case "heading_3": return `### ${rich(block.heading_3.rich_text)}`;
        case "paragraph": return rich(block.paragraph.rich_text);
        case "bulleted_list_item": return `- ${rich(block.bulleted_list_item.rich_text)}`;
        case "numbered_list_item": return `1. ${rich(block.numbered_list_item.rich_text)}`;
        case "to_do": return `- [${block.to_do.checked ? "x" : " "}] ${rich(block.to_do.rich_text)}`;
        case "quote": return `> ${rich(block.quote.rich_text)}`;
        case "code": return `\`\`\`\n${rich(block.code.rich_text)}\n\`\`\``;
        case "divider": return "---";
        default: return "";
      }
    })
    .filter(Boolean)
    .join("\n\n");
}

const notionAdapter: ProviderAdapter = {
  key: "notion",

  async getAuthUrl(state: string): Promise<string> {
    const params = new URLSearchParams({
      client_id: process.env.NOTION_CLIENT_ID!,
      response_type: "code",
      owner: "user",
      redirect_uri: REDIRECT_URI,
      state,
    });
    return `https://api.notion.com/v1/oauth/authorize?${params}`;
  },

  async exchangeCode(code: string, _ctx: CallbackCtx): Promise<TokenSet> {
    const credentials = Buffer.from(
      `${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`
    ).toString("base64");

    const res = await fetch("https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ grant_type: "authorization_code", code, redirect_uri: REDIRECT_URI }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Notion token exchange failed: ${err}`);
    }

    const data = await res.json();
    return {
      accessToken: data.access_token,
      externalAccountId: data.bot_id,
      externalAccountName: data.workspace_name,
      metadata: {
        botId: data.bot_id,
        workspaceName: data.workspace_name,
        workspaceIcon: data.workspace_icon,
      },
    };
  },

  async listImportable(conn: Connection): Promise<ImportCandidate[]> {
    const notion = new Client({ auth: decryptSecret(conn.accessToken) });

    const [pagesRes, dbRes] = await Promise.all([
      notion.search({ filter: { value: "page", property: "object" }, page_size: 50 }),
      notion.search({ filter: { value: "data_source", property: "object" }, page_size: 50 }),
    ]);

    const pages: ImportCandidate[] = pagesRes.results.map((p: any) => ({
      externalId: p.id,
      externalType: "page",
      title:
        p.properties?.title?.title?.[0]?.plain_text ||
        p.properties?.Name?.title?.[0]?.plain_text ||
        "Untitled",
    }));

    const databases: ImportCandidate[] = dbRes.results.map((d: any) => ({
      externalId: d.id,
      externalType: "database",
      title: d.title?.[0]?.plain_text || "Untitled Database",
    }));

    return [...pages, ...databases];
  },

  async fetchItem(conn: Connection, externalId: string, externalType: string): Promise<FetchedContent> {
    const notion = new Client({ auth: decryptSecret(conn.accessToken) });

    if (externalType === "page") {
      const blocksRes = await notion.blocks.children.list({ block_id: externalId, page_size: 100 });
      const markdown = blocksToMarkdown(blocksRes.results as any[]);
      const contentHash = createHash("sha256").update(markdown).digest("hex");
      const page = await notion.pages.retrieve({ page_id: externalId }) as any;
      const title =
        page.properties?.title?.title?.[0]?.plain_text ||
        page.properties?.Name?.title?.[0]?.plain_text ||
        "Untitled";

      return { externalId, externalType, title, markdown, contentHash };
    }

    // database → records
    const dbRows = await (notion as any).dataSources.query({ data_source_id: externalId, page_size: 100 });
    const records = (dbRows.results as any[]).map((row: any) => {
      const nameProp = Object.values(row.properties as Record<string, any>).find(
        (p: any) => p.type === "title"
      );
      return { title: nameProp?.title?.[0]?.plain_text || "Untitled" };
    });

    const contentHash = createHash("sha256")
      .update(JSON.stringify(records.map((r) => r.title)))
      .digest("hex");

    return {
      externalId,
      externalType,
      title: "Database",
      markdown: "",
      records,
      contentHash,
    };
  },
};

export default notionAdapter;
