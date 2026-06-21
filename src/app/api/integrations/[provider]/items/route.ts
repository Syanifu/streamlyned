import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getAdapter, getProviderConfig } from "@/lib/integrations/registry";
import { getConnection } from "@/lib/dal/connections";
import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import type { Ctx } from "@/lib/dal/context";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const session = await requireSession();
    const { provider } = await params;

    const config = getProviderConfig(provider);
    const ctx: Ctx = { userId: session.user.id, workspaceId: session.workspace.id, role: session.role };
    const conn = await getConnection(ctx, provider as any, config.ownerType);

    if (!conn) {
      return NextResponse.json({ error: `${provider} not connected` }, { status: 400 });
    }

    // Pass a raw connection with decrypted token to the adapter
    const rawConn = { ...conn, accessToken: conn.accessToken }; // already encrypted form for adapter interface
    // The adapter's listImportable decrypts itself via decryptSecret(conn.accessToken)
    const adapter = await getAdapter(provider);
    const items = await adapter.listImportable(rawConn);

    return NextResponse.json({ items });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.message === "Unauthorized" ? 401 : 500 });
  }
}
