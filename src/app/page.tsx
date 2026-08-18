import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import LandingForm from "@/components/landing-form";

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await getSession();

  // If already authenticated, go directly to the workspace dashboard
  if (session) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const authError = params.error;

  return (
    <div className="min-h-screen h-screen flex flex-col justify-between bg-black text-white font-mono overflow-hidden relative select-none">
      {/* CSS Stylesheet Inject for Scanlines, Data Rain, and Stark Terminals */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes data-rain {
          0% { background-position: 0 0; }
          100% { background-position: 0 600px; }
        }
        @keyframes text-flicker {
          0%, 100% { opacity: 1; }
          23% { opacity: 1; }
          24% { opacity: 0.2; }
          26% { opacity: 0.2; }
          27% { opacity: 1; }
          78% { opacity: 1; }
          79% { opacity: 0.4; }
          80% { opacity: 0.4; }
          81% { opacity: 1; }
        }
        @keyframes type-in {
          from { width: 0; }
          to { width: 100%; }
        }
        .animate-scanline {
          animation: scanline 8s linear infinite;
        }
        .data-rain-bg {
          background-image: linear-gradient(0deg, rgba(0, 0, 0, 0.95), rgba(0, 0, 0, 0.95)), 
            url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='10' y='20' fill='%2300ff00' font-family='monospace' font-size='10' opacity='0.25'%3E10101%3C/text%3E%3Ctext x='50' y='40' fill='%2300ff00' font-family='monospace' font-size='8' opacity='0.15'%3E01100%3C/text%3E%3Ctext x='30' y='70' fill='%2300ff00' font-family='monospace' font-size='9' opacity='0.2'%3E11011%3C/text%3E%3Ctext x='70' y='90' fill='%2300ff00' font-family='monospace' font-size='11' opacity='0.3'%3E00101%3C/text%3E%3C/svg%3E");
          background-size: 200px 200px;
          animation: data-rain 8s linear infinite;
        }
        .glow-red {
          text-shadow: 0 0 8px #FF2D2D, 0 0 15px rgba(255, 45, 45, 0.4);
        }
        .glow-amber {
          text-shadow: 0 0 8px #FFD700, 0 0 15px rgba(255, 215, 0, 0.4);
        }
        .animate-flicker {
          animation: text-flicker 4s linear infinite;
        }
      `}} />

      {/* 1. Background data rain & live processing static noise */}
      <div className="absolute inset-0 z-0 data-rain-bg opacity-[0.06] pointer-events-none" />

      {/* 2. Vertically traveling horizontal radar refresh scanline */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-[#FF2D2D]/35 shadow-[0_0_8px_#FF2D2D] z-10 pointer-events-none animate-scanline" />

      {/* 3. Global System Status Header */}
      <div className="w-full relative z-20 bg-black">
        <div className="flex flex-row justify-between items-center px-4 py-2 text-[10px] tracking-widest select-none">
          <div>
            <span className="text-[#FFD700] font-bold">[ STREAMLYNED ]</span>
            <span className="text-neutral-500 ml-2">// PROJECT_CONTROL_SPINE_v2.1</span>
          </div>
          <div className="text-neutral-400 flex gap-4">
            <span>PING: 14ms</span>
            <span className="hidden sm:inline">ENC: AES-256</span>
            <span>UPTIME: 99.99%</span>
          </div>
        </div>
        {/* Stark Red Dividing Line */}
        <div className="w-full h-[1px] bg-[#FF2D2D]" />
      </div>

      {/* 4. Main Interface (Full-Screen Split) */}
      <div className="flex-1 w-full flex flex-col md:flex-row relative z-20 items-stretch">
        
        {/* Left Panel: The Manifest (60% width) */}
        <div className="flex-1 md:w-3/5 border-b md:border-b-0 md:border-r border-neutral-800 p-6 md:p-12 flex flex-col justify-center space-y-8 bg-black">
          <div className="space-y-4 max-w-xl">
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-none">
              BLUEPRINT TO GENERAL LEDGER.
            </h1>
            <h2 className="text-lg md:text-xl font-bold tracking-widest text-[#FF2D2D] glow-red animate-flicker">
              &gt; ELIMINATE EXECUTION DRIFT.
            </h2>
          </div>

          <p className="text-xs text-neutral-300 leading-[1.8] max-w-lg font-sans">
            Streamlyned is an AI-native project control spine built specifically for heavy engineering, contractors, and builders. Connect daily site progress (DPR), material procurements, and subcontract commitments directly to your project ledger—eliminating the lag between physical execution and financial truth.
          </p>

          {/* Directory styled comment-code blocks */}
          <div className="space-y-4 max-w-xl border-t border-neutral-800 pt-6 text-[11px]">
            <div className="grid grid-cols-1 gap-1">
              <span className="text-[#FFD700] font-bold">01_RECONCILIATION.dat</span>
              <span className="text-neutral-400 pl-4 border-l border-neutral-800 leading-relaxed font-sans">
                Reconciled Money Trails. Automatically match commitments to actual costs. DPR and vendor invoices post directly to WBS nodes, ensuring project costs reconcile perfectly with your ledger.
              </span>
            </div>
            
            <div className="grid grid-cols-1 gap-1">
              <span className="text-[#FFD700] font-bold">02_ISOLATION.dat</span>
              <span className="text-neutral-400 pl-4 border-l border-neutral-800 leading-relaxed font-sans">
                Rigid Contract &amp; WIP. Maintain strict multi-tenancy and permission boundaries between site engineers, subcontractors, and clients. Share progress certification sheets without exposing internal costing records.
              </span>
            </div>

            <div className="grid grid-cols-1 gap-1">
              <span className="text-[#FFD700] font-bold">03_INTEGRITY.dat</span>
              <span className="text-neutral-400 pl-4 border-l border-neutral-800 leading-relaxed font-sans">
                Period-Locked Integrity. Lock closed accounting periods automatically. Late site syncs from mobile devices are held for future periods, preventing retrospective changes that corrupt tax returns and audits.
              </span>
            </div>
          </div>
        </div>

        {/* Right Panel: The Authentication Terminal (40% width) */}
        <div className="md:w-2/5 p-6 md:p-12 flex flex-col justify-center items-center bg-black">
          <div className="w-full max-w-md border border-white p-6 md:p-8 bg-black rounded-none shadow-none relative">
            
            {/* Status indicators */}
            <div className="absolute -top-3 right-4 bg-black px-2 text-[9px] text-neutral-500 uppercase tracking-widest select-none">
              SECURE_LINK // NODE_4B
            </div>

            <LandingForm />
          </div>
        </div>

      </div>

      {/* 5. Stark Scale Ruler Footer */}
      <div className="w-full relative z-20 bg-black">
        {/* Glowing blueprint scale ruler line */}
        <div className="w-full h-[1px] bg-neutral-800 relative">
          <div className="absolute inset-x-0 -top-[3px] flex justify-between px-6 text-[6px] text-neutral-600 font-mono select-none">
            <span>| 0%</span><span>| 10%</span><span>| 20%</span><span>| 30%</span><span>| 40%</span><span>| 50%</span><span>| 60%</span><span>| 70%</span><span>| 80%</span><span>| 90%</span><span>| 100%</span>
          </div>
        </div>

        <div className="flex flex-row justify-between items-center px-4 py-3 text-[10px] text-neutral-500 border-t border-neutral-900">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-white tracking-widest text-xs select-none">
              STREAMLYNED
            </span>
            <span className="w-1.5 h-3 bg-[#FFD700] inline-block animate-pulse align-middle" />
            <span className="text-[9px] text-[#00FF00] ml-2 select-none font-mono hidden sm:inline">// SYSTEM SECURED BY STREAMLYNED PROTOCOL // CC: 256bit</span>
          </div>
          <div className="text-[9px] text-neutral-500">
            © 2026 // BUILD v.8.2.4
          </div>
        </div>
      </div>
    </div>
  );
}
