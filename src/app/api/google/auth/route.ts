import { NextResponse } from "next/server";

/** @deprecated Redirects to /api/integrations/google/auth */
export async function GET() {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return NextResponse.redirect(`${base}/api/integrations/google/auth`);
}
