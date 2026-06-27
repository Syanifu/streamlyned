"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfileAction } from "@/app/actions/profile";
import { logoutAction } from "@/app/actions/auth";
import { disconnectIntegrationAction } from "@/app/actions/integrations";
import { Mail, Shield, Check, Save, LogOut, Plug, Upload, HardDrive, Download } from "lucide-react";
import Link from "next/link";

interface IntegrationStatus {
  connected: boolean;
  accountName: string | null;
  lastSyncedAt: string | null;
}

interface ProfileViewProps {
  currentUser: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    coverUrl: string | null;
    planTier: string;
  };
  googleAvatarUrl: string | null;
  storageUsedBytes: number;
  storageLimitBytes: number;
  role: string;
  workspaceName: string;
  integrations: {
    google: IntegrationStatus;
    notion: IntegrationStatus;
    airtable: IntegrationStatus;
    obsidian: IntegrationStatus;
    evernote: IntegrationStatus;
  };
}

// ── Integration definitions ───────────────────────────────────────────────────

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
  {
    key: "basecamp" as const,
    name: "Basecamp",
    description: "Import projects, tasks, messages, and docs from Basecamp 3",
    type: "import" as const,
    href: "/dashboard/import",
    icon: (
      <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 bg-[#F0423F]">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="white">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
        </svg>
      </div>
    ),
  },
] as const;

// ── Toggle switch ─────────────────────────────────────────────────────────────

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

// ── Integration row ───────────────────────────────────────────────────────────

function IntegrationRow({
  integration,
  status,
  onDisconnect,
  role,
}: {
  integration: (typeof INTEGRATIONS)[number];
  status: IntegrationStatus;
  onDisconnect: (provider: string) => Promise<void>;
  role: string;
}) {
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isDisabled = integration.type === "disabled";
  const isImport = integration.type === "import";

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
      {/* Left: icon + text */}
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

      {/* Right: toggle / import button / upload hint */}
      <div className="flex items-center gap-2 ml-4 shrink-0">
        {isImport ? (
          (role === "OWNER" || role === "ADMIN") ? (
            <Link
              href={"href" in integration ? integration.href : "/dashboard/import"}
              className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border border-border-custom hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300"
            >
              <Download size={10} />
              Import
            </Link>
          ) : (
            <span className="text-[9px] text-neutral-400">Owner only</span>
          )
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ProfileView({
  currentUser,
  googleAvatarUrl,
  storageUsedBytes,
  storageLimitBytes,
  role,
  workspaceName,
  integrations,
}: ProfileViewProps) {
  const router = useRouter();
  const [name, setName] = useState(currentUser.name);
  // Fall back to Google photo → name-seeded Dicebear
  const defaultAvatar =
    googleAvatarUrl ||
    `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(currentUser.name)}`;
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || defaultAvatar);
  const [coverUrl, setCoverUrl] = useState(currentUser.coverUrl || "");
  const [planTier, setPlanTier] = useState(currentUser.planTier || "standard");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const avatarPresets = [
    { name: "Olivia", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=olivia" },
    { name: "Alex", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=alex" },
    { name: "Marcus", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=marcus" },
    { name: "Catherine", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=catherine" },
    { name: "Sophie", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=sophie" },
    { name: "Leo", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=leo" },
    { name: "Kai", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=kai" },
    { name: "Elena", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=elena" },
  ];

  const coverPresets = [
    { name: "Nordic Dusk", url: "https://images.unsplash.com/photo-1604076913837-52ab5629fba9?w=1200&auto=format&fit=crop&q=60" },
    { name: "Minimal Warm", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=60" },
    { name: "Sunset Glow", url: "https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&auto=format&fit=crop&q=60" },
    { name: "Ocean Breeze", url: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&auto=format&fit=crop&q=60" },
    { name: "Forest Calm", url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=60" },
  ];

  const handleSave = async (e: React.BaseSyntheticEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    const res = await updateProfileAction({ name, avatarUrl, coverUrl, planTier });
    if (res.success) {
      setSuccess(true);
      router.refresh();
      setTimeout(() => {
        setSuccess(false);
        window.location.reload();
      }, 800);
    } else {
      setError(res.error || "Failed to update profile.");
    }
    setIsSaving(false);
  };

  const handleDisconnect = async (provider: string) => {
    const res = await disconnectIntegrationAction(provider);
    if (res.success) router.refresh();
    else alert(res.error ?? "Failed to disconnect");
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-surface border border-border-custom rounded-xl shadow-sm overflow-visible mb-12">
      {/* Cover */}
      <div className="relative h-32 shrink-0 bg-neutral-200 dark:bg-neutral-800 rounded-t-xl overflow-visible">
        <div className="w-full h-full rounded-t-xl overflow-hidden">
          {coverUrl ? (
            <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900" />
          )}
        </div>
        <div className="absolute -bottom-8 left-8 z-10">
          <div className="w-20 h-20 rounded-xl border-4 border-surface overflow-hidden bg-neutral-200 dark:bg-neutral-800 shadow-md">
            <img
              src={avatarUrl || defaultAvatar}
              alt={name}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      <div className="pt-12 px-8 pb-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-800 dark:text-neutral-100">
            Profile Settings
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Manage your personal representation inside the {workspaceName} workspace.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Email */}
          <div className="space-y-1">
            <label className="block text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
                <Mail size={13} />
              </span>
              <input
                type="text"
                disabled
                value={currentUser.email}
                className="w-full text-xs pl-9 pr-4 py-2 !bg-surface border border-border-custom rounded-lg !text-neutral-800 dark:!text-neutral-200 cursor-not-allowed opacity-75"
              />
            </div>
            <span className="text-[9px] text-neutral-400 leading-normal block">
              Email cannot be edited since it links your account identity.
            </span>
          </div>

          {/* Role */}
          <div className="space-y-1">
            <label className="block text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
              Active Member Role
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
                <Shield size={13} />
              </span>
              <input
                type="text"
                disabled
                value={role}
                className="w-full text-xs pl-9 pr-4 py-2 !bg-surface border border-border-custom rounded-lg !text-neutral-800 dark:!text-neutral-200 cursor-not-allowed opacity-75 font-semibold"
              />
            </div>
          </div>

          {/* Display Name */}
          <div className="space-y-1">
            <label className="block text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
              Display Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Olivia Owner"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-border-custom bg-surface rounded-lg focus:outline-none focus:border-brand-accent text-neutral-800 dark:text-neutral-200"
            />
          </div>

          {/* Plan Tier */}
          <div className="space-y-2">
            <label className="block text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
              Plan Tier
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: "standard", name: "Standard", desc: "Basic workspace usage" },
                { id: "premium", name: "Premium", desc: "Prioritized workspace features" },
                { id: "premium+", name: "Premium+", desc: "Full power & maximum priority" },
              ].map((tier) => {
                const isSelected = planTier === tier.id;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setPlanTier(tier.id)}
                    className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all ${
                      isSelected
                        ? "border-neutral-800 dark:border-neutral-200 bg-neutral-50/50 dark:bg-neutral-900/30"
                        : "border-border-custom hover:border-neutral-400 bg-transparent text-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    <div>
                      <span className={`text-xs font-bold block ${isSelected ? "text-neutral-900 dark:text-white" : "text-neutral-800 dark:text-neutral-200"}`}>
                        {tier.name}
                      </span>
                      <span className="text-[10px] text-neutral-400 mt-1 block">{tier.desc}</span>
                    </div>
                    {isSelected && (
                      <span className="self-end mt-2 text-[9px] font-semibold bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check size={8} /> Active
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Avatar Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                Choose Avatar
              </label>
              {googleAvatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl(googleAvatarUrl)}
                  className={`flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-lg border transition-colors ${
                    avatarUrl === googleAvatarUrl
                      ? "border-neutral-800 dark:border-neutral-200 bg-neutral-50 dark:bg-neutral-900/30 text-neutral-900 dark:text-white"
                      : "border-border-custom text-neutral-500 hover:border-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
                  }`}
                >
                  <img src={googleAvatarUrl} alt="Google" className="w-4 h-4 rounded-full" />
                  <span>Use Google Photo</span>
                  {avatarUrl === googleAvatarUrl && <Check size={10} />}
                </button>
              )}
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
              {avatarPresets.map((preset) => {
                const isSelected = avatarUrl === preset.url;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setAvatarUrl(preset.url)}
                    className={`relative p-1 rounded-lg border flex flex-col items-center gap-1 transition-colors ${
                      isSelected
                        ? "border-neutral-800 dark:border-neutral-200 bg-neutral-50/50 dark:bg-neutral-900/20"
                        : "border-border-custom hover:border-neutral-400 bg-surface/50"
                    }`}
                  >
                    <img src={preset.url} alt={preset.name} className="w-8 h-8 rounded-full bg-neutral-100" />
                    <span className="text-[9px] text-neutral-400 truncate max-w-full font-medium">{preset.name}</span>
                    {isSelected && (
                      <span className="absolute -top-1.5 -right-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-full p-0.5 shadow-sm">
                        <Check size={8} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Avatar URL */}
          <div className="space-y-1">
            <label className="block text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
              Custom Avatar URL
            </label>
            <input
              type="text"
              placeholder="Paste custom profile picture URL (e.g. https://...)"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-border-custom bg-transparent rounded-lg focus:outline-none focus:border-brand-accent text-neutral-800 dark:text-neutral-200"
            />
          </div>

          {/* Cover Presets */}
          <div className="space-y-2">
            <label className="block text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
              Choose Cover Image Preset
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {coverPresets.map((preset) => {
                const isSelected = coverUrl === preset.url;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setCoverUrl(preset.url)}
                    className={`relative h-14 rounded-lg border overflow-hidden flex items-end p-1.5 transition-colors ${
                      isSelected
                        ? "border-neutral-800 dark:border-neutral-200"
                        : "border-border-custom hover:border-neutral-400"
                    }`}
                  >
                    <img src={preset.url} alt={preset.name} className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 hover:bg-black/20 transition-colors" />
                    <span className="relative text-[9px] text-white truncate max-w-full font-bold">{preset.name}</span>
                    {isSelected && (
                      <span className="absolute top-1.5 right-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-full p-0.5 shadow-sm z-10">
                        <Check size={8} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Cover URL */}
          <div className="space-y-1">
            <label className="block text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
              Custom Cover URL
            </label>
            <input
              type="text"
              placeholder="Paste custom cover image URL (e.g. https://...)"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-border-custom bg-transparent rounded-lg focus:outline-none focus:border-brand-accent text-neutral-800 dark:text-neutral-200"
            />
          </div>

          {error && (
            <div className="text-[10px] bg-red-50 border border-red-100 text-red-600 p-2 rounded-lg">{error}</div>
          )}
          {success && (
            <div className="text-[10px] bg-neutral-100 border border-border-custom text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 p-2 rounded-lg flex items-center gap-1.5">
              <Check size={12} />
              <span>Profile updated successfully! Refreshing...</span>
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-border-custom">
            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold px-4 py-2 disabled:opacity-50 transition-colors"
            >
              <Save size={13} />
              <span>Save Changes</span>
            </button>
          </div>

          {/* ── Storage ─────────────────────────────────────────────────────── */}
          <div className="pt-6 border-t border-border-custom space-y-3">
            <div className="flex items-center gap-2">
              <HardDrive size={14} className="text-neutral-400" />
              <div>
                <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                  Storage
                </h3>
                <p className="text-[10px] text-neutral-400 mt-0.5">
                  Used across project files, chat attachments, and knowledge base uploads.
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    storageUsedBytes / storageLimitBytes > 0.9
                      ? "bg-red-500"
                      : storageUsedBytes / storageLimitBytes > 0.7
                      ? "bg-amber-500"
                      : "bg-neutral-900 dark:bg-white"
                  }`}
                  style={{ width: `${Math.min(100, (storageUsedBytes / storageLimitBytes) * 100).toFixed(1)}%` }}
                />
              </div>
              <p className="text-[10px] text-neutral-400">
                {(storageUsedBytes / (1024 * 1024)).toFixed(1)} MB used of{" "}
                {(storageLimitBytes / (1024 * 1024)).toFixed(0)} MB
              </p>
            </div>
          </div>

          {/* ── Connected Apps ──────────────────────────────────────────────── */}
          <div className="pt-6 border-t border-border-custom space-y-3">
            <div className="flex items-center gap-2">
              <Plug size={14} className="text-neutral-400" />
              <div>
                <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                  Connected Apps
                </h3>
                <p className="text-[10px] text-neutral-400 mt-0.5">
                  Toggle to connect or disconnect external tools. Connected apps can sync and import content into your workspace.
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-1">
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

          {/* ── Session Control ─────────────────────────────────────────────── */}
          <div className="pt-6 border-t border-border-custom space-y-4">
            <div>
              <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                Session Control
              </h3>
              <p className="text-[10px] text-neutral-400 mt-0.5">
                Log out of your current workspace session.
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                setIsSaving(true);
                await logoutAction();
              }}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 border border-red-200 dark:border-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/10 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <LogOut size={13} />
              <span>Log Out of Workspace</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
