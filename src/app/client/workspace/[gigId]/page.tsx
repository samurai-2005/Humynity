"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface Gig {
  id: string;
  title: string;
  description: string;
  primary_category: string;
  required_skills: string[];
  base_budget: number;
  total_escrow: number;
  status: string;
  worker_id: string | null;
  time_limit_hours: number;
  locked_at: string | null;
  delivered_at: string | null;
  preview_file_url: string | null;
  source_file_url: string | null;
  revision_count: number;
}

export default function ClientWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const gigId = params?.gigId as string;
  const supabase = createClient();

  const [gig, setGig] = useState<Gig | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // 1. Initial Load & Realtime Sync
  useEffect(() => {
    if (!gigId) return;

    let isMounted = true;

    const fetchGig = async () => {
      const { data, error } = await supabase
        .from("gigs")
        .select("*")
        .eq("id", gigId)
        .maybeSingle();

      if (error) {
        console.error("[Client Workspace] Fetch error:", error);
      } else if (isMounted && data) {
        setGig(data as Gig);
      }
      if (isMounted) setLoading(false);
    };

    fetchGig();

    const channel = supabase
      .channel(`client_gig_sync_${gigId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "gigs",
          filter: `id=eq.${gigId}`,
        },
        (payload) => {
          if (isMounted) {
            setGig(payload.new as Gig);
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [gigId, supabase]);

  // 2. Countdown Timer
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (
      !gig?.locked_at ||
      gig.status === "delivered" ||
      gig.status === "rated" ||
      gig.status === "cancelled"
    ) {
      return;
    }

    const revisionMultiplier = (gig.revision_count || 0) > 0 ? 0.5 : 1.0;
    const effectiveHours = (gig.time_limit_hours || 2) * revisionMultiplier;
    const durationMs = effectiveHours * 60 * 60 * 1000;

    const startTime = new Date(gig.locked_at).getTime();
    const deadline = startTime + durationMs;

    const updateTimer = () => {
      const remainingSecs = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
      setTimeLeft(remainingSecs);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [gig?.locked_at, gig?.time_limit_hours, gig?.status, gig?.revision_count]);

  const formattedTime = useMemo(() => {
    const hours = Math.floor(timeLeft / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);
    const seconds = timeLeft % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }, [timeLeft]);

  // 3. Client Action Handler
  const handleClientAction = async (action: "satisfied" | "revision" | "reassign" | "forfeit") => {
    if (!gig) return;

    const prompts: Record<string, string> = {
      satisfied: `Release full escrow of ₹${gig.base_budget} to the specialist?`,
      revision: `Request a revision? The specialist's timer will restart with 50% time (${((gig.time_limit_hours || 2) * 0.5).toFixed(1)} hrs).`,
      reassign: "Remove current specialist and send this task back to the Live Radar dispatch cascade?",
      forfeit: "Cancel this gig entirely and initiate a full escrow refund?",
    };

    if (!window.confirm(prompts[action])) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/workspace/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gigId: gig.id, action }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Action failed.");
      } else {
        alert(data.message || "Action updated successfully.");
        if (action === "satisfied" || action === "forfeit") {
          router.push("/dashboard");
        } else if (action === "reassign") {
          router.push(`/client/radar?gigId=${gig.id}`);
        }
      }
    } catch (err) {
      console.error("[Client Workspace Review Error]:", err);
      alert("A network error occurred. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center text-muted-light dark:text-muted-dark">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-foreground-light dark:border-foreground-dark border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Connecting to Client Workspace...</p>
        </div>
      </div>
    );
  }

  if (!gig) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold mb-2">Gig Not Found</h2>
        <Link
          href="/dashboard"
          className="h-10 px-6 rounded-pill bg-foreground-light dark:bg-foreground-dark text-canvas-light dark:text-canvas-dark font-medium text-sm flex items-center justify-center"
        >
          Return to Hub
        </Link>
      </div>
    );
  }

  const isDelivered = gig.status === "delivered";
  const isApproved = gig.status === "rated";
  const isCancelled = gig.status === "cancelled";
  const isRevision = gig.status === "locked" && (gig.revision_count || 0) > 0;

  return (
    <div className="min-h-screen bg-canvas-light dark:bg-canvas-dark py-8 px-6 text-foreground-light dark:text-foreground-dark">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Top Header Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-surface-light dark:bg-surface-dark p-6 rounded-panel border border-border-light dark:border-border-dark flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-2xl font-bold">{gig.title}</h1>
                <span
                  className={`px-3 py-0.5 rounded-pill text-xs font-bold uppercase tracking-wider ${
                    isDelivered
                      ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                      : isApproved
                      ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                      : isCancelled
                      ? "bg-red-500/10 text-red-500 border border-red-500/20"
                      : isRevision
                      ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                      : "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                  }`}
                >
                  {isDelivered
                    ? "Deliverables Submitted"
                    : isApproved
                    ? "Completed & Released"
                    : isCancelled
                    ? "Gig Cancelled"
                    : isRevision
                    ? `Revision #${gig.revision_count} Active`
                    : "Specialist In Progress"}
                </span>
              </div>
              <p className="text-xs text-muted-light dark:text-muted-dark">
                Category:{" "}
                <span className="font-medium text-foreground-light dark:text-foreground-dark">
                  {gig.primary_category}
                </span>{" "}
                • Allocation: {gig.time_limit_hours} Hours
              </p>
            </div>
          </div>

          <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-panel border border-border-light dark:border-border-dark flex flex-col justify-center items-center text-center">
            <span className="text-xs uppercase tracking-wider text-muted-light dark:text-muted-dark mb-1">
              {isDelivered
                ? "Delivery State"
                : isApproved
                ? "Task Completed"
                : isCancelled
                ? "Terminated"
                : "Delivery Window"}
            </span>
            <span
              className={`text-3xl font-mono font-bold ${
                timeLeft < 1800 && !isDelivered && !isApproved && !isCancelled
                  ? "text-red-500"
                  : "text-foreground-light dark:text-foreground-dark"
              }`}
            >
              {isDelivered
                ? "Under Review"
                : isApproved
                ? "Closed"
                : isCancelled
                ? "Cancelled"
                : formattedTime}
            </span>
          </div>
        </div>

        {/* Workspace Body */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column: Requirements & Escrow */}
          <div className="space-y-6">
            <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-panel border border-border-light dark:border-border-dark space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-light dark:text-muted-dark">
                Task Specification
              </h2>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-light dark:text-muted-dark">
                {gig.description || "No specific instructions provided."}
              </p>

              <div className="pt-4 border-t border-border-light dark:border-border-dark space-y-2">
                <span className="block text-xs text-muted-light dark:text-muted-dark">
                  Required Skill Matrix
                </span>
                <div className="flex flex-wrap gap-2">
                  {gig.required_skills?.map((skill) => (
                    <span
                      key={skill}
                      className="px-2.5 py-1 bg-canvas-light dark:bg-canvas-dark border border-border-light dark:border-border-dark rounded-pill text-xs font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-panel border border-border-light dark:border-border-dark space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-light dark:text-muted-dark">
                Escrow Details
              </h3>
              <div className="flex justify-between text-sm py-1 border-b border-border-light dark:border-border-dark">
                <span className="text-muted-light dark:text-muted-dark">Held in Escrow</span>
                <span className="font-mono font-bold">₹{gig.base_budget}</span>
              </div>
              <div className="flex justify-between text-sm py-1">
                <span className="text-muted-light dark:text-muted-dark">Protection</span>
                <span className="text-emerald-500 font-semibold">Active & Secured</span>
              </div>
            </div>
          </div>

          {/* Right Column: Review & Decision Center */}
          <div className="lg:col-span-2">
            <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-panel border border-border-light dark:border-border-dark space-y-6">
              <div className="border-b border-border-light dark:border-border-dark pb-4">
                <h2 className="text-lg font-bold">Client Review Center</h2>
                <p className="text-xs text-muted-light dark:text-muted-dark">
                  Inspect deliverables submitted by the specialist and determine escrow release.
                </p>
              </div>

              {/* State 1: Active In Progress (Worker Working) */}
              {!isDelivered && !isApproved && !isCancelled && (
                <div className="p-12 text-center space-y-3 bg-canvas-light dark:bg-canvas-dark rounded-panel border border-border-light dark:border-border-dark">
                  <div className="w-12 h-12 mx-auto rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center animate-pulse">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold">Specialist Is Actively Working</h3>
                  <p className="text-xs text-muted-light dark:text-muted-dark max-w-sm mx-auto">
                    The matched specialist is currently completing your specifications. Once submitted,
                    preview links and escrow decision actions will appear here automatically.
                  </p>
                </div>
              )}

              {/* State 2: Approved / Rated */}
              {isApproved && (
                <div className="p-12 text-center space-y-3 bg-emerald-500/10 border border-emerald-500/20 rounded-panel">
                  <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-emerald-600">Task Approved & Escrow Released</h3>
                  <p className="text-xs text-muted-light dark:text-muted-dark">
                    Escrow settlement has been initiated to the specialist via RazorpayX.
                  </p>
                </div>
              )}

              {/* State 3: Cancelled */}
              {isCancelled && (
                <div className="p-12 text-center space-y-3 bg-red-500/10 border border-red-500/20 rounded-panel">
                  <h3 className="text-lg font-bold text-red-500">Task Cancelled</h3>
                  <p className="text-xs text-muted-light dark:text-muted-dark">
                    This task was forfeited. Escrow authorization release has been initiated.
                  </p>
                </div>
              )}

              {/* State 4: Delivered (Review Panel with 4 Action Buttons) */}
              {isDelivered && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="p-5 bg-canvas-light dark:bg-canvas-dark rounded-panel border border-border-light dark:border-border-dark space-y-3">
                    <span className="block text-xs font-bold uppercase tracking-wider text-muted-light dark:text-muted-dark">
                      Incoming Deliverables
                    </span>
                    <div className="flex flex-col gap-2.5">
                      {gig.preview_file_url ? (
                        <a
                          href={gig.preview_file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline flex items-center gap-2 text-sm font-medium"
                        >
                          🔗 Open Watermarked / Preview Deliverable
                        </a>
                      ) : (
                        <span className="text-xs text-muted-light dark:text-muted-dark italic">
                          No preview link provided.
                        </span>
                      )}
                      {gig.source_file_url ? (
                        <a
                          href={gig.source_file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline flex items-center gap-2 text-sm font-medium"
                        >
                          📦 Access Full Deliverable / Git Repository
                        </a>
                      ) : (
                        <span className="text-xs text-muted-light dark:text-muted-dark italic">
                          No source link provided.
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <span className="block text-xs font-bold uppercase tracking-wider text-muted-light dark:text-muted-dark">
                      Escrow Decision Actions
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => handleClientAction("satisfied")}
                        disabled={actionLoading}
                        className="h-12 px-4 rounded-pill bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-transform active:scale-95 disabled:opacity-50"
                      >
                        ✓ Satisfied (Release Escrow)
                      </button>

                      <button
                        type="button"
                        onClick={() => handleClientAction("revision")}
                        disabled={actionLoading}
                        className="h-12 px-4 rounded-pill bg-amber-500 hover:bg-amber-400 text-slate-900 font-medium text-xs transition-transform active:scale-95 disabled:opacity-50"
                      >
                        ↺ Request Revision (50% Time)
                      </button>

                      <button
                        type="button"
                        onClick={() => handleClientAction("reassign")}
                        disabled={actionLoading}
                        className="h-12 px-4 rounded-pill border border-border-light dark:border-border-dark hover:bg-surface-light dark:hover:bg-surface-dark font-medium text-xs transition-colors disabled:opacity-50"
                      >
                        ⇄ Find Another Specialist
                      </button>

                      <button
                        type="button"
                        onClick={() => handleClientAction("forfeit")}
                        disabled={actionLoading}
                        className="h-12 px-4 rounded-pill border border-red-500/30 text-red-500 hover:bg-red-500/10 font-medium text-xs transition-colors disabled:opacity-50"
                      >
                        ✕ Forfeit & Cancel Gig
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}