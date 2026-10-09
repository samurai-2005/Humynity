"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [isChecking, setIsChecking] = useState(true);

  // Public pages accessible without an active session
  const isLandingPage = pathname === "/";
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isPublicPage = isLandingPage || isAuthPage;

  useEffect(() => {
    let isMounted = true;

    const enforceSecurityRouting = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        // If unauthenticated and trying to access a protected app route -> send to login
        if (!session && !isPublicPage) {
          router.replace("/login");
          return;
        }

        // If already logged in and visiting login/signup -> forward to dashboard
        if (session && isAuthPage) {
          router.replace("/dashboard");
          return;
        }

        if (isMounted) setIsChecking(false);
      } catch (err) {
        console.error("Auth security check error:", err);
        if (isMounted) setIsChecking(false);
      }
    };

    enforceSecurityRouting();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        router.replace("/login");
      } else if (event === "SIGNED_IN" && isAuthPage) {
        router.replace("/dashboard");
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [pathname, isPublicPage, isAuthPage, router, supabase]);

  if (isChecking) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-canvas-light dark:bg-canvas-dark">
        <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // The public landing page renders its own tailored hero header & footer
  if (isLandingPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen w-full flex flex-col justify-between overflow-x-hidden relative bg-canvas-light dark:bg-canvas-dark text-foreground-light dark:text-foreground-dark antialiased">
      {!isAuthPage && <Header />}

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col">
        {children}
      </main>

      {!isAuthPage && <Footer />}
    </div>
  );
}