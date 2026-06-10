import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { setSession } from "@/lib/auth";
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
    let targetWorkspaceSlug = "";
    const firstMembership = await db.workspaceMember.findFirst({
      where: { userId: user.id },
      include: { workspace: true },
    });

    if (firstMembership) {
      // Existing user -> log into their first active workspace
      targetWorkspaceSlug = firstMembership.workspace.slug;
    } else {
      // New user signup -> automatically create and seed a default workspace!
      const baseSlug = email.split("@")[0].toLowerCase().replace(/[^a-z0-9-]/g, "-");
      
      // Ensure slug uniqueness
      let uniqueSlug = baseSlug;
      let counter = 1;
      while (await db.workspace.findUnique({ where: { slug: uniqueSlug } })) {
        uniqueSlug = `${baseSlug}-${counter}`;
        counter++;
      }

      const workspaceName = `${formattedName}'s Workspace`;
      
      // Create Workspace
      const workspace = await db.workspace.create({
        data: {
          name: workspaceName,
          slug: uniqueSlug,
        },
      });

      targetWorkspaceSlug = uniqueSlug;

      // Create OWNER membership for the user
      await db.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          role: "OWNER",
        },
      });

      // Seed default Project
      const project = await db.project.create({
        data: {
          workspaceId: workspace.id,
          name: "First Project",
          description: "Welcome to your new workspace! Here is your first project.",
          tools: JSON.stringify(["tasks", "discussions", "chat", "docs", "calendar"]),
        },
      });

      // Add user to project
      await db.projectMember.create({
        data: {
          projectId: project.id,
          userId: user.id,
          visibleTools: JSON.stringify(["tasks", "discussions", "chat", "docs", "calendar"]),
        },
      });

      // Add default Task List
      const list = await db.taskList.create({
        data: {
          projectId: project.id,
          name: "General Tasks",
          position: 1000,
        },
      });

      // Add default Task
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

      // Create default AI Settings
      await db.aiSettings.create({
        data: {
          workspaceId: workspace.id,
          provider: "openai",
        },
      });

      // Log the action
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
    }

    // 3. Establish Streamlyned active cookies session
    await setSession(email, targetWorkspaceSlug);

    // 4. Redirect to dashboard
    return NextResponse.redirect(`${origin}/dashboard`);
  } catch (err: any) {
    console.error("Auth Callback GET Error:", err);
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    return NextResponse.redirect(`${protocol}://${host}/?error=InternalCallbackError`);
  }
}
