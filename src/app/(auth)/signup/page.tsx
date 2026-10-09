"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const router = useRouter();
  const supabase = createClient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");

  const [countryCode, setCountryCode] = useState("+91");
  const [whatsapp, setWhatsapp] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Verify username availability
      const { data: isAvailable, error: checkError } = await supabase.rpc(
        "check_username_available",
        { target_username: username.trim() }
      );

      if (checkError) throw checkError;

      if (!isAvailable) {
        setError("This public username is already taken. Please pick another.");
        setLoading(false);
        return;
      }

      // 2. Format WhatsApp contact
      const fullWhatsapp = `${countryCode}${whatsapp.trim()}`;

      // 3. Register user with secure metadata
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            username: username.trim(),
            whatsapp: fullWhatsapp,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/login");
        }, 2200);
      }
    } catch (err: any) {
      setError(err.message || "Failed to create account. Please try again.");
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

      {/* Main Registration Card */}
      <div className="w-full max-w-[460px] bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-panel p-6 sm:p-8 shadow-xl relative z-10 space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="w-11 h-11 mx-auto rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-md shadow-blue-500/10 mb-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-wider uppercase text-foreground-light dark:text-foreground-dark">
            Create Account
          </h1>
          <p className="text-[11px] uppercase tracking-widest text-muted-light dark:text-muted-dark font-medium">
            Join Humynity • Verified Talent Portal
          </p>
        </div>

        {/* Top Segmented Navigation */}
        <div className="grid grid-cols-2 p-1 bg-canvas-light dark:bg-canvas-dark rounded-input border border-border-light dark:border-border-dark text-xs font-semibold">
          <Link
            href="/login"
            className="py-2 text-center rounded-lg text-muted-light dark:text-muted-dark hover:text-foreground-light dark:hover:text-foreground-dark transition-all"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="py-2 text-center rounded-lg bg-blue-600 text-white shadow-sm transition-all"
          >
            Sign Up
          </Link>
        </div>

        {/* Privacy Notice */}
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-input flex items-start gap-2.5 text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>
            Your legal name and contact details remain strictly private. Only your chosen username will be visible across the portal.
          </span>
        </div>

        <form onSubmit={handleSignUp} className="space-y-3.5">
          {/* First & Last Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-light dark:text-muted-dark block mb-1">
                First Name
              </label>
              <input
                type="text"
                placeholder="Jane"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="w-full h-11 px-3.5 rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark text-foreground-light dark:text-foreground-dark placeholder:text-muted-light dark:placeholder:text-muted-dark text-xs focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-light dark:text-muted-dark block mb-1">
                Last Name
              </label>
              <input
                type="text"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="w-full h-11 px-3.5 rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark text-foreground-light dark:text-foreground-dark placeholder:text-muted-light dark:placeholder:text-muted-dark text-xs focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Public Username */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-light dark:text-muted-dark block mb-1">
              Public Handle
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark text-xs font-mono">
                @
              </span>
              <input
                type="text"
                placeholder="CodeSpecialist"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full h-11 pl-8 pr-3.5 rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark text-foreground-light dark:text-foreground-dark placeholder:text-muted-light dark:placeholder:text-muted-dark text-xs focus:outline-none focus:border-blue-500 transition-colors font-mono"
              />
            </div>
          </div>

          {/* WhatsApp */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-light dark:text-muted-dark block mb-1">
              WhatsApp Verification Contact
            </label>
            <div className="flex gap-2">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="h-11 px-2.5 w-[110px] rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark text-foreground-light dark:text-foreground-dark text-xs focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="+91">🇮🇳 +91</option>
                <option value="+1">🇺🇸 +1</option>
                <option value="+44">🇬🇧 +44</option>
                <option value="+61">🇦🇺 +61</option>
                <option value="+971">🇦🇪 +971</option>
                <option value="+65">🇸🇬 +65</option>
              </select>
              <input
                type="tel"
                placeholder="9876543210"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ""))}
                required
                className="flex-1 h-11 px-3.5 rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark text-foreground-light dark:text-foreground-dark placeholder:text-muted-light dark:placeholder:text-muted-dark text-xs focus:outline-none focus:border-blue-500 transition-colors font-mono"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-light dark:text-muted-dark block mb-1">
              Private Email Address
            </label>
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-11 px-3.5 rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark text-foreground-light dark:text-foreground-dark placeholder:text-muted-light dark:placeholder:text-muted-dark text-xs focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-light dark:text-muted-dark block mb-1">
              Account Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full h-11 pl-3.5 pr-10 rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark text-foreground-light dark:text-foreground-dark placeholder:text-muted-light dark:placeholder:text-muted-dark text-xs focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark hover:text-foreground-light dark:hover:text-foreground-dark"
                aria-label="Toggle password visibility"
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

          {success ? (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-input text-xs text-emerald-600 dark:text-emerald-400 text-center font-semibold">
              ✓ Account created successfully! Redirecting to sign in...
            </div>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-blue-600 hover:bg-blue-500 active:scale-[0.985] text-white font-bold text-xs uppercase tracking-wider rounded-pill transition-all disabled:opacity-50 shadow-md shadow-blue-500/20 mt-2"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          )}
        </form>

        <div className="pt-2 text-center border-t border-border-light dark:border-border-dark">
          <p className="text-xs text-muted-light dark:text-muted-dark">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
              Sign In here
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}