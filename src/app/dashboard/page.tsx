"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function UnifiedDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [routing, setRouting] = useState(false);

  const handleWorkerRouting = async () => {
    setRouting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No session");

      const { data: profile } = await supabase
        .from('profiles')
        .select('primary_category')
        .eq('id', user.id)
        .single();

      // If they have a primary category, they are already onboarded
      if (profile?.primary_category) {
        router.push("/worker/dashboard");
      } else {
        router.push("/worker/onboarding");
      }
    } catch (err) {
      console.error(err);
      setRouting(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas-light dark:bg-canvas-dark bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#363638_1px,transparent_1px)] [background-size:24px_24px] py-12 px-6 flex items-center justify-center">
      <div className="w-full max-w-[800px]">
        
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-pill border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-[11px] font-semibold uppercase tracking-widest text-muted-light dark:text-muted-dark">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            Anonymous Marketplace MVP
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-display text-foreground-light dark:text-foreground-dark mb-4">
            Welcome to AnonGig
          </h1>
          <p className="text-muted-light dark:text-muted-dark tracking-body text-base">
            The secure, zero-bias platform where top talent meets urgent tasks. How would you like to proceed today?
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Post a Job Card */}
          <button 
            onClick={() => router.push("/client/post-job")}
            className="text-left group p-8 bg-surface-light/90 dark:bg-surface-dark/90 backdrop-blur-md rounded-panel border border-border-light dark:border-border-dark hover:border-foreground-light dark:hover:border-foreground-dark transition-all duration-300 shadow-sm"
          >
            <div className="w-12 h-12 mb-6 rounded-xl bg-foreground-light text-canvas-light dark:bg-foreground-dark dark:text-canvas-dark flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <h2 className="text-2xl font-semibold mb-3">Post a Gig</h2>
            <p className="text-muted-light dark:text-muted-dark text-sm leading-relaxed mb-6">
              Post tasks, find exact 85%+ skill matches instantly, and securely review work before releasing escrow payments.
            </p>
            <span className="text-sm font-medium flex items-center gap-2 group-hover:translate-x-1 transition-transform">
              Enter as Client <span aria-hidden="true">&rarr;</span>
            </span>
          </button>

          {/* Find a Job Card */}
          <button 
            onClick={handleWorkerRouting}
            disabled={routing}
            className="text-left group p-8 bg-surface-light/90 dark:bg-surface-dark/90 backdrop-blur-md rounded-panel border border-border-light dark:border-border-dark hover:border-foreground-light dark:hover:border-foreground-dark transition-all duration-300 shadow-sm disabled:opacity-50"
          >
            <div className="w-12 h-12 mb-6 rounded-xl bg-foreground-light text-canvas-light dark:bg-foreground-dark dark:text-canvas-dark flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
            </div>
            <h2 className="text-2xl font-semibold mb-3">Find a Gig</h2>
            <p className="text-muted-light dark:text-muted-dark text-sm leading-relaxed mb-6">
              Receive exclusive task alerts matching your skills, complete gigs anonymously, and earn escrowed cash.
            </p>
            <span className="text-sm font-medium flex items-center gap-2 group-hover:translate-x-1 transition-transform">
              {routing ? "Verifying Profile..." : "Enter as Worker"} <span aria-hidden="true">&rarr;</span>
            </span>
          </button>
        </div>

      </div>
    </div>
  );
}