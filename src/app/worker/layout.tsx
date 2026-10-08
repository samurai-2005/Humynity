"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function WorkerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function enforceWorkerGate() {
      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.getUser();

      if (authErr || !user) {
        router.replace("/login");
        return;
      }

      // Check specialist clearance once in Postgres
      const { data: worker } = await supabase
        .from("workers")
        .select("terms_accepted")
        .eq("worker_id", user.id)
        .maybeSingle();

      const isOnboarded = Boolean(worker?.terms_accepted);

      if (pathname === "/worker/onboarding") {
        if (isOnboarded) {
          // Already onboarded -> forward to dashboard
          router.replace("/worker/dashboard");
          return;
        }
        // Allow un-onboarded user to complete onboarding
        setAuthorized(true);
        setLoading(false);
        return;
      }

      // Any other worker route (/worker/dashboard, /worker/settings/payouts, etc.)
      if (!isOnboarded) {
        router.replace("/worker/onboarding");
      } else {
        setAuthorized(true);
      }

      setLoading(false);
    }

    enforceWorkerGate();
  }, [pathname, router, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas-light dark:bg-canvas-dark flex items-center justify-center p-6 text-foreground-light dark:text-foreground-dark">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs uppercase tracking-wider text-muted-light dark:text-muted-dark font-medium">
            Verifying Specialist Clearance...
          </p>
        </div>
      </div>
    );
  }

  if (!authorized && pathname !== "/worker/onboarding") {
    return null;
  }

  return <>{children}</>;
}