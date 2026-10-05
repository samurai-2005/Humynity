"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [isChecking, setIsChecking] = useState(true);

  const isAuthPage = pathname === "/login" || pathname === "/signup";

  useEffect(() => {
    let isMounted = true;

    const enforceSecurityRouting = async () => {
      // Securely check if the browser holds a valid cryptographic token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session && !isAuthPage) {
        // SCENARIO 1: Unauthenticated user attempting to view a protected page
        router.replace("/login"); 
      } else if (session && isAuthPage) {
        // SCENARIO 2: STRICT LOGOUT POLICY
        // The user navigated backward to the login/signup page while logged in.
        // Destroy the session instantly to enforce re-authentication.
        await supabase.auth.signOut();
        if (isMounted) setIsChecking(false);
      } else {
        // SCENARIO 3: Normal rendering
        if (isMounted) setIsChecking(false);
      }
    };

    enforceSecurityRouting();

    // Listen for real-time authentication events (like clicking "Enter Dashboard")
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.replace("/login");
      } else if (event === 'SIGNED_IN' && isAuthPage) {
        // The user just successfully entered their credentials on the login page
        router.replace("/dashboard");
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [pathname, isAuthPage, router]);

  // Prevent UI flashing by showing a blank canvas while the security check runs
  if (isChecking) {
    return <div className="min-h-screen bg-canvas-light dark:bg-canvas-dark"></div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {!isAuthPage && <Header />}
      
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      
      {!isAuthPage && <Footer />}
    </div>
  );
}