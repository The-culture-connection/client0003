/**
 * Starter catalog for the staff Skills & Passions form (/staff-skills).
 *
 * Staff search these lists, and can add their own entries; additions are
 * stored in Firestore (`staff_skill_catalog`) and merged in at load time, so
 * everyone after them can pick the new entry too. Keep entries short and in
 * Title Case so search results read cleanly.
 */

export const SKILL_CATALOG: string[] = [
  // Entrepreneurship & strategy
  "Business Planning", "Business Model Design", "Entrepreneurship", "Startup Launch", "Strategic Planning",
  "Competitive Analysis", "Market Research", "Customer Discovery", "Pricing Strategy", "Value Proposition Design",
  "Pitch Deck Creation", "Pitching to Investors", "Business Plan Writing", "Lean Startup", "Product-Market Fit",
  "Franchising", "Succession Planning", "Scaling a Business", "Retail Operations", "Brick-and-Mortar Store Setup",
  "E-commerce", "Small Business Coaching", "Business Consulting", "Mergers & Acquisitions", "Exit Planning",
  // Finance & accounting
  "Bookkeeping", "QuickBooks", "Accounting", "Accounts Payable", "Accounts Receivable", "Payroll",
  "Budgeting", "Cash Flow Management", "Financial Planning", "Financial Modeling", "Financial Statements",
  "Forecasting", "Tax Preparation", "Small Business Taxes", "Personal Finance", "Credit Building",
  "Business Credit", "Fundraising", "Grant Writing", "Grant Management", "Investor Relations",
  "Venture Capital", "Crowdfunding", "Loan Applications", "Nonprofit Finance", "Invoicing", "Notary Services",
  "Excel Financial Analysis", "Cost Reduction", "Profit & Loss Management",
  // Marketing & sales
  "Marketing Strategy", "Brand Strategy", "Brand Identity", "Brand Management", "Content Marketing",
  "Social Media Marketing", "Social Media Management", "Influencer Marketing", "Email Marketing",
  "Search Engine Optimization (SEO)", "Search Engine Marketing (SEM)", "Paid Ads (Meta/Google)",
  "Digital Marketing", "Marketing Analytics", "Copywriting", "Storytelling", "Public Relations",
  "Media Relations", "Community Management", "Event Marketing", "Guerrilla Marketing", "Product Launches",
  "Sales", "B2B Sales", "B2C Sales", "Sales Strategy", "Sales Operations", "Lead Generation", "Cold Calling",
  "Negotiation", "Account Management", "Customer Success", "Customer Service", "Customer Relationship Management (CRM)",
  "HubSpot", "Salesforce", "RevOps", "Partnership Development", "Sponsorship Sales", "Merchandising",
  // Creative & media
  "Graphic Design", "Typography", "Color Theory", "Logo Design", "Illustration", "Canva", "Adobe Photoshop",
  "Adobe Illustrator", "Adobe InDesign", "Adobe Premiere Pro", "Final Cut Pro", "DaVinci Resolve",
  "Video Production", "Video Editing", "Videography", "Photography", "Portrait Photography", "Photo Editing",
  "Podcast Production", "Audio Engineering", "Music Production", "Motion Graphics", "Animation",
  "Creative Direction", "Art Direction", "Script Writing", "Script Editing", "Creative Writing",
  "Content Creation", "UX Design", "UI Design", "Web Design", "Figma", "Product Design", "Fashion Design",
  "Interior Design", "Visual Merchandising", "Packaging Design", "Print Production",
  // Technology & data
  "WordPress", "Shopify", "Squarespace", "Wix", "Website Development", "Front-End Development",
  "Back-End Development", "Mobile App Development", "Software Engineering", "Python", "JavaScript",
  "SQL", "No-Code Tools", "Zapier / Automation", "AI Tools for Business", "Prompt Engineering",
  "Data Analysis", "Data Visualization", "Google Analytics", "Microsoft Excel", "Google Sheets",
  "Microsoft Office", "Google Workspace", "Airtable", "Notion", "Asana", "Slack", "Cybersecurity Basics",
  "IT Support", "System Administration", "Cloud Computing", "Technology Strategy",
  // Operations & management
  "Operations Management", "Project Management", "Program Management", "Program Design", "Agile",
  "Scrum", "Product Management", "Product Roadmapping", "Process Improvement", "Change Management",
  "Supply Chain Management", "Inventory Management", "Logistics", "Procurement", "Vendor Management",
  "Facilities Management", "Building Operations", "Quality Assurance", "Risk Management",
  "Compliance", "Contract Management", "Scheduling", "Office Administration", "Office Management",
  "Executive Assistance", "Data Entry", "Reporting", "KPI Tracking", "Performance Management",
  "Operating Systems & SOPs", "Front Office Operations", "Food Safety", "Restaurant Operations",
  // People & leadership
  "Leadership", "Leadership Development", "Team Leadership", "Team Building", "Coaching", "Mentoring",
  "Executive Coaching", "Career Coaching", "Human Resources", "Recruiting", "Talent Acquisition",
  "Onboarding", "Employee Experience", "Organizational Culture", "Organizational Development",
  "Diversity, Equity & Inclusion", "Conflict Resolution", "Emotional Intelligence", "Facilitation",
  "Training & Development", "Curriculum Design", "Instructional Design", "Workshop Facilitation",
  "Teaching", "Adult Education", "Youth Development", "Volunteer Management", "Board Governance",
  // Communication
  "Public Speaking", "Keynote Speaking", "Presentation Skills", "Executive Presence", "Emceeing / Hosting",
  "Business Writing", "Corporate Communications", "Internal Communications", "Grant Proposals",
  "Technical Writing", "Editing & Proofreading", "Translation", "Spanish", "French", "American Sign Language",
  "Interviewing", "Active Listening", "Networking",
  // Events & community
  "Event Planning", "Event Management", "Event Production", "Live Event Production", "Run-of-Show",
  "Stage Management", "Conference Planning", "Venue Management", "Catering Coordination",
  "Community Outreach", "Community Development", "Community Engagement", "Economic Development",
  "Real Estate", "Commercial Leasing", "Property Management", "Urban Planning", "Advocacy",
  "Policy & Government Relations", "Government Contracting", "Nonprofit Management", "Social Impact",
  // Legal & admin
  "Business Formation (LLC/Corp)", "Contracts", "Intellectual Property Basics", "Trademarks",
  "Licensing & Permits", "Insurance", "Employment Law Basics",
  // Wellness & lifestyle businesses
  "Culinary Arts", "Baking", "Beverage / Mixology", "Hair Care", "Cosmetology", "Skin Care",
  "Fitness Training", "Nutrition", "Wellness Coaching", "Childcare", "Hospitality", "Travel Planning",
];

export const PASSION_CATALOG: string[] = [
  "Black Entrepreneurship", "Small Business", "Economic Mobility", "Generational Wealth", "Financial Literacy",
  "Community Building", "Neighborhood Revitalization", "Cincinnati", "Social Justice", "Racial Equity",
  "Women in Business", "Youth Empowerment", "Education", "Mentorship", "Workforce Development",
  "Lifelong Learning", "Leadership", "Faith", "Volunteering", "Philanthropy", "Nonprofits",
  "Arts & Culture", "Visual Arts", "Painting", "Drawing", "Photography", "Film", "Theater", "Dance",
  "Music", "Hip-Hop", "Jazz", "Gospel", "Singing", "DJing", "Music Production", "Poetry", "Writing",
  "Reading", "Storytelling", "Podcasting", "Fashion", "Style", "Beauty", "Hair", "Design", "Architecture",
  "Interior Design", "Home Improvement / DIY", "Real Estate", "Cooking", "Baking", "Food & Restaurants",
  "Coffee", "Wine", "Mixology", "Gardening", "Urban Farming", "Sustainability", "Environment",
  "Outdoors", "Hiking", "Camping", "Travel", "Languages", "History", "Black History", "Genealogy",
  "Sports", "Basketball", "Football", "Soccer", "Baseball", "Golf", "Tennis", "Pickleball", "Running",
  "Fitness", "Yoga", "Martial Arts", "Cycling", "Health & Wellness", "Mental Health", "Self-Care",
  "Mindfulness", "Parenting", "Family", "Pets", "Technology", "AI", "Gaming", "Esports", "Coding",
  "Science", "Space", "Cars", "Motorcycles", "Sneakers", "Collecting", "Crafts", "Sewing", "Woodworking",
  "Board Games", "Puzzles", "Comedy", "Event Hosting", "Public Speaking", "Networking", "Investing",
  "Personal Finance", "Politics & Civic Engagement", "Advocacy", "Social Media", "Content Creation",
  "Marketing", "Branding", "Innovation", "Startups", "Travel Hacking", "Volunteering Abroad",
];

/** Training formats staff can offer. */
export const TRAINING_FORMATS = [
  "Live webinar",
  "Recorded course",
  "In-person workshop",
  "1:1 coaching",
  "Panel or guest speaker",
];

/** Audiences staff may enjoy teaching. */
export const TRAINING_AUDIENCES = [
  "Entrepreneurs & small business owners",
  "Corporate teams",
  "Nonprofits",
  "Youth & students",
  "MORTAR alumni",
  "Community members",
];

export const MONTHLY_HOURS_OPTIONS = ["0", "1–2", "3–5", "6–10", "10+"];
