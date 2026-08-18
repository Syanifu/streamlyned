import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import ImportWizardWrapper from "@/components/import-wizard-wrapper";

export default async function ImportPage() {
  const session = await getSession();

  if (!session) redirect("/");
  if (session.role !== "OWNER" && session.role !== "ADMIN") redirect("/dashboard");

  const [googleConn, notionConn, airtableConn, obsidianConn, evernoteConn] = await Promise.all([
    db.connection.findFirst({
      where: { provider: "google", userId: session.user.id, status: "active" },
    }),
    db.connection.findFirst({
      where: { provider: "notion", workspaceId: session.workspace.id, status: "active" },
    }),
    db.connection.findFirst({
      where: { provider: "airtable", workspaceId: session.workspace.id, status: "active" },
    }),
    db.connection.findFirst({
      where: { provider: "obsidian", userId: session.user.id, status: "active" },
    }),
    db.connection.findFirst({
      where: { provider: "evernote", userId: session.user.id, status: "active" },
    }),
  ]);

  const integrations = {
    google: {
      connected: !!googleConn,
      accountName: googleConn?.externalAccountName ?? null,
      lastSyncedAt: googleConn?.lastSyncedAt?.toISOString() ?? null,
    },
    notion: {
      connected: !!notionConn,
      accountName: notionConn?.externalAccountName ?? null,
      lastSyncedAt: notionConn?.lastSyncedAt?.toISOString() ?? null,
    },
    airtable: {
      connected: !!airtableConn,
      accountName: airtableConn?.externalAccountName ?? null,
      lastSyncedAt: airtableConn?.lastSyncedAt?.toISOString() ?? null,
    },
    obsidian: {
      connected: !!obsidianConn,
      accountName: obsidianConn?.externalAccountName ?? null,
      lastSyncedAt: obsidianConn?.lastSyncedAt?.toISOString() ?? null,
    },
    evernote: {
      connected: !!evernoteConn,
      accountName: evernoteConn?.externalAccountName ?? null,
      lastSyncedAt: evernoteConn?.lastSyncedAt?.toISOString() ?? null,
    },
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-10 sm:py-16">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Workspace Data &amp; Integration
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Bring your project spaces, team collaboration tasks, or accounts ledger information from Basecamp, QuickBooks, and Tally ERP directly into Streamlyned.
          </p>
        </div>

        <ImportWizardWrapper role={session.role} integrations={integrations} />
      </div>
    </div>
  );
}
