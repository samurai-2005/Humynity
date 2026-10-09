import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-canvas-light dark:bg-canvas-dark text-foreground-light dark:text-foreground-dark flex flex-col relative overflow-hidden">
      {/* Background Accent Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#363638_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      {/* NAVIGATION BAR */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-base shadow-md shadow-blue-500/20">
            H
          </div>
          <span className="font-bold text-xl tracking-tight">Humynity</span>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-xs font-semibold text-muted-light dark:text-muted-dark hover:text-foreground-light dark:hover:text-foreground-dark transition-colors px-3 py-2"
          >
            Sign In
          </Link>
          <Link
            href="/client/post-job"
            className="h-10 px-5 rounded-pill bg-foreground-light text-canvas-light dark:bg-foreground-dark dark:text-canvas-dark text-xs font-semibold hover:opacity-90 transition-opacity flex items-center shadow-sm"
          >
            Get Work Done
          </Link>
        </div>
      </header>

      {/* HERO SECTION */}
      <main className="relative z-10 flex-1 max-w-5xl mx-auto px-6 pt-16 pb-24 flex flex-col items-center text-center">
        
        {/* Pill Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-pill bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-8 animate-in fade-in duration-500">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          Zero AI Hallucinations. 100% Verified Human Execution.
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight max-w-3xl leading-[1.15] mb-6">
          Delegate your task. Relax while a verified human handles it.
        </h1>

        {/* Subtitle */}
        <p className="text-muted-light dark:text-muted-dark text-base sm:text-lg max-w-2xl leading-relaxed mb-12">
          Skip endless proposals and resume screening. Tell us what you need done, deposit into protected escrow, and get clean results delivered directly to your workspace.
        </p>

        {/* DUAL ACTION CTAs (Posters vs Specialists) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl mb-16">
          
          {/* CTA 1: POSTERS */}
          <Link
            href="/client/post-job"
            className="p-6 bg-surface-light dark:bg-surface-dark border-2 border-blue-600 rounded-panel text-left shadow-lg shadow-blue-500/10 hover:border-blue-500 transition-all group flex flex-col justify-between"
          >
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block mb-1">
                For Posters
              </span>
              <h2 className="text-xl font-bold mb-1">Find the human you need →</h2>
              <p className="text-xs text-muted-light dark:text-muted-dark leading-relaxed">
                Post your task requirements. Match with a top-tier specialist in minutes.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border-light dark:border-border-dark flex items-center text-xs font-semibold text-blue-600">
              Post a Task Now
            </div>
          </Link>

          {/* CTA 2: SPECIALISTS */}
          <Link
            href="/worker/onboarding"
            className="p-6 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-panel text-left hover:border-foreground-light dark:hover:border-foreground-dark transition-all group flex flex-col justify-between"
          >
            <div>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-1">
                For Specialists
              </span>
              <h2 className="text-xl font-bold mb-1">Let us find you tasks →</h2>
              <p className="text-xs text-muted-light dark:text-muted-dark leading-relaxed">
                Receive live, exclusive task alerts matching your skill stack. Instant payouts.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border-light dark:border-border-dark flex items-center text-xs font-semibold text-foreground-light dark:text-foreground-dark">
              Activate Specialist Radar
            </div>
          </Link>

        </div>

        {/* 3-STEP HOW IT WORKS */}
        <div className="w-full pt-12 border-t border-border-light dark:border-border-dark">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-light dark:text-muted-dark mb-10">
            How Humynity Works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            
            {/* Step 1 */}
            <div className="p-6 rounded-panel bg-surface-light/60 dark:bg-surface-dark/60 border border-border-light dark:border-border-dark space-y-3">
              <div className="w-8 h-8 rounded-full bg-foreground-light dark:bg-foreground-dark text-canvas-light dark:text-canvas-dark flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h3 className="font-bold text-base">Tell us what you need</h3>
              <p className="text-xs text-muted-light dark:text-muted-dark leading-relaxed">
                Choose your domain or select a quick starting template. Define your scope, timeline, and budget.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-panel bg-surface-light/60 dark:bg-surface-dark/60 border border-border-light dark:border-border-dark space-y-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h3 className="font-bold text-base">Instant Specialist Match</h3>
              <p className="text-xs text-muted-light dark:text-muted-dark leading-relaxed">
                Our engine alerts the most qualified active specialist. They get an exclusive claim window to accept and begin.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-panel bg-surface-light/60 dark:bg-surface-dark/60 border border-border-light dark:border-border-dark space-y-3">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h3 className="font-bold text-base">Review & Release</h3>
              <p className="text-xs text-muted-light dark:text-muted-dark leading-relaxed">
                Review watermarked work in your workspace. Release payment only when completely satisfied—or get a 100% refund.
              </p>
            </div>

          </div>
        </div>

      </main>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-border-light dark:border-border-dark py-8 px-6 text-center text-xs text-muted-light dark:text-muted-dark">
        <p>© 2026 Humynity. Human-powered work delegation with protected payment escrow.</p>
      </footer>
    </div>
  );
}