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

export default function WorkerWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const gigId = params?.gigId as string;
  const supabase = createClient();

  const [gig, setGig] = useState<Gig | null>(null);
  const [currentWorkerId, setCurrentWorkerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [previewUrl, setPreviewUrl] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 1. Authenticate worker session & load gig
  useEffect(() => {
    if (!gigId) return;

    let isMounted = true;

    async function loadWorkspace() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      if (isMounted) setCurrentWorkerId(user.id);

      const { data, error } = await supabase
        .from("gigs")
        .select("*")
        .eq("id", gigId)
        .maybeSingle();

      if (error) {
        console.error("[Worker Workspace] Fetch error:", error);
      } else if (isMounted && data) {
        const gigData = data as Gig;
        setGig(gigData);
        if (gigData.preview_file_url) setPreviewUrl(gigData.preview_file_url);
        if (gigData.source_file_url) setSourceUrl(gigData.source_file_url);
      }
      if (isMounted) setLoading(false);
    }

    loadWorkspace();

    const channel = supabase
      .channel(`worker_workspace_sync_${gigId}`)
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
  }, [gigId, supabase, router]);

  // 2. Countdown Timer: 50% duration on revisions
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!gig?.locked_at || gig.status === "delivered" || gig.status === "rated" || gig.status === "cancelled") {
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

  // 3. Deliverable submission
  const handleWorkerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gig) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/workspace/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gigId: gig.id,
          workerId: currentWorkerId,
          previewUrl,
          sourceUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to submit deliverable");
      } else {
        setGig(data.gig);
      }
    } catch (err) {
      console.error("[Worker Workspace] Submission error:", err);
      alert("Submission failed. Please check network connection.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center text-muted-light dark:text-muted-dark">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-foreground-light dark:border-foreground-dark border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Connecting to Specialist Workspace...</p>
        </div>
      </div>
    );
  }

  if (!gig) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold mb-2">Gig Not Found</h2>
        <button
          onClick={() => router.push("/worker/dashboard")}
          className="h-10 px-6 rounded-pill bg-foreground-light dark:bg-foreground-dark text-canvas-light dark:text-canvas-dark font-medium text-sm"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const isCancelled = gig.status === "cancelled";
  const isApproved = gig.status === "rated";
  const isDelivered = gig.status === "delivered";
  const isRevision = gig.status === "locked" && (gig.revision_count || 0) > 0;
  const txnId = `TXN-HUM-${gig.id.slice(0, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`;

  return (
    <div className="min-h-screen bg-canvas-light dark:bg-canvas-dark py-8 px-6 text-foreground-light dark:text-foreground-dark">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* 1. TASK CANCELLED BANNER */}
        {isCancelled && (
          <div className="p-8 bg-surface-light dark:bg-surface-dark border border-red-500/30 rounded-panel text-center space-y-4 animate-in fade-in">
            <h2 className="text-2xl font-bold text-red-500">Gig Cancelled by Client</h2>
            <p className="text-sm text-muted-light dark:text-muted-dark max-w-md mx-auto">
              The client chose to forfeit and cancel this gig. Your working capacity slot has been cleared and restored to <strong>1</strong>.
            </p>
            <button
              onClick={() => router.push("/worker/dashboard")}
              className="h-11 px-8 rounded-pill bg-foreground-light dark:bg-foreground-dark text-canvas-light dark:text-canvas-dark font-medium text-sm"
            >
              Return to Live Radar
            </button>
          </div>
        )}

        {/* 2. TASK APPROVED / SETTLEMENT RECEIPT */}
        {isApproved && (
          <div className="bg-surface-light dark:bg-surface-dark p-8 rounded-panel border border-border-light dark:border-border-dark space-y-6 animate-in fade-in">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold">Task Approved!</h2>
              <p className="text-sm text-muted-light dark:text-muted-dark">
                The client released the escrow funds for this project.
              </p>
            </div>

            <div className="bg-canvas-light dark:bg-canvas-dark p-6 rounded-input border border-border-light dark:border-border-dark space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div className="p-4 border-b sm:border-b-0 sm:border-r border-border-light dark:border-border-dark">
                  <span className="block text-xs uppercase text-muted-light dark:text-muted-dark">Rating</span>
                  <div className="flex items-center justify-center gap-1 mt-1 text-amber-500 font-bold text-xl">
                    <span>5.0</span>
                    <span>★</span>
                  </div>
                </div>
                <div className="p-4 border-b sm:border-b-0 sm:border-r border-border-light dark:border-border-dark">
                  <span className="block text-xs uppercase text-muted-light dark:text-muted-dark">Settlement</span>
                  <span className="block text-2xl font-bold font-mono text-emerald-500 mt-1">₹{gig.base_budget}</span>
                </div>
                <div className="p-4">
                  <span className="block text-xs uppercase text-muted-light dark:text-muted-dark">Processing</span>
                  <span className="block text-sm font-semibold mt-1">Direct IMPS / UPI</span>
                </div>
              </div>

              <div className="pt-4 border-t border-border-light dark:border-border-dark flex flex-col sm:flex-row justify-between text-xs text-muted-light dark:text-muted-dark">
                <span>Reference: <strong className="font-mono text-foreground-light dark:text-foreground-dark">{txnId}</strong></span>
                <span>Destination: Verified RazorpayX Account</span>
              </div>
            </div>

            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-panel flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3">
                <span className="text-lg">🏦</span>
                <span>Verify your <strong>Bank Account</strong> and <strong>PAN Number</strong> to ensure direct automated settlements.</span>
              </div>
              <Link
                href="/worker/settings/payouts"
                className="font-semibold text-blue-600 hover:underline flex-shrink-0"
              >
                Payout Settings →
              </Link>
            </div>

            <button
              onClick={() => router.push("/worker/dashboard")}
              className="w-full h-12 rounded-pill bg-foreground-light dark:bg-foreground-dark text-canvas-light dark:text-canvas-dark font-medium text-sm transition-transform active:scale-95"
            >
              Back to Live Radar
            </button>
          </div>
        )}

        {/* 3. ACTIVE EXECUTION & DELIVERABLE SUBMISSION */}
        {!isApproved && !isCancelled && (
          <>
            {isRevision && (
              <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-panel flex items-center gap-3 text-amber-600 animate-in fade-in">
                <div className="text-xs sm:text-sm">
                  <strong className="font-bold">Revision Round #{gig.revision_count} Active:</strong> The client requested modifications. Timer has restarted with <strong>50% duration ({(gig.time_limit_hours * 0.5).toFixed(1)} hrs)</strong>.
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 bg-surface-light dark:bg-surface-dark p-6 rounded-panel border border-border-light dark:border-border-dark flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold">{gig.title}</h1>
                    <span className="px-3 py-0.5 rounded-pill text-xs font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 border border-blue-500/20">
                      {isDelivered ? "Under Client Review" : isRevision ? "Revision Needed" : "In Progress"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-light dark:text-muted-dark">
                    Category: <span className="font-medium text-foreground-light dark:text-foreground-dark">{gig.primary_category}</span> • Total Window: {gig.time_limit_hours} Hours
                  </p>
                </div>
              </div>

              <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-panel border border-border-light dark:border-border-dark flex flex-col justify-center items-center text-center">
                <span className="text-xs uppercase tracking-wider text-muted-light dark:text-muted-dark mb-1">
                  {isDelivered ? "Timer Paused" : isRevision ? "Revision Window (50%)" : "Remaining Time"}
                </span>
                <span className={`text-3xl font-mono font-bold ${timeLeft < 1800 && !isDelivered ? "text-red-500" : "text-foreground-light dark:text-foreground-dark"}`}>
                  {isDelivered ? "Reviewing" : formattedTime}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-6">
                <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-panel border border-border-light dark:border-border-dark space-y-4">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted-light dark:text-muted-dark">
                    Task Specification
                  </h2>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-light dark:text-muted-dark">
                    {gig.description || "No specific instructions provided."}
                  </p>

                  <div className="pt-4 border-t border-border-light dark:border-border-dark space-y-2">
                    <span className="block text-xs text-muted-light dark:text-muted-dark">Required Skill Matrix</span>
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
                    Escrow Locked
                  </h3>
                  <div className="flex justify-between text-sm py-1 border-b border-border-light dark:border-border-dark">
                    <span className="text-muted-light dark:text-muted-dark">Base Budget</span>
                    <span className="font-mono font-bold">₹{gig.base_budget}</span>
                  </div>
                  <div className="flex justify-between text-sm py-1">
                    <span className="text-muted-light dark:text-muted-dark">Deposit Status</span>
                    <span className="text-emerald-500 font-semibold">Held in Escrow</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-panel border border-border-light dark:border-border-dark space-y-6">
                  {!isDelivered ? (
                    <>
                      <div className="border-b border-border-light dark:border-border-dark pb-4">
                        <h2 className="text-lg font-bold">{isRevision ? "Submit Revision Deliverable" : "Deliver Your Work"}</h2>
                        <p className="text-xs text-muted-light dark:text-muted-dark">
                          Submitting transfers preview assets to the client and restores your working capacity to 1[cite: 10].
                        </p>
                      </div>

                      <form onSubmit={handleWorkerSubmit} className="space-y-5">
                        <div className="space-y-2">
                          <label className="block text-xs font-semibold uppercase text-muted-light dark:text-muted-dark">
                            Preview / Watermarked Deliverable URL
                          </label>
                          <input
                            type="url"
                            placeholder="https://preview.yourportfolio.com or drive preview"
                            value={previewUrl}
                            onChange={(e) => setPreviewUrl(e.target.value)}
                            required
                            className="w-full h-11 px-4 rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark text-sm focus:outline-none"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-semibold uppercase text-muted-light dark:text-muted-dark">
                            Source Deliverable / Git Repository URL
                          </label>
                          <input
                            type="url"
                            placeholder="https://github.com/... or source archive"
                            value={sourceUrl}
                            onChange={(e) => setSourceUrl(e.target.value)}
                            required
                            className="w-full h-11 px-4 rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark text-sm focus:outline-none"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={submitting}
                          className="w-full h-12 rounded-pill bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-transform active:scale-95 disabled:opacity-50"
                        >
                          {submitting ? "Uploading Deliverables..." : "Submit Task & End Work"}
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="p-8 text-center space-y-4 animate-in fade-in">
                      <div className="w-14 h-14 mx-auto rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center animate-pulse">
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold">Awaiting Client Review</h3>
                      <p className="text-xs text-muted-light dark:text-muted-dark max-w-md mx-auto">
                        Your deliverables are currently being verified by the client[cite: 10]. The timer is paused, and your working capacity slot has been restored to <strong>1</strong> so you can accept other tasks[cite: 10].
                      </p>
                      <div className="p-4 bg-canvas-light dark:bg-canvas-dark rounded-input border border-border-light dark:border-border-dark text-left text-xs space-y-1">
                        <span className="text-muted-light dark:text-muted-dark block font-semibold mb-1">Submitted Deliverable Links:</span>
                        <div className="truncate text-blue-500">Preview: {gig.preview_file_url}</div>
                        <div className="truncate text-blue-500">Source: {gig.source_file_url}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}