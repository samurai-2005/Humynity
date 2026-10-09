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
    <div className="min-h-screen bg-[#0d0f12] text-white flex flex-col items-center justify-center p-6 relative">
      {/* Back to Home Button */}
      <div className="absolute top-6 left-6 z-20">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-gray-300 transition-colors"
        >
          ← Back to Home
        </Link>
      </div>

      {/* Main Registration Card */}
      <div className="w-full max-w-[460px] bg-[#16191f] border border-white/10 rounded-2xl p-8 shadow-2xl relative z-10 space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="w-11 h-11 mx-auto rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/10 mb-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-wider uppercase text-white">
            Create Account
          </h1>
          <p className="text-[11px] uppercase tracking-widest text-gray-400 font-medium">
            Join Humynity • Verified Talent Portal
          </p>
        </div>

        {/* Top Segmented Navigation (Direct Links) */}
        <div className="grid grid-cols-2 p-1 bg-black/40 rounded-xl border border-white/5 text-xs font-semibold">
          <Link
            href="/login"
            className="py-2.5 text-center rounded-lg text-gray-400 hover:text-white transition-all"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="py-2.5 text-center rounded-lg bg-blue-600 text-white shadow-md shadow-blue-600/30 transition-all"
          >
            Sign Up
          </Link>
        </div>

        {/* Notice */}
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300 leading-relaxed">
          🔒 Your contact details and real name remain private. Only your chosen username is visible across the platform.
        </div>

        <form onSubmit={handleSignUp} className="space-y-4">
          
          {/* First & Last Name */}
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="h-11 px-3.5 rounded-xl bg-[#0d0f12] border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-blue-500 transition-colors"
            />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="h-11 px-3.5 rounded-xl bg-[#0d0f12] border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Public Username */}
          <div>
            <input
              type="text"
              placeholder="Public Username (e.g. CodeNinja, TechLead)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full h-11 px-3.5 rounded-xl bg-[#0d0f12] border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* WhatsApp */}
          <div className="flex gap-2">
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="h-11 px-2.5 w-[110px] rounded-xl bg-[#0d0f12] border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500 transition-colors"
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
              placeholder="WhatsApp Number"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ""))}
              required
              className="flex-1 h-11 px-3.5 rounded-xl bg-[#0d0f12] border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Email */}
          <div>
            <input
              type="email"
              placeholder="Private Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-11 px-3.5 rounded-xl bg-[#0d0f12] border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Password */}
          <div>
            <input
              type="password"
              placeholder="Secure Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full h-11 px-3.5 rounded-xl bg-[#0d0f12] border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
              {error}
            </div>
          )}

          {success ? (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 text-center font-semibold">
              ✓ Account created successfully! Redirecting to sign in...
            </div>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-blue-600 hover:bg-blue-500 active:scale-[0.985] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-blue-600/25"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          )}
        </form>

        <div className="pt-2 text-center border-t border-white/5">
          <p className="text-xs text-gray-400">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-400 font-semibold hover:underline">
              Sign In here
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}