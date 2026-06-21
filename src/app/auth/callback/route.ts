import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { setSession, setOnboardedCookie, setPendingOnboardingEmail } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      console.error("Auth Callback: Missing authorization code");
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

    // Exchange auth code for active Supabase session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error("Auth Callback: Session exchange failed:", error.message);
      return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(error.message)}`);
    }

    const email = data?.user?.email;
    if (!email) {
      console.error("Auth Callback: No email found in user metadata");
      return NextResponse.redirect(`${origin}/?error=NoEmail`);
    }

    // 1. Find or create User in Prisma
    let user = await db.user.findUnique({ where: { email } });
    const metadata = data.user.user_metadata || {};
    const fullName = metadata.full_name || metadata.name || email.split("@")[0];
    const formattedName = fullName.charAt(0).toUpperCase() + fullName.slice(1);

    if (!user) {
      user = await db.user.create({
        data: {
          email,
          name: formattedName,
          avatarUrl: metadata.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${email.split("@")[0]}`,
        },
      });
    }

    // 2. Resolve Workspace membership
    const memberships = await db.workspaceMember.findMany({
      where: { userId: user.id },
      include: { workspace: true },
    });

    // Check if THIS user has already completed onboarding on this browser
    const isOnboarded = cookieStore.get("streamlyned_onboarded")?.value === user.id;
    const ownerMembership = memberships.find((m) => m.role === "OWNER");

    if (memberships.length === 0) {
      // Brand-new user with no memberships → auto-create workspace
      const baseSlug = email.split("@")[0].toLowerCase().replace(/[^a-z0-9-]/g, "-");
      let uniqueSlug = baseSlug;
      let counter = 1;
      while (await db.workspace.findUnique({ where: { slug: uniqueSlug } })) {
        uniqueSlug = `${baseSlug}-${counter}`;
        counter++;
      }

      const workspaceName = `${formattedName}'s Workspace`;
      const workspace = await db.workspace.create({
        data: { name: workspaceName, slug: uniqueSlug },
      });

      await db.workspaceMember.create({
        data: { workspaceId: workspace.id, userId: user.id, role: "OWNER" },
      });

      const project = await db.project.create({
        data: {
          workspaceId: workspace.id,
          name: "First Project",
          description: "Welcome to your new workspace! Here is your first project.",
          tools: JSON.stringify(["tasks", "discussions", "chat", "docs", "calendar"]),
        },
      });

      await db.projectMember.create({
        data: {
          projectId: project.id,
          userId: user.id,
          visibleTools: JSON.stringify(["tasks", "discussions", "chat", "docs", "calendar"]),
        },
      });

      const list = await db.taskList.create({
        data: { projectId: project.id, name: "General Tasks", position: 1000 },
      });

      await db.task.create({
        data: {
          workspaceId: workspace.id,
          taskListId: list.id,
          projectId: project.id,
          title: "Explore Streamlyned features",
          notes: "Welcome! Toggle between roles using the developer banner below, and test discussions, chat, documents, and search.",
          position: 1000,
        },
      });

      await db.aiSettings.create({
        data: { workspaceId: workspace.id, provider: "openai" },
      });

      await db.auditLog.create({
        data: {
          workspaceId: workspace.id,
          entityType: "WORKSPACE",
          entityId: workspace.id,
          userId: user.id,
          action: "CREATE",
          description: `Created workspace ${workspaceName} via passwordless signup`,
        },
      });

      await setSession(user.id, workspace.id);
      await setOnboardedCookie(user.id);
      return NextResponse.redirect(`${origin}/dashboard`);
    }

    if (isOnboarded || ownerMembership) {
      // Returning user or workspace owner → auto-login to their owned workspace (or first)
      const target = ownerMembership || memberships[0];
      await setSession(user.id, target.workspaceId);
      await setOnboardedCookie(user.id);
      return NextResponse.redirect(`${origin}/dashboard`);
    }

    // Invited user who hasn't onboarded yet → ask them to join or create
    await setPendingOnboardingEmail(email);
    return NextResponse.redirect(`${origin}/onboarding`);
  } catch (err: any) {
    console.error("Auth Callback GET Error:", err);
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    return NextResponse.redirect(`${protocol}://${host}/?error=InternalCallbackError`);
  }
}
