"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

export default function WorkerOnboarding() {
  const router = useRouter();
  const supabase = createClient();

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [skillSearchQuery, setSkillSearchQuery] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [loading, setLoading] = useState(false);
  const [pageChecking, setPageChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already onboarded
  useEffect(() => {
    async function checkExistingWorkerStatus() {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
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
        // Already an onboarded specialist: forward to dashboard
        router.replace("/worker/dashboard");
        return;
      }

      setPageChecking(false);
    }

    checkExistingWorkerStatus();
  }, [router, supabase]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(cat)) {
        const skillsToRemove = CATEGORY_MAP[cat] || [];
        setSelectedSkills((prevSkills) => prevSkills.filter((s) => !skillsToRemove.includes(s)));
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
      setError("Please complete all requirements and accept the escrow terms.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("Authentication session expired. Please sign in again.");
      }

      // Secure Upsert: bind authenticated user ID with terms acceptance & initial capacity
      const { error: updateError } = await supabase
        .from("workers")
        .upsert({
          worker_id: user.id,
          categories: selectedCategories,
          skills: selectedSkills,
          capacity: 1,
          is_online: true,
          standing: "good",
          tier: "T3",
          match_percentage: 100,
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString(),
        });

      if (updateError) throw updateError;

      router.push("/worker/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to finalize worker onboarding.");
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
    <div className="min-h-screen bg-canvas-light dark:bg-canvas-dark bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#363638_1px,transparent_1px)] [background-size:24px_24px] py-12 px-6 flex items-center justify-center relative">
      <div className="w-full max-w-[680px] bg-surface-light/90 dark:bg-surface-dark/90 backdrop-blur-md rounded-panel border border-border-light dark:border-border-dark p-8 shadow-sm relative z-10">
        
        <div className="text-center mb-10">
          <h1 className="text-3xl font-semibold tracking-display text-foreground-light dark:text-foreground-dark mb-2">
            Establish Your Expertise
          </h1>
          <p className="text-muted-light dark:text-muted-dark tracking-body text-sm">
            Our algorithm routes high-value tasks based on absolute precision. Select your primary domains and exact skill stack.
          </p>
        </div>

        <form onSubmit={handleCompleteProfile} className="space-y-8">
          
          <div className="space-y-4">
            <label className="block text-xs font-medium uppercase tracking-wide text-muted-light dark:text-muted-dark">
              Primary Domains (Select one or more)
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.keys(CATEGORY_MAP).map((cat) => {
                const isSelected = selectedCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`h-9 px-4 rounded-pill text-sm font-medium transition-colors border flex-shrink-0 ${
                      isSelected
                        ? "bg-foreground-light text-canvas-light dark:bg-foreground-dark dark:text-canvas-dark border-transparent"
                        : "bg-canvas-light dark:bg-canvas-dark text-foreground-light dark:text-foreground-dark border-border-light dark:border-border-dark hover:bg-surface-light dark:hover:bg-surface-dark"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-light dark:text-muted-dark pt-1">
              Select multiple contexts to expand the available skills matrix below.
            </p>
          </div>

          {selectedCategories.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-border-light dark:border-border-dark">
              <div className="flex justify-between items-end">
                <label className="block text-xs font-medium uppercase tracking-wide text-muted-light dark:text-muted-dark">
                  Verified Skills
                </label>
                <span className="text-xs text-muted-light dark:text-muted-dark">
                  {selectedSkills.length} selected
                </span>
              </div>

              <input
                type="text"
                placeholder="Search combined skills..."
                value={skillSearchQuery}
                onChange={(e) => setSkillSearchQuery(e.target.value)}
                className="w-full h-10 px-4 rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark focus:outline-none focus:border-foreground-light dark:focus:border-foreground-dark transition-colors placeholder:text-muted-light dark:placeholder:text-muted-dark text-sm"
              />

              <div className="flex flex-wrap gap-2 max-h-[240px] overflow-y-auto pr-2 pb-2">
                {filteredSkills.length > 0 ? (
                  filteredSkills.map((skill) => {
                    const isSelected = selectedSkills.includes(skill);
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleSkill(skill)}
                        className={`h-9 px-4 rounded-pill text-sm font-medium transition-colors border flex-shrink-0 ${
                          isSelected
                            ? "bg-foreground-light text-canvas-light dark:bg-foreground-dark dark:text-canvas-dark border-transparent"
                            : "bg-canvas-light dark:bg-canvas-dark text-foreground-light dark:text-foreground-dark border-border-light dark:border-border-dark hover:bg-surface-light dark:hover:bg-surface-dark"
                        }`}
                      >
                        {skill}
                      </button>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-light dark:text-muted-dark italic p-2">
                    No skills found matching &quot;{skillSearchQuery}&quot;.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="pt-6 border-t border-border-light dark:border-border-dark">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative flex items-center justify-center w-5 h-5 mt-0.5 border border-border-light dark:border-border-dark rounded-sm group-hover:border-foreground-light dark:group-hover:border-foreground-dark transition-colors">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="absolute w-full h-full opacity-0 cursor-pointer"
                  required
                />
                {termsAccepted && (
                  <svg className="w-3.5 h-3.5 text-foreground-light dark:text-foreground-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-sm text-muted-light dark:text-muted-dark leading-relaxed">
                I agree to the stringent Humynity Escrow Policies, acknowledge that my in-app Live Radar will be used for skill-match alerts, and confirm my selected expertise is accurate.
              </span>
            </label>
          </div>

          {error && (
            <div className="text-sm text-canvas-light bg-foreground-light dark:text-canvas-dark dark:bg-foreground-dark p-3 rounded-input">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || selectedCategories.length === 0 || selectedSkills.length === 0 || !termsAccepted}
            className="w-full h-12 mt-4 rounded-pill bg-foreground-light text-canvas-light dark:bg-foreground-dark dark:text-canvas-dark font-medium transition-transform active:scale-[0.985] disabled:opacity-50"
          >
            {loading ? "Locking Profile..." : "Initialize Radar"}
          </button>

        </form>
      </div>
    </div>
  );
}