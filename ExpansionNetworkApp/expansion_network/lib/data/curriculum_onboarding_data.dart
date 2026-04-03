// Mirrors Digital Curriculum `src/app/lib/onboardingData.ts` — business goals and skill categories.

const List<String> kBusinessGoals = [
  'Learn more soft skills (networking, lead generation)',
  'Learn more technical skills',
  'Sell skills/services',
  'Buy skills/services',
  'Grow my network',
  'Build partnerships',
];

class CurriculumSkillCategory {
  const CurriculumSkillCategory({
    required this.title,
    required this.description,
    required this.skills,
  });

  final String title;
  final String description;
  final List<String> skills;
}

/// Same categories and skill labels as the digital curriculum onboarding (Steps 3–4).
const List<CurriculumSkillCategory> kCurriculumSkillCategories = [
  CurriculumSkillCategory(
    title: 'Leadership & Founder Development',
    description:
        'Skills that enable founders to lead teams, make decisions under uncertainty, and build resilient organizations.',
    skills: [
      'Vision articulation and mission design',
      'Founder decision-making under ambiguity',
      'Delegation and team empowerment',
      'Conflict resolution and team mediation',
      'Founder resilience and stress management',
      'Executive communication and storytelling',
    ],
  ),
  CurriculumSkillCategory(
    title: 'Financial Literacy & Capital Strategy',
    description:
        'Skills necessary to build financially sustainable companies and attract investment or capital.',
    skills: [
      'Business financial modeling',
      'Cash flow management and forecasting',
      'Pricing strategy and margin analysis',
      'Budget development and cost control',
      'Understanding capital sources (loans, grants, investors)',
      'Investor communication and financial reporting',
    ],
  ),
  CurriculumSkillCategory(
    title: 'Marketing & Brand Strategy',
    description:
        'Skills that help entrepreneurs build trust, attract customers, and differentiate their businesses in the market.',
    skills: [
      'Brand identity development',
      'Customer persona development',
      'Marketing funnel design',
      'Social media growth strategy',
      'Email marketing and retention systems',
      'Story-driven brand positioning',
    ],
  ),
  CurriculumSkillCategory(
    title: 'Sales & Revenue Generation',
    description:
        'Skills focused on turning interest into revenue and building repeatable sales systems.',
    skills: [
      'Sales conversation and closing techniques',
      'Lead generation strategy',
      'Customer relationship management (CRM) systems',
      'Strategic partnerships and distribution channels',
      'Negotiation and deal structuring',
      'Customer lifetime value optimization',
    ],
  ),
  CurriculumSkillCategory(
    title: 'Operations & Business Systems',
    description: 'Skills for building efficient, scalable business infrastructure.',
    skills: [
      'Operational workflow design',
      'Standard operating procedures (SOPs)',
      'Vendor sourcing and supply chain management',
      'Time management and founder productivity systems',
      'Hiring and onboarding systems',
      'KPI tracking and performance management',
    ],
  ),
  CurriculumSkillCategory(
    title: 'Product & Service Development',
    description:
        'Skills that ensure businesses create products customers actually want and will pay for.',
    skills: [
      'Customer discovery and validation',
      'Minimum viable product (MVP) development',
      'Service design and packaging',
      'User experience and customer journey mapping',
      'Iterative product testing and improvement',
      'Pricing experiments and market testing',
    ],
  ),
  CurriculumSkillCategory(
    title: 'Technology & Digital Infrastructure',
    description: 'Skills needed to build modern, tech-enabled businesses.',
    skills: [
      'Digital tool stack development',
      'Data analytics and performance tracking',
      'Automation and workflow optimization',
      'E-commerce and digital sales systems',
      'AI tools for business productivity',
    ],
  ),
  CurriculumSkillCategory(
    title: 'Network & Ecosystem Building',
    description:
        'Skills for leveraging community, mentorship, and partnerships to accelerate growth.',
    skills: [
      'Strategic networking and relationship building',
      'Community engagement and reputation building',
      'Public speaking and thought leadership',
      'Leveraging alumni and peer founder networks',
    ],
  ),
];

/// Same list as Digital Curriculum `onboardingData.ts` — `INDUSTRIES`.
const List<String> kIndustries = [
  'Food & Beverage',
  'Retail',
  'Health, Wellness & Personal Care',
  'Professional Services',
  'Creative & Media Services',
  'Education & Training',
  'Childcare & Family Services',
  'Home & Property Services',
  'Construction & Skilled Trades',
  'Automotive Services',
  'Hospitality & Lodging',
  'Entertainment & Recreation',
  'Event & Wedding Services',
  'Logistics & Transportation',
  'Manufacturing & Production',
  'Agriculture & Food Production',
  'Community & Cultural Organizations',
];
