# Curriculum options reference (Expansion + Digital Curriculum)

**Source of truth in code:** [`curriculum_onboarding_data.dart`](curriculum_onboarding_data.dart) — `kBusinessGoals`, `kCurriculumSkillCategories`, and `kCurriculumSkillLabelsFlat`.  
Update this markdown when you change the Dart file (or regenerate from it) so product and support stay aligned.

---

## Business goals (`kBusinessGoals`)

Used for onboarding profile fields such as `business_goals` on `users/{uid}`.

1. Learn more soft skills (networking, lead generation)
2. Learn more technical skills
3. Sell skills/services
4. Buy skills/services
5. Grow my network
6. Build partnerships

---

## Skill options (`kCurriculumSkillCategories`)

Used for onboarding **confident** / **desired** skills and for Explore **`skill_seeking`** / **`skill_offering`**.  
Flat list order = category order, then skill order within each category (`kCurriculumSkillLabelsFlat`).

### Leadership & Founder Development

*Skills that enable founders to lead teams, make decisions under uncertainty, and build resilient organizations.*

- Vision articulation and mission design
- Founder decision-making under ambiguity
- Delegation and team empowerment
- Conflict resolution and team mediation
- Founder resilience and stress management
- Executive communication and storytelling

### Financial Literacy & Capital Strategy

*Skills necessary to build financially sustainable companies and attract investment or capital.*

- Business financial modeling
- Cash flow management and forecasting
- Pricing strategy and margin analysis
- Budget development and cost control
- Understanding capital sources (loans, grants, investors)
- Investor communication and financial reporting

### Marketing & Brand Strategy

*Skills that help entrepreneurs build trust, attract customers, and differentiate their businesses in the market.*

- Brand identity development
- Customer persona development
- Marketing funnel design
- Social media growth strategy
- Email marketing and retention systems
- Story-driven brand positioning

### Sales & Revenue Generation

*Skills focused on turning interest into revenue and building repeatable sales systems.*

- Sales conversation and closing techniques
- Lead generation strategy
- Customer relationship management (CRM) systems
- Strategic partnerships and distribution channels
- Negotiation and deal structuring
- Customer lifetime value optimization

### Operations & Business Systems

*Skills for building efficient, scalable business infrastructure.*

- Operational workflow design
- Standard operating procedures (SOPs)
- Vendor sourcing and supply chain management
- Time management and founder productivity systems
- Hiring and onboarding systems
- KPI tracking and performance management

### Product & Service Development

*Skills that ensure businesses create products customers actually want and will pay for.*

- Customer discovery and validation
- Minimum viable product (MVP) development
- Service design and packaging
- User experience and customer journey mapping
- Iterative product testing and improvement
- Pricing experiments and market testing

### Technology & Digital Infrastructure

*Skills needed to build modern, tech-enabled businesses.*

- Digital tool stack development
- Data analytics and performance tracking
- Automation and workflow optimization
- E-commerce and digital sales systems
- AI tools for business productivity

### Network & Ecosystem Building

*Skills for leveraging community, mentorship, and partnerships to accelerate growth.*

- Strategic networking and relationship building
- Community engagement and reputation building
- Public speaking and thought leadership
- Leveraging alumni and peer founder networks

---

## Flat skill list (picker order)

Same strings as `kCurriculumSkillLabelsFlat`, one per line:

```
Vision articulation and mission design
Founder decision-making under ambiguity
Delegation and team empowerment
Conflict resolution and team mediation
Founder resilience and stress management
Executive communication and storytelling
Business financial modeling
Cash flow management and forecasting
Pricing strategy and margin analysis
Budget development and cost control
Understanding capital sources (loans, grants, investors)
Investor communication and financial reporting
Brand identity development
Customer persona development
Marketing funnel design
Social media growth strategy
Email marketing and retention systems
Story-driven brand positioning
Sales conversation and closing techniques
Lead generation strategy
Customer relationship management (CRM) systems
Strategic partnerships and distribution channels
Negotiation and deal structuring
Customer lifetime value optimization
Operational workflow design
Standard operating procedures (SOPs)
Vendor sourcing and supply chain management
Time management and founder productivity systems
Hiring and onboarding systems
KPI tracking and performance management
Customer discovery and validation
Minimum viable product (MVP) development
Service design and packaging
User experience and customer journey mapping
Iterative product testing and improvement
Pricing experiments and market testing
Digital tool stack development
Data analytics and performance tracking
Automation and workflow optimization
E-commerce and digital sales systems
AI tools for business productivity
Strategic networking and relationship building
Community engagement and reputation building
Public speaking and thought leadership
Leveraging alumni and peer founder networks
```
