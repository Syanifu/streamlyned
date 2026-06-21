import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getAdapter } from "@/lib/integrations/registry";
import { randomBytes } from "crypto";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    await requireSession();
    const { provider } = await params;
    const adapter = await getAdapter(provider);

    const state = randomBytes(16).toString("hex");
    const url = await adapter.getAuthUrl(state);

    if (!url) {
      return NextResponse.json(
        { error: `${provider} uses file-based import, not OAuth. Use the upload endpoint.` },
        { status: 400 }
      );
    }

    return NextResponse.redirect(url);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.message === "Unauthorized" ? 401 : 500 });
  }
}
