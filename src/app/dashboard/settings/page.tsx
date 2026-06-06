import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import SettingsView from "@/components/settings-view";

export default async function SettingsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/");
  }

  // Authorisation boundary: Only OWNER or ADMIN can open settings
  if (session.role !== "OWNER" && session.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // 1. Fetch AI Gateway configurations
  const aiSettings = await db.aiSettings.findUnique({
    where: { workspaceId: session.workspace.id },
  });

  // 2. Fetch all members belonging to this workspace
  const members = await db.workspaceMember.findMany({
    where: { workspaceId: session.workspace.id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { role: "asc" },
  });

  return (
    <SettingsView
      initialSettings={
        aiSettings
          ? {
              provider: aiSettings.provider,
              apiKey: aiSettings.apiKey,
              completionModel: aiSettings.completionModel,
              embeddingsModel: aiSettings.embeddingsModel,
            }
          : null
      }
      members={members}
    />
  );
}
