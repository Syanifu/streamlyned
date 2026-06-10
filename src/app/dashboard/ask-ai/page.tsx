import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import SuperAdminAiConsole from "@/components/super-admin-ai-console";

export default async function AskAiPage() {
  const session = await getSession();

  if (!session) {
    redirect("/");
  }

  if (session.role !== "super_admin") {
    redirect("/dashboard");
  }

  return (
    <div className="flex-1 flex flex-col space-y-6 min-h-0">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-800 dark:text-neutral-100">
          Super Admin AI Console
        </h1>
        <p className="text-xs text-neutral-400 mt-1">
          Ask questions about active projects, overdue tasks, team members, and overall operations.
        </p>
      </div>

      <SuperAdminAiConsole />
    </div>
  );
}
