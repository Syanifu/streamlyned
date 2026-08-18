"use client";

import { useState } from "react";
import BasecampImportWizard from "./basecamp-import-wizard";
import AccountingImportWizard from "./accounting-import-wizard";
import { FolderUp, Landmark } from "lucide-react";

export default function ImportWizardWrapper() {
  const [activeTab, setActiveTab] = useState<"basecamp" | "accounting">("basecamp");

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-border-custom flex gap-1">
        <button
          onClick={() => setActiveTab("basecamp")}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "basecamp"
              ? "border-neutral-900 text-neutral-900 dark:border-white dark:text-white"
              : "border-transparent text-neutral-400 hover:text-neutral-600"
          }`}
        >
          <FolderUp size={14} />
          Basecamp Projects
        </button>
        <button
          onClick={() => setActiveTab("accounting")}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "accounting"
              ? "border-neutral-900 text-neutral-900 dark:border-white dark:text-white"
              : "border-transparent text-neutral-400 hover:text-neutral-600"
          }`}
        >
          <Landmark size={14} />
          Accounting (QBO &amp; Tally)
        </button>
      </div>

      <div className="animate-in fade-in duration-200">
        {activeTab === "basecamp" && <BasecampImportWizard />}
        {activeTab === "accounting" && <AccountingImportWizard />}
      </div>
    </div>
  );
}
