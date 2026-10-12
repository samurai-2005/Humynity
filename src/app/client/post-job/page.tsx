"use client";

import { useRouter } from "next/navigation";

interface CategoryMeta {
  title: string;
  icon: string;
  description: string;
  sla: string;
  tagCount: number;
}

const CATEGORIES: CategoryMeta[] = [
  {
    title: "Code Review",
    icon: "🔍",
    description: "Security audits, PR reviews, refactoring, and performance tuning.",
    sla: "2–4 Hours",
    tagCount: 78,
  },
  {
    title: "Tech / Architecture",
    icon: "🏗️",
    description: "Cloud infra, Docker, CI/CD, database schema design, and microservices.",
    sla: "3–5 Hours",
    tagCount: 65,
  },
  {
    title: "Data & Analytics",
    icon: "📊",
    description: "SQL pipelines, ML models, dashboard design, and ETL automation.",
    sla: "3–5 Hours",
    tagCount: 45,
  },
  {
    title: "Excel / Spreadsheets",
    icon: "📈",
    description: "Complex formulas, VBA macros, Google Sheets dashboards, and cleanup.",
    sla: "2–3 Hours",
    tagCount: 16,
  },
  {
    title: "Design",
    icon: "🎨",
    description: "UI polish, Figma systems, mobile wireframes, and vector iconography.",
    sla: "3–4 Hours",
    tagCount: 28,
  },
  {
    title: "Branding",
    icon: "🏷️",
    description: "Brand guidelines, positioning strategy, naming, and visual identity.",
    sla: "2–4 Hours",
    tagCount: 11,
  },
  {
    title: "Content & Copy",
    icon: "✍️",
    description: "Landing copy, technical writing, SEO articles, and email sequences.",
    sla: "2–3 Hours",
    tagCount: 41,
  },
  {
    title: "Marketing",
    icon: "📣",
    description: "Paid ad strategy, SEO audits, lifecycle email flows, and growth roadmaps.",
    sla: "3–4 Hours",
    tagCount: 25,
  },
  {
    title: "Legal",
    icon: "⚖️",
    description: "Commercial contracts, SaaS terms, NDAs, and IP assignment reviews.",
    sla: "2–4 Hours",
    tagCount: 19,
  },
  {
    title: "Finance",
    icon: "💵",
    description: "3-statement models, bookkeeping reconciliation, cap tables, and unit economics.",
    sla: "3–5 Hours",
    tagCount: 20,
  },
  {
    title: "Strategy & Research",
    icon: "🎯",
    description: "Competitor matrices, GTM launch plans, market sizing, and pitch narratives.",
    sla: "3–5 Hours",
    tagCount: 17,
  },
];

export default function CategorySelectorPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-canvas-light dark:bg-canvas-dark py-12 px-6 text-foreground-light dark:text-foreground-dark">
      <div className="max-w-5xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Select Work Category</h1>
          <p className="text-sm text-muted-light dark:text-muted-dark">
            Choose what you need done. Tasks are matched to verified domain specialists under escrow protection.
          </p>
        </div>

        {/* FLAGSHIP HERO: VIBE-CODE DEBUGGING */}
        <div className="relative overflow-hidden rounded-2xl border-2 border-blue-500/30 bg-gradient-to-r from-blue-600/10 via-indigo-600/5 to-transparent p-7 shadow-sm transition-all hover:border-blue-500/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-pill bg-blue-600 text-white text-[11px] font-bold uppercase tracking-wider shadow-sm">
                <span>⚡ AI-Assisted Dev Special</span>
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              </div>
              
              <h2 className="text-2xl font-bold tracking-tight">
                Vibe-Code Debugging & Hotfixes
              </h2>
              
              <p className="text-xs text-muted-light dark:text-muted-dark leading-relaxed">
                Stuck in an AI hallucination loop? Terminal crashes, auth redirect issues, or broken state in Cursor, Claude, or v0. Includes our <strong>1-click diagnostic extractor prompt</strong>, automated environment triage, and optional <strong>1-on-1 live screen-share pairing</strong>.
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold pt-1">
                <span className="text-blue-600 dark:text-blue-400">⏱️ Fix SLA: 15–45 Mins</span>
                <span className="text-muted-light dark:text-muted-dark">•</span>
                <span className="text-emerald-600 dark:text-emerald-400">🔒 Zero Leaked Secrets</span>
                <span className="text-muted-light dark:text-muted-dark">•</span>
                <span className="text-purple-600 dark:text-purple-400">🎙️ Voice & Screen-Share Available</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push("/client/post-job/vibe-debug")}
              className="px-6 py-3.5 rounded-pill bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider whitespace-nowrap shadow-md shadow-blue-500/25 transition-transform active:scale-[0.98]"
            >
              Start Vibe Triage →
            </button>
          </div>
        </div>

        {/* 11 DOMAIN CATEGORIES GRID */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border-light dark:border-border-dark pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-light dark:text-muted-dark">
              Standard Professional Domains (11 Categories)
            </h3>
            <span className="text-xs text-muted-light dark:text-muted-dark">
              Escrow Protected • Verified Specialists
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.title}
                type="button"
                onClick={() =>
                  router.push(`/client/post-job/create?category=${encodeURIComponent(cat.title)}`)
                }
                className="flex flex-col justify-between text-left p-5 rounded-panel border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark hover:border-blue-500/40 hover:shadow-md transition-all group"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{cat.icon}</span>
                    <span className="text-[11px] font-semibold text-muted-light dark:text-muted-dark group-hover:text-blue-600 transition-colors">
                      {cat.sla}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold group-hover:text-blue-600 transition-colors">
                      {cat.title}
                    </h4>
                    <p className="text-xs text-muted-light dark:text-muted-dark mt-1 line-clamp-2 leading-relaxed">
                      {cat.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 mt-3 border-t border-border-light dark:border-border-dark text-[11px] text-muted-light dark:text-muted-dark font-medium">
                  <span>{cat.tagCount} Specialist Skills</span>
                  <span className="text-blue-600 dark:text-blue-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                    Post Task →
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}