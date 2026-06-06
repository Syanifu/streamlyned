import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import ProfileView from "@/components/profile-view";

export default async function ProfilePage() {
  const session = await getSession();

  if (!session) {
    redirect("/");
  }

  return (
    <ProfileView
      currentUser={session.user}
      role={session.role}
      workspaceName={session.workspace.name}
    />
  );
}
