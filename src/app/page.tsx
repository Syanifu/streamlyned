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
    <div className="flex-1 flex flex-col justify-between bg-[#0a0f14] text-[#ffb000] font-mono px-4 md:px-8 py-6 md:py-16 relative overflow-hidden min-h-screen selection:bg-[#00fff5] selection:text-[#0a0f14]">
      {/* CSS Stylesheet Inject for CRT Scanlines, Blueprint Grid and LED animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes bgGridMove {
          0% { background-position: 0 0; }
          100% { background-position: 40px 40px; }
        }
        @keyframes rotate3D {
          0% { transform: rotateX(65deg) rotateY(0deg) rotateZ(0deg); }
          100% { transform: rotateX(65deg) rotateY(0deg) rotateZ(360deg); }
        }
        @keyframes crt-flicker {
          0% { opacity: 0.98; }
          50% { opacity: 0.99; }
          100% { opacity: 0.98; }
        }
        @keyframes scanline-sweep {
          0% { left: -10%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { left: 110%; opacity: 0; }
        }
        @keyframes led-activate-green {
          0%, 25% { background-color: #ffb000; box-shadow: 0 0 4px #ffb000; }
          30%, 100% { background-color: #00ff66; box-shadow: 0 0 12px #00ff66; }
        }
        @keyframes led-activate-yellow {
          0%, 55% { background-color: #ffb000; box-shadow: 0 0 4px #ffb000; }
          60%, 100% { background-color: #ffcc00; box-shadow: 0 0 12px #ffcc00; }
        }
        @keyframes led-activate-red {
          0%, 80% { background-color: #ffb000; box-shadow: 0 0 4px #ffb000; }
          85%, 100% { background-color: #ff3333; box-shadow: 0 0 12px #ff3333; }
        }
        @keyframes text-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes terminal-boot {
          0% { transform: scaleY(0.005) scaleX(0); filter: brightness(3); opacity: 0; }
          40% { transform: scaleY(0.005) scaleX(1); filter: brightness(2.5); opacity: 1; }
          70% { transform: scaleY(1) scaleX(1); filter: brightness(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        .blueprint-grid {
          background-size: 40px 40px;
          background-image: 
            linear-gradient(to right, rgba(0, 255, 245, 0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 255, 245, 0.04) 1px, transparent 1px);
          animation: bgGridMove 20s linear infinite;
        }
        .animate-rotate-3d {
          transform-style: preserve-3d;
          animation: rotate3D 60s linear infinite;
          perspective: 1000px;
        }
        .crt-flicker {
          animation: crt-flicker 0.15s infinite;
        }
        .crt-overlay::after {
          content: " ";
          display: block;
          position: absolute;
          top: 0; left: 0; bottom: 0; right: 0;
          background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.3) 50%);
          z-index: 10;
          background-size: 100% 4px;
          pointer-events: none;
        }
        .scanner-bar {
          background: linear-gradient(90deg, transparent, #00fff5 50%, transparent);
          box-shadow: 0 0 15px #00fff5, 0 0 30px #00fff5;
          animation: scanline-sweep 4.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .led-green-anim {
          animation: led-activate-green 4.5s ease-in-out infinite;
        }
        .led-yellow-anim {
          animation: led-activate-yellow 4.5s ease-in-out infinite;
        }
        .led-red-anim {
          animation: led-activate-red 4.5s ease-in-out infinite;
        }
        .animate-terminal-boot {
          animation: terminal-boot 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transform-origin: center;
        }
        .glow-amber {
          text-shadow: 0 0 8px rgba(255, 176, 0, 0.65), 0 0 20px rgba(255, 176, 0, 0.3);
        }
        .glow-cyan {
          text-shadow: 0 0 8px rgba(0, 255, 245, 0.65), 0 0 20px rgba(0, 255, 245, 0.3);
        }
      `}} />

      {/* Blueprint Grid moving background */}
      <div className="absolute inset-0 z-0 blueprint-grid pointer-events-none" />

      {/* Top-left stenciled system layout */}
      <div className="max-w-6xl mx-auto w-full flex items-center justify-between mb-8 md:mb-10 relative z-10 border-b border-[#ffb000]/25 pb-3">
        <div className="flex items-center gap-3">
          <span className="font-serif font-black text-lg tracking-widest text-[#ffb000] uppercase glow-amber">
            [STREAMLYNED]
          </span>
          <span className="text-[9px] text-[#00fff5] border border-[#00fff5]/30 px-1.5 py-0.5 rounded font-mono glow-cyan">
            ONLINE // SECURE
          </span>
        </div>
        <span className="text-[10px] text-[#ffb000]/60 font-mono">
          DEV_BY: SCALING_DYNAMICS // CWD: /Users/apple/Streamlyned
        </span>
      </div>

      <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col justify-center relative z-10">
        
        {/* 1. Hero Section (Split Screen) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16 items-center py-6 md:py-12">
          
          {/* Left Side: The Briefing & Rotating Wireframe */}
          <div className="md:col-span-7 space-y-6 relative min-h-[380px] flex flex-col justify-center">
            {/* Slowly rotating 3D Tron wireframe bridge/platform */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none flex items-center justify-center opacity-[0.14] dark:opacity-[0.11]">
              <svg className="w-[110%] h-[110%] text-[#00fff5] animate-rotate-3d" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="0.25">
                <path d="M 0 50 L 100 50 M 50 0 L 50 100 M 0 0 L 100 100 M 100 0 L 0 100" />
                <circle cx="50" cy="50" r="45" strokeDasharray="3 3" />
                <circle cx="50" cy="50" r="35" />
                <circle cx="50" cy="50" r="22" strokeDasharray="6 6" />
                <polygon points="50,12 85,75 15,75" />
                <polygon points="50,88 85,25 15,25" />
                <line x1="10" y1="10" x2="90" y2="10" />
                <line x1="10" y1="90" x2="90" y2="90" />
              </svg>
            </div>

            <div className="relative z-10 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-[#00fff5]/35 bg-[#00fff5]/5 text-xs text-[#00fff5] font-bold tracking-widest uppercase glow-cyan">
                <Sparkles size={11} className="animate-spin" />
                <span>INTEGRATION_CORE_ACTIVE</span>
              </div>

              {/* Large glowing amber header */}
              <h1 className="text-3xl md:text-5xl font-serif font-black tracking-tight text-[#ffb000] leading-[1.15] glow-amber uppercase">
                Blueprint to General Ledger.<br />Eliminate the execution drift.
              </h1>

              {/* Clean sans-serif sub-header */}
              <p className="text-sm text-[#ffb000]/80 leading-relaxed font-sans max-w-lg">
                Streamlyned is an AI-native project control spine built specifically for heavy engineering, contractors, and builders. Connect daily site progress (DPR), material procurements, and subcontract commitments directly to your project ledger—eliminating the lag between physical execution and financial truth.
              </p>
            </div>
          </div>

          {/* Right Side: The Login Console */}
          <div className="md:col-span-5 w-full bg-[#11161d] border-2 border-[#ffb000]/40 rounded-xl p-6 md:p-8 shadow-2xl relative overflow-hidden crt-screen crt-overlay crt-flicker animate-terminal-boot">
            {/* CRT Screen Reflection Highlight */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none z-10" />
            
            {/* Terminal Header Info */}
            <div className="flex items-center justify-between text-[9px] text-[#ffb000]/50 border-b border-[#ffb000]/25 pb-3 mb-6 font-mono">
              <span>TERMINAL_ID: SL-X99</span>
              <span>LOC_TIME: {new Date().toISOString().substring(11,19)}</span>
            </div>

            {authError && (
              <div className="bg-red-950/30 text-red-400 text-xs px-3 py-2.5 rounded border border-red-900/40 mb-5 font-mono">
                SEC_ALERT: Auth failed: {decodeURIComponent(authError)}
              </div>
            )}
            
            <LandingForm />
          </div>

        </div>

        {/* 2. Features Section (The System Readouts) */}
        <div className="mt-16 md:mt-24 border-t border-[#ffb000]/25 pt-12 relative overflow-hidden">
          <div className="scanner-bar absolute top-0 bottom-0 pointer-events-none z-10 w-[6px]" />
          
          <h3 className="text-xs uppercase tracking-widest text-[#ffb000]/60 mb-8 font-mono">
            // CRITICAL_SYSTEM_READOUTS //
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            
            {/* Panel 01: Reconciled Money Trails */}
            <div className="border border-[#ffb000]/25 bg-[#0d131a] rounded-lg p-5 font-mono relative overflow-hidden flex flex-col justify-between min-h-[220px]">
              <div>
                <div className="flex items-center justify-between mb-4 border-b border-[#ffb000]/15 pb-2">
                  <span className="text-[10px] text-[#ffb000]/55 uppercase tracking-wider">PANEL_01 // SEC_A</span>
                  {/* Blinking LED */}
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ffb000] border border-black led-green-anim" />
                </div>
                <h4 className="text-sm font-bold uppercase text-[#ffb000] mb-2 glow-amber">Reconciled Money Trails</h4>
                <p className="text-[11px] text-[#ffb000]/80 leading-relaxed font-sans">
                  Automatically match commitments to actual costs. Daily progress (DPR) and vendor invoices post directly to WBS nodes, ensuring project costs reconcile perfectly with your ledger.
                </p>
              </div>
              {/* Faux Waveform Graphic */}
              <div className="h-6 w-full opacity-35 mt-4 flex items-end gap-[2px]">
                <span className="w-1 bg-[#ffb000]" style={{ height: "40%" }} />
                <span className="w-1 bg-[#ffb000]" style={{ height: "60%" }} />
                <span className="w-1 bg-[#ffb000]" style={{ height: "80%" }} />
                <span className="w-1 bg-[#ffb000]" style={{ height: "30%" }} />
                <span className="w-1 bg-[#ffb000]" style={{ height: "50%" }} />
                <span className="w-1 bg-[#ffb000]" style={{ height: "70%" }} />
                <span className="w-1 bg-[#ffb000]" style={{ height: "90%" }} />
                <span className="w-1 bg-[#ffb000]" style={{ height: "45%" }} />
                <span className="w-1 bg-[#ffb000]" style={{ height: "65%" }} />
                <span className="w-1 bg-[#ffb000]" style={{ height: "20%" }} />
              </div>
            </div>

            {/* Panel 02: Rigid Contract & WIP Isolation */}
            <div className="border border-[#ffb000]/25 bg-[#0d131a] rounded-lg p-5 font-mono relative overflow-hidden flex flex-col justify-between min-h-[220px]">
              <div>
                <div className="flex items-center justify-between mb-4 border-b border-[#ffb000]/15 pb-2">
                  <span className="text-[10px] text-[#ffb000]/55 uppercase tracking-wider">PANEL_02 // SEC_B</span>
                  {/* Blinking LED */}
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ffb000] border border-black led-yellow-anim" />
                </div>
                <h4 className="text-sm font-bold uppercase text-[#ffb000] mb-2 glow-amber">Rigid Contract &amp; WIP Isolation</h4>
                <p className="text-[11px] text-[#ffb000]/80 leading-relaxed font-sans">
                  Maintain strict multi-tenancy and permission boundaries between site engineers, subcontractors, and clients. Share progress certification sheets without exposing internal costing records.
                </p>
              </div>
              {/* Faux Waveform Graphic */}
              <div className="h-6 w-full opacity-35 mt-4 flex items-end gap-[2px]">
                <span className="w-1 bg-[#ffb000]" style={{ height: "25%" }} />
                <span className="w-1 bg-[#ffb000]" style={{ height: "45%" }} />
                <span className="w-1 bg-[#ffb000]" style={{ height: "35%" }} />
                <span className="w-1 bg-[#ffb000]" style={{ height: "85%" }} />
                <span className="w-1 bg-[#ffb000]" style={{ height: "15%" }} />
                <span className="w-1 bg-[#ffb000]" style={{ height: "75%" }} />
                <span className="w-1 bg-[#ffb000]" style={{ height: "55%" }} />
                <span className="w-1 bg-[#ffb000]" style={{ height: "95%" }} />
                <span className="w-1 bg-[#ffb000]" style={{ height: "35%" }} />
                <span className="w-1 bg-[#ffb000]" style={{ height: "65%" }} />
              </div>
            </div>

            {/* Panel 03: Period-Locked Integrity */}
            <div className="border border-[#ffb000]/25 bg-[#0d131a] rounded-lg p-5 font-mono relative overflow-hidden flex flex-col justify-between min-h-[220px]">
              <div>
                <div className="flex items-center justify-between mb-4 border-b border-[#ffb000]/15 pb-2">
                  <span className="text-[10px] text-[#ffb000]/55 uppercase tracking-wider">PANEL_03 // SEC_C</span>
                  {/* Blinking LED */}
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ffb000] border border-black led-red-anim" />
                </div>
                <h4 className="text-sm font-bold uppercase text-[#ffb000] mb-2 glow-amber">Period-Locked Integrity</h4>
                <p className="text-[11px] text-[#ffb000]/80 leading-relaxed font-sans">
                  Lock closed accounting periods automatically. Late site syncs from mobile devices are held for future periods, preventing retrospective changes that corrupt tax returns and audits.
                </p>
              </div>
              {/* Faux Waveform Graphic */}
              <div className="h-6 w-full opacity-35 mt-4 flex items-end gap-[2px]">
                <span className="w-1 bg-[#ffb000]" style={{ height: "80%" }} />
                <span className="w-1 bg-[#ffb000]" style={{ height: "70%" }} />
                <span className="w-1 bg-[#ffb000]" style={{ height: "60%" }} />
                <span className="w-1 bg-[#ffb000]" style={{ height: "50%" }} />
                <span className="w-1 bg-[#ffb000]" style={{ height: "40%" }} />
                <span className="w-1 bg-[#ffb000]" style={{ height: "30%" }} />
                <span className="w-1 bg-[#ffb000]" style={{ height: "20%" }} />
                <span className="w-1 bg-[#ffb000]" style={{ height: "10%" }} />
                <span className="w-1 bg-[#ffb000]" style={{ height: "5%" }} />
                <span className="w-1 bg-[#ffb000]" style={{ height: "0%" }} />
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* 3. The Footer */}
      <div className="max-w-6xl mx-auto w-full text-center mt-12 md:mt-16 relative z-10 pt-6">
        {/* Glowing blueprint scale ruler line */}
        <div className="w-full h-2.5 bg-gradient-to-r from-transparent via-[#ffb000]/30 to-transparent relative mb-6">
          <div className="absolute inset-0 flex justify-between text-[6px] text-[#ffb000]/40 font-mono px-4 select-none">
            <span>0.0m</span><span>2.5m</span><span>5.0m</span><span>7.5m</span><span>10.0m</span><span>12.5m</span><span>15.0m</span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#ffb000]/50 border-t border-[#ffb000]/15 pt-4">
          <div className="flex items-center gap-2">
            <span className="font-serif font-black tracking-widest text-[#ffb000] uppercase text-sm glow-amber">
              STREAMLYNED
            </span>
            <span className="w-1 h-3.5 bg-[#ffb000] inline-block animate-pulse align-middle" style={{ animationDuration: "1s" }} />
            <span className="text-[10px] text-[#00fff5] ml-2 glow-cyan">// SECURE CONNECTION ESTABLISHED // BUILD v.8.2.4.</span>
          </div>

          <p className="text-[10px] flex items-center gap-1.5 flex-wrap">
            <span>Quick Evaluation: Click the</span>
            <span className="bg-[#ffb000] text-[#0a0f14] px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border-t border-white/30">
              Dev Options
            </span>
            <span>pill at the bottom right to log in instantly.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
