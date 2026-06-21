import { getPendingOnboardingEmail } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import OnboardingView from "@/components/onboarding-view";

export default async function OnboardingPage() {
  const email = await getPendingOnboardingEmail();
  if (!email) redirect("/");

  const user = await db.user.findUnique({
    where: { email },
    include: {
      memberships: {
        include: { workspace: true },
      },
    },
  });

  if (!user) redirect("/");

  const memberships = user.memberships.map((m) => ({
    id: m.id,
    workspaceName: m.workspace.name,
    workspaceSlug: m.workspace.slug,
    role: m.role,
  }));

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-4">
      <OnboardingView
        memberships={memberships}
        userEmail={email}
        userName={user.name}
      />
    </div>
  );
}
