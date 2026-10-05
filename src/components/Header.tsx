"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export default function Header() {
  const router = useRouter();
  const supabase = createClient();
  
  const [username, setUsername] = useState<string | null>(null);
  const [balance, setBalance] = useState("0.00");

  useEffect(() => {
    const fetchUserIdentity = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();
          
        if (data?.username) {
          setUsername(data.username);
        }
      }
    };
    fetchUserIdentity();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="w-full border-b border-border-light dark:border-border-dark bg-surface-light/80 dark:bg-surface-dark/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
        
        {/* Brand / Logo */}
        <Link href="/dashboard" className="flex items-center gap-3 font-semibold tracking-display text-lg text-foreground-light dark:text-foreground-dark group">
          <div className="w-7 h-7 rounded-[8px] bg-foreground-light text-canvas-light dark:bg-foreground-dark dark:text-canvas-dark flex items-center justify-center group-hover:scale-105 transition-transform">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          AnonGig
        </Link>

        {/* Center Navigation */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-light dark:text-muted-dark">
          <Link href="/dashboard" className="hover:text-foreground-light dark:hover:text-foreground-dark transition-colors">
            Hub
          </Link>
          <Link href="/client/post-job" className="hover:text-foreground-light dark:hover:text-foreground-dark transition-colors">
            Post a Gig
          </Link>
          <Link href="/worker/dashboard" className="hover:text-foreground-light dark:hover:text-foreground-dark transition-colors">
            Live Radar
          </Link>
        </nav>

        {/* Right Actions: Identity & Disconnect */}
        <div className="flex items-center gap-6">
          
          {username && (
            <div className="hidden md:flex flex-col items-end border-r border-border-light dark:border-border-dark pr-6">
              <span className="text-sm font-semibold tracking-wide text-foreground-light dark:text-foreground-dark">
                @{username}
              </span>
              <span className="text-[11px] font-medium uppercase tracking-widest text-muted-light dark:text-muted-dark mt-0.5">
                ₹{balance} Available
              </span>
            </div>
          )}

          <button 
            onClick={handleLogout} 
            className="text-xs uppercase tracking-wider font-semibold px-5 py-2 rounded-pill border border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark hover:text-foreground-light dark:hover:text-foreground-dark hover:bg-border-light dark:hover:bg-border-dark transition-all"
          >
            Disconnect
          </button>
        </div>

      </div>
    </header>
  );
}