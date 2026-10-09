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
  const [isWorker, setIsWorker] = useState(false);
  const [isPanVerified, setIsPanVerified] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Live Database Worker Metrics
  const [rating, setRating] = useState<string>("New");
  const [tier, setTier] = useState<string>("T1");
  const [tasksCompleted, setTasksCompleted] = useState<number>(0);
  const [standing, setStanding] = useState<string>("good");

  useEffect(() => {
    let isMounted = true;

    const fetchUserIdentity = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user && isMounted) {
        // 1. Fetch Profile Username
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

        // 2. Fetch live metrics from workers table
        const { data: worker } = await supabase
          .from("workers")
          .select("terms_accepted, is_pan_verified, rating_avg, tier, tasks_completed, standing")
          .eq("worker_id", user.id)
          .maybeSingle();

        if (isMounted && worker) {
          setIsWorker(Boolean(worker.terms_accepted));
          setIsPanVerified(Boolean(worker.is_pan_verified));

          if (worker.tier) setTier(worker.tier);
          if (worker.standing) setStanding(worker.standing);
          if (typeof worker.tasks_completed === "number") {
            setTasksCompleted(worker.tasks_completed);
          }

          // Format real database rating
          if (worker.rating_avg !== null && worker.rating_avg !== undefined) {
            const parsedRating = parseFloat(String(worker.rating_avg));
            setRating(isNaN(parsedRating) || parsedRating === 0 ? "New" : parsedRating.toFixed(1));
          } else {
            setRating("New");
          }
        }
      }
    };

    fetchUserIdentity();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  // Close drawer automatically on route change
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

          {/* DRAWER BUTTON */}
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

      {/* SLIDE-OUT PROFILE DRAWER */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsDrawerOpen(false)}
          />

          <div className="relative w-full max-w-xs sm:max-w-sm h-full bg-surface-light dark:bg-surface-dark border-l border-border-light dark:border-border-dark p-6 shadow-2xl flex flex-col justify-between overflow-y-auto z-10 animate-in slide-in-from-right duration-250">
            <div className="space-y-6">
              {/* Profile Card Header */}
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

              {/* LIVE DATABASE RATING & STANDING CARD (REPLACES BALANCE) */}
              <div className="p-4 bg-canvas-light dark:bg-canvas-dark rounded-input border border-border-light dark:border-border-dark flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-light dark:text-muted-dark block">
                    {isWorker ? "Specialist Standing" : "Account Verification"}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    {isWorker ? (
                      <>
                        <span className="text-sm font-bold text-amber-500 font-mono flex items-center gap-1">
                          ★ {rating}
                        </span>
                        <span className="text-xs text-muted-light dark:text-muted-dark font-medium">
                          • {tier} ({tasksCompleted} completed)
                        </span>
                      </>
                    ) : (
                      <span className="text-xs font-semibold text-foreground-light dark:text-foreground-dark">
                        Verified Identity
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-pill text-[10px] font-bold uppercase tracking-wider ${
                    standing === "good"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                  }`}
                >
                  {standing}
                </span>
              </div>

              {/* MAIN NAVIGATION */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-light dark:text-muted-dark px-2 block mb-1">
                  General
                </span>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-canvas-light dark:hover:bg-canvas-dark transition-colors"
                >
                  <span>📊</span> Workspace Hub
                </Link>
                <Link
                  href="/profile"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-canvas-light dark:hover:bg-canvas-dark transition-colors"
                >
                  <span>👤</span> Personal Profile
                </Link>
                <Link
                  href="/leaderboard"
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold hover:bg-canvas-light dark:hover:bg-canvas-dark transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <span>🏆</span> Leaderboard
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-pill bg-blue-500/10 text-blue-500 font-semibold">
                    Soon
                  </span>
                </Link>
                <Link
                  href="/community"
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold hover:bg-canvas-light dark:hover:bg-canvas-dark transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <span>💬</span> Community
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-pill bg-purple-500/10 text-purple-500 font-semibold">
                    Soon
                  </span>
                </Link>
              </div>

              {/* SPECIALIST SECTION */}
              <div className="space-y-1 pt-2 border-t border-border-light dark:border-border-dark">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-light dark:text-muted-dark px-2 block mb-1">
                  Specialist Radar
                </span>
                {isWorker ? (
                  <>
                    <Link
                      href="/worker/dashboard"
                      className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold hover:bg-canvas-light dark:hover:bg-canvas-dark transition-colors"
                    >
                      <span className="flex items-center gap-3">
                        <span>📡</span> Live Gig Radar
                      </span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </Link>
                    <Link
                      href="/worker/settings/payouts"
                      className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold hover:bg-canvas-light dark:hover:bg-canvas-dark transition-colors"
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
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition-colors"
                  >
                    <span>⚡</span> Become a Specialist →
                  </Link>
                )}
              </div>

              {/* BILLING & INVOICES */}
              <div className="space-y-1 pt-2 border-t border-border-light dark:border-border-dark">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-light dark:text-muted-dark px-2 block mb-1">
                  Payments
                </span>
                <Link
                  href="/client/settings/billing"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-muted-light dark:text-muted-dark hover:text-foreground-light dark:hover:text-foreground-dark transition-colors"
                >
                  <span>💳</span> Payment & Billing
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