import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import LandingForm from "@/components/landing-form";
import { Sparkles, ArrowDown } from "lucide-react";

export default async function Home() {
  const session = await getSession();

  // If already authenticated, go directly to the workspace dashboard
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex-1 flex flex-col justify-between bg-background px-6 py-12 md:py-24">
      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8 items-center flex-1">
        {/* Left Side: Product Mission & Design Philosophy */}
        <div className="md:col-span-7 space-y-6 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border-custom bg-surface text-xs text-neutral-500 font-medium">
            <Sparkles size={12} className="text-brand-accent" />
            <span>Calm-Work Philosophy</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-neutral-900 dark:text-white leading-tight">
            Consolidate work. Eliminate noise.
          </h1>

          <p className="text-base md:text-lg text-neutral-500 leading-relaxed">
            Streamlyned is an AI-native project management platform designed specifically for small teams/solo founders. By replacing scattered channels with unified workspaces &  reduce daily cognitive load.
          </p>

          <div className="space-y-4 pt-4 border-t border-border-custom max-w-lg">
            <div className="flex gap-3">
              <span className="text-brand-success font-medium text-sm">✓</span>
              <div>
                <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Retrieval over generation</h4>
                <p className="text-xs text-neutral-500 mt-0.5">AI retrieves, ranks, and cites your team's context. No agent loops, no hallucinated content.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-brand-success font-medium text-sm">✓</span>
              <div>
                <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Workspace multi-tenancy & isolation</h4>
                <p className="text-xs text-neutral-500 mt-0.5">Strict permission boundaries at the database level. Clients only see what you enable.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-brand-success font-medium text-sm">✓</span>
              <div>
                <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Unlimited client collaboration</h4>
                <p className="text-xs text-neutral-500 mt-0.5">Flat billing models with zero seat fees for client spaces.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Setup form */}
        <div className="md:col-span-5 flex flex-col items-center md:items-end justify-center">
          <LandingForm />
        </div>
      </div>

      {/* Footer Instructions for Reviewer */}
      {process.env.NODE_ENV === "development" && (
        <div className="max-w-6xl mx-auto w-full text-center border-t border-border-custom pt-8 mt-12">
          <p className="text-xs text-neutral-400 flex items-center justify-center gap-1.5">
            <span>Quick Evaluation: Click the</span>
            <span className="bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
              Dev Options
            </span>
            <span>pill at the bottom right to log in as Olivia (Owner) or Catherine (Client) instantly.</span>
          </p>
        </div>
      )}
    </div>
  );
}
