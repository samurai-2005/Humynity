"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  // Deletion Modal States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUserData() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.replace("/login");
        return;
      }

      setEmail(user.email || "Not specified");

      const metadata = user.user_metadata || {};
      const first = metadata.first_name || "";
      const last = metadata.last_name || "";
      const combinedName = `${first} ${last}`.trim();
      setFullName(combinedName || "Verified User");
      setPhoneNumber(metadata.whatsapp || "Not linked");

      // Fetch Profile Handle
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();

      setUsername(profile?.username || metadata.username || "Anon");
      setLoading(false);
    }

    loadUserData();
  }, [router, supabase]);

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      setDeleteError('Please type "DELETE" to confirm.');
      return;
    }

    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch("/api/user/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete account.");
      }

      // Sign out from Supabase client and redirect
      await supabase.auth.signOut();
      router.refresh();
      router.push("/login");
    } catch (err: any) {
      setDeleteError(err.message || "An unexpected error occurred.");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-xs text-muted-light dark:text-muted-dark">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p>Loading personal information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-8 animate-in fade-in">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-border-light dark:border-border-dark pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Personal Information</h1>
          <p className="text-xs text-muted-light dark:text-muted-dark mt-1">
            Official account credentials registered under Humynity Escrow Protocols.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-xs text-muted-light dark:text-muted-dark hover:text-foreground-light dark:hover:text-foreground-dark"
        >
          ← Back to Hub
        </Link>
      </div>

      {/* READ-ONLY INFORMATION CARD */}
      <div className="p-6 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-panel shadow-sm space-y-5">
        <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-input text-xs text-blue-600 dark:text-blue-400">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>
            These verified records are non-editable to preserve task auditability and escrow security.
          </span>
        </div>

        {/* Username */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-light dark:text-muted-dark">
            Public Handle
          </label>
          <input
            type="text"
            value={`@${username}`}
            disabled
            className="w-full h-11 px-4 rounded-input border border-border-light dark:border-border-dark bg-canvas-light/50 dark:bg-canvas-dark/50 text-foreground-light dark:text-foreground-dark text-xs font-mono cursor-not-allowed select-all"
          />
        </div>

        {/* Full Name */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-light dark:text-muted-dark">
            Registered Legal Name
          </label>
          <input
            type="text"
            value={fullName}
            disabled
            className="w-full h-11 px-4 rounded-input border border-border-light dark:border-border-dark bg-canvas-light/50 dark:bg-canvas-dark/50 text-foreground-light dark:text-foreground-dark text-xs cursor-not-allowed select-all"
          />
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-light dark:text-muted-dark">
            Verified Email Address
          </label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full h-11 px-4 rounded-input border border-border-light dark:border-border-dark bg-canvas-light/50 dark:bg-canvas-dark/50 text-foreground-light dark:text-foreground-dark text-xs cursor-not-allowed select-all"
          />
        </div>

        {/* Phone Number */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-light dark:text-muted-dark">
            Verified Phone / WhatsApp
          </label>
          <input
            type="text"
            value={phoneNumber}
            disabled
            className="w-full h-11 px-4 rounded-input border border-border-light dark:border-border-dark bg-canvas-light/50 dark:bg-canvas-dark/50 text-foreground-light dark:text-foreground-dark text-xs font-mono cursor-not-allowed select-all"
          />
        </div>
      </div>

      {/* DANGER ZONE (DELETE ACCOUNT) */}
      <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-panel space-y-4">
        <div>
          <h2 className="text-sm font-bold text-red-600 dark:text-red-400">
            Danger Zone: Delete Account
          </h2>
          <p className="text-xs text-muted-light dark:text-muted-dark mt-1 leading-relaxed">
            Permanently delete your profile, specialist standing, verified phone records, and active credentials. This action is immediate and cannot be undone.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="h-10 px-5 rounded-pill bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-transform active:scale-95 shadow-sm"
        >
          Delete My Account
        </button>
      </div>

      {/* CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-panel p-6 shadow-2xl space-y-5">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto text-xl">
              ⚠️
            </div>

            <div className="text-center space-y-2">
              <h2 className="text-lg font-bold">Permanently Delete Account?</h2>
              <p className="text-xs text-muted-light dark:text-muted-dark leading-relaxed">
                All personal details, specialist tier credentials, and profile records will be permanently erased. Type <strong className="text-red-500 font-mono">DELETE</strong> below to confirm.
              </p>
            </div>

            <input
              type="text"
              placeholder='Type "DELETE"'
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="w-full h-11 px-4 text-center font-mono uppercase text-xs rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark text-foreground-light dark:text-foreground-dark focus:outline-none focus:border-red-500"
            />

            {deleteError && (
              <p className="text-xs text-red-500 bg-red-500/10 p-2.5 rounded-input text-center">
                {deleteError}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText("");
                  setDeleteError(null);
                }}
                disabled={deleting}
                className="flex-1 h-11 border border-border-light dark:border-border-dark rounded-pill text-xs font-semibold hover:bg-canvas-light dark:hover:bg-canvas-dark transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirmText !== "DELETE"}
                className="flex-1 h-11 bg-red-600 hover:bg-red-500 text-white rounded-pill text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
