import { NextResponse } from "next/server";

/** @deprecated Redirects to /api/integrations/google/callback — preserves old Google OAuth redirect URIs */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const qs = searchParams.toString();
  return NextResponse.redirect(`${base}/api/integrations/google/callback${qs ? `?${qs}` : ""}`);
}
