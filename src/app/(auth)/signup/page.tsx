"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
      // 1. Check if the username is already taken BEFORE doing anything else
      const { data: isAvailable, error: checkError } = await supabase.rpc(
        'check_username_available', 
        { target_username: username }
      );

      if (checkError) throw checkError;

      if (!isAvailable) {
        setError("This public username is already taken. Please choose another.");
        setLoading(false);
        return; // Stop the signup process entirely
      }

      // 2. Merge the code and number for the database
      const fullWhatsapp = `${countryCode}${whatsapp}`;

      // 3. Proceed with secure account creation
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            username: username,
            whatsapp: fullWhatsapp
          }
        }
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-canvas-light dark:bg-canvas-dark relative">
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#363638_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none"></div>

      <div className="w-full max-w-[480px] p-8 bg-surface-light/90 dark:bg-surface-dark/90 backdrop-blur-md border border-border-light dark:border-border-dark rounded-panel shadow-sm relative z-10">
        
        <h1 className="text-3xl font-semibold tracking-display mb-2 text-foreground-light dark:text-foreground-dark">
          Initialize Node
        </h1>
        <p className="text-muted-light dark:text-muted-dark tracking-body text-sm mb-6">
          Your real identity and contact details will remain strictly in the private vault. Only your username will be public.
        </p>

        <form onSubmit={handleSignUp} className="space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="w-full h-12 px-4 rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark focus:outline-none focus:border-foreground-light dark:focus:border-foreground-dark text-foreground-light dark:text-foreground-dark placeholder:text-muted-light dark:placeholder:text-muted-dark transition-colors"
            />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="w-full h-12 px-4 rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark focus:outline-none focus:border-foreground-light dark:focus:border-foreground-dark text-foreground-light dark:text-foreground-dark placeholder:text-muted-light dark:placeholder:text-muted-dark transition-colors"
            />
          </div>

          <div>
            <input
              type="text"
              placeholder="Public Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full h-12 px-4 rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark focus:outline-none focus:border-foreground-light dark:focus:border-foreground-dark text-foreground-light dark:text-foreground-dark placeholder:text-muted-light dark:placeholder:text-muted-dark transition-colors"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="h-12 px-2 w-[120px] rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark focus:outline-none focus:border-foreground-light dark:focus:border-foreground-dark text-foreground-light dark:text-foreground-dark transition-colors"
            >
              <option value="+91">🇮🇳 +91</option>
              <option value="+1">🇺🇸/🇨🇦 +1</option>
              <option value="+44">🇬🇧 +44</option>
              <option value="+61">🇦🇺 +61</option>
              <option value="+971">🇦🇪 +971</option>
              <option value="+65">🇸🇬 +65</option>
              <option value="+60">🇲🇾 +60</option>
              <option value="+64">🇳🇿 +64</option>
              <option value="+81">🇯🇵 +81</option>
              <option value="+86">🇨🇳 +86</option>
              <option value="+82">🇰🇷 +82</option>
              <option value="+49">🇩🇪 +49</option>
              <option value="+33">🇫🇷 +33</option>
              <option value="+39">🇮🇹 +39</option>
              <option value="+34">🇪🇸 +34</option>
              <option value="+31">🇳🇱 +31</option>
              <option value="+55">🇧🇷 +55</option>
              <option value="+52">🇲🇽 +52</option>
              <option value="+27">🇿🇦 +27</option>
              <option value="+966">🇸🇦 +966</option>
              <option value="+62">🇮🇩 +62</option>
              <option value="+63">🇵🇭 +63</option>
              <option value="+84">🇻🇳 +84</option>
              <option value="+66">🇹🇭 +66</option>
              <option value="+234">🇳🇬 +234</option>
              <option value="+254">🇰🇪 +254</option>
              <option value="+20">🇪🇬 +20</option>
              <option value="+880">🇧🇩 +880</option>
              <option value="+92">🇵🇰 +92</option>
              <option value="+94">🇱🇰 +94</option>
              <option value="+977">🇳🇵 +977</option>
            </select>
            <input
              type="tel"
              placeholder="WhatsApp Number"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ''))} 
              required
              className="w-full h-12 px-4 rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark focus:outline-none focus:border-foreground-light dark:focus:border-foreground-dark text-foreground-light dark:text-foreground-dark placeholder:text-muted-light dark:placeholder:text-muted-dark transition-colors"
            />
          </div>

          <div>
            <input
              type="email"
              placeholder="Private Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-12 px-4 rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark focus:outline-none focus:border-foreground-light dark:focus:border-foreground-dark text-foreground-light dark:text-foreground-dark placeholder:text-muted-light dark:placeholder:text-muted-dark transition-colors"
            />
          </div>
          
          <div>
            <input
              type="password"
              placeholder="Secure Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full h-12 px-4 rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark focus:outline-none focus:border-foreground-light dark:focus:border-foreground-dark text-foreground-light dark:text-foreground-dark placeholder:text-muted-light dark:placeholder:text-muted-dark transition-colors"
            />
          </div>

          {error && (
            <div className="text-sm text-canvas-light bg-foreground-light dark:text-canvas-dark dark:bg-foreground-dark p-3 rounded-input">
              {error}
            </div>
          )}

          {success ? (
            <div className="w-full mt-4 p-4 rounded-panel bg-border-light dark:bg-border-dark text-foreground-light dark:text-foreground-dark text-center text-sm">
              Identity securely logged. Please check your email to verify your account before logging in.
            </div>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 mt-4 rounded-pill bg-foreground-light text-canvas-light dark:bg-foreground-dark dark:text-canvas-dark font-medium transition-transform active:scale-[0.985] disabled:opacity-50"
            >
              {loading ? "Encrypting..." : "Create Identity"}
            </button>
          )}
        </form>

        <div className="mt-6 text-center">
          <a
            href="/login"
            className="text-sm text-muted-light dark:text-muted-dark hover:text-foreground-light dark:hover:text-foreground-dark transition-colors"
          >
            Already established? Access console.
          </a>
        </div>

      </div>
    </div>
  );
}