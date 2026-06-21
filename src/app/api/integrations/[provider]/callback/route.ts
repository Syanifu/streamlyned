import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getAdapter, getProviderConfig } from "@/lib/integrations/registry";
import { upsertConnection } from "@/lib/dal/connections";
import type { Ctx } from "@/lib/dal/context";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { origin } = new URL(request.url);

  try {
    const session = await requireSession();
    const { provider } = await params;

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error || !code) {
      return NextResponse.redirect(`${origin}/dashboard/settings?error=${encodeURIComponent(error ?? "cancelled")}`);
    }

    const adapter = await getAdapter(provider);
    const config = getProviderConfig(provider);

    const ctx: CallbackCtx = { userId: session.user.id, workspaceId: session.workspace.id };
    const tokens = await adapter.exchangeCode(code, ctx);

    if (!tokens) {
      return NextResponse.redirect(`${origin}/dashboard/settings?error=exchange_failed`);
    }

    const dalCtx: Ctx = { userId: session.user.id, workspaceId: session.workspace.id, role: session.role };
    await upsertConnection(dalCtx, provider as any, config.ownerType, tokens);

    return NextResponse.redirect(
      `${origin}/dashboard/settings?${provider}=connected`
    );
  } catch (err: any) {
    console.error(`[${(await params).provider} callback]`, err);
    return NextResponse.redirect(`${origin}/dashboard/settings?error=internal`);
  }
}

interface CallbackCtx {
  userId: string;
  workspaceId: string;
}
