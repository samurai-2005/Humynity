"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function AuthPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Authenticate the user securely via Supabase cookie session
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (data?.session) {
        // 2. Invalidate server/router layout cache so layouts pick up the session cookie immediately
        router.refresh();
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Failed to authenticate.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-canvas-light dark:bg-canvas-dark relative">
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#363638_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      <div className="w-full max-w-[400px] p-8 bg-surface-light/90 dark:bg-surface-dark/90 backdrop-blur-md border border-border-light dark:border-border-dark rounded-panel relative z-10 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-display mb-2 text-foreground-light dark:text-foreground-dark">
          Access Console
        </h1>
        <p className="text-muted-light dark:text-muted-dark tracking-body text-sm mb-8">
          Enter your credentials to proceed.
        </p>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="Private Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-12 px-4 rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark focus:outline-none focus:border-foreground-light dark:focus:border-foreground-dark transition-colors text-foreground-light dark:text-foreground-dark placeholder:text-muted-light dark:placeholder:text-muted-dark"
            />
          </div>

          <div>
            <input
              type="password"
              placeholder="Secure Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full h-12 px-4 rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark focus:outline-none focus:border-foreground-light dark:focus:border-foreground-dark transition-colors text-foreground-light dark:text-foreground-dark placeholder:text-muted-light dark:placeholder:text-muted-dark"
            />
          </div>

          {error && (
            <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 p-3 rounded-input">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 mt-4 rounded-pill bg-foreground-light text-canvas-light dark:bg-foreground-dark dark:text-canvas-dark font-medium transition-transform active:scale-[0.985] disabled:opacity-50"
          >
            {loading ? "Authenticating..." : "Enter Dashboard"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/signup"
            className="text-sm text-muted-light dark:text-muted-dark hover:text-foreground-light dark:hover:text-foreground-dark transition-colors"
          >
            No access node? Create one.
          </Link>
        </div>
      </div>
    </div>
  );
}