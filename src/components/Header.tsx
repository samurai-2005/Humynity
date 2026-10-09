"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const [username, setUsername] = useState<string>("User");
  const [balance, setBalance] = useState("0.00");
  const [isWorker, setIsWorker] = useState(false);
  const [isPanVerified, setIsPanVerified] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchUserIdentity = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user && isMounted) {
        // Fetch or default username
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .maybeSingle();

        const resolvedName =
          profile?.username ||
          user.user_metadata?.username ||
          (user.email ? user.email.split("@")[0] : "User");

        setUsername(resolvedName);

        // Fetch worker status and KYC verification
        const { data: worker } = await supabase
          .from("workers")
          .select("terms_accepted, is_pan_verified")
          .eq("worker_id", user.id)
          .maybeSingle();

        if (isMounted && worker) {
          setIsWorker(Boolean(worker.terms_accepted));
          setIsPanVerified(Boolean(worker.is_pan_verified));
        }
      }
    };

    fetchUserIdentity();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  // Close drawer automatically on route navigation
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  };

  return (
    <>
      <header className="w-full border-b border-border-light dark:border-border-dark bg-surface-light/90 dark:bg-surface-dark/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* LOGO */}
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 font-bold text-lg sm:text-xl text-foreground-light dark:text-foreground-dark group"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              H
            </div>
            <span>Humynity</span>
          </Link>

          {/* DESKTOP CORE NAV LINKS */}
          <nav className="hidden md:flex items-center gap-6 text-xs sm:text-sm font-semibold text-muted-light dark:text-muted-dark">
            <Link
              href="/dashboard"
              className={`hover:text-foreground-light dark:hover:text-foreground-dark transition-colors ${
                pathname === "/dashboard" ? "text-blue-600 dark:text-blue-400 font-bold" : ""
              }`}
            >
              Hub
            </Link>
            <Link
              href="/client/post-job"
              className={`hover:text-foreground-light dark:hover:text-foreground-dark transition-colors ${
                pathname === "/client/post-job" ? "text-blue-600 dark:text-blue-400 font-bold" : ""
              }`}
            >
              Post a Task
            </Link>
            <Link
              href={isWorker ? "/worker/dashboard" : "/worker/onboarding"}
              className={`hover:text-foreground-light dark:hover:text-foreground-dark transition-colors ${
                pathname.startsWith("/worker") ? "text-blue-600 dark:text-blue-400 font-bold" : ""
              }`}
            >
              Live Radar
            </Link>
          </nav>

          {/* RIGHT ACTIONS: DRAWER TOGGLE (DESKTOP & MOBILE) */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="flex items-center gap-2.5 p-1.5 pl-3 rounded-pill border border-border-light dark:border-border-dark hover:border-blue-500 transition-colors bg-canvas-light/50 dark:bg-canvas-dark/50"
              aria-label="Open Profile Menu"
            >
              <span className="text-xs font-semibold hidden sm:inline-block max-w-[120px] truncate">
                @{username}
              </span>
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                {username.charAt(0).toUpperCase()}
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* SLIDE-OUT PROFILE HAMBURGER DRAWER */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
          
          {/* Backdrop Blur */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative w-full max-w-xs sm:max-w-sm h-full bg-surface-light dark:bg-surface-dark border-l border-border-light dark:border-border-dark p-6 shadow-2xl flex flex-col justify-between overflow-y-auto z-10 animate-in slide-in-from-right duration-250">
            
            <div className="space-y-6">
              
              {/* Drawer Header */}
              <div className="flex justify-between items-center border-b border-border-light dark:border-border-dark pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                    {username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground-light dark:text-foreground-dark leading-tight">
                      @{username}
                    </h3>
                    <span className="text-[11px] text-muted-light dark:text-muted-dark">
                      {isWorker ? "Verified Specialist" : "Client Account"}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-muted-light dark:text-muted-dark hover:bg-canvas-light dark:hover:bg-canvas-dark transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Discreet Wallet Balance Card */}
              <div className="p-4 bg-canvas-light dark:bg-canvas-dark rounded-input border border-border-light dark:border-border-dark flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-light dark:text-muted-dark block">
                    Available Balance
                  </span>
                  <span className="text-lg font-mono font-bold text-foreground-light dark:text-foreground-dark">
                    ₹{balance}
                  </span>
                </div>
                <Link
                  href="/client/settings/billing"
                  className="px-3 py-1.5 rounded-pill bg-foreground-light dark:bg-foreground-dark text-canvas-light dark:text-canvas-dark text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  Deposit
                </Link>
              </div>

              {/* Main Navigation Links */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-light dark:text-muted-dark px-2 block mb-1">
                  Navigation
                </span>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold hover:bg-canvas-light dark:hover:bg-canvas-dark transition-colors"
                >
                  <span>📊</span> Workspace Hub
                </Link>
                <Link
                  href="/client/post-job"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold hover:bg-canvas-light dark:hover:bg-canvas-dark transition-colors"
                >
                  <span>✨</span> Post a New Task
                </Link>
              </div>

              {/* Specialist Management */}
              <div className="space-y-1 pt-2 border-t border-border-light dark:border-border-dark">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-light dark:text-muted-dark px-2 block mb-1">
                  Specialist Radar
                </span>
                {isWorker ? (
                  <>
                    <Link
                      href="/worker/dashboard"
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold hover:bg-canvas-light dark:hover:bg-canvas-dark transition-colors"
                    >
                      <span className="flex items-center gap-3">
                        <span>📡</span> Live Gig Radar
                      </span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </Link>
                    <Link
                      href="/worker/settings/payouts"
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold hover:bg-canvas-light dark:hover:bg-canvas-dark transition-colors text-blue-600 dark:text-blue-400"
                    >
                      <span className="flex items-center gap-3">
                        <span>🏦</span> Payout & KYC Settings
                      </span>
                      {!isPanVerified && (
                        <span className="text-[10px] px-2 py-0.5 rounded-pill bg-amber-500/10 text-amber-500 font-bold">
                          Pending
                        </span>
                      )}
                    </Link>
                  </>
                ) : (
                  <Link
                    href="/worker/onboarding"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition-colors"
                  >
                    <span>⚡</span> Become a Specialist →
                  </Link>
                )}
              </div>

              {/* Billing & Policies */}
              <div className="space-y-1 pt-2 border-t border-border-light dark:border-border-dark">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-light dark:text-muted-dark px-2 block mb-1">
                  Billing & Protection
                </span>
                <Link
                  href="/client/settings/billing"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-muted-light dark:text-muted-dark hover:text-foreground-light dark:hover:text-foreground-dark transition-colors"
                >
                  <span>🧾</span> Past Invoices & Receipts
                </Link>
              </div>

            </div>

            {/* Logout Action */}
            <div className="pt-6 border-t border-border-light dark:border-border-dark">
              <button
                onClick={handleLogout}
                className="w-full h-11 flex items-center justify-center gap-2 rounded-pill border border-red-500/20 text-red-500 hover:bg-red-500/10 text-xs font-semibold transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}