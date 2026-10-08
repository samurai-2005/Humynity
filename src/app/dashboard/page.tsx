"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface ClientGig {
  id: string;
  title: string;
  primary_category: string;
  base_budget: number;
  total_escrow: number;
  status: string;
  worker_id: string | null;
  created_at: string;
  delivered_at: string | null;
  revision_count: number;
}

export default function UnifiedDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [routingWorker, setRoutingWorker] = useState(false);
  const [clientGigs, setClientGigs] = useState<ClientGig[]>([]);
  const [loadingGigs, setLoadingGigs] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // 1. Fetch Client's Posted Gigs
  const fetchClientGigs = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("gigs")
      .select("id, title, primary_category, base_budget, total_escrow, status, worker_id, created_at, delivered_at, revision_count")
      .eq("poster_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setClientGigs(data as ClientGig[]);
    }
    setLoadingGigs(false);
  }, [supabase]);

  useEffect(() => {
    async function initUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      setCurrentUserId(user.id);
      fetchClientGigs(user.id);
    }
    initUser();
  }, [supabase, router, fetchClientGigs]);

  // 2. Realtime subscription for gig status updates
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`client_dashboard_${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "gigs",
          filter: `poster_id=eq.${currentUserId}`,
        },
        () => {
          fetchClientGigs(currentUserId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, supabase, fetchClientGigs]);

  const handleWorkerRouting = async () => {
    setRoutingWorker(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: worker } = await supabase
        .from("workers")
        .select("worker_id, terms_accepted")
        .eq("worker_id", user.id)
        .maybeSingle();

      if (worker?.terms_accepted) {
        router.push("/worker/dashboard");
      } else {
        router.push("/worker/onboarding");
      }
    } catch (err) {
      console.error("Routing error:", err);
      router.push("/worker/onboarding");
    } finally {
      setRoutingWorker(false);
    }
  };

  const pendingReviewCount = clientGigs.filter((g) => g.status === "delivered").length;
  const activeEscrowTotal = clientGigs
    .filter((g) => g.status === "searching" || g.status === "locked" || g.status === "delivered")
    .reduce((sum, g) => sum + (Number(g.base_budget) || 0), 0);

  return (
    <div className="min-h-screen bg-canvas-light dark:bg-canvas-dark bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#363638_1px,transparent_1px)] [background-size:24px_24px] py-10 px-6 text-foreground-light dark:text-foreground-dark">
      <div className="max-w-6xl mx-auto space-y-10">

        {/* TOP: ACTION REQUIRED BANNER */}
        {pendingReviewCount > 0 && (
          <div className="p-5 bg-amber-500/10 border-2 border-amber-500/30 rounded-panel flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h2 className="text-base font-bold text-amber-600 dark:text-amber-400">
                  Action Required: {pendingReviewCount} Deliverable{pendingReviewCount > 1 ? "s" : ""} Ready for Review
                </h2>
                <p className="text-xs text-muted-light dark:text-muted-dark">
                  Specialists have submitted work for your verification. Review deliverables to release escrow or request revisions.
                </p>
              </div>
            </div>
            <a
              href="#client-ledger"
              className="h-10 px-5 rounded-pill bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-xs flex items-center justify-center flex-shrink-0 transition-transform active:scale-95"
            >
              Inspect Tasks ↓
            </a>
          </div>
        )}

        {/* QUICK NAVIGATION CARDS */}
        <div className="grid md:grid-cols-2 gap-6">
          <button
            onClick={() => router.push("/client/post-job")}
            className="text-left group p-8 bg-surface-light/90 dark:bg-surface-dark/90 backdrop-blur-md rounded-panel border border-border-light dark:border-border-dark hover:border-foreground-light dark:hover:border-foreground-dark transition-all duration-300 shadow-sm"
          >
            <div className="w-12 h-12 mb-6 rounded-xl bg-blue-600 text-white flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold mb-2">Post a New Gig</h2>
            <p className="text-muted-light dark:text-muted-dark text-xs leading-relaxed mb-6">
              Create an urgent task specification, authorize funds via Razorpay escrow, and match with verified talent instantly.
            </p>
            <span className="text-xs font-semibold flex items-center gap-2 group-hover:translate-x-1 transition-transform text-blue-600">
              Create Task Specification &rarr;
            </span>
          </button>

          <button
            onClick={handleWorkerRouting}
            disabled={routingWorker}
            className="text-left group p-8 bg-surface-light/90 dark:bg-surface-dark/90 backdrop-blur-md rounded-panel border border-border-light dark:border-border-dark hover:border-foreground-light dark:hover:border-foreground-dark transition-all duration-300 shadow-sm disabled:opacity-50"
          >
            <div className="w-12 h-12 mb-6 rounded-xl bg-foreground-light text-canvas-light dark:bg-foreground-dark dark:text-canvas-dark flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold mb-2">Specialist Radar Portal</h2>
            <p className="text-muted-light dark:text-muted-dark text-xs leading-relaxed mb-6">
              Access your real-time gig listener, claim incoming exclusive matches, submit deliverables, and manage KYC payouts.
            </p>
            <span className="text-xs font-semibold flex items-center gap-2 group-hover:translate-x-1 transition-transform">
              {routingWorker ? "Verifying Clearance..." : "Switch to Specialist View &rarr;"}
            </span>
          </button>
        </div>

        {/* CLIENT GIG MANAGEMENT LEDGER */}
        <div id="client-ledger" className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-border-light dark:border-border-dark pb-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Client Project & Escrow Ledger</h2>
              <p className="text-xs text-muted-light dark:text-muted-dark">
                Track live worker execution, inspect deliverables, and release escrow settlements.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="text-muted-light dark:text-muted-dark">
                Active Escrow: <strong className="font-mono text-foreground-light dark:text-foreground-dark">₹{activeEscrowTotal}</strong>
              </span>
              <button
                onClick={() => currentUserId && fetchClientGigs(currentUserId)}
                className="text-blue-600 hover:underline"
              >
                Refresh Ledger
              </button>
            </div>
          </div>

          {loadingGigs ? (
            <div className="p-12 text-center text-xs text-muted-light dark:text-muted-dark">
              Loading your task history...
            </div>
          ) : clientGigs.length === 0 ? (
            <div className="p-12 text-center bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-panel space-y-3">
              <p className="text-sm text-muted-light dark:text-muted-dark">You have not posted any gigs yet.</p>
              <Link
                href="/client/post-job"
                className="inline-block h-10 px-6 rounded-pill bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold leading-10"
              >
                Post Your First Gig
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-panel shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-canvas-light dark:bg-canvas-dark text-muted-light dark:text-muted-dark uppercase tracking-wider font-semibold border-b border-border-light dark:border-border-dark">
                  <tr>
                    <th className="p-4">Date</th>
                    <th className="p-4">Task Specification</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Escrow Value</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light dark:divide-border-dark">
                  {clientGigs.map((item) => {
                    const isDelivered = item.status === "delivered";
                    const isSearching = item.status === "searching";
                    const isLocked = item.status === "locked";
                    const isRated = item.status === "rated";
                    const isCancelled = item.status === "cancelled";

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isDelivered
                            ? "bg-amber-500/5 hover:bg-amber-500/10"
                            : "hover:bg-surface-light/50 dark:hover:bg-surface-dark/50"
                        }`}
                      >
                        <td className="p-4 text-muted-light dark:text-muted-dark font-mono">
                          {new Date(item.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-4 font-semibold text-foreground-light dark:text-foreground-dark max-w-xs truncate">
                          {item.title}
                        </td>
                        <td className="p-4 text-muted-light dark:text-muted-dark">
                          {item.primary_category}
                        </td>
                        <td className="p-4 font-mono font-bold">₹{item.base_budget}</td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-pill text-[10px] font-bold uppercase tracking-wider ${
                              isDelivered
                                ? "bg-amber-500/10 text-amber-600 border border-amber-500/30 animate-pulse"
                                : isRated
                                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                : isLocked
                                ? "bg-purple-500/10 text-purple-600 border border-purple-500/20"
                                : isCancelled
                                ? "bg-red-500/10 text-red-500 border border-red-500/20"
                                : "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                            }`}
                          >
                            {isDelivered
                              ? "Action Needed"
                              : isRated
                              ? "Completed"
                              : isLocked
                              ? "Worker Working"
                              : isCancelled
                              ? "Cancelled"
                              : "Matching"}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {isDelivered ? (
                            <Link
                              href={`/client/workspace/${item.id}`}
                              className="inline-block h-8 px-4 rounded-pill bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs leading-8 transition-transform active:scale-95 shadow-sm"
                            >
                              Review & Decide →
                            </Link>
                          ) : isLocked ? (
                            <Link
                              href={`/client/workspace/${item.id}`}
                              className="text-blue-600 hover:underline font-medium"
                            >
                              Track Progress →
                            </Link>
                          ) : isSearching ? (
                            <Link
                              href={`/client/radar?gigId=${item.id}`}
                              className="text-blue-600 hover:underline font-medium"
                            >
                              Radar Search →
                            </Link>
                          ) : (
                            <Link
                              href={`/client/workspace/${item.id}`}
                              className="text-muted-light dark:text-muted-dark hover:underline"
                            >
                              Receipt Room →
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}