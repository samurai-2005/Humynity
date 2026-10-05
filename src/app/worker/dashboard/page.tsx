"use client";

import { useState } from "react";

export default function WorkerDashboard() {
  // Empty state waiting for Supabase Realtime WebSockets
  const [activeGigs, setActiveGigs] = useState<any[]>([]);

  return (
    <div className="min-h-screen bg-canvas-light dark:bg-canvas-dark py-12 px-6 text-foreground-light dark:text-foreground-dark relative">
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#363638_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none"></div>

      <div className="max-w-[800px] mx-auto relative z-10 space-y-6">
        
        {/* Radar Header */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-4xl font-semibold tracking-display mb-2">Live Gig Radar</h1>
            <p className="text-muted-light dark:text-muted-dark tracking-body text-sm">
              Tasks matching your precise skill matrix will appear here instantly.
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-pill border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-foreground-light dark:bg-foreground-dark opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-foreground-light dark:bg-foreground-dark"></span>
            </span>
            <span className="text-xs font-medium uppercase tracking-wide">Listening</span>
          </div>
        </div>

        {/* Radar Feed */}
        <div className="space-y-4">
          {activeGigs.length === 0 ? (
            <div className="py-20 text-center rounded-panel border border-dashed border-border-light dark:border-border-dark bg-surface-light/50 dark:bg-surface-dark/50 backdrop-blur-md">
              <div className="w-16 h-16 mx-auto rounded-full bg-canvas-light dark:bg-canvas-dark border border-border-light dark:border-border-dark flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-muted-light dark:text-muted-dark opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8.75 21V3m-4.5 13.5l4.5 4.5 4.5-4.5m4.5-13.5v18m-4.5-4.5l4.5 4.5 4.5-4.5" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-foreground-light dark:text-foreground-dark mb-1">
                Radar is active
              </h3>
              <p className="text-sm text-muted-light dark:text-muted-dark">
                Waiting for incoming tasks...
              </p>
            </div>
          ) : (
            activeGigs.map((gig) => (
              <div key={gig.id}>
                {/* The gig card UI will be injected here once the websocket pipeline is built */}
              </div>
            ))
          )}
        </div>
        
      </div>
    </div>
  );
}