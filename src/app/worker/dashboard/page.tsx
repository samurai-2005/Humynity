"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface IncomingGig {
  gigId: string;
  category: string;
  budget: number;
  matchScore: number;
}

interface HistoricalGig {
  id: string;
  title: string;
  primary_category: string;
  base_budget: number;
  status: string;
  created_at: string;
  delivered_at: string | null;
}

export default function WorkerDashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [workerId, setWorkerId] = useState<string | null>(null);
  const [activeGig, setActiveGig] = useState<IncomingGig | null>(null);
  const [countdown, setCountdown] = useState(60);
  const [claiming, setClaiming] = useState(false);
  const [history, setHistory] = useState<HistoricalGig[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const activeGigRef = useRef<IncomingGig | null>(null);
  activeGigRef.current = activeGig;

  // 1. Fetch Gig History for authenticated specialist
  const fetchHistory = useCallback(async (currentId: string) => {
    const { data, error } = await supabase
      .from("gigs")
      .select("id, title, primary_category, base_budget, status, created_at, delivered_at")
      .eq("worker_id", currentId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setHistory(data as HistoricalGig[]);
    }
    setLoadingHistory(false);
  }, [supabase]);

  // 2. Query DB directly for any active exclusive dispatch (survives refreshes & dropped WS)
  const checkForActiveDispatch = useCallback(async (currentId: string) => {
    if (activeGigRef.current) return;

    const { data: openOffer, error } = await supabase
      .from("gigs")
      .select("id, primary_category, base_budget, match_score, dispatch_expires_at")
      .eq("candidate_worker_id", currentId)
      .eq("status", "searching")
      .gt("dispatch_expires_at", new Date().toISOString())
      .order("dispatch_expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && openOffer && openOffer.dispatch_expires_at) {
      const remainingSeconds = Math.max(
        0,
        Math.floor((new Date(openOffer.dispatch_expires_at).getTime() - Date.now()) / 1000)
      );

      if (remainingSeconds > 0) {
        setActiveGig({
          gigId: openOffer.id,
          category: openOffer.primary_category,
          budget: Number(openOffer.base_budget),
          matchScore: openOffer.match_score || 95,
        });
        setCountdown(remainingSeconds);
      }
    }
  }, [supabase]);

  // 3. Initialize Specialist Session
  useEffect(() => {
    async function initWorker() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setWorkerId(user.id);
        fetchHistory(user.id);
        checkForActiveDispatch(user.id);
      }
    }

    initWorker();
  }, [supabase, fetchHistory, checkForActiveDispatch]);

  // 4. Realtime Broadcast & Postgres Table Listener
  useEffect(() => {
    if (!workerId) return;

    // A. Listen for instant WebSocket broadcasts
    const broadcastChannel = supabase
      .channel(`radar_${workerId}`)
      .on("broadcast", { event: "new_gig" }, (payload) => {
        console.log("[Worker Dashboard] Received real-time dispatch:", payload.payload);
        setActiveGig(payload.payload as IncomingGig);
        setCountdown(60);
      })
      .subscribe();

    // B. Fallback polling every 4 seconds while idle to catch any missed dispatch
    const pollInterval = setInterval(() => {
      checkForActiveDispatch(workerId);
    }, 4000);

    return () => {
      supabase.removeChannel(broadcastChannel);
      clearInterval(pollInterval);
    };
  }, [workerId, supabase, checkForActiveDispatch]);

  // 5. Countdown timer for incoming match
  useEffect(() => {
    if (!activeGig) return;

    if (countdown <= 0) {
      setActiveGig(null);
      return;
    }

    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [activeGig, countdown]);

  const handleClaim = async () => {
    if (!activeGig || !workerId) return;
    setClaiming(true);

    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gigId: activeGig.gigId,
          workerId: workerId,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        router.push(`/workspace/${data.gigId || activeGig.gigId}`);
      } else {
        alert(data.message || "Failed to claim gig");
        setActiveGig(null);
      }
    } catch (err) {
      console.error("Claim Error:", err);
      alert("Error claiming gig.");
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas-light dark:bg-canvas-dark py-10 px-6 text-foreground-light dark:text-foreground-dark">
      <div className="max-w-5xl mx-auto space-y-10">

        {/* TOP SECTION: LIVE GIG RADAR */}
        <div className="space-y-6">
          <div className="flex justify-between items-end border-b border-border-light dark:border-border-dark pb-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Live Gig Radar</h1>
              <p className="text-muted-light dark:text-muted-dark text-xs mt-1">
                Tasks matching your skill matrix appear here in real time.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/worker/settings/payouts"
                className="h-9 px-4 rounded-pill border border-border-light dark:border-border-dark text-xs font-semibold hover:bg-surface-light dark:hover:bg-surface-dark flex items-center gap-1.5 transition-colors"
              >
                🏦 Payout KYC Settings
              </Link>
              <span className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-pill text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                LISTENING
              </span>
            </div>
          </div>

          {activeGig ? (
            <div className="p-8 bg-surface-light dark:bg-surface-dark rounded-panel border-2 border-blue-500 shadow-xl space-y-6 animate-in zoom-in-95">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">
                    NEW EXCLUSIVE MATCH ({activeGig.matchScore}% FIT)
                  </span>
                  <h2 className="text-2xl font-bold mt-1">{activeGig.category} Task</h2>
                </div>
                <span className="text-3xl font-mono font-bold">₹{activeGig.budget}</span>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border-light dark:border-border-dark">
                <button
                  onClick={handleClaim}
                  disabled={claiming}
                  className="h-12 px-8 rounded-pill bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-transform active:scale-95 disabled:opacity-50"
                >
                  {claiming ? "Claiming..." : "Accept Gig"}
                </button>
                <div className="w-12 h-12 rounded-full border-2 border-red-500 flex items-center justify-center font-mono font-bold text-red-500">
                  {countdown}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-16 border-2 border-dashed border-border-light dark:border-border-dark rounded-panel text-center text-muted-light dark:text-muted-dark text-sm">
              Waiting for incoming tasks matching your skill matrix...
            </div>
          )}
        </div>

        {/* BOTTOM SECTION: SPECIALIST EARNINGS LEDGER */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Task History & Earnings Ledger</h2>
            <button
              onClick={() => workerId && fetchHistory(workerId)}
              className="text-xs text-muted-light dark:text-muted-dark hover:underline"
            >
              Refresh Table
            </button>
          </div>

          {loadingHistory ? (
            <div className="p-8 text-center text-xs text-muted-light dark:text-muted-dark">
              Loading ledger...
            </div>
          ) : history.length === 0 ? (
            <div className="p-8 text-center bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-panel text-xs text-muted-light dark:text-muted-dark">
              No completed gigs recorded yet. Accept your first task from the radar above!
            </div>
          ) : (
            <div className="overflow-x-auto bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-panel">
              <table className="w-full text-left text-xs">
                <thead className="bg-canvas-light dark:bg-canvas-dark text-muted-light dark:text-muted-dark uppercase tracking-wider font-semibold border-b border-border-light dark:border-border-dark">
                  <tr>
                    <th className="p-4">Date</th>
                    <th className="p-4">Gig Title</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Reward</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Workspace</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light dark:divide-border-dark">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-surface-light/50 dark:hover:bg-surface-dark/50 transition-colors">
                      <td className="p-4 text-muted-light dark:text-muted-dark">
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 font-semibold">{item.title}</td>
                      <td className="p-4 text-muted-light dark:text-muted-dark">{item.primary_category}</td>
                      <td className="p-4 font-mono font-bold">₹{item.base_budget}</td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-pill text-[10px] font-bold uppercase ${
                            item.status === "rated"
                              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                              : item.status === "delivered"
                              ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                              : item.status === "cancelled"
                              ? "bg-red-500/10 text-red-500 border border-red-500/20"
                              : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                          }`}
                        >
                          {item.status === "rated" ? "Approved" : item.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <Link
                          href={`/workspace/${item.id}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          Open Room →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}