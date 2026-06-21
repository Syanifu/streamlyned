"use client";

import React, { useState } from "react";
import { Building2, Plus, ArrowRight, Loader2, AlertCircle, Sparkles } from "lucide-react";
import { joinWorkspaceAction, createOwnWorkspaceAction } from "@/app/actions/auth";

interface Membership {
  id: string;
  workspaceName: string;
  workspaceSlug: string;
  role: string;
}

interface OnboardingViewProps {
  memberships: Membership[];
  userEmail: string;
  userName: string;
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
  CLIENT: "Client",
};

export default function OnboardingView({ memberships, userEmail, userName }: OnboardingViewProps) {
  const [mode, setMode] = useState<"choice" | "create">("choice");
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (val: string) => {
    setWorkspaceName(val);
    setWorkspaceSlug(
      val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
    );
  };

  const handleJoin = async (slug: string) => {
    setIsPending(true);
    setError(null);
    const res = await joinWorkspaceAction(slug);
    if (res?.success === false) {
      setError(res.error || "Failed to join workspace.");
      setIsPending(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim() || !workspaceSlug.trim()) return;
    setIsPending(true);
    setError(null);
    const res = await createOwnWorkspaceAction(workspaceName, workspaceSlug);
    if (res?.success === false) {
      setError(res.error || "Failed to create workspace.");
      setIsPending(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Sparkles size={18} className="text-neutral-600" />
          <span className="text-sm font-bold text-neutral-800 dark:text-neutral-100 tracking-tight">
            Streamlyned
          </span>
        </div>
        <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">
          Welcome, {userName.split(" ")[0]}
        </h1>
        <p className="text-xs text-neutral-400">{userEmail}</p>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-xs bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
          <AlertCircle size={13} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {mode === "choice" && (
        <div className="bg-surface border border-border-custom rounded-xl p-6 shadow-sm space-y-5">
          {memberships.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                You&apos;ve been invited to
              </p>
              <div className="space-y-2">
                {memberships.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border-custom bg-neutral-50 dark:bg-neutral-900/40"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                        <Building2 size={13} className="text-neutral-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 truncate">
                          {m.workspaceName}
                        </p>
                        <p className="text-[10px] text-neutral-400">
                          {ROLE_LABELS[m.role] || m.role}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleJoin(m.workspaceSlug)}
                      disabled={isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-950 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 shrink-0"
                    >
                      {isPending ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : (
                        <>
                          <span>Join</span>
                          <ArrowRight size={11} />
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {memberships.length > 0 && (
            <div className="relative flex items-center gap-3">
              <div className="flex-grow border-t border-border-custom opacity-55" />
              <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest shrink-0">
                or
              </span>
              <div className="flex-grow border-t border-border-custom opacity-55" />
            </div>
          )}

          <button
            onClick={() => setMode("create")}
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:border-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors disabled:opacity-50"
          >
            <Plus size={13} />
            <span>Create my own workspace</span>
          </button>
        </div>
      )}

      {mode === "create" && (
        <div className="bg-surface border border-border-custom rounded-xl p-6 shadow-sm space-y-5">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
              Create your workspace
            </p>
            <p className="text-xs text-neutral-400">
              You&apos;ll be the owner and can invite others.
            </p>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                Workspace Name
              </label>
              <input
                type="text"
                required
                placeholder="Acme Corp"
                value={workspaceName}
                onChange={(e) => handleNameChange(e.target.value)}
                disabled={isPending}
                className="w-full text-sm px-3.5 py-2 border border-border-custom bg-transparent rounded-lg focus:outline-none focus:border-brand-accent placeholder-neutral-400 text-neutral-800 dark:text-neutral-100 disabled:opacity-50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                Workspace URL
              </label>
              <div className="flex items-center gap-0 border border-border-custom rounded-lg overflow-hidden focus-within:border-brand-accent">
                <span className="text-xs text-neutral-400 px-3 py-2 bg-neutral-50 dark:bg-neutral-900/40 border-r border-border-custom shrink-0">
                  streamlyned.com/
                </span>
                <input
                  type="text"
                  required
                  placeholder="acme-corp"
                  value={workspaceSlug}
                  onChange={(e) =>
                    setWorkspaceSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
                  }
                  disabled={isPending}
                  className="flex-1 text-sm px-3 py-2 bg-transparent focus:outline-none placeholder-neutral-400 text-neutral-800 dark:text-neutral-100 disabled:opacity-50"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setMode("choice")}
                disabled={isPending}
                className="flex-1 py-2.5 text-xs font-semibold border border-border-custom rounded-lg text-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-900/30 transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isPending || !workspaceName.trim() || !workspaceSlug.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-950 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <>
                    <span>Create Workspace</span>
                    <ArrowRight size={12} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
