"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  // Auth Method: 'otp' | 'password'
  const [authMethod, setAuthMethod] = useState<"otp" | "password">("otp");

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Flow & State Handlers
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // 60-second cooldown timer for Resend OTP
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const ensureAnonymousProfile = async (userId: string) => {
    try {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      if (!existing) {
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        await supabase.from("profiles").insert({
          id: userId,
          username: `Anon_${randomNum}`,
        });
      }
    } catch {
      // Non-blocking fallback
    }
  };

  // 1. Send OTP Code
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim() || resendCooldown > 0) return;

    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: false, // Login only; registration happens on /signup
        },
      });

      if (otpError) throw otpError;

      setOtpSent(true);
      setResendCooldown(60);
      setNotice(`Verification code sent to ${email.trim()}. Check your inbox.`);
    } catch (err: any) {
      setError(err.message || "Failed to send verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Verify OTP Code
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.trim().length < 6) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otpCode.trim(),
        type: "email",
      });

      if (verifyError) throw verifyError;

      if (data?.user) {
        await ensureAnonymousProfile(data.user.id);
        router.refresh();
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Invalid or expired verification code.");
    } finally {
      setLoading(false);
    }
  };

  // 3. Password Login
  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInErr) throw signInErr;

      if (data?.session) {
        router.refresh();
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas-light dark:bg-canvas-dark text-foreground-light dark:text-foreground-dark flex flex-col items-center justify-center p-4 sm:p-6 relative">
      {/* Background Dot Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#363638_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      {/* Back to Home Button */}
      <div className="absolute top-6 left-6 z-20">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-pill bg-surface-light/80 dark:bg-surface-dark/80 backdrop-blur-md border border-border-light dark:border-border-dark text-xs font-medium text-muted-light dark:text-muted-dark hover:text-foreground-light dark:hover:text-foreground-dark transition-colors shadow-sm"
        >
          ← Back to Home
        </Link>
      </div>

      {/* Main Authentication Card */}
      <div className="w-full max-w-[420px] bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-panel p-6 sm:p-8 shadow-xl relative z-10 space-y-6">
        
        {/* Portal Shield & Header */}
        <div className="text-center space-y-1.5">
          <div className="w-11 h-11 mx-auto rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-md shadow-blue-500/10 mb-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-wider uppercase text-foreground-light dark:text-foreground-dark">
            Humynity
          </h1>
          <p className="text-[11px] uppercase tracking-widest text-muted-light dark:text-muted-dark font-medium">
            Verified Talent Portal • Escrow Secured
          </p>
        </div>

        {/* Top Segmented Navigation */}
        <div className="grid grid-cols-2 p-1 bg-canvas-light dark:bg-canvas-dark rounded-input border border-border-light dark:border-border-dark text-xs font-semibold">
          <Link
            href="/login"
            className="py-2 text-center rounded-lg bg-blue-600 text-white shadow-sm transition-all"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="py-2 text-center rounded-lg text-muted-light dark:text-muted-dark hover:text-foreground-light dark:hover:text-foreground-dark transition-all"
          >
            Sign Up
          </Link>
        </div>

        {/* Informational Notice */}
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-input flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            <strong>Secure Access:</strong> Sign in with your registered email via instant OTP or password.
          </span>
        </div>

        {/* --- OTP FLOW: STEP 1 (EMAIL INPUT) --- */}
        {authMethod === "otp" && !otpSent && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-light dark:text-muted-dark block">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full h-11 pl-10 pr-4 rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark text-foreground-light dark:text-foreground-dark placeholder:text-muted-light dark:placeholder:text-muted-dark text-xs focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-input text-xs text-red-500">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full h-11 bg-blue-600 hover:bg-blue-500 active:scale-[0.985] text-white font-bold text-xs uppercase tracking-wider rounded-pill transition-all disabled:opacity-50 shadow-md shadow-blue-500/20"
            >
              {loading ? "Sending Code..." : "Send Verification OTP"}
            </button>
          </form>
        )}

        {/* --- OTP FLOW: STEP 2 (CODE INPUT & RESEND) --- */}
        {authMethod === "otp" && otpSent && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-light dark:text-muted-dark">
                  Enter 6-Digit Code
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setOtpCode("");
                    setError(null);
                  }}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Change Email
                </button>
              </div>
              <input
                type="text"
                placeholder="123456"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                required
                autoFocus
                className="w-full h-12 text-center font-mono text-xl tracking-widest rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark text-foreground-light dark:text-foreground-dark placeholder:text-muted-light dark:placeholder:text-muted-dark focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Resend OTP Bar */}
            <div className="flex items-center justify-between text-xs px-1">
              <span className="text-muted-light dark:text-muted-dark">
                Didn&apos;t get the code?
              </span>
              <button
                type="button"
                disabled={resendCooldown > 0 || loading}
                onClick={() => handleSendOtp()}
                className="font-semibold text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 disabled:no-underline"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
              </button>
            </div>

            {notice && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-input text-xs text-emerald-600 dark:text-emerald-400">
                {notice}
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-input text-xs text-red-500">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || otpCode.trim().length < 6}
              className="w-full h-11 bg-blue-600 hover:bg-blue-500 active:scale-[0.985] text-white font-bold text-xs uppercase tracking-wider rounded-pill transition-all disabled:opacity-50 shadow-md shadow-blue-500/20"
            >
              {loading ? "Verifying..." : "Verify & Sign In"}
            </button>
          </form>
        )}

        {/* --- PASSWORD FLOW --- */}
        {authMethod === "password" && (
          <form onSubmit={handlePasswordAuth} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-light dark:text-muted-dark block">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full h-11 pl-10 pr-4 rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark text-foreground-light dark:text-foreground-dark placeholder:text-muted-light dark:placeholder:text-muted-dark text-xs focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-light dark:text-muted-dark">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod("otp");
                    setNotice("Use OTP verification for password-free access.");
                  }}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full h-11 pl-10 pr-10 rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark text-foreground-light dark:text-foreground-dark placeholder:text-muted-light dark:placeholder:text-muted-dark text-xs focus:outline-none focus:border-blue-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark hover:text-foreground-light dark:hover:text-foreground-dark"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-input text-xs text-red-500">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim() || !password}
              className="w-full h-11 bg-blue-600 hover:bg-blue-500 active:scale-[0.985] text-white font-bold text-xs uppercase tracking-wider rounded-pill transition-all disabled:opacity-50 shadow-md shadow-blue-500/20"
            >
              {loading ? "Signing In..." : "Sign In to Portal"}
            </button>
          </form>
        )}

        {/* Bottom Toggles */}
        <div className="pt-2 text-center space-y-3">
          {authMethod === "otp" ? (
            <button
              type="button"
              onClick={() => {
                setAuthMethod("password");
                setError(null);
                setNotice(null);
              }}
              className="text-xs text-muted-light dark:text-muted-dark hover:text-foreground-light dark:hover:text-foreground-dark transition-colors block mx-auto"
            >
              🔗 Sign in with Password instead
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setAuthMethod("otp");
                setError(null);
                setNotice(null);
              }}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline transition-colors block mx-auto"
            >
              🔗 Sign in with 6-Digit OTP instead
            </button>
          )}

          <p className="text-xs text-muted-light dark:text-muted-dark pt-2 border-t border-border-light dark:border-border-dark">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
              Sign Up here
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}