"use client";

import React, { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Mail, Sparkles, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key"
);

export default function LandingForm() {
  const [email, setEmail] = useState("");
  const [accessKey, setAccessKey] = useState("••••••••••••");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
        setSuccessMsg("AUTH_LINK_SENT: Verify secure link in operator inbox.");
        setEmail("");
      }
    } catch (err: any) {
      setError(err.message || "Security authorization failed. System offline.");
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
      setError(err.message || "Google federation route failed.");
      setIsPending(false);
    }
  };

  return (
    <div className="w-full space-y-5 font-mono text-[#ffb000]">
      {/* Status Bar */}
      <div className="border border-[#ffb000]/30 bg-[#ffb000]/5 px-3 py-1.5 rounded-lg flex items-center justify-between text-[11px] uppercase tracking-wider mb-2">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ffb000] animate-ping" />
          <span>SYS_STATUS:</span>
        </div>
        <span className="text-[#00fff5] font-bold">AWAITING AUTHORIZATION</span>
      </div>

      <form onSubmit={handleEmailSignIn} className="space-y-4">
        {/* OPERATOR_ID Field */}
        <div>
          <label htmlFor="email" className="block text-[11px] font-bold uppercase tracking-widest text-[#ffb000]/70 mb-1.5">
            OPERATOR_ID (Email)
          </label>
          <div className="relative">
            <input
              id="email"
              type="email"
              required
              placeholder="operator@streamlyned.sys"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isPending}
              className="w-full text-sm px-4 py-3 border-b-2 border-[#ffb000]/40 bg-[#0a0f14]/80 rounded-t-lg focus:outline-none focus:border-[#00fff5] focus:ring-0 placeholder-[#ffb000]/35 text-[#ffb000] disabled:opacity-50 transition-colors shadow-inner"
            />
          </div>
        </div>

        {/* ACCESS_KEY Field (Tactile password field) */}
        <div>
          <label htmlFor="accessKey" className="block text-[11px] font-bold uppercase tracking-widest text-[#ffb000]/70 mb-1.5">
            ACCESS_KEY (OTP Auth)
          </label>
          <div className="relative">
            <input
              id="accessKey"
              type="text"
              placeholder="PASSWORDLESS_OTP_AUTH"
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
              className="w-full text-sm px-4 py-3 border-b-2 border-[#ffb000]/20 bg-[#0a0f14]/50 rounded-t-lg focus:outline-none focus:border-[#ffb000]/40 placeholder-[#ffb000]/25 text-[#ffb000]/50 text-xs transition-colors cursor-not-allowed select-all"
            />
            <span className="absolute right-3 top-3 text-[9px] text-[#ffb000]/40 border border-[#ffb000]/25 px-1.5 py-0.5 rounded select-none">
              BYPASS_ACTIVE
            </span>
          </div>
        </div>

        {error && (
          <div className="text-xs bg-red-950/20 text-red-400 p-3 rounded-lg border border-red-900/30 flex items-start gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="text-xs bg-emerald-950/20 text-emerald-400 p-3 rounded-lg border border-emerald-900/30 flex items-start gap-2">
            <span>{successMsg}</span>
          </div>
        )}

        {/* Heavy 3D Push Button */}
        <button
          type="submit"
          disabled={isPending || !email.trim()}
          className="w-full flex items-center justify-center gap-2 bg-[#ffb000] hover:bg-[#00fff5] hover:text-[#0a0f14] text-[#0a0f14] rounded-lg text-sm font-bold py-3 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-md uppercase tracking-wider font-mono border-t border-[#ffffff]/40 relative overflow-hidden group"
        >
          {isPending ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>ESTABLISHING LINK...</span>
            </>
          ) : (
            <span>ESTABLISH SECURE LINK</span>
          )}
        </button>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-[#ffb000]/15"></div>
          <span className="flex-shrink mx-4 text-[9px] text-[#ffb000]/40 font-bold uppercase tracking-widest select-none">AUXILIARY_AUTH</span>
          <div className="flex-grow border-t border-[#ffb000]/15"></div>
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 border border-[#ffb000]/30 hover:border-[#00fff5] hover:text-[#00fff5] bg-transparent text-[#ffb000]/70 rounded-lg text-xs font-semibold py-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
        >
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="currentColor"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="currentColor"/>
          </svg>
          <span>FEDERATED GOOGLE LINK</span>
        </button>
      </form>
    </div>
  );
}
