# Mortar Technology Platform — Pitch Deck Source Document
**Prepared by:** The Culture Connection Technology Solutions  
**Date:** June 2026  
**Seller:** The Culture Connection Technology Solutions  
**Client / Buyer:** Mortar HQ  
**Subject:** Acquisition / Licensing of the Mortar Digital Curriculum & Expansion Network Platform

---

> **How to use this document:**  
> Each section below is a pitch deck slide. The headings are slide titles. The content is the raw data and copy to draw from when building the deck. Pull key bullet points directly into slides — this document contains all the technical facts, feature lists, and value propositions sourced from the codebase.

---

## SLIDE 1 — Title Slide

**Headline:**  
*The Complete Entrepreneur Development Platform*

**Sub-headline:**  
*From Learner to Alumni — One Integrated Technology Ecosystem*

**Brand:**  
Mortar | Powered by The Culture Connection Technology Solutions

**Products:**  
- Mortar Digital Curriculum (Web)
- Mortar Expansion Network (Mobile — iOS & Android)

---

## SLIDE 2 — The Problem We Solved

**For entrepreneurship programs, the hardest challenge is not teaching — it's continuity.**

Traditional programs face:
- No structured, scalable way to deliver curriculum online
- No system to track who is learning, completing, or falling behind
- No alumni network to retain and connect graduates after the program ends
- No data to prove program outcomes to stakeholders
- Separate tools that don't talk to each other (LMS + email + community = fragmented experience)

**The result:** Graduates disengage. Impact is invisible. The community dissolves.

---

## SLIDE 3 — The Solution

**We built an integrated, end-to-end platform purpose-built for Mortar's model.**

Two products. One ecosystem. Fully connected.

| Product | Platform | Who It Serves |
|---|---|---|
| **Digital Curriculum** | Web App (browser) | Active students / learners |
| **Expansion Network** | Mobile App (iOS + Android) | Graduates / alumni |

The two products share a single user identity, data layer, and backend — learners graduate into the network automatically. No duplicate accounts. No manual hand-off.

---

## SLIDE 4 — Digital Curriculum: What It Is

**A complete online entrepreneurship training platform.**

The Digital Curriculum delivers structured, module-based learning with built-in accountability, payments, and admin control — purpose-built for Mortar's cohort model.

**Core Structure:**
```
Mortar Masters Curriculum
  └─ Module (4 total)
       └─ Chapter
            └─ Lesson (slide-based, image, or media)
```

**Access Model:**
- First 5 chapters per module: free (open access)
- Remaining chapters: unlocked via module purchase (Stripe checkout)
- Admin can assign content by role or by individual user

**User Journey:**
1. Invited via eligible email list → creates account
2. Completes 8-step onboarding (goals, skills, industry, work style)
3. Progresses through curriculum with progress tracking
4. Takes quizzes to advance
5. Completes Data Room documents (business assets)
6. Graduates → receives certificate → admitted to Expansion Network

---

## SLIDE 5 — Digital Curriculum: Key Features

### Learning Engine
- Slide-based lesson player (titles, text, images, callouts, quotes, bullets)
- Video + image media lessons
- Real-time lesson time tracking
- Server-authoritative quiz scoring (not fakeable client-side)
- Multiple quiz variants per lesson (rotates on each attempt)
- Double-failure quiz triggers automatic email to learner

### Progression & Accountability
- Module completion gating (must finish before advancing)
- Asset requirements — Data Room documents required to unlock certain modules
- 7-day and 14-day inactivity email nudges (automatic)
- Progress dashboard visible to admin in real time

### Data Room
- Built-in document generator (Business Plan, Financial Projections, etc.)
- PDF generation and download
- Admin-defined templates per module
- "Finalize" flow locks submitted assets

### Certificates & Achievements
- Auto-generated graduation certificates (PDF)
- LinkedIn sharing link
- Publicly verifiable: `mortar.com/verify/{code}`
- Badge system tied to milestones

### Shop & Points
- Points earned for completing lessons, quizzes, and assets
- Merchandise store (physical goods redeemable via points or USD)
- Stripe checkout integration
- Admin order fulfillment tracking + email updates

### Events Hub
- Calendar of upcoming training events
- RSVP with capacity tracking
- Admin-triggered email announcements to registrants
- Training events linked to curriculum modules

### Community (Web)
- Threaded discussion board
- Comment nesting
- Meeting proposal submissions (admin approval workflow)

### Admin Command Center
- Full analytics dashboard (KPIs, cohort breakdowns, completion rates, city segmentation)
- User management (list, search, filter, edit roles, ban accounts)
- Content management (curriculum, quizzes, templates, events, badges)
- Graduation application review + admit/reject workflow
- Email testing panel (send any template to any user)
- App Access Hub (manage Expansion Network invites)
- CSV import for eligible users
- Push notification broadcast

---

## SLIDE 6 — Expansion Network: What It Is

**A private, invite-only alumni network — mobile-first.**

After graduating from the Digital Curriculum, students receive an invite code to join the Expansion Network. It is exclusively for Mortar alumni — not open to the public.

**Access is earned, not purchased.** This creates a high-trust, high-quality network.

**Platform:** Native Flutter app for iOS and Android  
**Bundle ID:** `com.mortar.wearemortar`  
**iOS Target:** iOS 15+

---

## SLIDE 7 — Expansion Network: Key Features

### Invite-Gated Access
- Admin manages an eligible email list in Firestore
- Graduation triggers an invite code email (Brevo Template 7)
- Claim flow: validate code → create account → complete onboarding
- Role-based: only Digital Curriculum Alumni and Alumni roles gain access

### Alumni Matching
- Skill-based and goal-based matching algorithm (Cloud Functions)
- Profiles ranked by skill overlap + complementary goals
- Matches stored per user — browse and connect
- Visibility controls per profile

### Community
- Discussion threads (community feed)
- Groups: create, join, post, message
- Direct messaging (1:1 DM threads)
- Admin moderation tools built in

### Job & Skill Board
- Post and browse job listings (with industry and status filters)
- Post skill/service ads (offered services, skill tags)
- Filter by industry, skill, or availability

### Events (Mobile)
- Mobile event feed with RSVP
- Push notifications for event reminders (1 day before, 2 hours before)

### Push Notifications
- Badge earned / new badge available
- New DM or group message
- Event reminders
- Admin alerts
- Deep links: taps navigate directly to relevant in-app screen

### Shared Onboarding Profile (7 Steps — mirrors Digital Curriculum)
1. Identity & location (name, city, state, cohort, bio, profession, photo, logo)
2. Business goals (6 options matching curriculum)
3. Confident skills (select ≥3 from 8 categories)
4. Desired skills (select ≥3)
5. Industry / Tribe (single choice from 17 options)
6. Work structure (sliders: flexibility, hours, ownership)
7. Profile links (LinkedIn, portfolio, Instagram, Facebook, TikTok)

**On completion:** Welcome animation with haptic feedback → home screen

---

## SLIDE 8 — The Integrated User Journey

```
[Invited → Digital Curriculum]
        ↓
  Complete Onboarding (8 steps)
        ↓
  Learn → Quiz → Data Room → Graduate
        ↓
  Receive Certificate (PDF + LinkedIn)
        ↓
[Admitted → Expansion Network]
        ↓
  Onboard Mobile Profile (7 steps)
        ↓
  Match → Connect → Post → Collaborate
```

**The journey is tracked end-to-end.** Every step — from first login to alumni match — is logged, aggregated, and visible to admins.

---

## SLIDE 9 — Data & Analytics Infrastructure

**Built-in analytics — no third-party tool required.**

### What Is Tracked
- Every user action on both web and mobile platforms
- Lesson time, completions, quiz attempts and scores
- Onboarding funnel: who started, who dropped off, where
- Community engagement (posts, DMs, group joins)
- Matching funnel (matched, connected, messaged)
- Payment events (what was purchased, when, by whom)
- Email delivery and open tracking (via Brevo + Firestore)
- Push notification delivery

### Analytics Collections
- `analytics_events` + `analytics_raw_events` — raw event log
- `user_analytics_summary` — per-user aggregated stats
- `analytics_daily_summaries` — daily per-user counters
- `daily_metrics` — global platform daily rollups
- `derived_metrics` — computed KPIs
- `expansion_analytics_events` — mobile app events
- `community_analytics_summary` — community activity
- `matching_summary` — alumni matching funnel
- `funnel_summary` — onboarding/auth conversion

### Admin Dashboard Capabilities
- KPI dashboard (real-time)
- Cohort breakdowns (by city, industry, cohort)
- Course completion rates by module
- Date-range queries with CSV export
- Per-user activity summary
- Mobile app usage dashboard

---

## SLIDE 10 — Technology Stack

**Enterprise-grade, cloud-native, built to scale.**

| Layer | Technology |
|---|---|
| Web Frontend | React 18 + Vite + TypeScript |
| Mobile App | Flutter (Dart) — iOS + Android |
| Backend / API | Firebase Cloud Functions v2 (TypeScript, Node.js 22) |
| Database | Google Cloud Firestore (NoSQL, real-time) |
| File Storage | Google Cloud Storage |
| Authentication | Firebase Authentication |
| Email | Brevo (transactional SMTP, 15 templates) |
| Payments | Stripe (checkout, webhooks, tax codes) |
| AI | OpenAI gpt-4o-mini (lesson survey feedback) |
| Hosting (Web) | Railway (auto-deploy, Nixpacks) |
| Hosting (Mobile) | Apple App Store + Google Play |
| Security | Firestore security rules (~900 lines, deny-by-default) |

### Scale Indicators
- 100+ Cloud Functions deployed
- 157 Firestore composite indexes
- 15 transactional email templates
- 8 skill categories × 40+ individual skills
- 17 industry/tribe options
- 3 Firebase environments: dev / stage / production

---

## SLIDE 11 — Security & Privacy Architecture

**Data is protected at every layer.**

- **Deny-by-default Firestore rules** (~900 lines): users can only read/write their own data
- **Role-based access control** via Firebase Auth custom claims (`superAdmin`, `Admin`, `Digital Curriculum Students`, `Digital Curriculum Alumni`, `Alumni`)
- **Server-authoritative scoring**: quiz grades are computed server-side — users cannot manipulate their own progress
- **Invite-gated network**: the Expansion Network is never publicly accessible — every member was verified and admitted
- **Account suspension enforcement** at the database rule layer — suspended users cannot read or write data
- **Secret management**: all API keys (Brevo, OpenAI, Stripe) stored in Firebase Secret Manager — never in client code
- **CORS allowlist**: Cloud Functions only accept requests from approved domains

---

## SLIDE 12 — AI-Powered Learning Feedback

**Personalized feedback at scale — no instructor required for every lesson.**

The platform integrates OpenAI's `gpt-4o-mini` model to analyze lesson survey responses and return custom feedback to each learner.

**How it works:**
1. Admin enables AI analysis on a specific lesson survey
2. Admin writes a custom prompt and grading rubric for that lesson
3. When a learner submits their survey, the system:
   - Loads lesson content and their answers
   - Sends to OpenAI with the admin's rubric
   - Returns personalized written feedback
   - Stores result in the learner's profile
4. Learner sees their feedback immediately

**Cost:** Less than $0.003 per analysis. At 500 users × 8 surveys = ~$8 total.

**Impact:** Scales 1-on-1 coaching feedback to every learner without instructor time per submission.

---

## SLIDE 13 — Deployment & Environments

**Production-ready with a full multi-environment pipeline.**

| Environment | Firebase Project | Status |
|---|---|---|
| Development | `mortar-dev` | Local emulator + Firebase |
| Staging | `mortar-stage` | Full cloud deploy for testing |
| Production | `mortar-9d29d` | Live platform |

- **Web:** Railway auto-deploys Digital Curriculum on every code push to the watched branch
- **Functions:** `firebase deploy` pushes all 100+ backend functions in one command
- **Mobile:** iOS via TestFlight → App Store; Android via Play Console
- **Environment isolation:** `VITE_FIREBASE_ENV` controls which Firebase project the web app connects to — same codebase, three environments

---

## SLIDE 14 — What Mortar HQ Is Getting

**A complete, production-grade platform. Not a prototype.**

| Deliverable | Status |
|---|---|
| Digital Curriculum web app (React/Vite) | Production-deployed on Railway |
| Expansion Network mobile app (Flutter/iOS/Android) | Deployable to App Store / Play Store |
| 100+ Cloud Functions backend | Deployed on Firebase (Google Cloud) |
| 157-index Firestore database schema | Configured and indexed |
| 15-template transactional email system | Active on Brevo |
| Stripe payment integration | Configured with webhooks |
| OpenAI survey feedback integration | Configured with Secret Manager |
| Full admin command center | Web-based, role-controlled |
| Analytics pipeline (web + mobile) | Dual-platform event tracking |
| Multi-environment deploy pipeline | dev / stage / prod |
| Security rules and access control | ~900 lines, role-based |
| Shared onboarding data model | Curriculum ↔ Network in sync |

---

## SLIDE 15 — Why This Platform Is Defensible

1. **Purpose-built for Mortar's model** — not a generic LMS or off-the-shelf community app. Every feature was designed around the cohort-to-alumni pipeline.

2. **The network is the moat** — the Expansion Network's value grows with every graduating cohort. Alumni matching, skill boards, and job listings become more valuable as membership grows.

3. **End-to-end data ownership** — all analytics, user behavior, and community data lives in Mortar-controlled Firebase projects (Google Cloud). No data locked in a third-party SaaS.

4. **Freemium + payments built in** — the platform is already monetized (module purchases, event tickets, shop) with Stripe integrated and operational.

5. **Two-platform reach** — web for learning, mobile for community. Meeting users where they are.

6. **Admin-controlled AI** — AI feedback is configured by admins per lesson, not hard-coded. The platform can scale intelligent feedback without replacing instructors.

---

## SLIDE 16 — Platform Cost to Operate

*(Approximate at ~200 active users/month)*

| Service | Monthly Cost |
|---|---|
| Firebase (Firestore + Functions + Storage) | $30–$80 |
| Brevo (transactional email) | $25–$65 |
| OpenAI (AI survey feedback) | $1–$5 |
| Railway (web hosting) | $5–$20 |
| Stripe | 2.9% + $0.30/transaction |
| **Total** | **~$60–$170/month** |

Low operational overhead relative to platform capability. Scales linearly — not exponentially — with user growth due to the serverless Cloud Functions architecture.

---

## SLIDE 17 — Call to Action

**Mortar HQ is acquiring a platform that already works.**

- The curriculum is built and deployed
- The alumni network is built and ready for App Store submission
- The backend is live on Google Cloud
- The analytics are running
- The email system is active

**What's next:**
1. Transfer Firebase project ownership to Mortar HQ's Google account
2. Transfer Railway service ownership
3. Transfer Brevo account / API key
4. Transfer Stripe account or create new connected account
5. Configure Apple Developer and Google Play accounts for Expansion Network
6. Hand off admin credentials and documentation

**The Culture Connection Technology Solutions is available for ongoing support, feature development, and maintenance under a separate services agreement.**

---

*Document prepared from codebase analysis by The Culture Connection Technology Solutions — June 2026*
