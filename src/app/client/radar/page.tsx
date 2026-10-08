"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function RadarContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const gigId = searchParams.get("gigId");
  const supabase = createClient();

  const [totalTimeLeft, setTotalTimeLeft] = useState(300); // 5-minute search window
  const [isExhausted, setIsExhausted] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [matchedWorker, setMatchedWorker] = useState(false);
  const [resolvedUuid, setResolvedUuid] = useState<string | null>(null);

  const isOrderId = typeof gigId === "string" && gigId.startsWith("order_");

  const handleMatchedTransition = useCallback(
    (realUuid: string) => {
      console.log("[Client Radar] Specialist match confirmed! Routing to client workspace:", realUuid);
      setMatchedWorker(true);
      setTimeout(() => {
        router.push(`/client/workspace/${realUuid}`);
      }, 700);
    },
    [router]
  );

  useEffect(() => {
    if (!gigId) return;

    let isMounted = true;

    const isClaimed = (status?: string, workerId?: string | null) => {
      return (
        workerId != null ||
        status === "locked" ||
        status === "in_progress" ||
        status === "delivered" ||
        status === "rated"
      );
    };

    // 1. Polling fallback every 2 seconds
    const pollInterval = setInterval(async () => {
      let query = supabase.from("gigs").select("id, status, worker_id");
      if (isOrderId) {
        query = query.eq("razorpay_order_id", gigId);
      } else {
        query = query.eq("id", gigId);
      }

      const { data: gig, error } = await query.maybeSingle();

      if (error) {
        console.error("[Client Radar Poll Error]:", error);
        return;
      }

      if (!isMounted || !gig) return;

      setResolvedUuid(gig.id);

      if (isClaimed(gig.status, gig.worker_id)) {
        clearInterval(pollInterval);
        handleMatchedTransition(gig.id);
      } else if (gig.status === "cancelled" || gig.status === "unmatched") {
        clearInterval(pollInterval);
        setIsExhausted(true);
      }
    }, 2000);

    // 2. Realtime Postgres Changes Listener
    const channelFilter = isOrderId
      ? `razorpay_order_id=eq.${gigId}`
      : `id=eq.${gigId}`;

    const channel = supabase
      .channel(`gig_tracker_${gigId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "gigs",
          filter: channelFilter,
        },
        (payload) => {
          const updated = payload.new as any;
          if (isMounted && updated) {
            setResolvedUuid(updated.id);
            if (isClaimed(updated.status, updated.worker_id)) {
              clearInterval(pollInterval);
              handleMatchedTransition(updated.id);
            } else if (updated.status === "cancelled" || updated.status === "unmatched") {
              clearInterval(pollInterval);
              setIsExhausted(true);
            }
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [gigId, isOrderId, handleMatchedTransition, supabase]);

  // Countdown clock
  useEffect(() => {
    if (totalTimeLeft <= 0) {
      setIsExhausted(true);
      return;
    }

    const timer = setInterval(() => {
      setTotalTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [totalTimeLeft]);

  const handleCancelGig = async () => {
    const targetId = resolvedUuid || gigId;
    if (!targetId) return;

    if (!window.confirm("Cancel this gig and initiate a full escrow refund?")) {
      return;
    }

    setCancelling(true);
    try {
      const res = await fetch("/api/workspace/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gigId: targetId, action: "forfeit" }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || "Gig cancelled. Escrow refund initiated.");
        router.push("/dashboard");
      } else {
        alert(data.error || "Failed to cancel gig.");
      }
    } catch (err) {
      console.error("[Cancel Gig Error]:", err);
      alert("A network error occurred while cancelling.");
    } finally {
      setCancelling(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (!gigId) {
    return (
      <div className="min-h-screen bg-canvas-light dark:bg-canvas-dark flex items-center justify-center p-6 text-foreground-light dark:text-foreground-dark">
        <p className="text-sm text-muted-light dark:text-muted-dark">No task ID provided.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas-light dark:bg-canvas-dark flex items-center justify-center p-6 text-foreground-light dark:text-foreground-dark">
      <div className="w-full max-w-md bg-surface-light dark:bg-surface-dark rounded-panel p-8 shadow-xl border border-border-light dark:border-border-dark text-center">
        {isExhausted ? (
          <div className="space-y-6 animate-in fade-in">
            <div className="w-16 h-16 mx-auto bg-red-500/10 text-red-500 flex items-center justify-center rounded-full mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold">Network Exhausted</h2>
            <p className="text-muted-light dark:text-muted-dark text-sm">
              We could not find an available specialist matching your requirements within the active window.
            </p>
            <p className="text-xs text-muted-light dark:text-muted-dark">
              Your escrow hold has been cancelled and a full refund has been issued.
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full h-12 mt-4 bg-foreground-light dark:bg-foreground-dark text-canvas-light dark:text-canvas-dark rounded-pill font-medium text-sm transition-transform active:scale-95"
            >
              Return to Dashboard
            </button>
          </div>
        ) : matchedWorker ? (
          <div className="space-y-6 animate-in fade-in">
            <div className="w-20 h-20 mx-auto bg-emerald-500/10 text-emerald-500 flex items-center justify-center rounded-full mb-4">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-1">Specialist Matched!</h2>
              <p className="text-muted-light dark:text-muted-dark text-sm">
                An expert accepted your gig. Loading your workspace...
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in">
            <div className="relative w-24 h-24 mx-auto bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30">
              <span className="absolute top-0 right-0 w-4 h-4 bg-green-400 border-2 border-surface-light dark:border-surface-dark rounded-full animate-pulse" />
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-2">Broadcasting Gig...</h2>
              <p className="text-muted-light dark:text-muted-dark text-sm">
                Cascading dispatch to qualified specialists on Live Radar.
              </p>
              <span className="inline-block mt-4 px-3 py-1 bg-blue-500/10 text-blue-600 text-xs font-bold rounded-pill uppercase tracking-wider">
                Targeting 85%+ Skill Overlap
              </span>
            </div>

            <div className="bg-canvas-light dark:bg-canvas-dark p-4 rounded-input border border-border-light dark:border-border-dark space-y-4 text-sm text-left">
              <div className="flex justify-between">
                <span className="text-muted-light dark:text-muted-dark">Dispatch Window:</span>
                <span className="font-mono font-bold text-red-500">{formatTime(totalTimeLeft)}</span>
              </div>
            </div>

            <button
              onClick={handleCancelGig}
              disabled={cancelling}
              className="w-full h-12 border border-red-500/30 text-red-500 hover:bg-red-500/10 rounded-pill font-medium text-sm transition-colors disabled:opacity-50"
            >
              {cancelling ? "Cancelling..." : "Cancel Gig & Refund"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ClientRadarPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-canvas-light dark:bg-canvas-dark flex items-center justify-center text-sm text-muted-light dark:text-muted-dark">
          Loading Radar...
        </div>
      }
    >
      <RadarContent />
    </Suspense>
  );
}