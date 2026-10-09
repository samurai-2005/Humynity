"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// The 11 Master Categories and their complete skill dictionaries
const CATEGORY_MAP: Record<string, string[]> = {
  "Code Review": [
    "Android Development", "Angular", "Api Development", "Aspnet Mvc", "Blazor", "C", "Clojure", "Cobol", "Code Review", "Codeigniter", "CPP", "Csharp", "Dart", "Debugging", "Design Patterns", "Django", "Dotnet", "Dotnet Core", "Elixir", "Expressjs", "Fastapi", "Flask", "Flutter", "Fortran", "Gatsby", "GIT", "GO", "Graphql", "Groovy", "Grpc", "Haskell", "Integration Testing", "Ionic", "Ios Development", "Java", "Javascript", "Jetpack Compose", "Kotlin", "Laravel", "LUA", "Matlab", "Nestjs", "Nextjs", "Nodejs", "Nuxtjs", "Objective C", "OOP", "Performance Tuning Code", "Perl", "PHP", "Python", "R", "Rails", "React", "React Native", "Refactoring", "Regular Expressions", "Remix", "Rest Api", "Ruby", "Rust", "Scala", "Solidity", "Spring Boot", "Svelte", "Swift", "Swiftui", "Symfony", "TDD", "Typescript", "Unit Testing", "Vbnet", "Vuejs", "Webhooks", "Websockets", "Xamarin"
  ],
  "Content & Copy": [
    "Arabic Translation", "Article Rewriting", "Article Writing", "Blog Writing", "Case Study Writing", "Content Audit", "Content Strategy", "Content Writing", "Copy Editing", "Copywriting", "Cover Letter", "Creative Writing", "Editing", "Email Copy", "Fact Checking", "French Translation", "German Translation", "Ghostwriting", "Grant Writing", "Hindi Translation", "Japanese Translation", "Localization", "Mandarin Translation", "Newsletters", "Portuguese Translation", "Press Releases", "Product Descriptions", "Proofreading", "Report Writing", "Resume Writing", "Script Writing", "Seo Writing", "Social Media Copy", "Spanish Translation", "Speech Writing", "Subtitles Captions", "Technical Writing", "Transcription", "Translation", "Ux Writing", "White Paper"
  ],
  "Legal": [
    "Clause Risk Analysis", "Commercial Agreements", "Compliance Legal Review", "Contract Drafting", "Contract Review", "Copyright", "Corporate Law", "Employment Law", "Gdpr Legal", "Ip Law", "Legal Memo", "Legal Research", "Nda Review", "Patents", "Privacy Law", "Saas Agreements", "Term Sheet Review", "Terms Of Service Drafting", "Trademark"
  ],
  "Finance": [
    "Accounting", "Accounts Payable", "Accounts Receivable", "Audit", "Bank Reconciliation", "Bookkeeping", "Budgeting", "Cap Table Analysis", "Cash Flow Modeling", "Equity Research", "Financial Analysis", "Financial Modeling", "Forecasting", "Fp And A", "Internal Controls", "Invoicing", "Tax Preparation", "Tax Research", "Unit Economics", "Valuation"
  ],
  "Data & Analytics": [
    "Ab Testing", "Anomaly Detection", "Bigquery", "Computer Vision", "Dashboard Design", "Data Annotation", "Data Cleansing", "Data Modeling", "Data Pipeline", "Data Visualization", "Data Warehousing", "Databricks", "DBT", "Deep Learning", "ETL", "Experiment Design", "Feature Engineering", "Google Data Studio", "Llm Integration", "Looker", "Machine Learning", "Model Evaluation", "NLP", "Numpy", "Pandas", "Power Bi", "Prompt Engineering", "Pyspark", "Pytorch", "RAG", "Recommendation Systems", "Redshift", "Regression Analysis", "Scikit Learn", "Snowflake", "Spark", "SQL", "Statistical Analysis", "Statistics", "Tableau", "Tensorflow", "Time Series Forecasting", "Vector Databases", "Web Scraping", "Xgboost"
  ],
  "Strategy & Research": [
    "Business Analysis", "Business Plan", "Business Requirements", "Competitor Analysis", "Due Diligence", "Financial Research", "Gtm Strategy", "Industry Analysis", "Investment Research", "Market Research", "Market Sizing", "Okr Design", "Pitch Deck Content", "Qualitative Research", "Strategic Planning", "Survey Research", "Swot Analysis"
  ],
  "Design": [
    "2D Animation", "Adobe Xd", "After Effects", "Canva", "Design Systems", "Figma", "Graphic Design", "Icon Design", "Illustration", "Illustrator", "Indesign", "Infographics", "Interaction Design", "Landing Page Design", "Logo Design", "Mobile App Design", "Motion Graphics", "Photo Retouching", "Photoshop", "Premiere Pro", "Presentation Design", "Prototyping", "Sketch", "Ui Design", "Ux Design", "Video Editing", "Web Design", "Wireframing"
  ],
  "Marketing": [
    "Ad Copy", "Affiliate Marketing", "Campaign Planning", "Content Marketing", "Conversion Rate Optimization", "Email Marketing", "Funnel Design", "Google Ads", "Google Analytics", "Growth Hacking", "Influencer Marketing", "Keyword Research", "Klaviyo", "Lead Generation", "Linkedin Ads", "Mailchimp", "Marketing Automation", "Marketing Strategy", "Meta Ads", "PPC", "SEM", "SEO", "Seo Audit", "Social Media Marketing", "Tiktok Ads"
  ],
  "Tech / Architecture": [
    "Amazon S3", "Ansible", "Apache", "Api Architecture", "Argocd", "AWS", "Aws Lambda", "Azure", "Bash Scripting", "Caching Strategy", "Cassandra", "Celery", "Ci Cd", "Cloud Security", "Cloudflare", "Cloudformation", "Datadog", "Digitalocean", "Distributed Systems", "DNS", "Docker", "Dynamodb", "Elasticsearch", "Event Driven Architecture", "Firebase", "GCP", "Github Actions", "Gitlab Ci", "Grafana", "Helm", "Heroku", "Infra Monitoring", "Jenkins", "Kafka", "Kubernetes", "Linux", "Load Balancing", "Mariadb", "Microservices", "Mongodb", "Mqtt", "Mysql", "Networking", "Nginx", "Oauth", "Observability", "Postgresql", "Powershell", "Prometheus", "Rabbitmq", "Redis", "Reverse Proxy", "Scalability Design", "Site Reliability", "Snowflake Admin", "Sqlite", "Sso Saml", "Supabase", "System Design", "Terraform", "Ubuntu", "Vercel", "VPN"
  ],
  "Branding": [
    "Brand Audit", "Brand Guidelines", "Brand Identity", "Brand Messaging", "Brand Positioning", "Brand Strategy", "Naming", "Rebranding", "Tagline Slogan", "Tone Of Voice", "Visual Identity"
  ],
  "Excel / Spreadsheets": [
    "Conditional Formatting", "Csv Transformation", "Data Entry", "Data Extraction", "Data Processing", "Excel", "Excel Formulas", "Excel Macros", "Excel Vba", "Google Sheets", "Lookup Functions", "Pivot Tables", "Power Query", "Report Automation Sheets", "Spreadsheet Automation", "Spreadsheet Cleanup", "Spreadsheet Modeling"
  ]
};

// Automatic Tier Calculation (T1 - T3)
// Tiers 4 & 5 are strictly reserved for manual elevation based on verified performance
function calculateTier(domainsCount: number, skillsCount: number): "T1" | "T2" | "T3" {
  if (domainsCount >= 2 && skillsCount >= 8) {
    return "T3";
  } else if (skillsCount >= 4 || (domainsCount >= 1 && skillsCount >= 3)) {
    return "T2";
  }
  return "T1";
}

export default function WorkerOnboarding() {
  const router = useRouter();
  const supabase = createClient();

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [skillSearchQuery, setSkillSearchQuery] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Modals & Flow States
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showKycRequiredModal, setShowKycRequiredModal] = useState(false);
  const [assignedTier, setAssignedTier] = useState<"T1" | "T2" | "T3">("T1");

  const [loading, setLoading] = useState(false);
  const [pageChecking, setPageChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already onboarded
  useEffect(() => {
    async function checkExistingWorkerStatus() {
      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.getUser();

      if (authErr || !user) {
        router.replace("/login");
        return;
      }

      const { data: worker } = await supabase
        .from("workers")
        .select("terms_accepted")
        .eq("worker_id", user.id)
        .maybeSingle();

      if (worker?.terms_accepted) {
        router.replace("/worker/dashboard");
        return;
      }

      setPageChecking(false);
    }

    checkExistingWorkerStatus();
  }, [router, supabase]);

  // Recalculate automatic tier whenever domains or skills change
  useEffect(() => {
    const tier = calculateTier(selectedCategories.length, selectedSkills.length);
    setAssignedTier(tier);
  }, [selectedCategories.length, selectedSkills.length]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(cat)) {
        const skillsToRemove = CATEGORY_MAP[cat] || [];
        setSelectedSkills((prevSkills) =>
          prevSkills.filter((s) => !skillsToRemove.includes(s))
        );
        return prev.filter((c) => c !== cat);
      } else {
        return [...prev, cat];
      }
    });
  };

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter((s) => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const currentSkills = Array.from(
    new Set(selectedCategories.flatMap((cat) => CATEGORY_MAP[cat] || []))
  ).sort();

  const filteredSkills = currentSkills.filter((skill) =>
    skill.toLowerCase().includes(skillSearchQuery.toLowerCase())
  );

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCategories.length === 0 || selectedSkills.length === 0 || !termsAccepted) {
      setError("Please select your primary domains, at least one skill, and agree to the Specialist Agreement.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Authentication session expired. Please sign in again.");
      }

      const computedTier = calculateTier(selectedCategories.length, selectedSkills.length);

      // Upsert worker record with computed tier
      const { error: updateError } = await supabase.from("workers").upsert({
        worker_id: user.id,
        categories: selectedCategories,
        skills: selectedSkills,
        capacity: 1,
        is_online: true,
        standing: "good",
        tier: computedTier,
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
      });

      if (updateError) throw updateError;

      // Show KYC Compulsory Modal before going to radar
      setAssignedTier(computedTier);
      setShowKycRequiredModal(true);
    } catch (err: any) {
      setError(err.message || "Failed to finalize specialist onboarding.");
    } finally {
      setLoading(false);
    }
  };

  if (pageChecking) {
    return (
      <div className="min-h-screen bg-canvas-light dark:bg-canvas-dark flex items-center justify-center p-6 text-foreground-light dark:text-foreground-dark">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-foreground-light dark:border-foreground-dark border-t-transparent rounded-full animate-spin" />
          <p className="text-xs uppercase tracking-wider text-muted-light dark:text-muted-dark font-medium">
            Verifying Specialist Status...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas-light dark:bg-canvas-dark py-12 px-6 flex items-center justify-center relative">
      <div className="w-full max-w-[700px] bg-surface-light dark:bg-surface-dark rounded-panel border border-border-light dark:border-border-dark p-8 shadow-sm relative z-10 space-y-8">
        
        {/* HEADER */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Establish Your Expertise</h1>
          <p className="text-muted-light dark:text-muted-dark text-sm max-w-lg mx-auto">
            Tasks are dispatched in real time based on skill precision. Select your domains and verified competencies below.
          </p>
        </div>

        {/* AUTOMATIC TIER STATUS PILL */}
        <div className="p-4 bg-canvas-light dark:bg-canvas-dark rounded-input border border-border-light dark:border-border-dark flex items-center justify-between text-xs">
          <div>
            <span className="font-semibold block text-foreground-light dark:text-foreground-dark">
              Assigned Level:{" "}
              <span className="text-blue-600 font-bold">
                {assignedTier === "T3"
                  ? "Tier 3 (Multi-Domain Senior)"
                  : assignedTier === "T2"
                  ? "Tier 2 (Core Specialist)"
                  : "Tier 1 (Foundational Specialist)"}
              </span>
            </span>
            <span className="text-muted-light dark:text-muted-dark text-[11px]">
              Automatic placement (T1–T3). Tiers 4 & 5 are awarded via portfolio review & verified delivery record.
            </span>
          </div>
          <span className="px-2.5 py-1 bg-blue-500/10 text-blue-600 font-mono font-bold rounded-pill text-xs">
            {assignedTier}
          </span>
        </div>

        <form onSubmit={handleCompleteProfile} className="space-y-8">
          
          {/* DOMAIN SELECTION */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">
                1. Select Primary Domains ({selectedCategories.length} selected)
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.keys(CATEGORY_MAP).map((cat) => {
                const isSelected = selectedCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`h-9 px-4 rounded-pill text-xs font-semibold transition-colors border flex-shrink-0 ${
                      isSelected
                        ? "bg-foreground-light text-canvas-light dark:bg-foreground-dark dark:text-canvas-dark border-transparent shadow-sm"
                        : "border-border-light dark:border-border-dark hover:bg-canvas-light dark:hover:bg-canvas-dark"
                    }`}
                  >
                    {cat} {isSelected ? "✓" : "+"}
                  </button>
                );
              })}
            </div>
          </div>

          {/* SKILLS SELECTION */}
          {selectedCategories.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-border-light dark:border-border-dark">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">
                  2. Select Verified Skills ({selectedSkills.length} selected)
                </label>
                {selectedSkills.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedSkills([])}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <input
                type="text"
                placeholder="Search skills within selected domains..."
                value={skillSearchQuery}
                onChange={(e) => setSkillSearchQuery(e.target.value)}
                className="w-full h-10 px-4 rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark text-xs focus:outline-none focus:border-foreground-light dark:focus:border-foreground-dark"
              />

              <div className="flex flex-wrap gap-2 max-h-[220px] overflow-y-auto pr-2 pb-2">
                {filteredSkills.length > 0 ? (
                  filteredSkills.map((skill) => {
                    const isSelected = selectedSkills.includes(skill);
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleSkill(skill)}
                        className={`h-8 px-3 rounded-pill text-xs font-medium transition-colors border flex-shrink-0 ${
                          isSelected
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : "border-border-light dark:border-border-dark hover:bg-canvas-light dark:hover:bg-canvas-dark"
                        }`}
                      >
                        {skill} {isSelected ? "✓" : "+"}
                      </button>
                    );
                  })
                ) : (
                  <p className="text-xs text-muted-light dark:text-muted-dark italic p-2">
                    No matching skills found.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* KYC NOTICE CALLOUT */}
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-input space-y-1.5 text-xs text-foreground-light dark:text-foreground-dark">
            <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Mandatory Payout KYC Notice</span>
            </div>
            <p className="text-muted-light dark:text-muted-dark leading-relaxed">
              Once onboarded, you must complete your <strong>Payout KYC (Bank/UPI & PAN)</strong> to accept tasks. Work cannot be dispatched or paid out to unverified accounts.
            </p>
          </div>

          {/* TERMS & CONDITIONS (COMPULSORY CHECKBOX & MODAL TRIGGER) */}
          <div className="pt-4 border-t border-border-light dark:border-border-dark space-y-2">
            <div className="flex items-start gap-3">
              <input
                id="terms-checkbox"
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                required
                className="w-5 h-5 mt-0.5 rounded border border-border-light dark:border-border-dark text-blue-600 focus:ring-0 cursor-pointer flex-shrink-0"
              />
              <label htmlFor="terms-checkbox" className="text-xs text-muted-light dark:text-muted-dark leading-relaxed cursor-pointer select-none">
                I agree to the{" "}
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="font-bold text-foreground-light dark:text-foreground-dark underline hover:text-blue-600 transition-colors"
                >
                  Humynity Specialist Terms & Escrow Service Agreement
                </button>
                , acknowledge that task claims are subject to verified KYC, and confirm that my declared expertise is accurate.
              </label>
            </div>
          </div>

          {error && (
            <div className="text-xs text-red-500 bg-red-500/10 p-3 rounded-input">
              {error}
            </div>
          )}

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={
              loading ||
              selectedCategories.length === 0 ||
              selectedSkills.length === 0 ||
              !termsAccepted
            }
            className="w-full h-12 rounded-pill bg-foreground-light text-canvas-light dark:bg-foreground-dark dark:text-canvas-dark font-semibold text-sm transition-transform active:scale-[0.985] disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {loading ? "Activating Profile..." : `Activate Profile (${assignedTier})`}
          </button>
        </form>
      </div>

      {/* MODAL 1: TERMS & CONDITIONS MODAL */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl max-h-[80vh] flex flex-col bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-panel shadow-2xl p-6">
            <div className="flex justify-between items-center border-b border-border-light dark:border-border-dark pb-4">
              <h2 className="text-lg font-bold">Specialist Service Agreement</h2>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-canvas-light dark:hover:bg-canvas-dark text-muted-light dark:text-muted-dark"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 py-4 text-xs text-muted-light dark:text-muted-dark leading-relaxed pr-2">
              <div>
                <h3 className="font-bold text-foreground-light dark:text-foreground-dark mb-1">
                  1. Independent Specialist Representation
                </h3>
                <p>
                  You represent that all skills and domains selected reflect verified professional capability. Inaccurate representations or abandonment of claimed tasks will result in immediate demotion or account termination.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-foreground-light dark:text-foreground-dark mb-1">
                  2. Protected Escrow Settlement & Watermarking
                </h3>
                <p>
                  Tasks operate under protected escrow authorization. Deliveries must include watermarked or preview formats during review phases. Funds are disbursed to your linked account once the client approves delivery.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-foreground-light dark:text-foreground-dark mb-1">
                  3. Anonymity & Professional Conduct
                </h3>
                <p>
                  Direct exchange of personal contact information (phone numbers, private email, social profiles) is strictly prohibited. All communication and deliveries must remain within the secure task workspace.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-foreground-light dark:text-foreground-dark mb-1">
                  4. Compulsory KYC & Tax Compliance
                </h3>
                <p>
                  Disbursements are processed directly via verified Bank Account or UPI upon submission of a valid Permanent Account Number (PAN). Taxes and platform processing fees are deducted at source per regulatory requirements.
                </p>
              </div>
            </div>

            <div className="border-t border-border-light dark:border-border-dark pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setTermsAccepted(true);
                  setShowTermsModal(false);
                }}
                className="h-10 px-6 rounded-pill bg-blue-600 text-white font-semibold text-xs hover:bg-blue-500 transition-colors"
              >
                I Understand & Agree
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: MANDATORY KYC REQUIRED NEXT STEP */}
      {showKycRequiredModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-panel p-6 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center mx-auto">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <div>
              <span className="px-3 py-1 bg-blue-500/10 text-blue-600 rounded-pill text-xs font-bold uppercase tracking-wider">
                Profile Active: {assignedTier}
              </span>
              <h2 className="text-xl font-bold mt-2">Final Step: Complete Payout KYC</h2>
              <p className="text-xs text-muted-light dark:text-muted-dark mt-2 leading-relaxed">
                Your expertise has been recorded. To receive live task invitations on your Live Radar and withdraw earnings, you must link your Bank/UPI and PAN details.
              </p>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-input text-[11px] text-amber-700 dark:text-amber-300 text-left">
              <strong>Why is this compulsory?</strong> Escrow payments cannot be routed or settled to specialist accounts without a verified payout destination.
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => router.push("/worker/settings/payouts")}
                className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-pill transition-colors shadow-md"
              >
                Complete Payout KYC Now →
              </button>
              <button
                type="button"
                onClick={() => router.push("/worker/dashboard")}
                className="w-full h-10 border border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark font-medium text-xs rounded-pill hover:bg-canvas-light dark:hover:bg-canvas-dark transition-colors"
              >
                Go to Radar (Tasks Paused Until KYC)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}