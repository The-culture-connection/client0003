Design the FULL web application UI for a curriculum-driven platform called “MORTAR MASTERS Online”. This webapp includes authentication, curriculum delivery, quiz gating, asset/data room generation, certificates, admin analytics, discussion board with meeting proposals, events calendar for trainings, pricing/paywall, Shopify store, and a link-out + preview of the mobile app. Do not omit any feature. Make the UI LIGHTER (not heavy dark), but still professional and premium.

BRAND COLORS:
Primary: #1d1d1d (use sparingly; nav or headings)
Secondary Accent: #871002
Text: #fafcfc (use on dark areas only)
Overall: light background theme with clean contrast. Use secondary accent for CTAs and badges.

STYLE:
Modern SaaS + education platform. Clean typography, card-based layout, lots of whitespace, clear progression indicators. Avoid clutter. Role-based permissions should be reflected by visible locked states, disabled CTAs, and “Access required” messaging.

ROLES + PRIVILEGES (must be represented with badges and UI gating):
1) Admin
- Admin dashboard, all courses, expansion network, event posting, post posting, group creation, job posting, skill posting, hidden training video permission control
2) Digital Curriculum Student
- Paid module bundles access (first 5 chapters free), post posting, skill posting
3) Digital Curriculum Alumni
- Paid module bundles access, expansion network, post posting, skill posting
4) In Person Curriculum Alumni
- All offered courses, expansion network, event posting, post posting, group creation, job posting, skill posting
5) In Person Curriculum Student
- Expansion network, post posting, job posting, skill posting

GLOBAL RULES / PATHWAY IMPLEMENTATION
- Business Profile is REQUIRED for all users before accessing curriculum:
  - cohort info
  - city
  - what they are looking for for connection on the app (multi-select)
- Graduation criteria:
  - Must complete all 4 modules AND
  - Must create all required module assets (Data Room documents) before passing
- Quiz wall:
  - At end of each chapter
  - Infinite attempts
  - Different quiz version after failure
  - Email triggered after 2 failures
  - User cannot progress until quiz passed successfully
- Freemium:
  - First 5 chapters free
  - Paid access is by module bundles (pay for clumps of chapters)

SCREENS TO GENERATE (FULL WEBAPP)

A) AUTH + ONBOARDING
- Login (email/password + Google sign-in)
- Sign up
- Verify email
- Forgot password
- Join with Code (invite/cohort code)
- Business Profile Setup (required gating)
- Role badge + privileges confirmation screen

B) DASHBOARD (role-aware)
- Progress across 4 modules with clear completion bars
- “Next lesson” CTA
- Quiz wall alerts (locked until passed)
- Asset checklist alerts (locked until assets final)
- Badges earned (including City badge)
- Points balance (for store rewards)
- Upcoming trainings/events mini-calendar
- Button: “Open Mobile App” + “Mobile App Preview”

C) CURRICULUM
- Curriculum Catalog segmented by 4 modules
- Chapter list per module; first 5 chapters marked FREE, later chapters show lock + “Buy Module”
- Module purchase page (pricing model: freemium + bundles)
- Lesson Viewer (video, reading, external)
- Hidden Training Videos section (visible only if admin unlocked)
- Chapter end Quiz entry point (required)

D) QUIZ SYSTEM
- Quiz start
- Quiz runner (with progress indicator)
- Quiz results (pass/fail)
- If failed: “New version unlocked” messaging
- After 2 fails: show “Support resources emailed” status
- Quiz wall locked state that prevents progression

E) DATA ROOM + ASSET CREATION
- Data Room Home: templates + generated documents
- Module Asset Checklist page (required assets per module)
- Document Form Builder screen
- Generated PDF confirmation screen (stored + emailed messaging)
- Finalize asset (mark as final)
- Module completion blocked state if assets missing

F) CERTIFICATES + LINKEDIN
- Certificate Center with issued certificate card
- Download button
- Credential URL + “Add to LinkedIn” helper (copy UI)

G) DISCUSSION BOARD + MEETING PROPOSALS
- Mortar Discussion Board feed
- Thread detail with comments
- “Propose a meeting” flow:
  - choose topic
  - select time slots
  - submit proposal
- Admin approval UI for proposals (approve creates training/event)

H) EVENTS + TRAININGS CALENDAR
- Events Hub list + detail
- Calendar view specifically for trainings
- RSVP and Add-to-calendar UI
- Admin event posting flow

I) ADMIN SUITE (Admin role only)
- Admin Dashboard overview (KPIs)
- Analytics Suite:
  - completion rate
  - time per lesson
  - quiz pass/fail + attempts distribution
  - cohort breakdown
  - city breakdown
  - referral breakdown
  - export CSV CTA
- User management (role assignment)
- Invite/code generator (cohort + role)
- Curriculum management shell
- Hidden training permission management

J) SHOPIFY STORE + POINTS
- Store page embedded/linked
- Points balance and earning explanation
- Redeem points UI (placeholder)
- “Earn points by completing modules/assets” messaging

K) MOBILE BLEND (WEB)
- “Open Mobile App” page (access code and deep link)
- “Mobile App Preview” page with mock screens (feed, groups, events, explore, profile)
- Feedback submission form for mobile preview

RBAC UI PATTERNS (must be included)
- RoleGate screen: explains why access is denied and how to gain it
- Privilege-based button disabling
- Locked course/quiz/asset states with clear next steps
- Badge system: city badges, graduation badge, role badges

OUTPUT
- Create a clickable prototype with at least these flows:
  1) Sign up → Business Profile → Dashboard → Module catalog → Lesson → Quiz → pass → progress updated
  2) Fail quiz twice → new quiz version → email sent messaging → eventual pass
  3) Complete module but missing assets → forced Data Room asset creation → finalize → module passes
  4) Graduate after all 4 modules + all assets → certificate issued → LinkedIn add UI
  5) Admin flow: analytics dashboard → user role assignment → unlock hidden training video