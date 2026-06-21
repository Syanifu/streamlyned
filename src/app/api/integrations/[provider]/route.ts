import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getProviderConfig } from "@/lib/integrations/registry";
import { revokeConnection, getConnection } from "@/lib/dal/connections";
import type { Ctx } from "@/lib/dal/context";

/** GET — returns connection status for this provider. */
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

    return NextResponse.json({
      connected: !!conn,
      status: conn?.status ?? null,
      externalAccountName: conn?.externalAccountName ?? null,
      lastSyncedAt: conn?.lastSyncedAt ?? null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

/** DELETE — revokes the connection for this provider. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const session = await requireSession();
    const { provider } = await params;
    const config = getProviderConfig(provider);

    if (session.role === "CLIENT" || session.role === "MEMBER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ctx: Ctx = { userId: session.user.id, workspaceId: session.workspace.id, role: session.role };
    await revokeConnection(ctx, provider as any, config.ownerType);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.message === "Unauthorized" ? 401 : 500 });
  }
}
