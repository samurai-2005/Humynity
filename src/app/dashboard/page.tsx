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
  const [username, setUsername] = useState<string>("User");

  // 1. Fetch Client's Posted Gigs
  const fetchClientGigs = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("gigs")
      .select(
        "id, title, primary_category, base_budget, total_escrow, status, worker_id, created_at, delivered_at, revision_count"
      )
      .eq("poster_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setClientGigs(data as ClientGig[]);
    }
    setLoadingGigs(false);
  }, [supabase]);

  useEffect(() => {
    async function initUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setCurrentUserId(user.id);

      // Fetch Profile Username
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
      const {
        data: { user },
      } = await supabase.auth.getUser();

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
  const activeCount = clientGigs.filter((g) =>
    ["searching", "locked", "delivered"].includes(g.status)
  ).length;
  const completedCount = clientGigs.filter((g) => g.status === "rated").length;

  return (
    <div className="min-h-screen bg-canvas-light dark:bg-canvas-dark py-8 px-4 sm:px-6 text-foreground-light dark:text-foreground-dark">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* WELCOME HEADER & QUICK SUMMARY */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-light dark:border-border-dark">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Welcome back, <span className="text-blue-600 dark:text-blue-400">@{username}</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-light dark:text-muted-dark mt-1">
              Manage your tasks, review specialist deliverables, and monitor live progress.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-pill bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-xs flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-muted-light dark:text-muted-dark font-medium">Active:</span>
              <span className="font-bold font-mono">{activeCount}</span>
            </div>
            <div className="px-3 py-1.5 rounded-pill bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-xs flex items-center gap-1.5 shadow-sm">
              <span className="text-muted-light dark:text-muted-dark font-medium">Completed:</span>
              <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {completedCount}
              </span>
            </div>
          </div>
        </div>

        {/* ACTION REQUIRED: PENDING DELIVERABLES BANNER */}
        {pendingReviewCount > 0 && (
          <div className="p-4 sm:p-5 bg-amber-500/10 border-2 border-amber-500/30 rounded-panel flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg flex-shrink-0">
                🔔
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-amber-700 dark:text-amber-300">
                  {pendingReviewCount} Deliverable{pendingReviewCount > 1 ? "s" : ""} Ready for Your Review
                </h2>
                <p className="text-xs text-muted-light dark:text-muted-dark mt-0.5">
                  Specialists have submitted work. Review the preview files to approve release or request changes.
                </p>
              </div>
            </div>
            <a
              href="#task-history"
              className="h-9 px-4 rounded-pill bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs flex items-center justify-center flex-shrink-0 transition-transform active:scale-95 shadow-sm"
            >
              Review Deliverables ↓
            </a>
          </div>
        )}

        {/* PRIMARY ACTION CARDS */}
        <div className="grid md:grid-cols-3 gap-6">
          
          {/* POST TASK HERO CARD */}
          <div className="md:col-span-2 p-6 sm:p-8 bg-surface-light dark:bg-surface-dark rounded-panel border border-border-light dark:border-border-dark shadow-sm flex flex-col justify-between relative overflow-hidden group">
            <div className="space-y-3 relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-pill bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold">
                ✨ Task Delegation
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Need something done?</h2>
              <p className="text-xs sm:text-sm text-muted-light dark:text-muted-dark leading-relaxed max-w-lg">
                Choose a domain or popular template, set your budget, and match with an available specialist in minutes. Payment stays protected until you approve.
              </p>
            </div>

            <div className="mt-6 pt-4 flex flex-wrap items-center gap-3 relative z-10">
              <button
                onClick={() => router.push("/client/post-job")}
                className="h-11 px-6 rounded-pill bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-transform active:scale-95 shadow-md shadow-blue-500/20"
              >
                + Post a New Task
              </button>
              <span className="text-xs text-muted-light dark:text-muted-dark">
                Starting from ₹500 with 100% Escrow Protection
              </span>
            </div>
          </div>

          {/* SPECIALIST MODE CARD */}
          <div className="p-6 sm:p-8 bg-surface-light dark:bg-surface-dark rounded-panel border border-border-light dark:border-border-dark shadow-sm flex flex-col justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-pill bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                💼 Specialist Mode
              </div>
              <h3 className="text-lg font-bold">Earn by Delivering Tasks</h3>
              <p className="text-xs text-muted-light dark:text-muted-dark leading-relaxed">
                Receive live task invitations matched to your skill tier. Claim tasks, submit deliverables, and get paid directly.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-border-light dark:border-border-dark">
              <button
                onClick={handleWorkerRouting}
                disabled={routingWorker}
                className="w-full h-11 px-4 rounded-pill border border-border-light dark:border-border-dark hover:border-emerald-500 text-foreground-light dark:text-foreground-dark font-semibold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {routingWorker ? "Verifying..." : "Open Specialist Radar →"}
              </button>
            </div>
          </div>

        </div>

        {/* TASK HISTORY & DELIVERIES TABLE */}
        <div id="task-history" className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-2">
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight">My Tasks & Deliveries</h2>
              <p className="text-xs text-muted-light dark:text-muted-dark">
                Track active progress, review submitted deliverables, and access task workspaces.
              </p>
            </div>
            <button
              onClick={() => currentUserId && fetchClientGigs(currentUserId)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline self-start sm:self-auto font-medium"
            >
              🔄 Refresh List
            </button>
          </div>

          {loadingGigs ? (
            <div className="p-12 text-center text-xs text-muted-light dark:text-muted-dark bg-surface-light dark:bg-surface-dark rounded-panel border border-border-light dark:border-border-dark">
              Loading your tasks...
            </div>
          ) : clientGigs.length === 0 ? (
            <div className="p-12 text-center bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-panel space-y-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-600 mx-auto flex items-center justify-center text-xl">
                📂
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold">No tasks created yet</h3>
                <p className="text-xs text-muted-light dark:text-muted-dark max-w-sm mx-auto">
                  When you post a task, you can track specialist progress and review deliverables right here.
                </p>
              </div>
              <Link
                href="/client/post-job"
                className="inline-flex items-center h-10 px-5 rounded-pill bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md"
              >
                Post Your First Task →
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-panel shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-canvas-light dark:bg-canvas-dark text-muted-light dark:text-muted-dark uppercase tracking-wider font-semibold border-b border-border-light dark:border-border-dark">
                  <tr>
                    <th className="p-4">Date</th>
                    <th className="p-4">Task Title</th>
                    <th className="p-4">Domain</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Workspace</th>
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
                            : "hover:bg-canvas-light/50 dark:hover:bg-canvas-dark/50"
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
                        <td className="p-4 font-mono font-bold">
                          ₹{item.base_budget}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-pill text-[10px] font-bold uppercase tracking-wider ${
                              isDelivered
                                ? "bg-amber-500/10 text-amber-600 border border-amber-500/30 animate-pulse"
                                : isRated
                                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                : isLocked
                                ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                                : isCancelled
                                ? "bg-red-500/10 text-red-500 border border-red-500/20"
                                : "bg-purple-500/10 text-purple-600 border border-purple-500/20"
                            }`}
                          >
                            {isDelivered
                              ? "Review Needed"
                              : isRated
                              ? "Completed"
                              : isLocked
                              ? "In Progress"
                              : isCancelled
                              ? "Cancelled / Refunded"
                              : "Matching Specialist"}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {isDelivered ? (
                            <Link
                              href={`/client/workspace/${item.id}`}
                              className="inline-block h-8 px-4 rounded-pill bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs leading-8 transition-transform active:scale-95 shadow-sm"
                            >
                              Review Delivery →
                            </Link>
                          ) : isLocked ? (
                            <Link
                              href={`/client/workspace/${item.id}`}
                              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                            >
                              Track Progress →
                            </Link>
                          ) : isSearching ? (
                            <Link
                              href={`/client/radar?gigId=${item.id}`}
                              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                            >
                              Live Radar →
                            </Link>
                          ) : (
                            <Link
                              href={`/client/workspace/${item.id}`}
                              className="text-muted-light dark:text-muted-dark hover:underline font-medium"
                            >
                              Workspace Details →
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