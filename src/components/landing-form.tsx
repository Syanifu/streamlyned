"use client";

import React, { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Mail, Sparkles, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function LandingForm() {
  const [email, setEmail] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key"
  );

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || isPending) return;

    setIsPending(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccessMsg("Verification link sent! Check your email inbox to log in.");
        setEmail("");
      }
    } catch (err: any) {
      setError(err.message || "Failed to send verification email. Try again later.");
    } finally {
      setIsPending(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsPending(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
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

  return (
    <div className="w-full max-w-md bg-surface border border-border-custom rounded-xl p-8 shadow-sm space-y-6">
      <div>
        <h2 className="text-xl font-medium text-neutral-900 dark:text-white tracking-tight">
          Join Streamlyned
        </h2>
        <p className="text-xs text-neutral-400 mt-1">
          Access your workspaces passwordlessly via email link or Google OAuth.
        </p>
      </div>

      <form onSubmit={handleEmailSignIn} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-neutral-400">
              <Mail size={14} />
            </span>
            <input
              id="email"
              type="email"
              required
              placeholder="you@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isPending}
              className="w-full text-sm pl-9 pr-4 py-2 border border-border-custom bg-transparent rounded-lg focus:outline-none focus:border-brand-accent placeholder-neutral-400 text-neutral-800 dark:text-neutral-100 disabled:opacity-50"
            />
          </div>
        </div>

        {error && (
          <div className="text-xs bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-3 rounded-lg border border-red-100 dark:border-red-950/30 flex items-start gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 flex items-start gap-2">
            <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isPending || !email.trim()}
          className="w-full flex items-center justify-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-900 rounded-lg text-sm font-semibold py-2.5 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {isPending ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>Sending verification link...</span>
            </>
          ) : (
            <>
              <span>Join with Email</span>
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
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 border border-border-custom bg-[#FFFFFF] hover:bg-[#F8F9FA] text-[#000000] dark:bg-[#FFFFFF] dark:hover:bg-[#F8F9FA] dark:text-[#000000] rounded-lg text-sm font-semibold py-2.5 transition-colors disabled:opacity-50 cursor-pointer"
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
        <Sparkles size={14} className="text-neutral-400 mt-0.5 shrink-0" />
        <span>
          A frictionless signup. If you do not have a workspace yet, one will be created and pre-seeded for you automatically upon first entry.
        </span>
      </div>
    </div>
  );
}
