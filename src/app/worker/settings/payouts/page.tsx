"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function PayoutSettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [workerId, setWorkerId] = useState<string | null>(null);
  const [panNumber, setPanNumber] = useState("");
  const [isPanVerified, setIsPanVerified] = useState(false);
  const [verifyingPan, setVerifyingPan] = useState(false);

  const [payoutMethod, setPayoutMethod] = useState<"bank" | "upi">("bank");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [upiId, setUpiId] = useState("");

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWorkerKYC() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;
      setWorkerId(user.id);

      const { data: worker } = await supabase
        .from("workers")
        .select(
          "pan_number, is_pan_verified, payout_method, account_holder_name, ifsc_code, upi_id"
        )
        .eq("worker_id", user.id)
        .maybeSingle();

      if (worker) {
        if (worker.pan_number && worker.pan_number.length === 10) {
          setPanNumber(worker.pan_number);
        }
        if (worker.is_pan_verified) setIsPanVerified(worker.is_pan_verified);
        if (worker.payout_method) setPayoutMethod(worker.payout_method as "bank" | "upi");
        if (worker.account_holder_name) setAccountName(worker.account_holder_name);
        if (worker.ifsc_code) setIfsc(worker.ifsc_code);
        if (worker.upi_id) setUpiId(worker.upi_id);
      }

      setLoading(false);
    }

    loadWorkerKYC();
  }, [supabase]);

  const handleVerifyPan = async () => {
    if (!workerId || panNumber.trim().length !== 10) {
      alert("Please enter a valid 10-character PAN number.");
      return;
    }
    setVerifyingPan(true);

    try {
      const res = await fetch("/api/worker/verify-pan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workerId, panNumber: panNumber.trim().toUpperCase() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsPanVerified(true);
        alert(data.message || "PAN verified! TDS reduced to 1%.");
      } else {
        alert(data.error || "PAN verification failed.");
      }
    } catch {
      alert("Network error verifying PAN.");
    } finally {
      setVerifyingPan(false);
    }
  };

  const handleSavePayoutDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerId) return;
    setSaving(true);

    const payload = {
      workerId,
      panNumber: panNumber.trim().toUpperCase(),
      payoutMethod,
      details: payoutMethod === "bank" ? { accountName, accountNumber, ifsc } : { upiId },
    };

    try {
      const res = await fetch("/api/worker/payout-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        alert("Payout details securely linked with RazorpayX!");
        router.push("/worker/dashboard");
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert("A network error occurred while saving your details.");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas-light dark:bg-canvas-dark flex items-center justify-center p-6 text-foreground-light dark:text-foreground-dark">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-foreground-light dark:border-foreground-dark border-t-transparent rounded-full animate-spin" />
          <p className="text-xs uppercase tracking-wider text-muted-light dark:text-muted-dark font-medium">
            Loading Payout Settings...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas-light dark:bg-canvas-dark p-8 text-foreground-light dark:text-foreground-dark flex justify-center">
      <div className="w-full max-w-2xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Specialist Payout & KYC</h1>
          <p className="text-muted-light dark:text-muted-dark text-sm">
            Configure how you receive your earnings from completed Humynity tasks.
          </p>
        </div>

        {/* Section 1: PAN Verification */}
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-panel p-6 shadow-sm">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold mb-1">Tax Verification (KYC)</h2>
              <p className="text-xs text-muted-light dark:text-muted-dark max-w-md">
                Income tax regulations require TDS deduction.{" "}
                <strong className="text-foreground-light dark:text-foreground-dark">
                  Verify your PAN to reduce your TDS deduction from 5% to 1%.
                </strong>
              </p>
            </div>
            {isPanVerified && (
              <span className="px-3 py-1 bg-green-500/10 text-green-600 dark:text-green-400 font-medium text-xs rounded-pill uppercase tracking-wider">
                Verified (1% TDS)
              </span>
            )}
          </div>

          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Enter 10-digit PAN (e.g. ABCDE1234F)"
              value={panNumber}
              onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
              disabled={isPanVerified}
              maxLength={10}
              className="flex-1 h-12 px-4 rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark focus:outline-none focus:border-foreground-light dark:focus:border-foreground-dark transition-colors disabled:opacity-50 font-mono text-sm"
            />
            <button
              type="button"
              onClick={handleVerifyPan}
              disabled={isPanVerified || verifyingPan || panNumber.trim().length !== 10}
              className="h-12 px-6 rounded-pill bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors disabled:opacity-50"
            >
              {verifyingPan ? "Verifying..." : isPanVerified ? "Verified ✓" : "Verify PAN"}
            </button>
          </div>
        </div>

        {/* Section 2: Payout Destination */}
        <form
          onSubmit={handleSavePayoutDetails}
          className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-panel p-6 shadow-sm space-y-6"
        >
          <h2 className="text-xl font-semibold">Withdrawal Method</h2>

          <div className="flex gap-4 p-1 bg-canvas-light dark:bg-canvas-dark rounded-input border border-border-light dark:border-border-dark">
            <button
              type="button"
              onClick={() => setPayoutMethod("bank")}
              className={`flex-1 h-10 rounded-sm text-xs font-semibold transition-colors ${
                payoutMethod === "bank"
                  ? "bg-surface-light dark:bg-surface-dark shadow-sm text-foreground-light dark:text-foreground-dark"
                  : "text-muted-light dark:text-muted-dark hover:text-foreground-light dark:hover:text-foreground-dark"
              }`}
            >
              Direct Bank Transfer (IMPS/NEFT)
            </button>
            <button
              type="button"
              onClick={() => setPayoutMethod("upi")}
              className={`flex-1 h-10 rounded-sm text-xs font-semibold transition-colors ${
                payoutMethod === "upi"
                  ? "bg-surface-light dark:bg-surface-dark shadow-sm text-foreground-light dark:text-foreground-dark"
                  : "text-muted-light dark:text-muted-dark hover:text-foreground-light dark:hover:text-foreground-dark"
              }`}
            >
              UPI VPA
            </button>
          </div>

          <div className="pt-2 space-y-4">
            {payoutMethod === "bank" ? (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">
                    Account Holder Name
                  </label>
                  <input
                    required
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Full name registered with bank"
                    className="w-full h-12 px-4 rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark text-sm focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">
                      Account Number
                    </label>
                    <input
                      required
                      type="password"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="Account Number"
                      className="w-full h-12 px-4 rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark text-sm focus:outline-none font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">
                      IFSC Code
                    </label>
                    <input
                      required
                      type="text"
                      maxLength={11}
                      value={ifsc}
                      onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                      placeholder="HDFC0001234"
                      className="w-full h-12 px-4 rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark text-sm focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">
                  UPI ID (VPA)
                </label>
                <input
                  required
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. mobile@paytm or name@okhdfcbank"
                  className="w-full h-12 px-4 rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark text-sm focus:outline-none"
                />
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-border-light dark:border-border-dark flex items-center justify-between">
            <p className="text-[11px] text-muted-light dark:text-muted-dark max-w-sm">
              Your banking details are tokenized by RazorpayX. Humynity never stores unencrypted account numbers.
            </p>
            <button
              type="submit"
              disabled={saving}
              className="h-12 px-8 rounded-pill bg-foreground-light dark:bg-foreground-dark text-canvas-light dark:text-canvas-dark font-medium text-xs transition-transform active:scale-95 disabled:opacity-50"
            >
              {saving ? "Registering Beneficiary..." : "Save Payout Details"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}