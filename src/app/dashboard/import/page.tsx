import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import ImportWizardWrapper from "@/components/import-wizard-wrapper";

export default async function ImportPage() {
  const session = await getSession();

  if (!session) redirect("/");
  if (session.role !== "OWNER" && session.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-10 sm:py-16">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Workspace Integrations &amp; Imports
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Bring your project spaces, team collaboration tasks, or accounts ledger information from Basecamp, QuickBooks, and Tally ERP directly into Streamlyned.
          </p>
        </div>

        <ImportWizardWrapper />
      </div>
    </div>
  );
}
