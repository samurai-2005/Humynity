"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function RadarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gigId = searchParams.get("gigId") || "unknown-gig";

  const [globalTimeLeft, setGlobalTimeLeft] = useState(300); // 5 minutes total
  const [workerTimeLeft, setWorkerTimeLeft] = useState(60);  // 60-second exclusive window
  const [currentCycle, setCurrentCycle] = useState(1);       // Max 5 cycles

  // 1. Dual Countdown Logic (Global Timeout & Serial Worker Window)
  useEffect(() => {
    if (globalTimeLeft <= 0) {
      // Timeout scenario: Exhausted all 5 workers
      return;
    }
    const timer = setInterval(() => {
      setGlobalTimeLeft((prev) => prev - 1);
      setWorkerTimeLeft((prev) => {
        if (prev <= 1) {
          setCurrentCycle((c) => (c < 5 ? c + 1 : 5));
          return 60; // Reset for the next worker in the queue
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [globalTimeLeft]);

  // Formatting the global timer to MM:SS
  const minutes = Math.floor(globalTimeLeft / 60);
  const seconds = globalTimeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="min-h-screen bg-canvas-light dark:bg-canvas-dark bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#363638_1px,transparent_1px)] [background-size:24px_24px] flex flex-col items-center justify-center p-6 text-foreground-light dark:text-foreground-dark relative">
      
      <div className="w-full max-w-md bg-surface-light/90 dark:bg-surface-dark/90 backdrop-blur-xl rounded-panel border border-border-light dark:border-border-dark p-8 shadow-2xl relative z-10">
        
        {/* Pulsing Radar Icon */}
        <div className="relative flex justify-center items-center mb-10 mt-4">
          <div className="absolute w-32 h-32 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
          <div className="absolute w-24 h-24 bg-indigo-500/20 dark:bg-indigo-500/30 rounded-full animate-pulse" style={{ animationDuration: '2s' }}></div>
          <div className="relative z-10 w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.5)]">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 border-2 border-surface-light dark:border-surface-dark rounded-full"></div>
          </div>
        </div>

        {/* Headings */}
        <div className="text-center space-y-3 mb-8">
          <h2 className="text-2xl font-semibold tracking-display">Broadcasting Gig...</h2>
          <p className="text-sm text-muted-light dark:text-muted-dark font-mono">
            Pitching to highest-merit worker.
          </p>
          <div className="mt-4">
            <span className="inline-block px-3 py-1 text-[10px] uppercase font-bold tracking-wider bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-full">
              Targeting 85%+ Skill overlap
            </span>
          </div>
        </div>

        {/* Indeterminate Progress Bar */}
        <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden mb-8 relative">
          <div className="absolute top-0 left-0 h-full bg-indigo-500 w-1/3 rounded-full animate-[slide_2s_ease-in-out_infinite_alternate]"></div>
        </div>

        {/* Stats Panel */}
        <div className="border border-border-light dark:border-border-dark rounded-xl p-5 space-y-4 font-mono text-sm bg-canvas-light/50 dark:bg-canvas-dark/50">
          
          <div className="flex justify-between items-center">
            <span className="text-muted-light dark:text-muted-dark">Active Dispatch Cycle:</span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              Worker {currentCycle} <span className="text-xs text-muted-light dark:text-muted-dark">of 5</span>
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-light dark:text-muted-dark">Worker Response Window:</span>
            <span className="font-semibold">
              {workerTimeLeft}s <span className="text-xs text-muted-light dark:text-muted-dark">(Pending)</span>
            </span>
          </div>
          
          <div className="flex justify-between items-center pt-3 border-t border-border-light dark:border-border-dark">
            <span className="text-muted-light dark:text-muted-dark">Total Timeout In:</span>
            <span className={`font-bold ${globalTimeLeft <= 60 ? 'text-rose-600 dark:text-rose-500 animate-pulse' : 'text-rose-500'}`}>
              {formattedTime}
            </span>
          </div>

        </div>

        {/* Developer Override Button (For Testing) */}
        <div className="mt-8 text-center">
          <button 
            onClick={() => alert("Dev Override: Manually triggering 'Worker Found' state...")}
            className="text-xs text-muted-light dark:text-muted-dark hover:text-foreground-light dark:hover:text-foreground-dark transition-colors border-b border-dashed border-muted-light dark:border-muted-dark pb-0.5"
          >
            [Developer Override: Switch to Worker Dash]
          </button>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}} />
    </div>
  );
}

export default function RadarPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas-dark flex items-center justify-center text-white">Loading Radar...</div>}>
      <RadarContent />
    </Suspense>
  );
}