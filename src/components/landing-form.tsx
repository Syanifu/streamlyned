"use client";

import React, { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Loader2, AlertCircle } from "lucide-react";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key"
);

export default function LandingForm() {
  const [email, setEmail] = useState("");
  const [accessKey, setAccessKey] = useState("");
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
        setSuccessMsg("SYS_ALERT: AUTHENTICATION_LINK_DISPATCHED. CHECK OPERATOR BOX.");
        setEmail("");
      }
    } catch (err: any) {
      setError(err.message || "SYS_ALERT: SECURE LINK FAILURE.");
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
      setError(err.message || "SYS_ALERT: GOOGLE_OAUTH_LINK_FAILED.");
      setIsPending(false);
    }
  };

  return (
    <div className="w-full space-y-6 font-mono text-white">
      {/* Terminal Header */}
      <div className="text-xs font-bold text-white tracking-widest uppercase mb-4 flex items-center gap-1 select-none">
        <span>&gt; AUTHORIZATION_REQUIRED</span>
        <span className="w-1.5 h-3 bg-white inline-block animate-pulse" />
      </div>

      <form onSubmit={handleEmailSignIn} className="space-y-6">
        {/* OPERATOR_ID Input */}
        <div className="relative border-b border-white">
          <input
            id="email"
            type="email"
            required
            placeholder="[ENTER_OPERATOR_ID]"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isPending}
            className="w-full text-xs bg-black py-3 px-1 focus:outline-none focus:text-[#00FF00] placeholder-neutral-500 uppercase tracking-widest text-[#00FF00] disabled:opacity-50 transition-colors border-none rounded-none"
          />
        </div>

        {/* ACCESS_KEY Input */}
        <div className="relative border-b border-white">
          <input
            id="accessKey"
            type="password"
            placeholder="[ENTER_ACCESS_KEY]"
            value={accessKey}
            onChange={(e) => setAccessKey(e.target.value)}
            disabled={isPending}
            className="w-full text-xs bg-black py-3 px-1 focus:outline-none focus:text-[#00FF00] placeholder-neutral-500 uppercase tracking-widest text-[#00FF00] disabled:opacity-50 transition-colors border-none rounded-none"
          />
        </div>

        {error && (
          <div className="text-[10px] bg-black text-[#FF2D2D] p-3 border border-[#FF2D2D] flex items-start gap-2 rounded-none">
            <AlertCircle size={12} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="text-[10px] bg-black text-[#00FF00] p-3 border border-[#00FF00] flex items-start gap-2 rounded-none">
            <span>{successMsg}</span>
          </div>
        )}

        {/* CTA Button */}
        <button
          type="submit"
          disabled={isPending || !email.trim()}
          className="w-full bg-white text-black hover:bg-[#FF2D2D] hover:text-white rounded-none text-xs font-bold py-4 transition-all duration-75 uppercase tracking-widest cursor-pointer border-none flex items-center justify-center gap-2 select-none"
        >
          {isPending ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              <span>LINK_ESTABLISHING...</span>
            </>
          ) : (
            <span>EXECUTE_LOGIN // ESTABLISH_LINK &gt;&gt;&gt;</span>
          )}
        </button>

        {/* Auxiliary Federated Auth */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isPending}
            className="w-full text-center border border-white hover:border-[#FF2D2D] hover:text-[#FF2D2D] text-xs font-bold py-2.5 bg-black transition-colors rounded-none cursor-pointer uppercase tracking-widest"
          >
            [GOOGLE_AUTH_FEDERATION_LINK]
          </button>
        </div>
      </form>

      {/* Footer Micro-text */}
      <div className="text-[9px] text-neutral-500 uppercase tracking-widest select-none text-center">
        // SYSTEM SECURED BY STREAMLYNED PROTOCOL // © 2026
      </div>
    </div>
  );
}
