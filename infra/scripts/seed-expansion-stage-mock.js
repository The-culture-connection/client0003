/**
 * Seed Expansion mock data from fixed curriculum-style fixtures (no scaling).
 *
 * Prerequisites: GOOGLE_APPLICATION_CREDENTIALS or gcloud application-default login.
 *
 * Usage:
 *   npm install --prefix infra/scripts
 *   npm.cmd run seed:dev:expansion-mock
 *   node seed-expansion-stage-mock.js --project mortar-dev
 *
 * Optional: SEED_DRY_RUN=1 or --dry-run
 */

const admin = require("firebase-admin");
const { FieldValue, Timestamp } = require("firebase-admin/firestore");

const DEFAULT_PROJECT = "mortar-dev";
const DEFAULT_PASSWORD = process.env.SEED_USER_PASSWORD || "MortarDevSeed!2026";
const DRY_RUN = process.env.SEED_DRY_RUN === "1" || process.argv.includes("--dry-run");

function argProject() {
  const i = process.argv.indexOf("--project");
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return (
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    DEFAULT_PROJECT
  );
}

const PROJECT_ID = argProject();

/** Shorthand / typos in source JSON → full curriculum label where the app expects it. */
const SKILL_SEEKING_ALIASES = {
  "CRM systems": "Customer relationship management (CRM) systems",
  "crm systems": "Customer relationship management (CRM) systems",
};

function normalizeSeekingSkill(s) {
  if (typeof s !== "string") return null;
  const t = s.trim();
  if (!t) return null;
  return SKILL_SEEKING_ALIASES[t] ?? t;
}

function uniqueStrings(arr) {
  const out = [];
  const seen = new Set();
  for (const x of arr) {
    if (x == null || typeof x !== "string") continue;
    const n = x.trim();
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

function jobSkillSeeking(job) {
  const pref = Array.isArray(job.preferred_skills) ? job.preferred_skills : [];
  const growth = Array.isArray(job.growth_skills) ? job.growth_skills : [];
  return uniqueStrings([...pref, ...growth].map(normalizeSeekingSkill).filter(Boolean));
}

function ts(dateStr) {
  return Timestamp.fromDate(new Date(dateStr));
}

function name(u) {
  return `${u.first_name} ${u.last_name}`.trim();
}

function buildUserDoc(uid, bp) {
  return {
    uid,
    email: bp.email,
    email_verified: true,
    display_name: null,
    photo_url: null,
    first_name: bp.first_name,
    last_name: bp.last_name,
    industry: bp.industry,
    city: "Cincinnati",
    state: "Ohio",
    roles: ["Digital Curriculum Alumni"],
    badges: { earned: [], visible: [] },
    business_goals: bp.business_goals,
    confident_skills: bp.confident_skills,
    desired_skills: bp.desired_skills,
    membership: { status: "active", paid_modules: [] },
    onboarding_status: "complete",
    not_in_cohort: true,
    profile_completed: true,
    permissions: { hidden_videos: [] },
    points: { balance: 0, history_summary: [] },
    work_structure: { flexibility: 7, ownership: 5, weekly_hours: 40 },
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  };
}

async function getOrCreateAuthUser(auth, bp, password) {
  if (DRY_RUN) {
    return { uid: `dry-${bp.email}`, isNew: true };
  }
  try {
    const existing = await auth.getUserByEmail(bp.email);
    return { uid: existing.uid, isNew: false };
  } catch (e) {
    if (e.code !== "auth/user-not-found") throw e;
    const created = await auth.createUser({
      email: bp.email,
      password,
      displayName: `${bp.first_name} ${bp.last_name}`,
      emailVerified: true,
    });
    return { uid: created.uid, isNew: true };
  }
}

/** Map loose profile industries to Explore posting allowlist where needed. */
function industryForListing(authorIndustry) {
  const m = {
    "Beauty & Wellness": "Health, Wellness & Personal Care",
    Fitness: "Health, Wellness & Personal Care",
    "Creative Services": "Creative & Media Services",
    Logistics: "Logistics & Transportation",
    "Logistics & Transportation": "Logistics & Transportation",
    Construction: "Construction & Skilled Trades",
    "Construction & Skilled Trades": "Construction & Skilled Trades",
    Technology: "Technology",
    Retail: "Retail",
    "Food & Beverage": "Food & Beverage",
    "Professional Services": "Professional Services",
    "Health, Wellness & Personal Care": "Health, Wellness & Personal Care",
    Education: "Education & Training",
    "Education & Training": "Education & Training",
  };
  return m[authorIndustry] || authorIndustry || "Professional Services";
}

function jobLocationMode(loc) {
  if (typeof loc !== "string") return "in_person";
  return loc.trim().toLowerCase() === "remote" ? "remote" : "in_person";
}

/** Firestore batch max 500 ops; count each set. */
function createBatchWriter(db) {
  let batch = db.batch();
  let count = 0;
  const commits = [];
  function set(ref, data, opt) {
    if (opt?.merge) batch.set(ref, data, { merge: true });
    else batch.set(ref, data);
    count++;
    if (count >= 450) {
      commits.push(batch.commit());
      batch = db.batch();
      count = 0;
    }
  }
  async function commit() {
    if (count > 0) commits.push(batch.commit());
    await Promise.all(commits);
  }
  return { set, commit };
}

// --- Mock fixtures (values as authored; small normalizations in code only where noted) ---

const RAW_USERS = [
  {
    first_name: "Aaliyah",
    last_name: "Grant",
    industry: "Beauty & Wellness",
    business_goals: ["Open second salon location", "Hire 2 stylists"],
    skills_offering: [
      "Customer persona development",
      "Pricing strategy and margin analysis",
      "Community engagement and reputation building",
    ],
    skills_seeking: [
      "Hiring and onboarding systems",
      "Social media growth strategy",
      "Delegation and team empowerment",
    ],
  },
  {
    first_name: "Marcus",
    last_name: "Reed",
    industry: "Food & Beverage",
    business_goals: ["Launch food truck", "Secure downtown permit"],
    skills_offering: [
      "Vendor sourcing and supply chain management",
      "Service design and packaging",
      "Budget development and cost control",
    ],
    skills_seeking: [
      "Strategic partnerships and distribution channels",
      "Lead generation strategy",
      "Investor communication and financial reporting",
    ],
  },
  {
    first_name: "Tiana",
    last_name: "Coleman",
    industry: "Retail",
    business_goals: ["Increase foot traffic", "Expand product line"],
    skills_offering: [
      "Brand identity development",
      "Customer journey mapping",
      "Pricing experiments and market testing",
    ],
    skills_seeking: [
      "E-commerce and digital sales systems",
      "Automation and workflow optimization",
      "Email marketing and retention systems",
    ],
  },
  {
    first_name: "Devon",
    last_name: "Price",
    industry: "Fitness",
    business_goals: ["Open gym studio", "Build membership base"],
    skills_offering: [
      "Community engagement and reputation building",
      "Customer discovery and validation",
      "Public speaking and thought leadership",
    ],
    skills_seeking: [
      "Cash flow management and forecasting",
      "Marketing funnel design",
      "KPI tracking and performance management",
    ],
  },
  {
    first_name: "Jasmine",
    last_name: "Walker",
    industry: "Creative Services",
    business_goals: ["Grow freelance clients", "Build agency"],
    skills_offering: [
      "Brand identity development",
      "Executive communication and storytelling",
      "Story-driven brand positioning",
    ],
    skills_seeking: [
      "Sales conversation and closing techniques",
      "Negotiation and deal structuring",
      "Customer lifetime value optimization",
    ],
  },
  {
    first_name: "Andre",
    last_name: "Mitchell",
    industry: "Construction",
    business_goals: ["Land commercial contracts", "Build reliable subcontractor team"],
    skills_offering: [
      "Operational workflow design",
      "Vendor sourcing and supply chain management",
      "Conflict resolution and team mediation",
    ],
    skills_seeking: [
      "Strategic networking and relationship building",
      "Investor communication and financial reporting",
      "Founder decision-making under ambiguity",
    ],
  },
  {
    first_name: "Nia",
    last_name: "Harris",
    industry: "Education",
    business_goals: ["Launch tutoring center", "Build recurring memberships"],
    skills_offering: [
      "Customer persona development",
      "Service design and packaging",
      "Community engagement and reputation building",
    ],
    skills_seeking: [
      "Marketing funnel design",
      "Lead generation strategy",
      "AI tools for business productivity",
    ],
  },
  {
    first_name: "Chris",
    last_name: "Daniels",
    industry: "Technology",
    business_goals: ["Launch SaaS tool", "Reach first 100 users"],
    skills_offering: [
      "Minimum viable product (MVP) development",
      "Digital tool stack development",
      "Automation and workflow optimization",
    ],
    skills_seeking: [
      "Customer discovery and validation",
      "Story-driven brand positioning",
      "Strategic partnerships and distribution channels",
    ],
  },
  {
    first_name: "Brianna",
    last_name: "Lopez",
    industry: "Food & Beverage",
    business_goals: ["Start catering business", "Book 10 monthly clients"],
    skills_offering: [
      "Service design and packaging",
      "Pricing strategy and margin analysis",
      "Operational workflow design",
    ],
    skills_seeking: [
      "Email marketing and retention systems",
      "Public speaking and thought leadership",
      "Strategic networking and relationship building",
    ],
  },
  {
    first_name: "Tyrell",
    last_name: "Jackson",
    industry: "Retail",
    business_goals: ["Open sneaker store", "Host community events"],
    skills_offering: [
      "Brand identity development",
      "Community engagement and reputation building",
      "Strategic networking and relationship building",
    ],
    skills_seeking: [
      "Cash flow management and forecasting",
      "Hiring and onboarding systems",
      "E-commerce and digital sales systems",
    ],
  },
  {
    first_name: "Kayla",
    last_name: "Morris",
    industry: "Professional Services",
    business_goals: ["Scale consulting business", "Hire VA"],
    skills_offering: [
      "Executive communication and storytelling",
      "Founder decision-making under ambiguity",
      "Strategic networking and relationship building",
    ],
    skills_seeking: [
      "Automation and workflow optimization",
      "KPI tracking and performance management",
      "Delegation and team empowerment",
    ],
  },
  {
    first_name: "Darius",
    last_name: "Owens",
    industry: "Logistics & Transportation",
    business_goals: ["Win local contracts", "Improve dispatch efficiency"],
    skills_offering: [
      "Operational workflow design",
      "Time management and founder productivity systems",
      "Vendor sourcing and supply chain management",
    ],
    skills_seeking: [
      "Brand identity development",
      "CRM systems",
      "Strategic partnerships and distribution channels",
    ],
  },
  {
    first_name: "Imani",
    last_name: "Brooks",
    industry: "Health, Wellness & Personal Care",
    business_goals: ["Launch wellness studio", "Build recurring client base"],
    skills_offering: [
      "Customer journey mapping",
      "Service design and packaging",
      "Community engagement and reputation building",
    ],
    skills_seeking: [
      "Pricing strategy and margin analysis",
      "Lead generation strategy",
      "Email marketing and retention systems",
    ],
  },
  {
    first_name: "Malik",
    last_name: "Turner",
    industry: "Technology",
    business_goals: ["Build B2B software", "Close first pilot customer"],
    skills_offering: [
      "Digital tool stack development",
      "Data analytics and performance tracking",
      "AI tools for business productivity",
    ],
    skills_seeking: [
      "Sales conversation and closing techniques",
      "Negotiation and deal structuring",
      "Vision articulation and mission design",
    ],
  },
  {
    first_name: "Sierra",
    last_name: "Banks",
    industry: "Creative Services",
    business_goals: ["Grow creative agency", "Retain higher-paying clients"],
    skills_offering: [
      "Story-driven brand positioning",
      "Executive communication and storytelling",
      "Brand identity development",
    ],
    skills_seeking: [
      "Cash flow management and forecasting",
      "Customer lifetime value optimization",
      "Strategic partnerships and distribution channels",
    ],
  },
  {
    first_name: "Jordan",
    last_name: "Perry",
    industry: "Construction & Skilled Trades",
    business_goals: ["Build a more efficient team", "Reduce operational bottlenecks"],
    skills_offering: [
      "Operational workflow design",
      "Standard operating procedures (SOPs)",
      "Hiring and onboarding systems",
    ],
    skills_seeking: [
      "Founder resilience and stress management",
      "Investor communication and financial reporting",
      "Public speaking and thought leadership",
    ],
  },
  {
    first_name: "Naomi",
    last_name: "Ellis",
    industry: "Retail",
    business_goals: ["Launch online store", "Grow recurring customers"],
    skills_offering: [
      "Customer persona development",
      "Marketing funnel design",
      "Email marketing and retention systems",
    ],
    skills_seeking: [
      "E-commerce and digital sales systems",
      "Automation and workflow optimization",
      "Budget development and cost control",
    ],
  },
  {
    first_name: "Xavier",
    last_name: "Carter",
    industry: "Professional Services",
    business_goals: ["Expand legal support practice", "Build strategic referral pipeline"],
    skills_offering: [
      "Negotiation and deal structuring",
      "Executive communication and storytelling",
      "Conflict resolution and team mediation",
    ],
    skills_seeking: [
      "Lead generation strategy",
      "Story-driven brand positioning",
      "Community engagement and reputation building",
    ],
  },
  {
    first_name: "Leah",
    last_name: "Robinson",
    industry: "Education & Training",
    business_goals: ["Package courses", "Build speaking opportunities"],
    skills_offering: [
      "Service design and packaging",
      "Public speaking and thought leadership",
      "Customer journey mapping",
    ],
    skills_seeking: [
      "Email marketing and retention systems",
      "AI tools for business productivity",
      "Customer lifetime value optimization",
    ],
  },
  {
    first_name: "Terrell",
    last_name: "Young",
    industry: "Food & Beverage",
    business_goals: ["Open café location", "Improve margins"],
    skills_offering: [
      "Vendor sourcing and supply chain management",
      "Pricing strategy and margin analysis",
      "Budget development and cost control",
    ],
    skills_seeking: [
      "Brand identity development",
      "Strategic networking and relationship building",
      "Hiring and onboarding systems",
    ],
  },
];

const RAW_JOBS = [
  {
    title: "Part-Time Operations Coordinator",
    company: "Grant Glow Studio",
    location: "Cincinnati, OH",
    description:
      "Support scheduling, vendor communication, and daily business operations for a growing salon brand.",
    preferred_skills: [
      "Operational workflow design",
      "Time management and founder productivity systems",
      "Hiring and onboarding systems",
    ],
    growth_skills: ["KPI tracking and performance management", "Delegation and team empowerment"],
  },
  {
    title: "Social Media & Community Assistant",
    company: "OTR Coffee Collective",
    location: "Cincinnati, OH",
    description: "Help manage social content, event promotion, and community engagement for a local café brand.",
    preferred_skills: [
      "Social media growth strategy",
      "Story-driven brand positioning",
      "Community engagement and reputation building",
    ],
    growth_skills: ["Email marketing and retention systems", "Public speaking and thought leadership"],
  },
  {
    title: "Founder’s Administrative Assistant",
    company: "Northside Creative House",
    location: "Remote",
    description: "Support a founder with scheduling, communication, workflow organization, and follow-ups.",
    preferred_skills: [
      "Executive communication and storytelling",
      "Time management and founder productivity systems",
      "Operational workflow design",
    ],
    growth_skills: ["Delegation and team empowerment", "Automation and workflow optimization"],
  },
  {
    title: "Sales & Partnerships Intern",
    company: "Brickline Retail Group",
    location: "Cincinnati, OH",
    description: "Support outreach to local businesses, event partners, and potential collaborators.",
    preferred_skills: [
      "Lead generation strategy",
      "Strategic partnerships and distribution channels",
      "CRM systems",
    ],
    growth_skills: ["Negotiation and deal structuring", "Customer lifetime value optimization"],
  },
  {
    title: "Customer Experience Associate",
    company: "Sage Wellness Studio",
    location: "Cincinnati, OH",
    description: "Help improve the customer journey, support bookings, and create a welcoming client experience.",
    preferred_skills: [
      "User experience and customer journey mapping",
      "Service design and packaging",
      "Community engagement and reputation building",
    ],
    growth_skills: ["Customer persona development", "Email marketing and retention systems"],
  },
  {
    title: "Brand Content Intern",
    company: "LaunchHer Agency",
    location: "Remote",
    description: "Assist with content creation, storytelling, and digital brand strategy for women-led startups.",
    preferred_skills: [
      "Brand identity development",
      "Story-driven brand positioning",
      "Executive communication and storytelling",
    ],
    growth_skills: ["Marketing funnel design", "Social media growth strategy"],
  },
  {
    title: "Community Event Assistant",
    company: "Culture Connect Network",
    location: "Cincinnati, OH",
    description: "Help coordinate founder meetups, networking events, and community activations.",
    preferred_skills: [
      "Strategic networking and relationship building",
      "Community engagement and reputation building",
      "Operational workflow design",
    ],
    growth_skills: ["Public speaking and thought leadership", "Brand identity development"],
  },
  {
    title: "Junior Business Analyst",
    company: "Next Door Ventures",
    location: "Remote",
    description: "Assist with KPI tracking, business reporting, and growth performance analysis.",
    preferred_skills: [
      "Data analytics and performance tracking",
      "Business financial modeling",
      "KPI tracking and performance management",
    ],
    growth_skills: ["Investor communication and financial reporting", "Automation and workflow optimization"],
  },
  {
    title: "Retail Floor & Merchandising Assistant",
    company: "Main Street Market House",
    location: "Cincinnati, OH",
    description: "Support in-store customer experience, merchandising, and launch preparation.",
    preferred_skills: [
      "Customer persona development",
      "Service design and packaging",
      "Operational workflow design",
    ],
    growth_skills: ["Pricing experiments and market testing", "Brand identity development"],
  },
  {
    title: "CRM & Lead Follow-Up Assistant",
    company: "Elevate Tax Solutions",
    location: "Remote",
    description: "Manage inbound leads, support follow-up systems, and organize client pipelines.",
    preferred_skills: [
      "Customer relationship management (CRM) systems",
      "Lead generation strategy",
      "Customer lifetime value optimization",
    ],
    growth_skills: ["Email marketing and retention systems", "Negotiation and deal structuring"],
  },
  {
    title: "Operations Intern",
    company: "West End Supply Co.",
    location: "Cincinnati, OH",
    description: "Assist with inventory systems, vendor communication, and internal process cleanup.",
    preferred_skills: [
      "Vendor sourcing and supply chain management",
      "Standard operating procedures (SOPs)",
      "Operational workflow design",
    ],
    growth_skills: ["Automation and workflow optimization", "Budget development and cost control"],
  },
  {
    title: "Product Testing Coordinator",
    company: "Rooted Home Goods",
    location: "Remote",
    description: "Support customer feedback collection and product iteration for a growing consumer brand.",
    preferred_skills: [
      "Customer discovery and validation",
      "Iterative product testing and improvement",
      "User experience and customer journey mapping",
    ],
    growth_skills: ["Pricing experiments and market testing", "Customer persona development"],
  },
  {
    title: "Grant Research Assistant",
    company: "Urban Impact Labs",
    location: "Remote",
    description: "Research grant opportunities and support founder funding readiness.",
    preferred_skills: [
      "Understanding capital sources (loans, grants, investors)",
      "Business financial modeling",
      "Investor communication and financial reporting",
    ],
    growth_skills: ["Executive communication and storytelling", "Vision articulation and mission design"],
  },
  {
    title: "Founder Support Coordinator",
    company: "Scale Black Founders",
    location: "Cincinnati, OH",
    description: "Support startup founders with scheduling, systems, communication, and resource navigation.",
    preferred_skills: [
      "Founder decision-making under ambiguity",
      "Delegation and team empowerment",
      "Time management and founder productivity systems",
    ],
    growth_skills: ["Conflict resolution and team mediation", "Founder resilience and stress management"],
  },
  {
    title: "E-Commerce Assistant",
    company: "The Daily Edit",
    location: "Remote",
    description: "Help manage online product listings, customer support, and digital sales systems.",
    preferred_skills: [
      "E-commerce and digital sales systems",
      "Customer journey mapping",
      "Email marketing and retention systems",
    ],
    growth_skills: ["Automation and workflow optimization", "Data analytics and performance tracking"],
  },
  {
    title: "Startup Outreach Fellow",
    company: "Founder Forward Collective",
    location: "Cincinnati, OH",
    description: "Build founder relationships and help recruit members into local programming.",
    preferred_skills: [
      "Strategic networking and relationship building",
      "Public speaking and thought leadership",
      "Community engagement and reputation building",
    ],
    growth_skills: ["CRM systems", "Lead generation strategy"],
  },
  {
    title: "Service Packaging Assistant",
    company: "BrightPath Consulting",
    location: "Remote",
    description: "Support service refinement, offer packaging, and customer journey optimization.",
    preferred_skills: [
      "Service design and packaging",
      "Customer discovery and validation",
      "User experience and customer journey mapping",
    ],
    growth_skills: ["Pricing experiments and market testing", "Story-driven brand positioning"],
  },
  {
    title: "Business Systems Coordinator",
    company: "Pillar Strategy Group",
    location: "Remote",
    description: "Improve workflows, organize SOPs, and help optimize backend systems for clients.",
    preferred_skills: [
      "Operational workflow design",
      "Standard operating procedures (SOPs)",
      "Automation and workflow optimization",
    ],
    growth_skills: ["KPI tracking and performance management", "AI tools for business productivity"],
  },
  {
    title: "Brand Partnerships Assistant",
    company: "Crown & Co.",
    location: "Cincinnati, OH",
    description: "Support local brand partnerships, outreach, and collaborative campaigns.",
    preferred_skills: [
      "Strategic partnerships and distribution channels",
      "Negotiation and deal structuring",
      "Story-driven brand positioning",
    ],
    growth_skills: ["Public speaking and thought leadership", "Executive communication and storytelling"],
  },
  {
    title: "AI Productivity Intern",
    company: "FlowStack Studio",
    location: "Remote",
    description: "Help implement AI and automation tools to streamline internal business operations.",
    preferred_skills: [
      "AI tools for business productivity",
      "Digital tool stack development",
      "Automation and workflow optimization",
    ],
    growth_skills: ["Data analytics and performance tracking", "Operational workflow design"],
  },
];

/** Mixed offering + seeking rows — only `offering` become expansion_skills docs. */
const RAW_SKILL_ROWS = [
  {
    skill_type: "offering",
    skill_title: "Pricing Strategy & Margin Review",
    summary: "I can help you price your services or products more profitably without scaring off customers.",
  },
  {
    skill_type: "offering",
    skill_title: "Brand Identity Development",
    summary: "I’ll help you tighten your visual brand and messaging so your business feels more polished and clear.",
  },
  {
    skill_type: "offering",
    skill_title: "Customer Persona Development",
    summary: "I can help you get clearer on who your ideal customer is and how to market to them.",
  },
  {
    skill_type: "offering",
    skill_title: "Social Media Growth Strategy",
    summary: "I’ll help you figure out what to post, who to target, and how to actually grow.",
  },
  {
    skill_type: "offering",
    skill_title: "Operational Workflow Cleanup",
    summary: "I can help simplify your backend systems so your business runs smoother day to day.",
  },
  {
    skill_type: "offering",
    skill_title: "Sales Script & Closing Help",
    summary: "I can help you improve how you talk about your offer and close more confidently.",
  },
  {
    skill_type: "offering",
    skill_title: "Founder Productivity Systems",
    summary: "I’ll help you organize your time, tasks, and systems so you stop feeling scattered.",
  },
  {
    skill_type: "offering",
    skill_title: "MVP & Offer Feedback",
    summary: "I can help you pressure-test your offer, app, or early business concept.",
  },
  {
    skill_type: "offering",
    skill_title: "CRM & Lead Tracking Setup",
    summary: "I can help you organize your leads and follow-up process so opportunities don’t slip through.",
  },
  {
    skill_type: "offering",
    skill_title: "AI Tools for Business Productivity",
    summary: "I can show you simple AI tools that save time in your business immediately.",
  },
  {
    skill_type: "seeking",
    skill_title: "Need Help with Hiring & Onboarding Systems",
    summary: "I’m growing and need support building a better process for bringing people onto my team.",
  },
  {
    skill_type: "seeking",
    skill_title: "Looking for Investor Communication Guidance",
    summary: "I need help learning how to talk about my business financially and present it more clearly.",
  },
  {
    skill_type: "seeking",
    skill_title: "Need Help with Lead Generation Strategy",
    summary: "I want help figuring out how to consistently attract more leads.",
  },
  {
    skill_type: "seeking",
    skill_title: "Looking for Better Cash Flow Management",
    summary: "I need help understanding and managing my money better month to month.",
  },
  {
    skill_type: "seeking",
    skill_title: "Need Help Packaging My Services",
    summary: "I want to make my offer clearer and easier for customers to understand and buy.",
  },
  {
    skill_type: "seeking",
    skill_title: "Looking for Better Marketing Funnel Design",
    summary: "I want help building a system that turns attention into paying customers.",
  },
  {
    skill_type: "seeking",
    skill_title: "Need Help with Strategic Partnerships",
    summary: "I want to learn how to find and structure better brand or business partnerships.",
  },
  {
    skill_type: "seeking",
    skill_title: "Looking for SOP / Systems Support",
    summary: "I need help documenting and organizing how my business runs.",
  },
  {
    skill_type: "seeking",
    skill_title: "Need Help with Public Speaking & Thought Leadership",
    summary: "I want to get more comfortable representing my business publicly.",
  },
  {
    skill_type: "seeking",
    skill_title: "Looking for Better Automation & Workflow Tools",
    summary: "I want to stop doing everything manually and build smarter systems.",
  },
];

const RAW_EVENTS = [
  {
    title: "Pop-Up Shop Vendor Meetup",
    location: "Over-the-Rhine Market, Cincinnati",
    details: "Meet local vendors and learn how to secure booth space",
    event_type: "In-person",
  },
  {
    title: "How to Get Your First 100 Customers",
    location: "Zoom",
    details: "Marketing strategies for local businesses",
    event_type: "Online",
  },
  {
    title: "Small Business Grant Workshop",
    location: "Cincinnati Business Hub",
    details: "Learn how to apply for grants",
    event_type: "In-person",
  },
  {
    title: "Networking Night for Creatives",
    location: "The Lounge, Downtown",
    details: "Connect with designers, photographers, and creatives",
    event_type: "In-person",
  },
  {
    title: "Retail Store Owner Roundtable",
    location: "Zoom",
    details: "Discuss inventory and pricing strategies",
    event_type: "Online",
  },
];

const RAW_GROUPS = [
  { name: "Cincinnati Small Business Owners", category: "Community & Networking" },
  { name: "Retail Store Owners", category: "Industry-Specific" },
  { name: "Marketing for Local Businesses", category: "Marketing & Brand Growth" },
  { name: "Funding & Grants Help", category: "Money, Funding & Resources" },
  { name: "Startup Founders Circle", category: "Business & Entrepreneurship" },
];

const RAW_REPLIES = [
  {
    body: "I had the same issue when I opened my shop — honestly foot traffic didn’t pick up until I partnered with another local business.",
  },
  {
    body: "Try running a soft launch event first. That helped me get my first 20 customers.",
  },
  {
    body: "Not gonna lie, pricing was the hardest part for me too.",
  },
  {
    body: "I’d definitely recommend using Square if you’re just starting.",
  },
  {
    body: "This is super helpful, thank you for sharing this.",
  },
];

function slug(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

async function main() {
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    console.warn("WARN: FIRESTORE_EMULATOR_HOST is set. Unset for cloud project seeding.");
  }

  console.log(`Project: ${PROJECT_ID}${DRY_RUN ? " (DRY RUN)" : ""}`);

  if (!admin.apps.length) {
    admin.initializeApp({ projectId: PROJECT_ID });
  }

  const auth = admin.auth();
  const db = admin.firestore();

  const blueprints = RAW_USERS.map((row, i) => ({
    email: `seed.mock.u${i}@mortar-dev.local`,
    first_name: row.first_name,
    last_name: row.last_name,
    industry: row.industry,
    business_goals: row.business_goals,
    confident_skills: row.skills_offering || [],
    desired_skills: row.skills_seeking || [],
  }));

  const resolved = [];
  for (let i = 0; i < blueprints.length; i++) {
    const bp = blueprints[i];
    const { uid, isNew } = await getOrCreateAuthUser(auth, bp, DEFAULT_PASSWORD);
    resolved.push({ ...bp, uid, authIsNew: isNew });
    if (!DRY_RUN) {
      await db.collection("users").doc(uid).set(buildUserDoc(uid, bp), { merge: true });
    }
    console.log(`User ${bp.email} -> ${uid}${isNew ? " (new)" : ""}`);
    if (!DRY_RUN && i % 5 === 4) {
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  const users = resolved;
  const u = (i) => users[i % users.length];

  const bw = DRY_RUN ? null : createBatchWriter(db);

  RAW_EVENTS.forEach((ev, i) => {
    const id = `seed_mock_event_${slug(ev.title)}_${i}`;
    const day = 1 + i * 3;
    const isOnline = (ev.event_type || "").toLowerCase().includes("online");
    const payload = {
      title: ev.title,
      date: ts(`2026-06-${String(day).padStart(2, "0")}T${12 + (i % 6)}:00:00-04:00`),
      time: isOnline ? "12:00 PM - 1:30 PM" : "6:00 PM - 8:00 PM",
      location: ev.location,
      details: ev.details,
      event_type: isOnline ? "Online" : "In-person",
      distribution: "mobile",
      registered_users: i % 2 === 0 && users[0] ? [users[0].uid] : [],
      total_spots: isOnline ? 0 : 40,
      available_spots: isOnline ? 0 : 38,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    };
    if (!DRY_RUN) bw.set(db.collection("events_mobile").doc(id), payload);
  });

  const allMemberIds = users.map((x) => x.uid);

  RAW_GROUPS.forEach((g, gi) => {
    const gid = `seed_group_mock_${gi}`;
    const gRef = db.collection("groups_mobile").doc(gid);
    const creator = users[0];
    const threadId = "seed_thread_welcome";
    const thread = {
      title: `Welcome to ${g.name}`,
      body: "Introduce yourself and share what you’re working on this month.",
      author_id: creator.uid,
      author_name: name(creator),
      author_role: "Digital Curriculum Alumni",
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
      score: 0,
      helpful_score: 0,
      reply_count: RAW_REPLIES.length,
    };

    if (!DRY_RUN) {
      bw.set(
        gRef,
        {
          Name: g.name,
          Status: "Open",
          Created: FieldValue.serverTimestamp(),
          GroupMembers: allMemberIds,
          PendingMembers: [],
          createdBy: creator.uid,
          description: `Community: ${g.name}. Mock seed data.`,
          rulesText: "Be respectful — test data.",
          category: g.category,
          memberCount: allMemberIds.length,
          threadCount: 1,
          lastActivityAt: FieldValue.serverTimestamp(),
          lastActivitySnippet: RAW_REPLIES[0].body.slice(0, 80),
        },
        { merge: true }
      );

      bw.set(gRef.collection("threads").doc(threadId), thread);

      RAW_REPLIES.forEach((rep, ri) => {
        const author = u(gi + ri + 1);
        const cid = `seed_comment_${ri}`;
        bw.set(gRef.collection("threads").doc(threadId).collection("comments").doc(cid), {
          body: rep.body,
          author_id: author.uid,
          author_name: name(author),
          created_at: FieldValue.serverTimestamp(),
        });
      });
    }
  });

  RAW_JOBS.forEach((job, ji) => {
    const author = u(ji);
    const loc = job.location || "Cincinnati, OH";
    const mode = jobLocationMode(loc);
    const locStored = mode === "remote" ? "Remote" : loc;
    const skills = jobSkillSeeking(job);
    if (skills.length === 0) {
      console.warn(`Job "${job.title}" has no skill_seeking after merge — skipping.`);
      return;
    }
    const id = `seed_mock_job_${ji}`;
    if (!DRY_RUN) {
      bw.set(
        db.collection("expansion_jobs").doc(id),
        {
          title: job.title,
          company: job.company,
          location: locStored,
          location_mode: mode,
          industry: industryForListing(author.industry),
          description: job.description,
          skill_seeking: skills,
          author_id: author.uid,
          author_name: name(author),
          created_at: FieldValue.serverTimestamp(),
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }
  });

  const offeringRows = RAW_SKILL_ROWS.filter((r) => r.skill_type === "offering");
  offeringRows.forEach((row, si) => {
    const author = u(si + 5);
    const id = `seed_mock_skill_${si}`;
    const title = row.skill_title;
    if (!DRY_RUN) {
      bw.set(
        db.collection("expansion_skills").doc(id),
        {
          title,
          summary: row.summary,
          skill_offering: [title],
          location: "Cincinnati, OH",
          location_mode: "in_person",
          industry: industryForListing(author.industry),
          author_id: author.uid,
          author_name: name(author),
          created_at: FieldValue.serverTimestamp(),
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }
  });

  if (!DRY_RUN && bw) {
    await bw.commit();
  }

  console.log("\nSummary (fixed mock):");
  console.log(`  Users: ${RAW_USERS.length}`);
  console.log(`  events_mobile: ${RAW_EVENTS.length}`);
  console.log(`  groups_mobile: ${RAW_GROUPS.length} (1 thread + ${RAW_REPLIES.length} comments each)`);
  console.log(`  expansion_jobs: ${RAW_JOBS.length} (skill_seeking = preferred + growth)`);
  console.log(`  expansion_skills: ${offeringRows.length} (offering rows only; skill_offering = [skill_title])`);
  console.log("\nDone.");
  console.log(`Sign-in: seed.mock.u0..u${RAW_USERS.length - 1}@mortar-dev.local password=${DEFAULT_PASSWORD}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
