"use client";

import React, { useState, useEffect } from "react";
import { createWorkspaceAction, loginAction } from "@/app/actions/auth";
import { RefreshCw, ArrowRight, ShieldCheck, KeyRound, UserPlus } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

export default function LandingForm() {
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key"
  );

  const handleGoogleSignIn = async () => {
    if (!workspaceSlug) {
      setError("Please specify a workspace URL slug first.");
      return;
    }
    setIsPending(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?slug=${workspaceSlug}`,
        },
      });
      if (error) {
        setError(error.message);
        setIsPending(false);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during Google Sign In.");
      setIsPending(false);
    }
  };

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

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-border-custom opacity-55"></div>
          <span className="flex-shrink mx-4 text-[9px] text-neutral-400 font-bold uppercase tracking-widest select-none">or</span>
          <div className="flex-grow border-t border-border-custom opacity-55"></div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isPending || !workspaceSlug}
          className="w-full flex items-center justify-center gap-2 border border-border-custom bg-surface hover:bg-neutral-50 dark:hover:bg-neutral-800/40 text-neutral-750 dark:text-neutral-200 rounded-lg text-sm font-medium py-2.5 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
          </svg>
          <span>Continue with Google</span>
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
