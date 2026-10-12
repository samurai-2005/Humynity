"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && (window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const EXTRACTOR_PROMPT_TEMPLATE = `CRITICAL INSTRUCTION: ACT AS A TECHNICAL ESCROW AUDITOR.
I need to hand this project over to an external senior engineer on the Humynity platform.
Based on our entire conversation history, generate a "Humynity Handoff Manifest" using the exact structure below.

STRICT REDACTION DIRECTIVES:
- NEVER reveal, echo, or include actual API keys, database connection strings, passwords, JWT tokens, Stripe live/test secrets, or Supabase service_role keys.
- Mask ANY secret as [REDACTED_SECRET].
- State facts, errors, and reproducible code only. Do not invent hypothetical solutions.

Output in this exact markdown format:

### 1. REPO & RUNTIME ENVIRONMENT
- Framework & Core Libraries: (e.g., Next.js 15.1 App Router, Supabase JS v2, Tailwind v4)
- Runtime / OS Context: (e.g., Localhost Node 20, Windows, Docker, Vercel, or Browser Builder like Bolt/v0)
- GitHub Repo Available: [YES / NO / PRIVATE] (If YES, provide branch/URL if known)

### 2. CORE BUG & CONSOLE OUTPUT
- Error Summary: (1 sentence executive summary of what is broken)
- Exact Error Output: (Paste the exact terminal stack trace, browser console error, or HTTP status code)
- Trigger Action: (What exact button, API call, or CLI command causes the error?)

### 3. FAILED ATTEMPTS & ROOT CAUSE SUSPICION
- What we tried that failed: (List 2-4 prompts or code changes we made that did not resolve it)
- Where the bug is living: (List exact file paths and line ranges involved)

### 4. ENVIRONMENT & SECRET DEPENDENCIES
- Does reproducing this require private API keys, custom database seeds, or local session state? [YES / NO]
- Can this bug be reproduced in isolation outside the local machine? [YES / NO]

### 5. DEFINITION OF "DONE"
- Expected Outcome: (What exact output, test pass, or UI state proves the bug is 100% resolved?)`;

export default function VibeDebugPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<1 | 2>(1);
  const [manifestText, setManifestText] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [isTakingLonger, setIsTakingLonger] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Prefilled Form States
  const [executionMode, setExecutionMode] = useState<"live_workspace" | "async_task">("live_workspace");
  const [modeRationale, setModeRationale] = useState("");
  const [actionInstruction, setActionInstruction] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [githubUrl, setGithubUrl] = useState("");
  const [baseBudget, setBaseBudget] = useState("1200");
  const [timeLimit, setTimeLimit] = useState("2");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Billing calculations
  const parsedBudget = parseFloat(baseBudget) || 0;
  const platformFee = Math.round(parsedBudget * 0.12);
  const cgst = Math.round(parsedBudget * 0.09);
  const sgst = Math.round(parsedBudget * 0.09);
  const totalPayable = parsedBudget + platformFee + cgst + sgst;

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(EXTRACTOR_PROMPT_TEMPLATE);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      setErrorMsg("Failed to copy prompt to clipboard. Please copy manually.");
    }
  };

  const handleAnalyzeManifest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manifestText.trim() || analyzing) return;

    setAnalyzing(true);
    setIsTakingLonger(false);
    setErrorMsg(null);

    // If heavy prompt takes longer than 6 seconds, inform the client to be patient
    const noticeTimer = setTimeout(() => {
      setIsTakingLonger(true);
    }, 6000);

    try {
      const res = await fetch("/api/ai/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manifest: manifestText }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed.");

      setExecutionMode(data.recommended_mode);
      setModeRationale(data.mode_rationale);
      setActionInstruction(data.client_action_instruction);

      if (data.form_prefill) {
        setTitle(data.form_prefill.title || "");
        setDescription(data.form_prefill.description || "");
        setSkills(data.form_prefill.skills || []);
        if (data.form_prefill.recommended_bounty_inr) {
          setBaseBudget(data.form_prefill.recommended_bounty_inr.toString());
        }
        if (data.form_prefill.recommended_duration_hours) {
          setTimeLimit(data.form_prefill.recommended_duration_hours.toString());
        }
      }

      setStep(2);
    } catch (err: any) {
      let userMessage = "AI analysis service is temporarily busy. Please try clicking analyze again in a moment.";
      try {
        const rawMsg = err.message || "";
        if (rawMsg.includes("{") && rawMsg.includes("}")) {
          const match = rawMsg.match(/"message"\s*:\s*"([^"]+)"/);
          if (match && match[1]) {
            userMessage = match[1].replace(/\\"/g, '"');
          }
        } else if (rawMsg) {
          userMessage = rawMsg;
        }
      } catch {
        // Keep default message
      }
      setErrorMsg(userMessage);
    } finally {
      clearTimeout(noticeTimer);
      setAnalyzing(false);
      setIsTakingLonger(false);
    }
  };

  const handleAuthorizeAndLockEscrow = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const payload = {
        posterId: user.id,
        title: title.trim(),
        description: description.trim(),
        baseBudget: parsedBudget,
        timeLimit: Number(timeLimit),
        category: "Code Review",
        selectedSkills: skills,
        executionMode,
        modeRationale,
        manifestRaw: manifestText,
        githubUrl: githubUrl.trim() || null,
      };

      const response = await fetch("/api/escrow/create-hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok || !data.orderId || !data.gigId) {
        throw new Error(data.error || "Unable to initialize escrow authorization.");
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Razorpay failed to load. Please verify connection.");
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: "INR",
        name: "Humynity",
        description: `Escrow Hold: ${title}`,
        order_id: data.orderId,
        handler: async function (paymentResponse: any) {
          try {
            await fetch("/api/dispatch", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                gigId: data.gigId,
                paymentId: paymentResponse.razorpay_payment_id,
                jobCategory: "Code Review",
                jobSkills: skills,
                jobTier: parsedBudget >= 3000 ? "T3" : "T2",
              }),
            });
            router.push(`/client/radar?gigId=${data.gigId}`);
          } catch {
            router.push(`/client/radar?gigId=${data.gigId}`);
          }
        },
        modal: {
          ondismiss: () => setIsSubmitting(false),
        },
        theme: { color: "#2563EB" },
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas-light dark:bg-canvas-dark py-12 px-6 text-foreground-light dark:text-foreground-dark">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-light dark:text-muted-dark">
          <button onClick={() => router.push("/client/post-job")} className="hover:underline">
            Categories
          </button>
          <span>/</span>
          <span className="font-semibold text-foreground-light dark:text-foreground-dark">
            ⚡ Vibe-Code Debugging
          </span>
        </div>

        {/* Step Indicator Header */}
        <div className="border-b border-border-light dark:border-border-dark pb-4">
          <h1 className="text-2xl font-bold tracking-tight">Vibe-Code Emergency Triage</h1>
          <p className="text-xs text-muted-light dark:text-muted-dark mt-1">
            {step === 1
              ? "Step 1: Extract Manifest & Run Gemini Architectural Triage"
              : "Step 2: Review Pre-filled Brief & Authorize Escrow"}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-input text-xs text-red-500 font-medium">
            {errorMsg}
          </div>
        )}

        {/* STEP 1: EXTRACTOR PROMPT */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-surface-subtle-light dark:bg-surface-subtle-dark border border-border-light dark:border-border-dark rounded-panel p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  1. Copy Diagnostic Extractor Prompt
                </span>
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="px-4 py-2 rounded-pill bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-all"
                >
                  {isCopied ? "✓ Copied!" : "Copy Extractor Prompt"}
                </button>
              </div>
              <p className="text-xs text-muted-light dark:text-muted-dark leading-relaxed">
                Paste this prompt into your current Cursor, Claude, or ChatGPT session. It instructs your AI assistant to dump the exact environment context, file paths, and terminal traces while scrubbing sensitive database passwords and API tokens.
              </p>
            </div>

            <form onSubmit={handleAnalyzeManifest} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-light dark:text-muted-dark">
                  2. Paste Your Assistant&apos;s Response
                </label>
                <textarea
                  required
                  rows={9}
                  value={manifestText}
                  onChange={(e) => setManifestText(e.target.value)}
                  placeholder="Paste the generated Humynity manifest here..."
                  className="w-full p-4 rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark text-xs font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Informational Notice: Visible when a heavy manifest takes longer */}
              {isTakingLonger && analyzing && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-input text-xs text-blue-600 dark:text-blue-400 font-medium animate-in fade-in flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping flex-shrink-0" />
                  <span>
                    Heavy prompt detected. Complex logs and environment dependencies take more time to synthesize—please be patient, architectural triage is in progress.
                  </span>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={analyzing || manifestText.trim().length < 20}
                  className="h-12 px-7 rounded-pill bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider disabled:opacity-50 shadow-md shadow-blue-500/20 transition-all"
                >
                  {analyzing
                    ? isTakingLonger
                      ? "Synthesizing Deep Architecture..."
                      : "Evaluating Technical Architecture..."
                    : "Analyze & Verify Brief →"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 2: PREFILLED FORM & ESCROW HOLD */}
        {step === 2 && (
          <form onSubmit={handleAuthorizeAndLockEscrow} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-6 bg-surface-light dark:bg-surface-dark p-6 rounded-panel border border-border-light dark:border-border-dark shadow-sm">
              
              {/* Triage Verdict Banner */}
              <div
                className={`p-4 rounded-input border space-y-2 ${
                  executionMode === "live_workspace"
                    ? "bg-amber-500/10 border-amber-500/25 text-foreground-light dark:text-foreground-dark"
                    : "bg-blue-500/10 border-blue-500/25 text-foreground-light dark:text-foreground-dark"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        executionMode === "live_workspace" ? "bg-amber-500" : "bg-blue-500"
                      }`}
                    />
                    AI Recommendation: {executionMode === "live_workspace" ? "1-on-1 Live Room" : "Async GitHub PR"}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setExecutionMode(
                        executionMode === "live_workspace" ? "async_task" : "live_workspace"
                      )
                    }
                    className="text-[11px] underline font-semibold text-muted-light dark:text-muted-dark hover:text-foreground-light dark:hover:text-foreground-dark"
                  >
                    Switch to {executionMode === "live_workspace" ? "Async PR" : "Live Room"}
                  </button>
                </div>
                <p className="text-xs text-muted-light dark:text-muted-dark leading-relaxed">
                  {modeRationale}
                </p>
                <div className="pt-2 border-t border-border-light dark:border-border-dark text-xs font-medium">
                  👉 <strong>Next Step:</strong> {actionInstruction}
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">
                  Task Headline
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-11 px-4 rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark text-xs font-medium"
                />
              </div>

              {/* GitHub Link (Optional for Live Screen Share) */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">
                    GitHub Repo Link
                  </label>
                  {executionMode === "live_workspace" && (
                    <span className="text-amber-500 font-semibold">Optional for Live Sessions</span>
                  )}
                </div>
                <input
                  type="url"
                  required={executionMode === "async_task"}
                  placeholder="https://github.com/username/project-repo"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  className="w-full h-11 px-4 rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark text-xs font-mono"
                />
              </div>

              {/* Technical Brief */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">
                  Sanitized Technical Brief
                </label>
                <textarea
                  required
                  rows={6}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-4 rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark text-xs font-mono"
                />
              </div>

              {/* Skills */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">
                  Detected Skills ({skills.length})
                </label>
                <div className="flex flex-wrap gap-2 p-2 bg-canvas-light dark:bg-canvas-dark rounded-input border border-border-light dark:border-border-dark">
                  {skills.map((s) => (
                    <span
                      key={s}
                      className="px-2.5 py-1 bg-blue-600 text-white rounded-pill text-[11px] font-semibold flex items-center gap-1.5"
                    >
                      {s}
                      <button
                        type="button"
                        onClick={() => setSkills(skills.filter((k) => k !== s))}
                        className="hover:opacity-75"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Budget & Time Limit */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">
                    Specialist Reward (₹)
                  </label>
                  <input
                    type="number"
                    min="500"
                    step="100"
                    value={baseBudget}
                    onChange={(e) => setBaseBudget(e.target.value)}
                    className="w-full h-11 px-4 rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark text-xs font-mono font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">
                    Delivery Window
                  </label>
                  <select
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(e.target.value)}
                    className="w-full h-11 px-4 rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark text-xs font-medium"
                  >
                    <option value="1">1 Hour (Critical Fix)</option>
                    <option value="2">2 Hours (Standard)</option>
                    <option value="4">4 Hours (Deep Debug)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Right Column: Escrow Checkout Summary */}
            <div className="lg:col-span-4">
              <div className="sticky top-6 bg-surface-light dark:bg-surface-dark rounded-panel border border-border-light dark:border-border-dark p-6 shadow-sm space-y-6">
                <div>
                  <h2 className="text-lg font-bold">Escrow Summary</h2>
                  <p className="text-xs text-muted-light dark:text-muted-dark mt-0.5">
                    100% protected until verified.
                  </p>
                </div>

                <div className="space-y-3 text-xs border-t border-b border-border-light dark:border-border-dark py-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-light dark:text-muted-dark">Specialist Reward</span>
                    <span className="font-mono font-medium">₹{parsedBudget.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-light dark:text-muted-dark">Handling (12%)</span>
                    <span className="font-mono font-medium">₹{platformFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-light dark:text-muted-dark">CGST + SGST (18%)</span>
                    <span className="font-mono font-medium">₹{(cgst + sgst).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-dashed border-border-light dark:border-border-dark text-sm font-bold">
                    <span>Total Authorization</span>
                    <span className="font-mono text-base">₹{totalPayable.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || parsedBudget < 500}
                  className="w-full h-12 rounded-pill bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider disabled:opacity-50 shadow-md shadow-blue-500/25"
                >
                  {isSubmitting ? "Securing Escrow..." : "Lock Escrow & Dispatch Specialist"}
                </button>
              </div>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}