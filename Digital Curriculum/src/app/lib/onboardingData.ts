/**
 * Onboarding data structures and constants
 */

export const BUSINESS_GOALS = [
  "Learn more soft skills (networking, lead generation)",
  "Learn more technical skills",
  "Sell skills/services",
  "Buy skills/services",
  "Grow my network",
  "Build partnerships",
] as const;

export type BusinessGoal = typeof BUSINESS_GOALS[number];

export const SKILL_CATEGORIES = {
  "Leadership & Founder Development": {
    description: "Skills that enable founders to lead teams, make decisions under uncertainty, and build resilient organizations.",
    skills: [
      "Vision articulation and mission design",
      "Founder decision-making under ambiguity",
      "Delegation and team empowerment",
      "Conflict resolution and team mediation",
      "Founder resilience and stress management",
      "Executive communication and storytelling",
    ],
  },
  "Financial Literacy & Capital Strategy": {
    description: "Skills necessary to build financially sustainable companies and attract investment or capital.",
    skills: [
      "Business financial modeling",
      "Cash flow management and forecasting",
      "Pricing strategy and margin analysis",
      "Budget development and cost control",
      "Understanding capital sources (loans, grants, investors)",
      "Investor communication and financial reporting",
    ],
  },
  "Marketing & Brand Strategy": {
    description: "Skills that help entrepreneurs build trust, attract customers, and differentiate their businesses in the market.",
    skills: [
      "Brand identity development",
      "Customer persona development",
      "Marketing funnel design",
      "Social media growth strategy",
      "Email marketing and retention systems",
      "Story-driven brand positioning",
    ],
  },
  "Sales & Revenue Generation": {
    description: "Skills focused on turning interest into revenue and building repeatable sales systems.",
    skills: [
      "Sales conversation and closing techniques",
      "Lead generation strategy",
      "Customer relationship management (CRM) systems",
      "Strategic partnerships and distribution channels",
      "Negotiation and deal structuring",
      "Customer lifetime value optimization",
    ],
  },
  "Operations & Business Systems": {
    description: "Skills for building efficient, scalable business infrastructure.",
    skills: [
      "Operational workflow design",
      "Standard operating procedures (SOPs)",
      "Vendor sourcing and supply chain management",
      "Time management and founder productivity systems",
      "Hiring and onboarding systems",
      "KPI tracking and performance management",
    ],
  },
  "Product & Service Development": {
    description: "Skills that ensure businesses create products customers actually want and will pay for.",
    skills: [
      "Customer discovery and validation",
      "Minimum viable product (MVP) development",
      "Service design and packaging",
      "User experience and customer journey mapping",
      "Iterative product testing and improvement",
      "Pricing experiments and market testing",
    ],
  },
  "Technology & Digital Infrastructure": {
    description: "Skills needed to build modern, tech-enabled businesses.",
    skills: [
      "Digital tool stack development",
      "Data analytics and performance tracking",
      "Automation and workflow optimization",
      "E-commerce and digital sales systems",
      "AI tools for business productivity",
    ],
  },
  "Network & Ecosystem Building": {
    description: "Skills for leveraging community, mentorship, and partnerships to accelerate growth.",
    skills: [
      "Strategic networking and relationship building",
      "Community engagement and reputation building",
      "Public speaking and thought leadership",
      "Leveraging alumni and peer founder networks",
    ],
  },
} as const;

export type SkillCategory = keyof typeof SKILL_CATEGORIES;

// Flatten all skills for easier selection
export const ALL_SKILLS = Object.entries(SKILL_CATEGORIES).flatMap(([category, data]) =>
  data.skills.map((skill) => ({ category, skill }))
);

export const INDUSTRIES = [
  "Food & Beverage",
  "Retail",
  "Health, Wellness & Personal Care",
  "Professional Services",
  "Creative & Media Services",
  "Education & Training",
  "Childcare & Family Services",
  "Home & Property Services",
  "Construction & Skilled Trades",
  "Automotive Services",
  "Hospitality & Lodging",
  "Entertainment & Recreation",
  "Event & Wedding Services",
  "Logistics & Transportation",
  "Manufacturing & Production",
  "Agriculture & Food Production",
  "Community & Cultural Organizations",
] as const;

export type Industry = typeof INDUSTRIES[number];

export interface OnboardingData {
  // Step 1
  first_name?: string;
  last_name?: string;
  city?: string;
  state?: string;
  cohort_id?: string;
  not_in_cohort?: boolean;
  
  // Step 2
  business_goals?: BusinessGoal[];
  
  // Step 3
  confident_skills?: string[];
  desired_skills?: string[];
  industry?: Industry;
  
  // Step 4
  work_structure?: {
    flexibility?: number; // 1-10 scale
    weekly_hours?: number; // 20-80
    ownership?: number; // 1-10 scale (employee to owner)
  };
  
  // Step 5
  profile_links?: {
    linkedin?: string;
    portfolio?: string;
    instagram?: string;
    facebook?: string;
    tiktok?: string;
  };
  
  onboarding_status?: "needs_profile" | "partial" | "complete";
}
