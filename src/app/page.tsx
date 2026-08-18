import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import LandingForm from "@/components/landing-form";
import { Sparkles } from "lucide-react";

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await getSession();

  // If already authenticated, go directly to the workspace dashboard
  if (session) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const authError = params.error;

  return (
    <div className="flex-1 flex flex-col justify-between bg-[#FAF6F0] dark:bg-[#121413] text-[#3c3e3c] dark:text-[#ebdccb] font-sans px-4 md:px-8 py-6 md:py-16 relative overflow-hidden min-h-screen">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes bgBreath {
          0%, 100% { transform: scale(1.02); }
          50% { transform: scale(1.08); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-bg-breath {
          animation: bgBreath 24s ease-in-out infinite;
        }
        .animate-fade-up {
          animation: fadeUp 800ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }
      `}} />

      {/* Full screen background image with slow zoom */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          src="/landing-image.svg"
          alt="Background constructions abstract"
          className="w-full h-full object-cover opacity-[0.30] dark:opacity-[0.20] animate-bg-breath transform origin-center"
        />
      </div>

      {/* Subtle paper texture overlay */}
      <div className="absolute inset-0 opacity-[0.035] pointer-events-none mix-blend-overlay z-0" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")" }} />

      {/* Diagonal golden sunbeam casting warm morning light */}
      <div className="absolute top-0 right-0 w-[70%] h-[140%] bg-gradient-to-tr from-transparent via-[#FFFDFB]/10 to-[#F6DEB2]/15 rotate-12 -translate-y-[15%] pointer-events-none mix-blend-screen dark:mix-blend-overlay z-0" />

      {/* Top-left wordmark */}
      <div className="max-w-6xl mx-auto w-full flex items-center gap-2 mb-8 md:mb-14 relative z-10">
        <span className="text-base font-bold text-[#2e312f] dark:text-[#f7f4f0] tracking-tight">
          Streamlyned
        </span>
        <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium">
          developed by Scaling Dynamics
        </span>
      </div>

      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16 items-center flex-1 relative z-10">
        {/* Left Side: Product Mission & Design Philosophy */}
        <div className="md:col-span-7 space-y-6 max-w-xl animate-fade-up" style={{ animationDelay: "100ms" }}>
          
          {/* Calm-Work Philosophy Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#dfc4c0] bg-[#f3dbda]/65 dark:bg-[#b85b4b]/15 text-[#855348] dark:text-[#e5c3c0] text-xs font-semibold uppercase tracking-wider">
            <Sparkles size={12} className="text-[#c06c5c]" />
            <span>Calm-Work Philosophy</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-serif font-medium tracking-tight text-[#2e312f] dark:text-[#f7f4f0] leading-[1.15]">
            Consolidate work.<br />Eliminate noise.
          </h1>

          <p className="text-base text-[#4c504d] dark:text-[#c4bdb4] leading-[1.7] font-sans">
            Streamlyned is an AI-native project management platform designed specifically for small teams &amp; solo founders. By replacing scattered channels with unified workspaces &amp; reduce daily cognitive load.
          </p>

          <div className="space-y-4 pt-6 border-t border-[#ebdccb]/60 dark:border-neutral-800 max-w-lg">
            <div className="flex gap-3.5">
              <span className="text-[#c06c5c] dark:text-[#e5c3c0] font-bold text-sm select-none">✓</span>
              <div>
                <h4 className="text-sm font-bold text-[#2e312f] dark:text-[#f7f4f0]">Retrieval over generation</h4>
                <p className="text-xs text-[#5c615d] dark:text-[#aba49b] leading-relaxed mt-0.5">AI retrieves, ranks, and cites your team's context. No agent loops, no hallucinated content.</p>
              </div>
            </div>
            <div className="flex gap-3.5">
              <span className="text-[#c06c5c] dark:text-[#e5c3c0] font-bold text-sm select-none">✓</span>
              <div>
                <h4 className="text-sm font-bold text-[#2e312f] dark:text-[#f7f4f0]">Workspace multi-tenancy &amp; isolation</h4>
                <p className="text-xs text-[#5c615d] dark:text-[#aba49b] leading-relaxed mt-0.5">Strict permission boundaries at the database level. Clients only see what you enable.</p>
              </div>
            </div>
            <div className="flex gap-3.5">
              <span className="text-[#c06c5c] dark:text-[#e5c3c0] font-bold text-sm select-none">✓</span>
              <div>
                <h4 className="text-sm font-bold text-[#2e312f] dark:text-[#f7f4f0]">Human in command</h4>
                <p className="text-xs text-[#5c615d] dark:text-[#aba49b] leading-relaxed mt-0.5">Your data, completely private. You choose what to index and control how it responds.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Authentication Card */}
        <div className="md:col-span-5 w-full bg-white/70 dark:bg-neutral-900/50 backdrop-blur-md border border-[#ebdccb]/60 dark:border-neutral-800 rounded-3xl p-6 md:p-8 shadow-xl shadow-[#ebdccb]/10 dark:shadow-none animate-fade-up" style={{ animationDelay: "300ms" }}>
          <h2 className="text-lg font-bold text-[#2e312f] dark:text-[#f7f4f0] tracking-tight mb-2">
            Get started today
          </h2>
          <p className="text-xs text-neutral-400 mb-6">
            Enter your details to create an account or sign in to your workspace.
          </p>
          {authError && (
            <div className="bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400 text-xs px-3 py-2 rounded-lg border border-red-100 dark:border-red-950/30 mb-4">
              Sign-in failed: <span className="font-mono">{decodeURIComponent(authError)}</span>
            </div>
          )}
          <LandingForm />
        </div>
      </div>

      {/* Footer Instructions for Reviewer */}
      <div className="max-w-6xl mx-auto w-full text-center border-t border-[#ebdccb]/60 dark:border-neutral-800 pt-8 mt-12 relative z-10 animate-fade-up" style={{ animationDelay: "450ms" }}>
        <p className="text-xs text-neutral-400 flex items-center justify-center gap-1.5 flex-wrap">
          <span>Quick Evaluation: Click the</span>
          <span className="bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
            Dev Options
          </span>
          <span>pill at the bottom right to log in as Syed Irfan (Owner) or Test-4 (Client) instantly.</span>
        </p>
      </div>
    </div>
  );
}
