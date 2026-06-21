import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Client } from "@notionhq/client";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const connection = await db.notionConnection.findUnique({
    where: { workspaceId: session.workspace.id },
  });
  if (!connection) return NextResponse.json({ error: "Notion not connected" }, { status: 400 });

  const notion = new Client({ auth: connection.accessToken });

  const [pagesRes, dbRes] = await Promise.all([
    notion.search({ filter: { value: "page", property: "object" }, page_size: 50 }),
    notion.search({ filter: { value: "data_source", property: "object" }, page_size: 50 }),
  ]);

  const pages = pagesRes.results.map((p: any) => ({
    id: p.id,
    type: "page" as const,
    title: p.properties?.title?.title?.[0]?.plain_text || p.properties?.Name?.title?.[0]?.plain_text || "Untitled",
    url: p.url,
  }));

  const databases = dbRes.results.map((d: any) => ({
    id: d.id,
    type: "database" as const,
    title: d.title?.[0]?.plain_text || "Untitled Database",
    url: d.url,
  }));

  return NextResponse.json({ pages, databases });
}
