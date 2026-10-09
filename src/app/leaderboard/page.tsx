import Link from "next/link";

export default function LeaderboardPage() {
  return (
    <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-6 animate-in fade-in">
      <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-3xl mx-auto shadow-sm">
        🏆
      </div>

      <div className="space-y-2">
        <span className="px-3 py-1 rounded-pill bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider">
          Coming Soon
        </span>
        <h1 className="text-3xl font-bold tracking-tight">Specialist Leaderboard</h1>
        <p className="text-xs sm:text-sm text-muted-light dark:text-muted-dark max-w-md mx-auto leading-relaxed">
          Top-rated specialists, speed delivery records, and domain ranking tiers will be recognized here.
        </p>
      </div>

      <div className="pt-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center h-10 px-5 rounded-pill bg-foreground-light dark:bg-foreground-dark text-canvas-light dark:text-canvas-dark text-xs font-semibold hover:opacity-90 transition-opacity"
        >
          ← Return to Workspace Hub
        </Link>
      </div>
    </div>
  );
}