# Mortar Platform Capabilities — Presentation Source Document

**Purpose:** A single, accurate reference of what the Mortar technology ecosystem does today, segmented by platform and mapped to four strategic outcomes:

1. **Drive sales / revenue**
2. **Increase fruitful connections among alumni**
3. **Automate staff workflows**
4. **Position Mortar as the city's leading accelerator**

Everything below reflects **real, built functionality** in the codebase (not roadmap). Use it to build slides; the “Talking points” and the value matrix at the end are written to drop straight into a deck.

---

## The ecosystem at a glance

Mortar runs **three connected products on one shared backend** (Google Firebase — Auth, Firestore, Cloud Functions, Storage, Messaging; payments via Stripe; email via Brevo):

| Platform | Audience | Surface | What it's for |
|---|---|---|---|
| **Digital Curriculum** | Current students / entrepreneurs | Web app | Learn the Mortar curriculum, earn certificates, buy modules/merch, join the community |
| **Admin Command Center** | Mortar staff | Web (admin view) | Run the whole operation — courses, users, events, commerce, moderation, analytics |
| **Mortar Alumni Network (“Expansion”)** | Graduates / alumni | iOS + Android app | Stay connected, match, network, hire, sell skills, attend events |

Because they share one backend, a student’s journey flows unbroken: **learn → graduate → alumni network**, with staff orchestrating all of it from one hub and measuring it with one analytics layer.

---

# Platform 1 — Digital Curriculum (Student Web App)

The learning and commerce engine. Turns program enrollment into completed curriculum, credentials, and revenue.

### Learning
- **Structured curriculum:** Courses → Modules → Chapters → Lessons, with a guided “Module Journey” and “Next Step” hero that always points a learner to their next action.
- **Rich lesson player:** slide decks, images, text, embedded video/YouTube, callouts, and quotes — authored by staff (including PowerPoint import).
- **Quizzes:** chapter-level, multiple-choice, **70% to pass**, with retakes and scored results.
- **In-lesson surveys with AI feedback:** reflective checkpoints that give learners instant, generated feedback and capture qualitative insight for staff.
- **Progress tracking:** per-lesson, per-chapter, per-module completion; automatic re-open when staff push updated content.

### Credentials & motivation
- **Module certificates:** downloadable PDF certificates on completion.
- **Public certificate share pages:** branded, shareable links (LinkedIn/social) — organic marketing for Mortar.
- **Achievement badges + points + cohort leaderboard:** gamification that drives completion and friendly competition.
- **Data Room:** learner’s personal vault of certificates and survey responses, with **“Download all as ZIP.”**

### Community (student side)
- **Community Hub:** discussions, events, and group chats in one place.
- **Discussions/forums:** threads by category, replies, likes, view counts, pinned posts.
- **Direct messaging** with staff and peers.

### Commerce (revenue)
- **Paid course modules** — buy individual modules via Stripe Checkout.
- **Paid event tickets** — register and pay for events.
- **Mortar Shop** — branded merchandise with cart, sizes, inventory, and Stripe checkout.
- **Automatic sales tax (Stripe Tax, Ohio-registered)** and flat-rate shipping handled server-side.
- **Order records** captured for fulfillment and accounting.

### Progression to alumni
- **Graduation application:** eligible students apply in-app; approval moves them into the **alumni network** — the on-ramp to Platform 3.

### Notifications
- In-app alerts for **certificate ready** and **badge earned**, pulling learners back into the product.

---

# Platform 2 — Admin Command Center (Staff)

The operational cockpit. One hub to run curriculum, people, events, commerce, moderation, and measurement across **both** the web platform and the mobile app. Each tool is tagged **WEB / MOBILE / BOTH** so staff always know which surface they’re affecting.

### Live “Action items” queue (workflow automation)
A self-refreshing to-do list that surfaces work the moment it appears — no inbox-digging:
- **Events needing approval** (member-submitted)
- **Alumni/graduation applications pending**
- **Mobile expansion reports** to moderate
- **Unread student DMs** to answer
- **Shop orders to fulfill**

Counts update live from Firestore; each card deep-links straight to the tool. Admins with push tokens also get notified (e.g. “Shop order needs fulfillment”).

### Management tools
- **Courses:** catalog management, **course builder**, and a **course creation wizard** (incl. PowerPoint/PPTX import) — staff author curriculum without engineering.
- **Badge Management:** define achievement badges for **both** the curriculum and the mobile app.
- **Events:** create events, moderate RSVPs, approve member submissions.
- **Role & admins:** manage admin access and user roles.
- **Reports:** goal reports and engagement summaries.
- **Shop:** items, inventory, and **order fulfillment** (status, tracking number, notes).
- **Alumni applications:** review graduation/alumni intake.
- **App Access Hub / Expansion invites:** create eligible users and generate invite codes; **bulk CSV cohort import** to onboard whole cohorts at once.
- **Expansion mobile moderation:** review flagged content and users; ban/suspend tools.
- **Direct messages & Groups:** manage student DMs and community groups.
- **Mortar Info:** publish announcements/newsletters that appear on the alumni app home screen.
- **Email Management + Email testing (Brevo):** send custom announcements to students and alumni, and QA templates before sending.
- **Push notifications:** activity feed and manual sends to the mobile app.

### Measurement
- **Analytics dashboards + exports** for the web platform, plus **Mobile analytics** for the expansion app (funnels, engagement, friction points, course/community/matching/job summaries).

### Why it matters
Staff run a multi-product operation from **one screen**, with routine triage automated and every action measurable — the operational backbone of a scaled accelerator.

---

# Platform 3 — Mortar Alumni Network (Expansion Mobile App)

The relationship and opportunity engine for graduates — where “fruitful connections among alumni” actually happen. iOS + Android, invite-based for verified alumni. Five-tab layout: **Home, Events, Groups, Explore, Profile.**

### Smart Matching (the connection driver)
- **One-tap “Run Smart Matching”** — a Cloud Function matches alumni on **skills, goals, and industry** and surfaces the most relevant people to meet, each with a direct “Message” action. Turns a static directory into active, high-signal introductions.

### Networking & community
- **Groups / communities:** join or create topic-based communities; threaded discussions with comments and up/down votes.
- **Explore marketplace:**
  - **Jobs** — post roles you’re hiring for.
  - **Skills** — offer services/skills to other founders.
  - **Network search** — find members by name/skills/industry.
  - Message anyone **directly from a job/skill card**, with the listing attached.
- **Direct messaging:** private 1:1 conversations.
- **Social feed / posts:** share updates; recent activity surfaces on Home.

### Events
- **Browse and RSVP** to alumni events; **All Events** vs **Registered** views.
- **Paid events** via Stripe; **add to calendar** in one tap.

### Profile & motivation
- **Rich professional profile:** goals, confident skills, desired skills, industry, work-structure preferences, and social/portfolio links.
- **Achievement badges** for participation (posts, events, connections) — gamified engagement that keeps alumni active.

### Staying informed & staff reach
- **Mortar HQ** on the home screen: announcements, newsletters, and media from the team (with “NEW” badges).
- **Mortar Shop** link and **push notifications** keep alumni connected to the brand.

### Staff tools (in-app)
- **Events admin** and **reports/moderation** for staff on the go.

### Why it matters
This is the durable value of a Mortar graduation: alumni keep **hiring each other, buying each other’s services, and collaborating** — with Mortar as the trusted hub that made the connection.

---

# Cross-cutting systems (the moat)

These run across all three platforms and are strong slide material on their own:

- **Unified identity & access:** one Firebase account model; invite/roster-gated access with role-based permissions (Student, Alumni, Admin, superAdmin).
- **Payments & commerce (Stripe):** modules, event tickets, and merch; **automatic Ohio sales tax**, shipping, order records, and admin fulfillment — a real revenue stack, not a donate button.
- **Analytics layer:** web + mobile event streams rolled into daily/derived summaries, funnels, and friction reports — Mortar can **prove outcomes and engagement** to funders and partners.
- **Gamification:** badges, points, and leaderboards spanning curriculum and alumni app to drive completion and retention.
- **Automated communications:** Brevo email (transactional + announcements) and push notifications, triggered by real events (certificate earned, order placed, announcement posted).
- **Matching engine:** algorithmic alumni matching — the technical differentiator behind “fruitful connections.”

---

# How it maps to your four goals (value matrix)

| Strategic goal | What powers it | Proof points to cite |
|---|---|---|
| **Drive sales / revenue** | Paid modules, paid events, Mortar Shop, Stripe Checkout with automatic tax + shipping, order fulfillment | Multiple revenue lines through one checkout; server-priced (no client tampering); Ohio tax compliance built in |
| **Fruitful alumni connections** | Smart Matching, Explore jobs/skills marketplace, communities/groups, direct messaging, member search | One-tap matching on skills/goals/industry; alumni hire and sell to each other in-app; message from any job/skill card |
| **Automate staff workflows** | Live Action-items queue, course builder + PPTX import, CSV cohort import, invite-code generation, fulfillment tools, Brevo email, push sends, auto badge/certificate issuance | Routine triage surfaces automatically and deep-links to the fix; whole cohorts onboarded from a CSV; content authored without engineers |
| **Position Mortar as the city's leading accelerator** | End-to-end learn→graduate→network journey, credentials + public certificate shares, analytics that prove outcomes, a polished multi-platform product | A graduate’s relationship with Mortar never ends; shareable certificates market Mortar organically; data proves impact to funders/partners |

---

# Suggested deck outline

1. **Title** — “The Mortar Platform: From Classroom to Career-Long Network”
2. **The ecosystem** — three products, one backend, one continuous journey (use the “at a glance” table)
3. **Digital Curriculum** — how we turn enrollment into completion, credentials, and revenue
4. **Admin Command Center** — how a small team runs a big operation (Action-items queue screenshot)
5. **Alumni Network** — where graduation becomes a lifelong, revenue-generating relationship (Smart Matching screenshot)
6. **The four outcomes** — one slide per goal, using the value matrix rows
7. **The moat** — payments, analytics, matching, gamification, automated comms
8. **Proof & metrics** — pull live numbers (see below)
9. **Ask / close** — investment, partnership, or expansion goal

### Metrics you can pull to make it concrete
Your analytics layer already tracks these — grab real numbers before the deck:
- Course completion rate, modules completed, average quiz score, certificates issued
- Revenue by type (modules / events / shop), orders fulfilled
- Alumni matches generated, DMs sent, jobs/skills posted, groups active
- Events created & RSVPs, community posts, weekly active users (web + mobile)

---

*Prepared from the live codebase. Feature names and behavior reflect what is currently built. Pull real metric values from the Analytics tools (Admin → Analytics / Mobile analytics) before presenting.*
