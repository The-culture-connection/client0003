// Mock data store for MORTAR MASTERS Online

export type UserRole = 
  | "admin"
  | "digital-student"
  | "digital-alumni"
  | "in-person-student"
  | "in-person-alumni";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  city: string;
  cohort: string;
  completedBusinessProfile: boolean;
  badges: string[];
  points: number;
}

export interface Module {
  id: string;
  name: string;
  description: string;
  chapters: Chapter[];
  requiredAssets: string[];
  completionPercentage: number;
}

export interface Chapter {
  id: string;
  moduleId: string;
  name: string;
  isFree: boolean;
  lessons: Lesson[];
  quizRequired: boolean;
  quizPassed: boolean;
  quizAttempts: number;
  locked: boolean;
}

export interface Lesson {
  id: string;
  chapterId: string;
  name: string;
  type: "video" | "reading" | "external";
  duration: string;
  completed: boolean;
  url?: string;
}

export interface Quiz {
  id: string;
  chapterId: string;
  version: number;
  questions: Question[];
  passScore: number;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
}

export interface Asset {
  id: string;
  moduleId: string;
  name: string;
  templateType: string;
  status: "not-started" | "in-progress" | "completed" | "finalized";
  required: boolean;
}

export interface Certificate {
  id: string;
  userId: string;
  moduleName: string;
  issuedDate: string;
  credentialUrl: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  type: "training" | "networking" | "workshop";
  createdBy: string;
  rsvpCount: number;
  maxCapacity: number;
}

export interface DiscussionThread {
  id: string;
  title: string;
  author: string;
  authorRole: UserRole;
  content: string;
  createdAt: string;
  replies: number;
  category: string;
}

// Mock current user
export const currentUser: User = {
  id: "user-1",
  name: "Jordan Smith",
  email: "jordan@example.com",
  role: "in-person-alumni",
  city: "Cincinnati",
  cohort: "2024-Fall",
  completedBusinessProfile: true,
  badges: ["Cincinnati", "Module 1 Complete", "Early Adopter"],
  points: 450,
};

// Mock modules data
export const modules: Module[] = [
  {
    id: "module-1",
    name: "Business Fundamentals",
    description: "Master the core principles of business planning and strategy",
    completionPercentage: 75,
    requiredAssets: ["Business Plan", "Market Analysis"],
    chapters: [
      {
        id: "ch-1",
        moduleId: "module-1",
        name: "Introduction to Business Planning",
        isFree: true,
        quizRequired: true,
        quizPassed: true,
        quizAttempts: 1,
        locked: false,
        lessons: [
          { id: "l-1", chapterId: "ch-1", name: "What is a Business Plan?", type: "video", duration: "12 min", completed: true },
          { id: "l-2", chapterId: "ch-1", name: "Reading: Key Components", type: "reading", duration: "8 min", completed: true },
        ],
      },
      {
        id: "ch-2",
        moduleId: "module-1",
        name: "Market Research Basics",
        isFree: true,
        quizRequired: true,
        quizPassed: true,
        quizAttempts: 1,
        locked: false,
        lessons: [
          { id: "l-3", chapterId: "ch-2", name: "Understanding Your Market", type: "video", duration: "15 min", completed: true },
        ],
      },
      {
        id: "ch-3",
        moduleId: "module-1",
        name: "Financial Projections",
        isFree: true,
        quizRequired: true,
        quizPassed: true,
        quizAttempts: 2,
        locked: false,
        lessons: [
          { id: "l-4", chapterId: "ch-3", name: "Building Financial Models", type: "video", duration: "20 min", completed: true },
        ],
      },
      {
        id: "ch-4",
        moduleId: "module-1",
        name: "Competitive Analysis",
        isFree: true,
        quizRequired: true,
        quizPassed: true,
        quizAttempts: 1,
        locked: false,
        lessons: [
          { id: "l-5", chapterId: "ch-4", name: "Analyzing Competition", type: "video", duration: "18 min", completed: true },
        ],
      },
      {
        id: "ch-5",
        moduleId: "module-1",
        name: "Business Model Canvas",
        isFree: true,
        quizRequired: true,
        quizPassed: true,
        quizAttempts: 1,
        locked: false,
        lessons: [
          { id: "l-6", chapterId: "ch-5", name: "Creating Your Canvas", type: "video", duration: "22 min", completed: true },
        ],
      },
      {
        id: "ch-6",
        moduleId: "module-1",
        name: "Legal Structures",
        isFree: false,
        quizRequired: true,
        quizPassed: false,
        quizAttempts: 0,
        locked: false,
        lessons: [
          { id: "l-7", chapterId: "ch-6", name: "Choosing a Business Structure", type: "video", duration: "16 min", completed: false },
        ],
      },
      {
        id: "ch-7",
        moduleId: "module-1",
        name: "Funding Options",
        isFree: false,
        quizRequired: true,
        quizPassed: false,
        quizAttempts: 0,
        locked: false,
        lessons: [
          { id: "l-8", chapterId: "ch-7", name: "Sources of Capital", type: "video", duration: "19 min", completed: false },
        ],
      },
    ],
  },
  {
    id: "module-2",
    name: "Marketing & Sales",
    description: "Learn to market your business and close sales effectively",
    completionPercentage: 40,
    requiredAssets: ["Marketing Plan", "Sales Strategy"],
    chapters: [
      {
        id: "ch-8",
        moduleId: "module-2",
        name: "Marketing Fundamentals",
        isFree: false,
        quizRequired: true,
        quizPassed: false,
        quizAttempts: 0,
        locked: false,
        lessons: [
          { id: "l-9", chapterId: "ch-8", name: "The 4 Ps of Marketing", type: "video", duration: "14 min", completed: false },
        ],
      },
      {
        id: "ch-9",
        moduleId: "module-2",
        name: "Digital Marketing",
        isFree: false,
        quizRequired: true,
        quizPassed: false,
        quizAttempts: 0,
        locked: false,
        lessons: [
          { id: "l-10", chapterId: "ch-9", name: "Social Media Strategy", type: "video", duration: "17 min", completed: false },
        ],
      },
    ],
  },
  {
    id: "module-3",
    name: "Operations & Management",
    description: "Optimize your business operations and team management",
    completionPercentage: 0,
    requiredAssets: ["Operations Manual", "HR Policy"],
    chapters: [
      {
        id: "ch-10",
        moduleId: "module-3",
        name: "Process Optimization",
        isFree: false,
        quizRequired: true,
        quizPassed: false,
        quizAttempts: 0,
        locked: false,
        lessons: [
          { id: "l-11", chapterId: "ch-10", name: "Streamlining Operations", type: "video", duration: "16 min", completed: false },
        ],
      },
    ],
  },
  {
    id: "module-4",
    name: "Growth & Scaling",
    description: "Scale your business and plan for sustainable growth",
    completionPercentage: 0,
    requiredAssets: ["Growth Plan", "Exit Strategy"],
    chapters: [
      {
        id: "ch-11",
        moduleId: "module-4",
        name: "Growth Strategies",
        isFree: false,
        quizRequired: true,
        quizPassed: false,
        quizAttempts: 0,
        locked: false,
        lessons: [
          { id: "l-12", chapterId: "ch-11", name: "Scaling Your Business", type: "video", duration: "21 min", completed: false },
        ],
      },
    ],
  },
];

// Mock assets
export const assets: Asset[] = [
  {
    id: "asset-1",
    moduleId: "module-1",
    name: "Business Plan",
    templateType: "business-plan",
    status: "finalized",
    required: true,
  },
  {
    id: "asset-2",
    moduleId: "module-1",
    name: "Market Analysis",
    templateType: "market-analysis",
    status: "completed",
    required: true,
  },
  {
    id: "asset-3",
    moduleId: "module-2",
    name: "Marketing Plan",
    templateType: "marketing-plan",
    status: "in-progress",
    required: true,
  },
  {
    id: "asset-4",
    moduleId: "module-2",
    name: "Sales Strategy",
    templateType: "sales-strategy",
    status: "not-started",
    required: true,
  },
];

// Mock certificates
export const certificates: Certificate[] = [
  {
    id: "cert-1",
    userId: "user-1",
    moduleName: "Business Fundamentals - Module 1",
    issuedDate: "2024-11-15",
    credentialUrl: "https://mortarmasters.com/verify/cert-1",
  },
];

// Mock events
export const events: Event[] = [
  {
    id: "event-1",
    title: "Advanced Financial Modeling Workshop",
    description: "Deep dive into financial projections and modeling for your business",
    date: "2026-03-15",
    time: "2:00 PM - 4:00 PM EST",
    type: "training",
    createdBy: "Admin",
    rsvpCount: 24,
    maxCapacity: 30,
  },
  {
    id: "event-2",
    title: "Alumni Networking Mixer",
    description: "Connect with fellow MORTAR graduates and expand your network",
    date: "2026-03-20",
    time: "6:00 PM - 8:00 PM EST",
    type: "networking",
    createdBy: "Admin",
    rsvpCount: 45,
    maxCapacity: 50,
  },
  {
    id: "event-3",
    title: "Digital Marketing Bootcamp",
    description: "Hands-on workshop covering social media, SEO, and content marketing",
    date: "2026-03-25",
    time: "10:00 AM - 12:00 PM EST",
    type: "workshop",
    createdBy: "Admin",
    rsvpCount: 18,
    maxCapacity: 25,
  },
];

// Mock discussion threads
export const discussionThreads: DiscussionThread[] = [
  {
    id: "thread-1",
    title: "Best practices for customer acquisition?",
    author: "Alex Rivera",
    authorRole: "in-person-alumni",
    content: "I'm looking for advice on cost-effective customer acquisition strategies for a B2C product. What's worked well for you?",
    createdAt: "2026-03-02",
    replies: 12,
    category: "Marketing",
  },
  {
    id: "thread-2",
    title: "Proposal: Workshop on Grant Writing",
    author: "Jamie Chen",
    authorRole: "digital-alumni",
    content: "I'd like to propose a workshop on grant writing for small businesses. Would there be interest?",
    createdAt: "2026-03-01",
    replies: 8,
    category: "Proposals",
  },
  {
    id: "thread-3",
    title: "Looking for accountability partner",
    author: "Morgan Davis",
    authorRole: "digital-student",
    content: "Anyone interested in weekly check-ins to stay on track with the curriculum?",
    createdAt: "2026-02-28",
    replies: 15,
    category: "Community",
  },
];

// Role permissions
export const rolePermissions = {
  admin: {
    canAccessAllCourses: true,
    canAccessExpansionNetwork: true,
    canPostEvents: true,
    canCreatePosts: true,
    canCreateGroups: true,
    canPostJobs: true,
    canPostSkills: true,
    canManageUsers: true,
    canViewAnalytics: true,
    canManageHiddenTrainings: true,
  },
  "digital-student": {
    canAccessAllCourses: false, // Only paid bundles
    canAccessExpansionNetwork: false,
    canPostEvents: false,
    canCreatePosts: true,
    canCreateGroups: false,
    canPostJobs: false,
    canPostSkills: true,
    canManageUsers: false,
    canViewAnalytics: false,
    canManageHiddenTrainings: false,
  },
  "digital-alumni": {
    canAccessAllCourses: false, // Only paid bundles
    canAccessExpansionNetwork: true,
    canPostEvents: false,
    canCreatePosts: true,
    canCreateGroups: false,
    canPostJobs: false,
    canPostSkills: true,
    canManageUsers: false,
    canViewAnalytics: false,
    canManageHiddenTrainings: false,
  },
  "in-person-student": {
    canAccessAllCourses: false,
    canAccessExpansionNetwork: true,
    canPostEvents: false,
    canCreatePosts: true,
    canCreateGroups: false,
    canPostJobs: true,
    canPostSkills: true,
    canManageUsers: false,
    canViewAnalytics: false,
    canManageHiddenTrainings: false,
  },
  "in-person-alumni": {
    canAccessAllCourses: true, // All courses
    canAccessExpansionNetwork: true,
    canPostEvents: true,
    canCreatePosts: true,
    canCreateGroups: true,
    canPostJobs: true,
    canPostSkills: true,
    canManageUsers: false,
    canViewAnalytics: false,
    canManageHiddenTrainings: false,
  },
};

export function hasPermission(role: UserRole, permission: keyof typeof rolePermissions.admin): boolean {
  return rolePermissions[role][permission] || false;
}

export function getRoleName(role: UserRole): string {
  const roleNames = {
    admin: "Administrator",
    "digital-student": "Digital Curriculum Student",
    "digital-alumni": "Digital Curriculum Alumni",
    "in-person-student": "In-Person Student",
    "in-person-alumni": "In-Person Alumni",
  };
  return roleNames[role];
}

export function getRoleBadgeColor(role: UserRole): string {
  const colors = {
    admin: "bg-purple-600",
    "digital-student": "bg-blue-600",
    "digital-alumni": "bg-green-600",
    "in-person-student": "bg-orange-600",
    "in-person-alumni": "bg-secondary",
  };
  return colors[role];
}
