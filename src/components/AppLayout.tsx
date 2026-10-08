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

  const isAuthPage = pathname === "/login" || pathname === "/signup";

  useEffect(() => {
    let isMounted = true;

    const enforceSecurityRouting = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session && !isAuthPage) {
          router.replace("/login"); 
          return;
        } 
        
        if (session && isAuthPage) {
          await supabase.auth.signOut();
          if (isMounted) setIsChecking(false);
          return;
        }

        if (isMounted) setIsChecking(false);
      } catch (err) {
        console.error("Auth security check failed:", err);
        if (isMounted) setIsChecking(false);
      }
    };

    enforceSecurityRouting();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
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
  }, [pathname, isAuthPage, router, supabase]);

  if (isChecking) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-canvas-light dark:bg-canvas-dark">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
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