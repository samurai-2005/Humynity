"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface EscrowReceipt {
  id: string;
  title: string;
  base_budget: number;
  platform_fee: number;
  total_escrow: number;
  status: string;
  created_at: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
}

export default function ClientBillingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [preferredUpi, setPreferredUpi] = useState("");
  const [savingUpi, setSavingUpi] = useState(false);
  const [receipts, setReceipts] = useState<EscrowReceipt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadClientBilling() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      // 1. Load saved client metadata
      if (user.user_metadata?.preferred_upi) {
        setPreferredUpi(user.user_metadata.preferred_upi);
      }

      // 2. Fetch past escrow transactions
      const { data: gigs } = await supabase
        .from("gigs")
        .select("id, title, base_budget, platform_fee, total_escrow, status, created_at, razorpay_order_id, razorpay_payment_id")
        .eq("poster_id", user.id)
        .order("created_at", { ascending: false });

      if (gigs) {
        setReceipts(gigs as EscrowReceipt[]);
      }
      setLoading(false);
    }

    loadClientBilling();
  }, [router, supabase]);

  const handleSaveUpi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preferredUpi.includes("@")) {
      alert("Please enter a valid UPI ID (e.g. yourname@okhdfcbank)");
      return;
    }

    setSavingUpi(true);
    const { error } = await supabase.auth.updateUser({
      data: { preferred_upi: preferredUpi.trim() },
    });

    if (error) {
      alert("Failed to save UPI preference: " + error.message);
    } else {
      alert("Preferred UPI ID saved for fast escrow checkout!");
    }
    setSavingUpi(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas-light dark:bg-canvas-dark flex items-center justify-center text-xs text-muted-light dark:text-muted-dark">
        Loading billing & escrow records...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas-light dark:bg-canvas-dark p-8 text-foreground-light dark:text-foreground-dark flex justify-center">
      <div className="w-full max-w-3xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Billing & Payment Settings</h1>
          <p className="text-muted-light dark:text-muted-dark text-xs">
            Manage your payment preferences and review past escrow authorizations.
          </p>
        </div>

        {/* UPI Pre-population Box */}
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-panel p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">Default UPI Method</h2>
            <p className="text-xs text-muted-light dark:text-muted-dark">
              Enter your UPI VPA to auto-fill Razorpay Checkout when depositing funds into escrow.
            </p>
          </div>

          <form onSubmit={handleSaveUpi} className="flex gap-3">
            <input
              type="text"
              placeholder="e.g. mobile@paytm or name@okhdfcbank"
              value={preferredUpi}
              onChange={(e) => setPreferredUpi(e.target.value)}
              required
              className="flex-1 h-11 px-4 rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark text-sm focus:outline-none"
            />
            <button
              type="submit"
              disabled={savingUpi}
              className="h-11 px-6 rounded-pill bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-transform active:scale-95 disabled:opacity-50"
            >
              {savingUpi ? "Saving..." : "Save UPI"}
            </button>
          </form>

          <p className="text-[11px] text-muted-light dark:text-muted-dark">
            ⚡ On mobile devices, Razorpay automatically launches Google Pay, PhonePe, or Paytm with zero manual entry.
          </p>
        </div>

        {/* Escrow Transaction History */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Escrow Authorization History</h2>

          {receipts.length === 0 ? (
            <div className="p-8 text-center bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-panel text-xs text-muted-light dark:text-muted-dark">
              No escrow charges recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-panel">
              <table className="w-full text-left text-xs">
                <thead className="bg-canvas-light dark:bg-canvas-dark text-muted-light dark:text-muted-dark uppercase tracking-wider font-semibold border-b border-border-light dark:border-border-dark">
                  <tr>
                    <th className="p-4">Date</th>
                    <th className="p-4">Task</th>
                    <th className="p-4">Escrow Total</th>
                    <th className="p-4">Razorpay Order</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light dark:divide-border-dark">
                  {receipts.map((item) => (
                    <tr key={item.id} className="hover:bg-canvas-light/50 dark:hover:bg-canvas-dark/50">
                      <td className="p-4 text-muted-light dark:text-muted-dark font-mono">
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 font-semibold">{item.title}</td>
                      <td className="p-4 font-mono font-bold">₹{item.total_escrow}</td>
                      <td className="p-4 font-mono text-[11px] text-muted-light dark:text-muted-dark truncate max-w-[140px]">
                        {item.razorpay_order_id || "N/A"}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded-pill text-[10px] font-bold uppercase ${
                            item.status === "rated"
                              ? "bg-emerald-500/10 text-emerald-500"
                              : item.status === "cancelled"
                              ? "bg-red-500/10 text-red-500"
                              : "bg-blue-500/10 text-blue-500"
                          }`}
                        >
                          {item.status === "rated" ? "Settled" : item.status === "cancelled" ? "Refunded" : "In Escrow"}
                        </span>
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