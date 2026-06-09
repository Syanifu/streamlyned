"use client";

import React, { useState, useEffect } from "react";
import { createWorkspaceAction, loginAction } from "@/app/actions/auth";
import { RefreshCw, ArrowRight, ShieldCheck, KeyRound, UserPlus } from "lucide-react";

export default function LandingForm() {
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate slug from workspace name (only in signup mode)
  useEffect(() => {
    if (mode === "signup") {
      const slug = workspaceName
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-");
      setWorkspaceSlug(slug);
    }
  }, [workspaceName, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    try {
      if (mode === "signup") {
        const res = await createWorkspaceAction({
          workspaceName,
          workspaceSlug,
          email,
          name,
          password,
        });

        if (res && !res.success) {
          setError(res.error || "An error occurred while creating the workspace.");
        }
      } else {
        const res = await loginAction({
          email,
          workspaceSlug,
          password,
        });

        if (res && !res.success) {
          setError(res.error || "Login failed. Please check your credentials.");
        }
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-surface border border-border-custom rounded-xl p-8 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-medium text-brand-accent tracking-tight">
          {mode === "signup" ? "Create a new workspace" : "Log in to workspace"}
        </h2>
        <button
          type="button"
          onClick={() => {
            setMode(mode === "signup" ? "login" : "signup");
            setError(null);
          }}
          className="text-xs text-neutral-500 hover:text-brand-accent transition-colors font-medium flex items-center gap-1.5"
        >
          {mode === "signup" ? (
            <>
              <KeyRound size={12} />
              <span>Log In instead</span>
            </>
          ) : (
            <>
              <UserPlus size={12} />
              <span>Sign Up instead</span>
            </>
          )}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {mode === "signup" && (
          <div>
            <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1.5">
              Agency or Team Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Acme Creative"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              disabled={isPending}
              className="w-full text-sm px-3.5 py-2 border border-border-custom bg-transparent rounded-lg focus:outline-none focus:border-brand-accent placeholder-neutral-400"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1.5">
            Workspace URL slug
          </label>
          <div className="flex rounded-lg border border-border-custom overflow-hidden focus-within:border-brand-accent">
            <span className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-400 text-xs px-3 flex items-center border-r border-border-custom select-none font-mono">
              /
            </span>
            <input
              type="text"
              required
              placeholder="acme-creative"
              value={workspaceSlug}
              onChange={(e) => setWorkspaceSlug(e.target.value)}
              disabled={isPending}
              className="w-full text-sm px-3.5 py-2 bg-transparent focus:outline-none placeholder-neutral-400 font-mono"
            />
          </div>
        </div>

        {mode === "signup" && (
          <div className="border-t border-border-custom pt-4">
            <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1.5">
              Your Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Olivia Owner"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
              className="w-full text-sm px-3.5 py-2 border border-border-custom bg-transparent rounded-lg focus:outline-none focus:border-brand-accent placeholder-neutral-400"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1.5">
            Email Address
          </label>
          <input
            type="email"
            required
            placeholder={mode === "signup" ? "e.g. owner@acmecreative.com" : "e.g. you@domain.com"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isPending}
            className="w-full text-sm px-3.5 py-2 border border-border-custom bg-transparent rounded-lg focus:outline-none focus:border-brand-accent placeholder-neutral-400"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1.5">
            Password
          </label>
          <input
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isPending}
            className="w-full text-sm px-3.5 py-2 border border-border-custom bg-transparent rounded-lg focus:outline-none focus:border-brand-accent placeholder-neutral-400"
          />
        </div>

        {error && (
          <div className="text-xs bg-red-50 dark:bg-red-950/20 text-brand-danger p-3 rounded-lg border border-red-100 dark:border-red-950/30">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={
            isPending ||
            !workspaceSlug ||
            !email ||
            !password ||
            (mode === "signup" && (!workspaceName || !name))
          }
          className="w-full flex items-center justify-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-950 rounded-lg text-sm font-medium py-2.5 transition-colors disabled:opacity-50"
        >
          {isPending ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              <span>{mode === "signup" ? "Setting up workspace..." : "Verifying details..."}</span>
            </>
          ) : (
            <>
              <span>{mode === "signup" ? "Get Started" : "Log In"}</span>
              <ArrowRight size={14} />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 flex items-start gap-2 text-neutral-400 text-xs">
        <ShieldCheck size={14} className="text-brand-success mt-0.5 shrink-0" />
        <span>
          {mode === "signup"
            ? "Workspace is created instantly. Includes pre-configured AI Gateway."
            : "Pre-seeded dev accounts will automatically save your password on first login."}
        </span>
      </div>
    </div>
  );
}
