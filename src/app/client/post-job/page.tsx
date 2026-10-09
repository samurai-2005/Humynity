"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// --- RAZORPAY SCRIPT LOADER ---
const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && (window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

// FULL 11-CATEGORY TAXONOMY PRESERVED
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

interface JtbdPreset {
  label: string;
  title: string;
  description: string;
  suggestedBudget: number;
  timeLimit: string;
  defaultSkills: string[];
}

const OPTIONAL_TEMPLATES: Record<string, JtbdPreset[]> = {
  "Code Review": [
    {
      label: "🔒 Security & Auth Audit",
      title: "Security & Authentication Review",
      description: "Perform a thorough review of our auth flow, token handling, session management, and route protections. Highlight any vulnerabilities and recommend concrete fixes.",
      suggestedBudget: 2000,
      timeLimit: "3",
      defaultSkills: ["Code Review", "Typescript", "Nextjs", "Debugging"],
    },
    {
      label: "⚡ Pull Request Review",
      title: "PR Architecture & Logic Audit",
      description: "Review pending PR code changes for clean coding standards, edge cases, error handling, and performance regressions.",
      suggestedBudget: 1200,
      timeLimit: "2",
      defaultSkills: ["Code Review", "GIT", "Refactoring", "Unit Testing"],
    },
  ],
  "Content & Copy": [
    {
      label: "✍️ Landing Page Copy",
      title: "High-Converting Landing Page Copywriting",
      description: "Write clear, customer-centric value propositions, hero headlines, feature summaries, and conversion CTAs.",
      suggestedBudget: 1800,
      timeLimit: "3",
      defaultSkills: ["Copywriting", "Content Strategy", "Editing"],
    },
    {
      label: "🔍 Proofreading & Polish",
      title: "Professional Editing & Proofreading",
      description: "Review and polish an existing draft to elevate tone, clarity, grammar, and engagement.",
      suggestedBudget: 800,
      timeLimit: "2",
      defaultSkills: ["Proofreading", "Content Audit", "Copy Editing"],
    },
  ],
  "Design": [
    {
      label: "🎨 UI Screen Polish",
      title: "UI Design & Component Hierarchy Polish",
      description: "Review existing UI frames in Figma and elevate typography, spacing rhythm, and visual polish.",
      suggestedBudget: 2000,
      timeLimit: "3",
      defaultSkills: ["Ui Design", "Ux Design", "Figma"],
    },
  ],
};

export default function PostJobPage() {
  const router = useRouter();
  const supabase = createClient();

  const [posterId, setPosterId] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Form States
  const [category, setCategory] = useState<string>("Code Review");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [baseBudget, setBaseBudget] = useState("1000");
  const [timeLimit, setTimeLimit] = useState("3");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  // Skill Search & Custom Skill Addition States
  const [skillSearchQuery, setSkillSearchQuery] = useState("");
  const [showFullSkillCatalog, setShowFullSkillCatalog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hourOptions = Array.from({ length: 47 }, (_, i) => i + 2);

  // Authenticate user on mount
  useEffect(() => {
    async function checkClientAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }
      setPosterId(user.id);
      setAuthChecking(false);
    }
    checkClientAuth();
  }, [router, supabase]);

  // When category changes, reset skill query
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCat = e.target.value;
    setCategory(newCat);
    setSkillSearchQuery("");
  };

  // Optional: Apply Preset Template
  const applyPreset = (preset: JtbdPreset) => {
    setTitle(preset.title);
    setDescription(preset.description);
    setBaseBudget(preset.suggestedBudget.toString());
    setTimeLimit(preset.timeLimit);

    // Merge skills uniquely
    const merged = Array.from(new Set([...selectedSkills, ...preset.defaultSkills]));
    setSelectedSkills(merged);
  };

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter((s) => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  // Handle adding custom skills on the fly
  const handleAddCustomSkill = () => {
    const trimmed = skillSearchQuery.trim();
    if (!trimmed) return;

    if (!selectedSkills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setSelectedSkills([...selectedSkills, trimmed]);
    }
    setSkillSearchQuery("");
  };

  // Zomato-style Billing Calculation (30% Platform & Tax Overhead)
  const parsedBudget = parseFloat(baseBudget) || 0;
  const platformFee = Math.round(parsedBudget * 0.12); // 12% Handling
  const cgst = Math.round(parsedBudget * 0.09);        // 9% CGST
  const sgst = Math.round(parsedBudget * 0.09);        // 9% SGST
  const totalPayable = parsedBudget + platformFee + cgst + sgst;

  const handlePostGig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!posterId) {
      router.push("/login");
      return;
    }
    if (parsedBudget < 500) {
      alert("Minimum task budget is ₹500");
      return;
    }
    if (selectedSkills.length === 0) {
      alert("Please specify or select at least one relevant skill for the specialist.");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      posterId,
      title: title.trim() || `${category} Task`,
      description: description.trim() || `Execution required for ${category}`,
      baseBudget: parsedBudget,
      timeLimit: Number(timeLimit),
      category,
      selectedSkills,
    };

    try {
      // 1. Initialize Protected Escrow Hold in Supabase
      const response = await fetch("/api/escrow/create-hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.orderId || !data.gigId) {
        alert(data.error || "Unable to initialize payment authorization.");
        setIsSubmitting(false);
        return;
      }

      // 2. Load Razorpay SDK
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        alert("Payment gateway failed to load. Please verify your connection.");
        setIsSubmitting(false);
        return;
      }

      // 3. Open Checkout Modal with UPI & QR prioritized upfront
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: "INR",
        name: "Humynity",
        description: `Payment Hold: ${title || `${category} Task`}`,
        order_id: data.orderId,
        config: {
          display: {
            blocks: {
              upi: {
                name: "Pay via UPI / QR Code",
                instruments: [{ method: "upi" }],
              },
              other: {
                name: "Cards & Netbanking",
                instruments: [
                  { method: "card" },
                  { method: "netbanking" },
                  { method: "wallet" },
                ],
              },
            },
            sequence: ["block.upi", "block.other"],
            preferences: {
              show_default_blocks: true,
            },
          },
        },
        handler: async function (paymentResponse: any) {
          try {
            // Trigger matching dispatcher
            const dispatchRes = await fetch("/api/dispatch", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                gigId: data.gigId,
                paymentId: paymentResponse.razorpay_payment_id,
                jobCategory: category,
                jobSkills: selectedSkills,
                jobTier: parsedBudget >= 5000 ? "T4" : "T2",
              }),
            });

            if (dispatchRes.ok) {
              router.push(`/client/radar?gigId=${data.gigId}`);
            } else {
              router.push(`/client/radar?gigId=${data.gigId}`);
            }
          } catch (error) {
            console.error("Dispatcher trigger error:", error);
            router.push(`/client/radar?gigId=${data.gigId}`);
          } finally {
            setIsSubmitting(false);
          }
        },
        modal: {
          ondismiss: function () {
            setIsSubmitting(false);
          },
        },
        theme: {
          color: "#2563EB",
        },
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();
    } catch (error) {
      console.error("Checkout Error:", error);
      alert("An unexpected error occurred during authorization.");
      setIsSubmitting(false);
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-canvas-light dark:bg-canvas-dark flex items-center justify-center p-6 text-foreground-light dark:text-foreground-dark">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-foreground-light dark:border-foreground-dark border-t-transparent rounded-full animate-spin" />
          <p className="text-xs uppercase tracking-wider text-muted-light dark:text-muted-dark font-medium">
            Verifying Session...
          </p>
        </div>
      </div>
    );
  }

  const categorySkills = CATEGORY_MAP[category] || [];
  const filteredCategorySkills = categorySkills.filter((s) =>
    s.toLowerCase().includes(skillSearchQuery.toLowerCase())
  );
  const isExactSkillMatch = categorySkills.some(
    (s) => s.toLowerCase() === skillSearchQuery.trim().toLowerCase()
  );
  const currentCategoryTemplates = OPTIONAL_TEMPLATES[category] || [];

  return (
    <div className="min-h-screen bg-canvas-light dark:bg-canvas-dark py-12 px-6 text-foreground-light dark:text-foreground-dark relative">
      <div className="max-w-[1040px] mx-auto relative z-10">

        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Get Work Done</h1>
          <p className="text-muted-light dark:text-muted-dark text-sm">
            Define your task requirements. A verified domain specialist will accept and deliver with quality protection.
          </p>
        </div>

        <form onSubmit={handlePostGig} className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* LEFT COLUMN: TASK DETAILS */}
          <div className="lg:col-span-8 space-y-6 bg-surface-light dark:bg-surface-dark p-8 rounded-panel border border-border-light dark:border-border-dark shadow-sm">

            {/* DOMAIN CATEGORY */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">
                Project Domain
              </label>
              <select
                value={category}
                onChange={handleCategoryChange}
                className="w-full h-12 px-4 rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark focus:outline-none focus:border-foreground-light dark:focus:border-foreground-dark transition-colors font-medium text-sm"
              >
                {Object.keys(CATEGORY_MAP).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* OPTIONAL TEMPLATES (ACCELERATORS) */}
            {currentCategoryTemplates.length > 0 && (
              <div className="space-y-2 pt-1">
                <span className="text-xs text-muted-light dark:text-muted-dark">
                  Need a starting point? (Optional):
                </span>
                <div className="flex flex-wrap gap-2">
                  {currentCategoryTemplates.map((template) => (
                    <button
                      key={template.label}
                      type="button"
                      onClick={() => applyPreset(template)}
                      className="px-3.5 py-1.5 rounded-pill text-xs font-medium border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark hover:border-blue-500 transition-colors"
                    >
                      {template.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TASK TITLE */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">
                Task Title
              </label>
              <input
                type="text"
                placeholder="e.g. Next.js Auth Review, Custom Python Scraper, or Translation"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full h-12 px-4 rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark focus:outline-none focus:border-foreground-light dark:focus:border-foreground-dark transition-colors placeholder:text-muted-light dark:placeholder:text-muted-dark text-sm"
              />
            </div>

            {/* DESCRIPTION */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">
                Task Requirements & Scope
              </label>
              <textarea
                placeholder="Describe what needs to be delivered, edge cases to watch for, links, or specific acceptance criteria..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="w-full min-h-[140px] p-4 rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark focus:outline-none focus:border-foreground-light dark:focus:border-foreground-dark transition-colors placeholder:text-muted-light dark:placeholder:text-muted-dark text-sm resize-y"
              />
            </div>

            {/* BUDGET & TIME */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">
                  Specialist Budget (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={baseBudget}
                    onChange={(e) => setBaseBudget(e.target.value)}
                    required
                    min="500"
                    className="w-full h-12 pl-8 pr-4 rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark focus:outline-none focus:border-foreground-light dark:focus:border-foreground-dark transition-colors text-sm font-semibold"
                  />
                </div>
                <span className="text-[11px] text-muted-light dark:text-muted-dark">
                  Minimum platform task: ₹500
                </span>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">
                  Expected Delivery Window
                </label>
                <select
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(e.target.value)}
                  required
                  className="w-full h-12 px-4 rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark focus:outline-none focus:border-foreground-light dark:focus:border-foreground-dark transition-colors text-sm font-medium"
                >
                  {hourOptions.map((hour) => (
                    <option key={hour} value={hour}>
                      {hour} Hours
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* SKILLS SECTION: AUTOSCOPED + CUSTOM SKILL CAPABILITY */}
            <div className="pt-4 border-t border-border-light dark:border-border-dark space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">
                  Required Specialist Skills ({selectedSkills.length} selected)
                </label>
                <button
                  type="button"
                  onClick={() => setShowFullSkillCatalog(!showFullSkillCatalog)}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  {showFullSkillCatalog ? "Close Skill Browser" : "Browse All Skills"}
                </button>
              </div>

              {/* Selected Pills */}
              <div className="flex flex-wrap gap-2 min-h-[36px] p-2 bg-canvas-light dark:bg-canvas-dark rounded-input border border-border-light dark:border-border-dark">
                {selectedSkills.length === 0 ? (
                  <span className="text-xs text-muted-light dark:text-muted-dark italic self-center">
                    No skills attached yet. Type below or browse the catalog.
                  </span>
                ) : (
                  selectedSkills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-foreground-light text-canvas-light dark:bg-foreground-dark dark:text-canvas-dark text-xs font-medium"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => toggleSkill(skill)}
                        className="hover:opacity-75 text-sm leading-none ml-1"
                      >
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* Search or Add Custom Skill Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={`Search ${category} skills or type custom skill...`}
                  value={skillSearchQuery}
                  onChange={(e) => setSkillSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustomSkill();
                    }
                  }}
                  className="flex-1 h-10 px-3 rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark text-xs"
                />
                {skillSearchQuery.trim() && !isExactSkillMatch && (
                  <button
                    type="button"
                    onClick={handleAddCustomSkill}
                    className="px-4 h-10 rounded-input bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 transition-colors whitespace-nowrap"
                  >
                    + Add &quot;{skillSearchQuery.trim()}&quot;
                  </button>
                )}
              </div>

              {/* Category Skill Search Matches / Full Catalog */}
              {(skillSearchQuery.trim() || showFullSkillCatalog) && (
                <div className="p-4 rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark space-y-2 animate-in fade-in">
                  <div className="flex justify-between items-center text-[11px] text-muted-light dark:text-muted-dark">
                    <span>
                      {skillSearchQuery.trim()
                        ? `Matches in ${category}:`
                        : `All ${category} Skills (${categorySkills.length}):`}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                    {filteredCategorySkills.map((skill) => {
                      const isSelected = selectedSkills.includes(skill);
                      return (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => toggleSkill(skill)}
                          className={`px-2.5 py-1 rounded-pill text-[11px] font-medium transition-colors border ${
                            isSelected
                              ? "bg-blue-600 text-white border-blue-600"
                              : "border-border-light dark:border-border-dark hover:bg-surface-light dark:hover:bg-surface-dark"
                          }`}
                        >
                          {skill} {isSelected ? "✓" : "+"}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: ZOMATO-STYLE BILL BREAKDOWN */}
          <div className="lg:col-span-4">
            <div className="sticky top-6 bg-surface-light dark:bg-surface-dark rounded-panel border border-border-light dark:border-border-dark p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-lg font-bold">Payment Details</h2>
                <p className="text-xs text-muted-light dark:text-muted-dark mt-0.5">
                  Itemized summary for your task authorization.
                </p>
              </div>

              {/* ITEMIZATION */}
              <div className="space-y-3 text-xs border-t border-b border-border-light dark:border-border-dark py-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-light dark:text-muted-dark">Specialist Reward</span>
                  <span className="font-medium font-mono">₹{parsedBudget.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-light dark:text-muted-dark">Platform & Quality Handling</span>
                  <span className="font-medium font-mono">₹{platformFee.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-light dark:text-muted-dark">Central GST (CGST 9%)</span>
                  <span className="font-medium font-mono">₹{cgst.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-light dark:text-muted-dark">State GST (SGST 9%)</span>
                  <span className="font-medium font-mono">₹{sgst.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-dashed border-border-light dark:border-border-dark text-sm font-bold">
                  <span>Total Amount Payable</span>
                  <span className="font-mono text-base">₹{totalPayable.toFixed(2)}</span>
                </div>
              </div>

              {/* REASSURANCE BADGE */}
              <div className="p-3.5 bg-canvas-light dark:bg-canvas-dark rounded-input border border-border-light dark:border-border-dark space-y-1.5 text-xs text-muted-light dark:text-muted-dark">
                <div className="flex items-center gap-1.5 font-semibold text-foreground-light dark:text-foreground-dark">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>100% Protected Payment Hold</span>
                </div>
                <p className="leading-relaxed">
                  Funds remain safely held. You only release payment once you review and approve the watermarked delivery.
                </p>
              </div>

              {/* ACTION BUTTON */}
              <button
                type="submit"
                disabled={isSubmitting || parsedBudget < 500 || selectedSkills.length === 0}
                className="w-full h-12 rounded-pill bg-foreground-light text-canvas-light dark:bg-foreground-dark dark:text-canvas-dark font-semibold text-sm transition-transform active:scale-[0.985] disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                {isSubmitting ? "Securing Authorization..." : "Authorize & Match Specialist"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}