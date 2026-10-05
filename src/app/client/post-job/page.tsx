"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

export default function PostJobPage() {
  const router = useRouter();
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [baseBudget, setBaseBudget] = useState("");
  const [timeLimit, setTimeLimit] = useState("2"); // Set minimum to 2 hours default
  
  const [category, setCategory] = useState<string>("Code Review");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [skillSearchQuery, setSkillSearchQuery] = useState("");

  // Generates dropdown options from 2 to 48 hours
  const hourOptions = Array.from({ length: 47 }, (_, i) => i + 2);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategory(e.target.value);
    setSelectedSkills([]); 
    setSkillSearchQuery(""); 
  };

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  // Financial Calculations: Base Budget + 30% Platform Fee
  const parsedBudget = parseFloat(baseBudget) || 0;
  const platformFee = parsedBudget * 0.30;
  const finalEscrow = parsedBudget + platformFee;

  const handlePostGig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedBudget < 500) {
      alert("Minimum base budget is ₹500");
      return;
    }
    if (selectedSkills.length === 0) {
      alert("Please select at least one required skill.");
      return;
    }
    
    const payload = { 
      title, 
      description, 
      baseBudget, 
      platformFee, 
      finalEscrow, 
      timeLimit: Number(timeLimit), // Converted to number for DB insertion
      category, 
      selectedSkills 
    };

    console.log("Proceeding to Escrow with:", payload);
    
    // TODO: Await Razorpay Escrow API route execution here
  };

  const currentSkills = CATEGORY_MAP[category] || [];
  
  const filteredSkills = currentSkills.filter((skill) => 
    skill.toLowerCase().includes(skillSearchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-canvas-light dark:bg-canvas-dark bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#363638_1px,transparent_1px)] [background-size:24px_24px] py-12 px-6 text-foreground-light dark:text-foreground-dark relative">
      
      <div className="max-w-[1040px] mx-auto relative z-10">
        
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-semibold tracking-display mb-2">Create New Gig</h1>
          <p className="text-muted-light dark:text-muted-dark tracking-body text-sm">
            Specify your task requirements. Our algorithm targets workers with an 85%+ skill match.
          </p>
        </div>

        <form onSubmit={handlePostGig} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Form Fields */}
          <div className="lg:col-span-8 space-y-8 bg-surface-light/80 dark:bg-surface-dark/80 backdrop-blur-md p-8 rounded-panel border border-border-light dark:border-border-dark">
            
            <div className="space-y-2">
              <label className="block text-xs font-medium uppercase tracking-wide text-muted-light dark:text-muted-dark">
                Gig Title
              </label>
              <input
                type="text"
                placeholder="e.g. Code Review for Next.js Authentication"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full h-12 px-4 rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark focus:outline-none focus:border-foreground-light dark:focus:border-foreground-dark transition-colors placeholder:text-muted-light dark:placeholder:text-muted-dark"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium uppercase tracking-wide text-muted-light dark:text-muted-dark">
                Detailed Description
              </label>
              <textarea
                placeholder="Detail exactly what you need done..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="w-full min-h-[160px] p-4 rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark focus:outline-none focus:border-foreground-light dark:focus:border-foreground-dark transition-colors placeholder:text-muted-light dark:placeholder:text-muted-dark resize-y"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-medium uppercase tracking-wide text-muted-light dark:text-muted-dark">
                  Base Budget (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark">₹</span>
                  <input
                    type="number"
                    placeholder="500"
                    value={baseBudget}
                    onChange={(e) => setBaseBudget(e.target.value)}
                    required
                    min="500"
                    className="w-full h-12 pl-8 pr-4 rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark focus:outline-none focus:border-foreground-light dark:focus:border-foreground-dark transition-colors placeholder:text-muted-light dark:placeholder:text-muted-dark"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium uppercase tracking-wide text-muted-light dark:text-muted-dark">
                  Estimated Effort (Hours)
                </label>
                <select
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(e.target.value)}
                  required
                  className="w-full h-12 px-4 rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark focus:outline-none focus:border-foreground-light dark:focus:border-foreground-dark transition-colors text-foreground-light dark:text-foreground-dark"
                >
                  {hourOptions.map((hour) => (
                    <option key={hour} value={hour}>
                      {hour} Hours
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-border-light dark:border-border-dark space-y-6">
              
              <div className="space-y-2">
                <label className="block text-xs font-medium uppercase tracking-wide text-muted-light dark:text-muted-dark">
                  Project Category
                </label>
                <select
                  value={category}
                  onChange={handleCategoryChange}
                  className="w-full h-12 px-4 rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark focus:outline-none focus:border-foreground-light dark:focus:border-foreground-dark transition-colors text-foreground-light dark:text-foreground-dark"
                >
                  {Object.keys(CATEGORY_MAP).map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <label className="block text-xs font-medium uppercase tracking-wide text-muted-light dark:text-muted-dark">
                    Required Skills (Select to require)
                  </label>
                  <span className="text-xs text-muted-light dark:text-muted-dark">
                    {selectedSkills.length} selected
                  </span>
                </div>
                
                <input
                  type="text"
                  placeholder={`Search ${category} skills...`}
                  value={skillSearchQuery}
                  onChange={(e) => setSkillSearchQuery(e.target.value)}
                  className="w-full h-10 px-4 rounded-input border border-border-light dark:border-border-dark bg-canvas-light dark:bg-canvas-dark focus:outline-none focus:border-foreground-light dark:focus:border-foreground-dark transition-colors placeholder:text-muted-light dark:placeholder:text-muted-dark text-sm"
                />

                <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto pr-2 pb-2">
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
                      No skills found matching "{skillSearchQuery}".
                    </p>
                  )}
                </div>
              </div>

            </div>

          </div>

          {/* Right Column: Summary & Escrow Panel */}
          <div className="lg:col-span-4">
            <div className="sticky top-6 bg-surface-light/90 dark:bg-surface-dark/90 backdrop-blur-md rounded-panel border border-border-light dark:border-border-dark p-6 shadow-sm">
              
              <h2 className="text-xl font-semibold mb-6">Gig Summary</h2>
              
              <div className="space-y-0">
                <div className="flex justify-between items-center py-4 border-b border-border-light dark:border-border-dark">
                  <span className="text-sm text-muted-light dark:text-muted-dark">Algorithm Match</span>
                  <span className="text-sm font-medium">Strict (85%+)</span>
                </div>
                
                <div className="flex justify-between items-center py-4 border-b border-border-light dark:border-border-dark">
                  <span className="text-sm text-muted-light dark:text-muted-dark">Base Budget</span>
                  <span className="text-sm font-medium">₹{parsedBudget.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center py-4 border-b border-border-light dark:border-border-dark">
                  <span className="text-sm text-muted-light dark:text-muted-dark">Platform Fee (30%)</span>
                  <span className="text-sm font-medium">₹{platformFee.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center py-6">
                  <span className="text-sm text-muted-light dark:text-muted-dark">Total Escrow</span>
                  <span className="text-3xl font-semibold tracking-display">
                    ₹{finalEscrow.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 mb-6 bg-canvas-light dark:bg-canvas-dark rounded-input border border-border-light dark:border-border-dark">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-muted-light dark:text-muted-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <p className="text-[13px] text-muted-light dark:text-muted-dark leading-relaxed">
                  Funds are held securely. You only release payment upon final approval of watermarked files.
                </p>
              </div>

              <button
                type="submit"
                className="w-full h-12 rounded-pill bg-foreground-light text-canvas-light dark:bg-foreground-dark dark:text-canvas-dark font-medium transition-transform active:scale-[0.985]"
              >
                Deposit & Find Workers
              </button>
              
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}