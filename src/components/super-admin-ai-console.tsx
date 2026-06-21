"use client";

import React, { useState } from "react";
import AskAiView from "./ask-ai-view";
import AiConfigPanel from "./ai-config-panel";
import { Terminal, Settings } from "lucide-react";

export default function SuperAdminAiConsole() {
  const [activeTab, setActiveTab] = useState<"console" | "config">("console");

  return (
    <div className="flex-1 flex flex-col space-y-6 min-h-0">
      {/* Tab Controls */}
      <div className="flex border-b border-border-custom shrink-0">
        <button
          onClick={() => setActiveTab("console")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all select-none ${
            activeTab === "console"
              ? "border-neutral-800 text-neutral-800 dark:border-neutral-200 dark:text-neutral-200"
              : "border-transparent text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
          }`}
        >
          <Terminal size={14} />
          <span>Operational Console</span>
        </button>

        <button
          onClick={() => setActiveTab("config")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all select-none ${
            activeTab === "config"
              ? "border-neutral-800 text-neutral-800 dark:border-neutral-200 dark:text-neutral-200"
              : "border-transparent text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
          }`}
        >
          <Settings size={14} />
          <span>Agent Settings</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0">
        {activeTab === "console" ? (
          <AskAiView />
        ) : (
          <div className="max-w-4xl mx-auto">
            <AiConfigPanel />
          </div>
        )}
      </div>
    </div>
  );
}
