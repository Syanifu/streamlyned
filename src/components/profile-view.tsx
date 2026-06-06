"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfileAction } from "@/app/actions/profile";
import { logoutAction } from "@/app/actions/auth";
import { User, Mail, Shield, Check, Save, LogOut } from "lucide-react";

interface ProfileViewProps {
  currentUser: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    coverUrl: string | null;
    planTier: string;
  };
  role: string;
  workspaceName: string;
}

export default function ProfileView({
  currentUser,
  role,
  workspaceName,
}: ProfileViewProps) {
  const router = useRouter();
  const [name, setName] = useState(currentUser.name);
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || "");
  const [coverUrl, setCoverUrl] = useState(currentUser.coverUrl || "");
  const [planTier, setPlanTier] = useState(currentUser.planTier || "standard");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Preset avatar selections (Dicebear)
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

  // Preset cover selections (Notion-style cover options)
  const coverPresets = [
    { name: "Nordic Dusk", url: "https://images.unsplash.com/photo-1604076913837-52ab5629fba9?w=1200&auto=format&fit=crop&q=60" },
    { name: "Minimal Warm", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=60" },
    { name: "Sunset Glow", url: "https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&auto=format&fit=crop&q=60" },
    { name: "Ocean Breeze", url: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&auto=format&fit=crop&q=60" },
    { name: "Forest Calm", url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=60" },
  ];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    const res = await updateProfileAction({ name, avatarUrl, coverUrl, planTier });
    if (res.success) {
      setSuccess(true);
      router.refresh();
      // Reload page after a short delay to sync sidebar layout
      setTimeout(() => {
        setSuccess(false);
        window.location.reload();
      }, 800);
    } else {
      setError(res.error || "Failed to update profile.");
    }
    setIsSaving(false);
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-surface border border-border-custom rounded-xl shadow-sm overflow-visible mb-12">
      {/* Cover Image (Notion-style) */}
      <div className="relative h-32 shrink-0 bg-neutral-200 dark:bg-neutral-800 rounded-t-xl overflow-visible">
        <div className="w-full h-full rounded-t-xl overflow-hidden">
          {coverUrl ? (
            <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900" />
          )}
        </div>
        {/* Large Profile Picture overlapping cover */}
        <div className="absolute -bottom-8 left-8 z-10">
          <div className="w-20 h-20 rounded-xl border-4 border-surface overflow-hidden bg-neutral-200 dark:bg-neutral-800 shadow-md">
            {avatarUrl ? (
              <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User size={32} className="text-neutral-400" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Details Content */}
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
          {/* Email Address (Disabled) */}
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

          {/* Role (Disabled) */}
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

          {/* Name Field */}
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

          {/* Plan Tier Field */}
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
                        ? "border-brand-accent bg-neutral-50/50 dark:bg-neutral-900/30"
                        : "border-border-custom hover:border-neutral-400 bg-transparent text-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    <div>
                      <span className={`text-xs font-bold block ${isSelected ? "text-brand-accent font-semibold" : "text-neutral-800 dark:text-neutral-200"}`}>
                        {tier.name}
                      </span>
                      <span className="text-[10px] text-neutral-400 mt-1 block">
                        {tier.desc}
                      </span>
                    </div>
                    {isSelected && (
                      <span className="self-end mt-2 text-[9px] font-semibold bg-brand-accent text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check size={8} /> Active
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Avatar Selector Presets */}
          <div className="space-y-2">
            <label className="block text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
              Choose Avatar Preset
            </label>
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
                        ? "border-brand-accent bg-indigo-50/20"
                        : "border-border-custom hover:border-neutral-400 bg-surface/50"
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.name}
                      className="w-8 h-8 rounded-full bg-neutral-100"
                    />
                    <span className="text-[9px] text-neutral-400 truncate max-w-full font-medium">
                      {preset.name}
                    </span>
                    {isSelected && (
                      <span className="absolute -top-1.5 -right-1.5 bg-brand-accent text-white rounded-full p-0.5 shadow-sm">
                        <Check size={8} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Avatar URL input */}
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

          {/* Cover Selector Presets */}
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
                        ? "border-brand-accent"
                        : "border-border-custom hover:border-neutral-400"
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 hover:bg-black/20 transition-colors" />
                    <span className="relative text-[9px] text-white truncate max-w-full font-bold">
                      {preset.name}
                    </span>
                    {isSelected && (
                      <span className="absolute top-1.5 right-1.5 bg-brand-accent text-white rounded-full p-0.5 shadow-sm z-10">
                        <Check size={8} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Cover URL input */}
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
            <div className="text-[10px] bg-red-50 border border-red-100 text-brand-danger p-2 rounded-lg">
              {error}
            </div>
          )}
          {success && (
            <div className="text-[10px] bg-emerald-50 border border-emerald-100 text-emerald-800 p-2 rounded-lg flex items-center gap-1.5">
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

          {/* Session Control / Log Out */}
          <div className="pt-6 border-t border-border-custom space-y-4">
            <div>
              <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                Session Control
              </h3>
              <p className="text-[10px] text-neutral-400 mt-0.5">
                Log out of your current workspace session. You can switch back anytime using the developer Switcher tool.
              </p>
            </div>
            
            <button
              type="button"
              onClick={async () => {
                setIsSaving(true);
                await logoutAction();
              }}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 border border-red-200 dark:border-red-950/40 text-brand-danger hover:bg-red-50 dark:hover:bg-red-950/10 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
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
