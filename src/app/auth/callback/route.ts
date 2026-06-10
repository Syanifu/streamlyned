import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { setSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const workspaceSlug = searchParams.get("slug") || "";

    if (!code) {
      console.error("Auth Callback: Missing OAuth authorization code");
      return NextResponse.redirect(`${origin}/?error=MissingCode`);
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key",
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    // Exchange authentication code for active Supabase session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error("Auth Callback: Session exchange failed:", error.message);
      return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(error.message)}`);
    }

    const email = data?.user?.email;
    if (!email) {
      console.error("Auth Callback: No email found in Google OAuth response");
      return NextResponse.redirect(`${origin}/?error=NoEmail`);
    }

    // 1. Sync User into the local Prisma database
    let user = await db.user.findUnique({ where: { email } });
    if (!user) {
      const metadata = data.user.user_metadata || {};
      const fullName = metadata.full_name || metadata.name || email.split("@")[0];
      const formattedName = fullName.charAt(0).toUpperCase() + fullName.slice(1);
      
      user = await db.user.create({
        data: {
          email,
          name: formattedName,
          avatarUrl: metadata.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${email.split("@")[0]}`,
        },
      });
    }

    // 2. Resolve Workspace from slug
    // If slug is missing, find user's first workspace membership or default to "first-workspace"
    let targetSlug = workspaceSlug.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-");
    
    if (!targetSlug) {
      const firstMembership = await db.workspaceMember.findFirst({
        where: { userId: user.id },
        include: { workspace: true },
      });
      if (firstMembership) {
        targetSlug = firstMembership.workspace.slug;
      } else {
        // Fallback or request signup slug
        targetSlug = "general-workspace";
      }
    }

    // 3. Pre-create the workspace if it does not exist (to ensure frictionless login)
    let workspace = await db.workspace.findUnique({ where: { slug: targetSlug } });
    if (!workspace) {
      workspace = await db.workspace.create({
        data: {
          name: targetSlug.split("-").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" "),
          slug: targetSlug,
        },
      });
    }

    // 4. Create Workspace membership (default to OWNER if first member, else MEMBER)
    const membershipCount = await db.workspaceMember.count({
      where: { workspaceId: workspace.id },
    });
    const targetRole = membershipCount === 0 ? "OWNER" : "MEMBER";

    const membership = await db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
    });
    if (!membership) {
      await db.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          role: targetRole,
        },
      });
    }

    // 5. Establish Streamlyned active cookies session
    await setSession(email, targetSlug);

    // 6. Redirect safely to dashboard
    return NextResponse.redirect(`${origin}/dashboard`);
  } catch (err: any) {
    console.error("Auth Callback GET Error:", err);
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    return NextResponse.redirect(`${protocol}://${host}/?error=InternalCallbackError`);
  }
}
