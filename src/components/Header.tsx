"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useRef } from "react";

export default function Header() {
  const router = useRouter();
  const supabase = createClient();

  const [username, setUsername] = useState<string | null>(null);
  const [balance, setBalance] = useState("0.00");
  const [isWorker, setIsWorker] = useState(false);

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchUserIdentity = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user && isMounted) {
        const defaultName = user.email ? user.email.split("@")[0] : "User";
        setUsername(user.user_metadata?.username || defaultName);

        const { data: worker } = await supabase
          .from("workers")
          .select("terms_accepted")
          .eq("worker_id", user.id)
          .maybeSingle();

        if (isMounted) {
          setIsWorker(Boolean(worker?.terms_accepted));
        }
      }
    };

    fetchUserIdentity();

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      isMounted = false;
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  };

  return (
    <header className="w-full border-b border-border-light dark:border-border-dark bg-surface-light/80 dark:bg-surface-dark/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

        <Link
          href="/dashboard"
          className="flex items-center gap-3 font-bold tracking-display text-xl text-foreground-light dark:text-foreground-dark group"
        >
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center group-hover:scale-105 transition-transform shadow-md shadow-blue-500/20">
            <span className="text-lg font-serif italic pr-0.5">H</span>
          </div>
          Humynity
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-light dark:text-muted-dark">
          <Link
            href="/dashboard"
            className="hover:text-foreground-light dark:hover:text-foreground-dark transition-colors"
          >
            Hub
          </Link>
          <Link
            href="/client/post-job"
            className="hover:text-foreground-light dark:hover:text-foreground-dark transition-colors"
          >
            Post a Gig
          </Link>
          <Link
            href={isWorker ? "/worker/dashboard" : "/worker/onboarding"}
            className="hover:text-foreground-light dark:hover:text-foreground-dark transition-colors"
          >
            Live Radar
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          {username && (
            <div className="hidden md:flex flex-col items-end mr-2">
              <span className="text-sm font-semibold tracking-wide text-foreground-light dark:text-foreground-dark">
                @{username}
              </span>
              <span className="text-[11px] font-medium uppercase tracking-widest text-muted-light dark:text-muted-dark mt-0.5">
                ₹{balance} Available
              </span>
            </div>
          )}

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="w-10 h-10 rounded-full bg-border-light dark:bg-border-dark border border-border-light dark:border-border-dark flex items-center justify-center text-foreground-light dark:text-foreground-dark hover:ring-2 ring-blue-500 transition-all"
              aria-label="User Menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-panel shadow-xl py-2 animate-in fade-in slide-in-from-top-2 z-50 text-xs">
                <Link
                  href="/dashboard"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-foreground-light dark:text-foreground-dark hover:bg-canvas-light dark:hover:bg-canvas-dark transition-colors"
                >
                  📊 Dashboard Hub
                </Link>

                <div className="h-px bg-border-light dark:border-border-dark my-1" />

                {/* Client Section */}
                <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-light dark:text-muted-dark">
                  Client Account
                </div>
                <Link
                  href="/client/settings/billing"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-foreground-light dark:text-foreground-dark hover:bg-canvas-light dark:hover:bg-canvas-dark transition-colors"
                >
                  💳 Payment & Billing (UPI)
                </Link>

                <div className="h-px bg-border-light dark:border-border-dark my-1" />

                {/* Specialist Section */}
                <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-light dark:text-muted-dark">
                  Specialist Account
                </div>
                {isWorker ? (
                  <>
                    <Link
                      href="/worker/dashboard"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-foreground-light dark:text-foreground-dark hover:bg-canvas-light dark:hover:bg-canvas-dark transition-colors"
                    >
                      📡 Live Gig Radar
                    </Link>
                    <Link
                      href="/worker/settings/payouts"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-blue-600 font-semibold hover:bg-canvas-light dark:hover:bg-canvas-dark transition-colors"
                    >
                      🏦 Payout & KYC Settings
                    </Link>
                  </>
                ) : (
                  <Link
                    href="/worker/onboarding"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-blue-600 font-semibold hover:bg-canvas-light dark:hover:bg-canvas-dark transition-colors"
                  >
                    ⚡ Activate Specialist Profile →
                  </Link>
                )}

                <div className="h-px bg-border-light dark:border-border-dark my-1" />

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-500/10 transition-colors text-left"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden text-foreground-light dark:text-foreground-dark"
            aria-label="Toggle Navigation Menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16m-7 6h7"}
              />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}