"use client";

import React, { useState, useEffect } from "react";
import { createWorkspaceAction } from "@/app/actions/auth";
import { RefreshCw, ArrowRight, ShieldCheck } from "lucide-react";

export default function LandingForm() {
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate slug from workspace name
  useEffect(() => {
    const slug = workspaceName
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-");
    setWorkspaceSlug(slug);
  }, [workspaceName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    try {
      const res = await createWorkspaceAction({
        workspaceName,
        workspaceSlug,
        email,
        name,
      });

      if (res && !res.success) {
        setError(res.error || "An error occurred while creating the workspace.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-surface border border-border-custom rounded-xl p-8 shadow-sm">
      <h2 className="text-xl font-medium text-brand-accent tracking-tight mb-6">
        Create a new workspace
      </h2>

      <form onSubmit={handleSubmit} className="space-y-5">
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

        <div>
          <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1.5">
            Email Address
          </label>
          <input
            type="email"
            required
            placeholder="e.g. owner@acmecreative.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
          disabled={isPending || !workspaceName || !workspaceSlug || !name || !email}
          className="w-full flex items-center justify-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-950 rounded-lg text-sm font-medium py-2.5 transition-colors disabled:opacity-50"
        >
          {isPending ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              <span>Setting up your workspace...</span>
            </>
          ) : (
            <>
              <span>Get Started</span>
              <ArrowRight size={14} />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 flex items-start gap-2 text-neutral-400 text-xs">
        <ShieldCheck size={14} className="text-brand-success mt-0.5 shrink-0" />
        <span>
          Workspace is created instantly. Includes a pre-configured AI Gateway and flat pricing.
        </span>
      </div>
    </div>
  );
}
