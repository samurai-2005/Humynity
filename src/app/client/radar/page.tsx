"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const SEARCH_STATUS_MESSAGES = [
  "Searching for verified specialists in your domain...",
  "Reviewing specialist availability and workload...",
  "Selecting the best match for your task...",
  "Sending priority task invitation to specialist...",
];

function RadarContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const gigId = searchParams.get("gigId");
  const supabase = createClient();

  const [totalTimeLeft, setTotalTimeLeft] = useState(300); // 5-minute search window
  const [statusMessageIndex, setStatusMessageIndex] = useState(0);
  const [isExhausted, setIsExhausted] = useState(false);
  const [matchedWorker, setMatchedWorker] = useState(false);
  const [resolvedUuid, setResolvedUuid] = useState<string | null>(null);

  // In-app Modal & Action States
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const isOrderId = typeof gigId === "string" && gigId.startsWith("order_");

  const handleMatchedTransition = useCallback(
    (realUuid: string) => {
      setMatchedWorker(true);
      setTimeout(() => {
        router.push(`/client/workspace/${realUuid}`);
      }, 900);
    },
    [router]
  );

  // Cycle status messages gently while client waits
  useEffect(() => {
    if (matchedWorker || isExhausted) return;
    const interval = setInterval(() => {
      setStatusMessageIndex((prev) => (prev + 1) % SEARCH_STATUS_MESSAGES.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [matchedWorker, isExhausted]);

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

  // 5-Minute Countdown clock
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

  // In-app cancellation handler
  const handleConfirmCancel = async () => {
    const targetId = resolvedUuid || gigId;
    if (!targetId) return;

    setCancelling(true);
    setCancelError(null);

    try {
      const res = await fetch("/api/workspace/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gigId: targetId, action: "forfeit" }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowCancelModal(false);
        setIsExhausted(true);
      } else {
        setCancelError(data.error || "Failed to cancel task. Please try again.");
      }
    } catch (err) {
      console.error("[Cancel Task Error]:", err);
      setCancelError("Network error. Please check your connection.");
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
        <p className="text-sm text-muted-light dark:text-muted-dark">No task ID found in session.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas-light dark:bg-canvas-dark flex items-center justify-center p-6 text-foreground-light dark:text-foreground-dark relative">
      <div className="w-full max-w-md bg-surface-light dark:bg-surface-dark rounded-panel p-8 shadow-xl border border-border-light dark:border-border-dark text-center relative z-10">

        {/* STATE 1: SPECIALISTS AT CAPACITY / CANCELLED / REFUNDED */}
        {isExhausted ? (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 mx-auto bg-amber-500/10 text-amber-500 flex items-center justify-center rounded-full">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <div>
              <h2 className="text-2xl font-bold tracking-tight">Specialists Currently Busy</h2>
              <p className="text-muted-light dark:text-muted-dark text-sm mt-2 leading-relaxed">
                All qualified specialists in this domain are currently engaged with active tasks.
              </p>
            </div>

            <div className="p-4 bg-canvas-light dark:bg-canvas-dark rounded-input border border-border-light dark:border-border-dark text-xs text-muted-light dark:text-muted-dark leading-relaxed text-left">
              <p className="font-semibold text-foreground-light dark:text-foreground-dark mb-1">
                ✓ 100% Refund Initiated
              </p>
              Your payment authorization has been released. The full amount is returning to your original payment method.
            </div>

            <button
              onClick={() => router.push("/dashboard")}
              className="w-full h-12 bg-foreground-light dark:bg-foreground-dark text-canvas-light dark:text-canvas-dark rounded-pill font-medium text-sm transition-transform active:scale-95"
            >
              Return to Home
            </button>
          </div>

        /* STATE 2: SPECIALIST MATCHED & ACCEPTED */
        ) : matchedWorker ? (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-20 h-20 mx-auto bg-emerald-500/10 text-emerald-500 flex items-center justify-center rounded-full">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-2">Specialist Assigned!</h2>
              <p className="text-muted-light dark:text-muted-dark text-sm leading-relaxed">
                A verified domain expert accepted your task. Opening your private workspace room...
              </p>
            </div>
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>

        /* STATE 3: SEARCHING & MATCHING (CONSUMER TRACKING VIEW) */
        ) : (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Animated Search Radar Icon */}
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
              <div className="relative w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30">
                <svg className="w-9 h-9 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-2">Finding Your Specialist</h2>
              <p className="text-muted-light dark:text-muted-dark text-sm min-h-[40px] flex items-center justify-center transition-all duration-300">
                {SEARCH_STATUS_MESSAGES[statusMessageIndex]}
              </p>
            </div>

            {/* Matching Window Status Card */}
            <div className="bg-canvas-light dark:bg-canvas-dark p-4 rounded-input border border-border-light dark:border-border-dark space-y-3 text-sm text-left">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-light dark:text-muted-dark">
                  Matching Window
                </span>
                <span className="font-mono font-bold text-foreground-light dark:text-foreground-dark">
                  {formatTime(totalTimeLeft)}
                </span>
              </div>
              <p className="text-xs text-muted-light dark:text-muted-dark leading-relaxed">
                Specialists receive exclusive windows to claim tasks based on expertise fit.
              </p>
            </div>

            {/* Cancel Button */}
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              className="w-full h-12 border border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark hover:text-red-500 hover:border-red-500/30 rounded-pill font-medium text-sm transition-colors"
            >
              Cancel Task & Release Payment
            </button>
          </div>
        )}
      </div>

      {/* CUSTOM IN-APP CANCEL CONFIRMATION MODAL (NO BROWSER ALERTS) */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-panel p-6 shadow-2xl text-center space-y-5">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>

            <div>
              <h3 className="text-lg font-bold">Cancel This Task?</h3>
              <p className="text-xs text-muted-light dark:text-muted-dark mt-2 leading-relaxed">
                Cancelling will halt the search and immediately release the payment hold back to your account.
              </p>
            </div>

            {cancelError && (
              <p className="text-xs text-red-500 bg-red-500/10 p-2 rounded-input">
                {cancelError}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
                className="flex-1 h-11 border border-border-light dark:border-border-dark rounded-pill text-xs font-semibold hover:bg-surface-light dark:hover:bg-surface-dark transition-colors disabled:opacity-50"
              >
                Keep Searching
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={cancelling}
                className="flex-1 h-11 bg-red-600 hover:bg-red-500 text-white rounded-pill text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {cancelling ? "Releasing..." : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClientRadarPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-canvas-light dark:bg-canvas-dark flex items-center justify-center text-sm text-muted-light dark:text-muted-dark">
          Connecting to matching engine...
        </div>
      }
    >
      <RadarContent />
    </Suspense>
  );
}