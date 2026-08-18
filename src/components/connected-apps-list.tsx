"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { disconnectIntegrationAction } from "@/app/actions/integrations";
import { Plug, Upload } from "lucide-react";

interface IntegrationStatus {
  connected: boolean;
  accountName: string | null;
  lastSyncedAt: string | null;
}

interface ConnectedAppsProps {
  role: string;
  integrations: {
    google: IntegrationStatus;
    notion: IntegrationStatus;
    airtable: IntegrationStatus;
    obsidian: IntegrationStatus;
    evernote: IntegrationStatus;
  };
}

const INTEGRATIONS = [
  {
    key: "google" as const,
    name: "Google",
    description: "Sync Calendar events and import Drive documents",
    type: "oauth" as const,
    icon: (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    ),
  },
  {
    key: "notion" as const,
    name: "Notion",
    description: "Import pages and databases from your Notion workspace",
    type: "oauth" as const,
    icon: (
      <div className="w-5 h-5 bg-neutral-900 dark:bg-white rounded flex items-center justify-center shrink-0">
        <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none">
          <path d="M2.5 2h6l4 4v8h-10V2z" fill="white" className="dark:fill-neutral-900"/>
          <path d="M8.5 2v4h4" stroke="white" strokeWidth="1" className="dark:stroke-neutral-900" fill="none"/>
        </svg>
      </div>
    ),
  },
  {
    key: "airtable" as const,
    name: "Airtable",
    description: "Import bases and tables as projects and tasks",
    type: "oauth" as const,
    icon: (
      <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 bg-[#FCB400]">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="white">
          <path d="M11.5 2.5L2 7l9.5 4.5L21 7 11.5 2.5zM2 11l9.5 4.5L21 11M2 15l9.5 4.5L21 15"/>
        </svg>
      </div>
    ),
  },
  {
    key: "obsidian" as const,
    name: "Obsidian",
    description: "Upload your vault or markdown files to import notes",
    type: "file" as const,
    icon: (
      <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 bg-[#7C3AED]">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="white">
          <path d="M12 2L4 8l2 12h12L20 8 12 2zm0 3l5 4-1 8H8L7 9l5-4z"/>
        </svg>
      </div>
    ),
  },
  {
    key: "evernote" as const,
    name: "Evernote",
    description: "Import notes and notebooks — pending API key approval",
    type: "disabled" as const,
    icon: (
      <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 bg-[#00A82D]">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="white">
          <path d="M8 2C5.8 2 4 3.8 4 6v12c0 2.2 1.8 4 4 4h8c2.2 0 4-1.8 4-4V9l-5-7H8zm0 2h6v5h5v9c0 1.1-.9 2-2 2H8c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        </svg>
      </div>
    ),
  },
] as const;

function Toggle({
  checked,
  onChange,
  disabled,
  loading,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled || loading}
      className={[
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none",
        checked
          ? "bg-neutral-900 dark:bg-white"
          : "bg-neutral-200 dark:bg-neutral-700",
        disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
        loading ? "opacity-60" : "",
      ].join(" ")}
    >
      <span
        className={[
          "inline-block h-3.5 w-3.5 rounded-full bg-white dark:bg-neutral-900 shadow transition-transform duration-200",
          checked ? "translate-x-[18px]" : "translate-x-[3px]",
        ].join(" ")}
      />
    </button>
  );
}

function IntegrationRow({
  integration,
  status,
  onDisconnect,
}: {
  integration: (typeof INTEGRATIONS)[number];
  status: IntegrationStatus;
  onDisconnect: (provider: string) => Promise<void>;
  role: string;
}) {
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isDisabled = integration.type === "disabled";

  const handleToggle = async () => {
    if (isDisabled || loading) return;

    if (status.connected) {
      setLoading(true);
      await onDisconnect(integration.key);
      setLoading(false);
    } else if (integration.type === "file") {
      fileRef.current?.click();
    } else {
      window.location.href = `/api/integrations/${integration.key}/auth`;
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/integrations/obsidian/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.json()).error ?? "Upload failed");
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={[
      "flex items-center justify-between py-3 px-4 rounded-xl border transition-colors",
      status.connected
        ? "border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/40"
        : "border-border-custom bg-surface/50",
      isDisabled ? "opacity-60" : "",
    ].join(" ")}>
      <div className="flex items-center gap-3 min-w-0">
        {integration.icon}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              {integration.name}
            </p>
            {status.connected && (
              <span className="text-[9px] font-semibold bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-full leading-none">
                Connected
              </span>
            )}
            {isDisabled && (
              <span className="text-[9px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-500 px-1.5 py-0.5 rounded-full leading-none">
                Coming soon
              </span>
            )}
          </div>
          <p className="text-[10px] text-neutral-400 truncate mt-0.5">
            {status.connected && status.accountName
              ? status.accountName
              : integration.description}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 ml-4 shrink-0">
        {integration.type === "file" && !status.connected && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".md,.txt,.zip"
              className="hidden"
              onChange={handleFileChange}
            />
            <span className="text-[9px] text-neutral-400 flex items-center gap-0.5">
              <Upload size={9} /> .md / .txt
            </span>
          </>
        )}
        <Toggle
          checked={status.connected}
          onChange={handleToggle}
          disabled={isDisabled}
          loading={loading}
        />
      </div>
    </div>
  );
}

export default function ConnectedAppsList({ role, integrations }: ConnectedAppsProps) {
  const router = useRouter();

  const handleDisconnect = async (provider: string) => {
    const res = await disconnectIntegrationAction(provider);
    if (res.success) router.refresh();
    else alert(res.error ?? "Failed to disconnect");
  };

  return (
    <div className="bg-surface border border-border-custom rounded-3xl p-6 space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-border-custom">
        <Plug size={18} className="text-neutral-400" />
        <div>
          <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
            Connected Apps &amp; Workspaces
          </h3>
          <p className="text-[10px] text-neutral-400 mt-0.5">
            Toggle integrations below to connect or disconnect external productivity, note-taking, or database systems.
          </p>
        </div>
      </div>

      <div className="space-y-2 pt-2">
        {INTEGRATIONS.map((integration) => (
          <IntegrationRow
            key={integration.key}
            integration={integration}
            status={integrations[integration.key as keyof typeof integrations] ?? { connected: false, accountName: null, lastSyncedAt: null }}
            onDisconnect={handleDisconnect}
            role={role}
          />
        ))}
      </div>
    </div>
  );
}
