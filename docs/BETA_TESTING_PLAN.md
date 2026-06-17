# Mortar Beta Testing Plan & Runbook — Digital Curriculum + Expansion Network


> **How to use this document.** This is a **runbook**, not a strategy memo. Read Sections 1–4 once to load context, then execute Sections 5–9 in order. Every operational section has numbered steps, an **Owner**, and **Entry/Exit gates** — do not advance a phase until its Exit gate is met. Section 7 is a library of copy-pasteable test scripts; assign them, run them, log the result.

---

## 1. Purpose & the symbiotic thesis

Mortar ships two products that are meant to feed each other:

- **Digital Curriculum (DC)** — web app: courses → modules → lessons (slides, quizzes, surveys), certificates, badges, shop (merch), curriculum events.
- **Expansion Network** — Flutter mobile app: alumni feed, groups, events, 1:1 DMs, jobs/skills marketplace, and algorithmic member matching.

They share one Firebase backend: one `users` collection (roles + business profile + match profile), one Stripe pipeline, one Brevo email service, one FCM push service, and one `analytics_*` pipeline.

**The bet (the symbiotic loop):**

```
        ┌──────────────────────────────────────────────────┐
        │                                                    │
        ▼                                                    │
  DIGITAL CURRICULUM ──teaches business skills──►  graduates │
        ▲                                            │       │
        │                                            ▼       │
   pulled back for                          EXPANSION NETWORK│
   more content / events                  alumni connect,    │
        │                                  transact, mentor  │
        │                                            │       │
        └──────────drives engagement & ◄─────────────┘       │
                    revenue, which funds Mortar ─────────────┘
```

The beta exists to test whether that loop actually turns. We treat each goal as a **falsifiable hypothesis**, ranked by priority:

| # | Goal | Hypothesis (what we're trying to prove) |
|---|------|------------------------------------------|
| **1** | **Alumni symbiosis** *(primary)* | Alumni surfaced to each other will form **productive** relationships: match → DM → meeting → a concrete exchange (job lead, skill swap, intro, collaboration). |
| 2 | Cross-app engagement | Users active in DC become active in Expansion (and back). The two apps reinforce each other rather than competing for attention. |
| 3 | Business-learning efficacy | Completing curriculum measurably increases business knowledge **and** drives an applied action ("I did X in my business because of this"). |
| 4 | Revenue | Users will pay — for module access, event tickets, and/or merch. (At pilot scale this is a willingness-to-pay signal, not a forecast.) |

---

## 2. Scope — what's in / out

**In scope (tested + instrumented):** the cross-app value loop.

- Invite → claim access: `claimExpansionAccess` / `expansionInvite` (`functions/src/callables/`, `functions/src/expansionInvite.ts`).
- Onboarding, both apps (DC web onboarding; Expansion onboarding + business profile + match profile).
- Learning loop: course → lesson player → quiz → survey → module complete → certificate → badge → push.
- Symbiosis loop: `runExpansionUserMatching` → matching screen → `dm_threads` → `proposeMeeting` / `approveMeeting`; jobs/skills post + discover (`expansion_jobs`, `expansion_skills`).
- Events: create → admin approve → register → reminder push (curriculum `events` + mobile `events_mobile`).
- Commerce: `createStripeCheckoutSession` for module / event / shop; webhook fulfillment.
- Email: Brevo transactional sends (welcome, alumni-admitted, event, invite-code).


---

## 3. Participants

### 3.1 Internal testers — Weeks 1–2

**~5–8 staff/team.** Collectively they must cover **every role** and **every platform**. Assign each person a role + platform + a set of test scripts (Section 7).

**Role coverage matrix (every cell must be owned by at least one internal tester):**

| Role | DC web | Expansion iOS | Expansion Android |
|------|:------:|:-------------:|:-----------------:|
| `Admin` (network admin) | ✓ | ✓ | ✓ |
| `Alumni` / `Digital Curriculum Alumni` | ✓ | ✓ | ✓ |
| `Digital Curriculum Students` | ✓ | n/a (no Expansion access) | n/a |

### 3.2 External testers — Weeks 4–6

**Target ~30 · minimum viable 15.** Hand-picked, concierge-recruited.

| Cohort | Count | What they exercise |
|--------|------:|--------------------|
| Alumni / Digital Curriculum Alumni | **~20** (hard floor **12**) | Full both-app access. The **symbiosis engine** — matching, DMs, meetings, jobs/skills, events, commerce. |
| Digital Curriculum Students | **~10** | Learning + certificate + commerce flows. (No Expansion access by design.) |

> **Why the floor matters.** Matching, DMs, and the jobs/skills marketplace are worthless without density. Below ~12 active alumni the primary hypothesis (symbiosis) cannot be observed — the network is too sparse to produce connections. If you cannot recruit 12 alumni, **delay external testing**, don't run it under-powered.

**Concierge recruiting instruction (do this deliberately):** hand-pick alumni who **already run a business** and whose needs are **complementary** (someone who needs a designer + someone who offers design; someone hiring + someone job-seeking). Matching can only surface value if there is real, matchable supply and demand in the pool. This single choice is the biggest lever on whether the beta proves anything.

### 3.3 Recruitment steps (Owner: technical lead + program staff)

1. Build the external invite list (name, email, role to assign, business/needs note for concierge matching).
2. Seed the backend: add emails to `eligibleUsers` and `expansion_cohort_emails`; generate `inviteCodes`.
3. Send the Brevo **invite-code email** with the public app link (depends on launch Tasks 5 & 7 being done — real Mortar link + app link in template).
4. On first redemption per cohort, confirm `claimExpansionAccess` granted the **correct role** (check `users/{uid}.roles`) and that DC Students did **not** receive Expansion access.

---

## 4. Distribution channels & access steps (per platform)

**Owner: technical lead.** Complete all pre-flight items before inviting anyone.

- **DC web** — staging URL; provision test login; assign role. *Staging gotchas (known):* staff accounts are bounced from learner routes to `/admin` unless `localStorage.mortar_admin_view_mode = "student"`; the lesson player requires `is_published: true` even for admins — publish beta lessons first.
- **Expansion iOS** — TestFlight build from `ExpansionNetworkApp/expansion_network`. Add testers by email; send the TestFlight invite.
- **Expansion Android** — Google Play **closed/internal** track. Add testers to the tester list; share the opt-in link.
- **Config pre-flight (depends on launch Task 9):** confirm which environment the beta uses. Internal testing (Weeks 1–2) runs on **staging** (`mortar-stage`). External testing decision: run on staging with seeded data, **or** on production with live keys — pick one and document it; do **not** mix dev/stage/prod keys.

---

## 5. Timeline & milestones — 6 weeks (2 internal / 1 adjust / 3 external)

Each phase has explicit **Entry** and **Exit** gates. **Do not advance until the Exit gate is met.**

### Weeks 1–2 — Internal testing (team/staff)

**Owner:** technical lead. **Testers:** ~5–8 staff.

- **Entry gate:**
  - [ ] Staging seeded with **real, published** course content (migrated lessons; `is_published: true`).
  - [ ] Test accounts exist for **all roles** (Section 3.1 matrix).
  - [ ] Expansion builds live on TestFlight + Play internal track.
  - [ ] Analytics pipeline confirmed writing (events land in `analytics_raw_events` / `expansion_analytics_events`).
- **Do (steps):**
  1. Assign each tester their cells in the role/platform matrix + a set of Section 7 test scripts.
  2. Each tester runs every assigned script end-to-end and logs the result (pass / fail + severity) per Section 8.
  3. Verify the cross-cutting flows explicitly: push delivery, invite redemption, all three Stripe checkout types, Brevo sends, security gates.
  4. Daily 15-min defect standup; technical lead triages new defects.
- **Exit gate:**
  - [ ] **Zero open S1.**
  - [ ] Every functional test script in Section 7 has passed **at least once**.
  - [ ] Instrumentation confirmed: the events behind each Section 6 metric are actually being emitted (or the gap is logged in Section 10).

### Week 3 — Adjustments / fixes

**Owner:** technical lead (eng) + program staff (cohort).

- **Do (steps):**
  1. Triage and **root-cause fix** everything found internally (follow launch Task 12: reproduce → failing test → root-cause fix → no regressions).
  2. Re-run every test script that failed in Weeks 1–2; confirm green.
  3. Finalize the external cohort list and draft/translate the invite emails (Section 3.3).
  4. **Freeze the build** external testers will use (tag it; note the version). No new features after freeze — fixes only.
- **Exit gate ("external-ready" sign-off):**
  - [ ] No open **S1 or S2**.
  - [ ] Invite flow tested end-to-end on a single fresh seed account (email → install → claim → correct role → first lesson / first match).
  - [ ] Analytics dashboards read correctly for a known test user (sanity-check the numbers you'll rely on in Week 6).
  - [ ] Build frozen + cohort list locked.

### Weeks 4–6 — External testing (~30 cohort)

**Owner:** program staff (cohort engagement) + technical lead (eng/triage).

- **Week 4 — Activation & learning.**
  1. Send invites to the full cohort (stagger by ~10/day to catch deliverability issues early).
  2. Confirm onboarding completion in both apps; chase non-activations within 48h.
  3. Trigger the **pre-learning self-assessment survey** at enrollment (Section 6.3) — this is the baseline; it cannot be collected retroactively.
  4. Alumni complete Expansion profile + **match profile** (feeds matching).
- **Week 5 — Symbiosis & commerce.**
  1. Confirm matching is producing suggestions for alumni (`runExpansionUserMatching` populated `expansion_matches`).
  2. Encourage the value loop: review matches → DM → propose meeting → exchange. Seed 2–3 jobs/skills posts to prime the marketplace.
  3. Open commerce: ensure at least one purchasable module, one ticketed event, and live shop items exist; watch for first checkouts.
  4. Run at least one **real event** (create → approve → register → reminder push → attend).
- **Week 6 — Synthesis & go/no-go.**
  1. Trigger the **post-learning survey** for module completers (the pre/post pair = learning lift).
  2. Run **connection-outcome interviews** (Section 6.1) with alumni who matched/DMed — this is the primary-goal evidence.
  3. Pull final metrics from the dashboards; fill in the Section 9 scorecard.
  4. Final triage; make the **launch decision** against Section 9.

**Recurring cadence during Weeks 4–6:**
- **Daily:** S1/S2 triage review (technical lead).
- **Twice weekly:** 30-min cohort check-in (program staff) — surface friction, nudge dormant testers.
- **Weekly:** metrics pull from analytics dashboards; update the Section 9 scorecard so go/no-go isn't a Week-6 scramble.

---

## 6. Goal instrumentation — metrics tied to real analytics

For each goal: the **headline metric**, the **existing data source**, the **required qualitative signal** (n is small — never report a number alone), and any **instrumentation gap** flagged for follow-up (see Section 10).

### 6.1 Alumni symbiosis *(primary)*

- **Headline — connection→outcome rate:** of matches surfaced, how many progress **match → DM → meeting → concrete exchange**? Track the funnel drop-off at each step.
- **Sources:** `expansion_matches` / `matching_summary`; `dm_threads` (+ `dm_repository.dart`); `proposeMeeting` / `approveMeeting` callables; `expansion_jobs` / `expansion_skills` + `job_summary`.
- **Qualitative (required):** short structured interview with each alumni who matched — *"Did a connection here create real value for your business? What happened?"* Capture verbatim outcome stories — these are the single most persuasive launch evidence.
- **Instrumentation gap:** there is likely **no event that marks a connection as having "produced an outcome."** Do **not** infer it from message count. Propose a lightweight self-report — a one-tap "this connection helped me" or a `survey_templates` trigger after a meeting — as a Section 10 follow-up.

### 6.2 Cross-app engagement

- **Headline — cross-app activation rate:** % of beta users active in **both** apps within the window. Sub-metrics: DC module-completion → Expansion activation; Expansion activity → return to DC.
- **Sources:** `users` roles; `analytics_raw_events` (web); `expansion_analytics_events` (mobile); `funnel_summary`; `daily_metrics`.
- **Qualitative (required):** ask in check-ins which app they open first and why; whether the other app felt connected or like a separate product.
- **Instrumentation gap:** a **cross-app activation join** (same `uid` active in both streams) may not exist as a precomputed metric — likely a manual join across `analytics_raw_events` + `expansion_analytics_events` for the beta. Flag in Section 10.

### 6.3 Business-learning efficacy

- **Headline — knowledge/behavior lift:** pre vs. post self-assessment delta, plus an **applied-action** count ("I changed something in my business because of a lesson").
- **Sources:** pre/post via a `survey_templates` survey (enrollment + post-module) → `survey_responses`; `quiz_attempts` (pass rates); `courseProgress` (completion); `certificates` (earned).
- **Qualitative (required):** the applied-action stories from Week-6 interviews.
- **Instrumentation gap:** the pre/post survey templates and their triggers may need to be created before Week 4 (the pre-survey must fire **at enrollment** or the baseline is lost). Flag in Section 10.

### 6.4 Revenue

- **Headline — checkout conversion + ARPU** across the three revenue types (module / event / merch).
- **Sources:** `payment_orders`, `shop_orders` (+ `shopOrders.ts`), Stripe dashboard, `createStripeCheckoutSession`.
- **Qualitative (required):** for non-purchasers, ask what stopped them (price, value, friction). For purchasers, ask what made it worth it.
- **Note:** at n≈30 this is **willingness-to-pay signal**, not a revenue model. A handful of real, unprompted purchases across ≥2 types is the meaningful result.

---

## 7. Functional test-script library (QA gate)

Run during Weeks 1–2; re-run any that touch changed code before Weeks 4–6. **Format:** Precondition → Steps → Expected → Logged-where. Carries forward Task 8's functional bar and ties to the cross-referenced launch tasks.

> Severity reminder: a failed script is logged per Section 8 with a severity. S1/S2 block their phase's Exit gate.

### TS-1 — Invite → claim → correct role *(ties to launch Tasks 5, 7)*
- **Precondition:** email seeded in `eligibleUsers`; invite code generated; app installed.
- **Steps:** 1) Receive Brevo invite email. 2) Tap app link → install/open. 3) Sign up / sign in. 4) Enter/redeem invite code (`claimExpansionAccess`).
- **Expected:** access granted; `users/{uid}.roles` is the intended role; a **DC Student** email is **denied** Expansion access.
- **Logged:** beta tracker + verify Firestore `users` doc.

### TS-2 — Onboarding, both apps
- **Precondition:** fresh account per role.
- **Steps:** complete DC onboarding; complete Expansion onboarding incl. business profile + match profile.
- **Expected:** completion persists (no repeat on relaunch); role-appropriate flow shown (student vs alumni — ties to launch Task 3); match profile saved on `users` doc.
- **Logged:** beta tracker; confirm onboarding funnel event in analytics.

### TS-3 — Learning loop → certificate → badge → push *(ties to launch Task 2)*
- **Precondition:** a published course with a quiz + survey.
- **Steps:** open lesson player; advance slides; submit a quiz (`submitQuizAttempt`); submit a survey; complete the module.
- **Expected:** `courseProgress` updates; quiz pass/fail correct; certificate generated; badge awarded (`awardCourseModuleBadges`); **one** "badge earned" push arrives (no duplicate — `push_notification_dedupes`).
- **Logged:** beta tracker; verify `certificates`, `quiz_attempts`, push receipt.

### TS-4 — Matching → DM → meeting *(primary-goal flow)*
- **Precondition:** ≥2 alumni with complementary match profiles; matching run.
- **Steps:** open matching screen; view a suggested match; start a DM (`dm_threads`); propose a meeting (`proposeMeeting`); other party approves (`approveMeeting`).
- **Expected:** suggestions appear; DM delivers + DM push fires once; meeting proposal + approval round-trip works.
- **Logged:** beta tracker; verify `expansion_matches`, `dm_threads`, meeting docs.

### TS-5 — Jobs / skills marketplace
- **Steps:** post a job (`expansion_jobs`) and a skill (`expansion_skills`); from another account, discover via Explore/search; share one into a DM.
- **Expected:** listing appears in discovery; attachment renders in DM; content-suspended users cannot post.
- **Logged:** beta tracker.

### TS-6 — Events: create → approve → register → reminder
- **Steps:** member submits an event (`events_mobile`, approval workflow); admin approves; another user registers; wait for reminder window.
- **Expected:** approval gating works; registration counts spots correctly; `event_reminder_1d` / `event_reminder_2h` push fires once each, correct time zone (ties to launch Task 2).
- **Logged:** beta tracker; verify event doc + push receipts.

### TS-7 — Stripe checkout (module / event / merch) *(ties to launch Task 9)*
- **Steps:** run `createStripeCheckoutSession` for each of the three types; complete payment with a test card (staging) / real card (prod beta).
- **Expected:** session created; payment succeeds; webhook verified with live signing secret; `payment_orders` / `shop_orders` written; access/fulfillment granted; mobile return redirect works.
- **Logged:** beta tracker; verify order docs + Stripe dashboard.

### TS-8 — Brevo emails render + deliver *(ties to launch Tasks 5, 6, 7)*
- **Steps:** trigger welcome, alumni-admitted, event-registrant, and invite-code emails to a seed inbox.
- **Expected:** delivered (not spam-foldered), merge params resolve (no raw `{{ }}`), links point to the real Mortar URL, app link present in invite email.
- **Logged:** screenshots in beta tracker.

### TS-9 — Security gates *(ties to launch Task 1)*
- **Steps:** as a non-admin, attempt admin actions and reads of another user's private data; as a content-suspended user, attempt to post/DM/create.
- **Expected:** all denied by Firestore rules / callable auth checks; no privilege escalation; suspension/ban enforced.
- **Logged:** beta tracker; note each attempted path + result.

### TS-10 — Crash-free / stability (per platform)
- **Steps:** run the core flows above across iOS, Android, and web; record any crash/ANR/white-screen.
- **Expected:** crash-free session rate ≥ target (Section 9).
- **Logged:** crash reporting tool + beta tracker.

---

## 8. Feedback & triage

**Intake channels:**
- In-app / Typeform feedback link (shared with all testers).
- A dedicated beta **Slack channel** for real-time reports.
- Staff-logged `user_reports` for any in-product content issues.

**Severity levels & response:**

| Sev | Definition | Response |
|-----|------------|----------|
| **S1** | Blocker — data loss, payment failure, crash on core flow, security hole, can't onboard | Same-day fix; blocks phase Exit gate |
| **S2** | Major — core feature broken with no workaround | Fix within the phase; blocks external-ready (Week 3) Exit gate |
| **S3** | Minor — feature degraded, workaround exists | Fix if time; otherwise backlog |
| **S4** | Polish — cosmetic / copy | Backlog |

**Bug flow (every S1/S2 — follow launch Task 12):** reproduce → write a failing test that encodes the bug → root-cause fix (not a symptom patch) → confirm test passes + no regressions → note cause/fix.

**Triage cadence:** daily S1/S2 review during all 6 weeks; full backlog review at each phase boundary.

---

## 9. Go / no-go exit criteria

**Both gates must pass to launch.** Fill the scorecard in Week 6.

### Gate A — Functional (hard)
- [ ] Crash-free session rate **≥ 99%** (mobile) / **≥ 99.5%** (web) over the external window.
- [ ] **Zero open S1**; no open S2 on an in-scope flow.
- [ ] TS-1, TS-3, TS-6, TS-7, TS-8 (invite, learning+push, events, payments, email) verified end-to-end on real devices.
- [ ] Security gates (TS-9) hold — no privilege escalation, suspension enforced.

### Gate B — Outcome / thesis (directional, n≈30)
Each threshold is a **directional pass** and **requires the paired qualitative evidence** — a number alone does not satisfy the gate.

| Goal | Threshold (proposed — tune to cohort) | Required qualitative evidence |
|------|----------------------------------------|-------------------------------|
| **Symbiosis (primary)** | **≥ 5** real **connection→outcome** instances (match → exchange) across the alumni cohort | ≥ 5 verbatim outcome stories from interviews |
| Cross-app engagement | **≥ 50%** of alumni active in **both** apps within the window | Testers describe the two apps as connected, not separate |
| Learning efficacy | Measurable **pre/post lift** on **≥ 60%** of module completers, with **≥ 5** applied-action reports | ≥ 5 "I changed X in my business" stories |
| Revenue | **≥ 5** successful unprompted paid checkouts across **≥ 2** of the 3 revenue types | Purchasers articulate why it was worth paying for |

> If Gate A passes but Gate B falls short, that is **not necessarily a launch blocker** — it's a signal about the *product thesis*, not stability. Decide explicitly: launch and keep iterating on the loop, or extend the beta to strengthen the weak goal. Document the call.

---

## 10. Roles, risks & instrumentation backlog

### Ownership during the beta
- **Technical lead:** environment/config, builds, analytics integrity, defect triage, all eng fixes, Gate A.
- **Program staff:** cohort recruiting (concierge matching), engagement nudges, check-ins, interviews, Gate B evidence.
- **Admins:** event approvals, moderation (`user_reports`, suspension), in-app announcements.

### Risk register
| Risk | Impact | Mitigation |
|------|--------|------------|
| Cohort lacks business diversity → matching has nothing to match on | Primary hypothesis untestable | Concierge-recruit complementary alumni; enforce the 12-alumni floor |
| Invite/email deliverability (spam-folder) | Activation stalls | Verify SPF/DKIM/DMARC (Task 6); stagger sends; monitor opens |
| TestFlight / Play review delay | Build not ready for Week 4 | Submit builds during Week 3, not Week 4 |
| Sparse activity makes metrics noisy | Weak go/no-go signal | Lean on qualitative interviews; report directionally, never as significance |
| Pre-survey not fired at enrollment | Learning baseline lost | Build + test survey trigger **before** Week 4 (see backlog) |

### Instrumentation backlog (build these as small follow-ups — **not** in this doc)
These metrics in Section 6 may lack a data source today. Confirm during Weeks 1–2; build before Week 4 where needed:
1. **Connection-outcome self-report** (6.1) — one-tap "this connection helped me" or post-meeting `survey_templates` trigger. *Without this, symbiosis success is interview-only.*
2. **Cross-app activation join** (6.2) — a query/report joining `analytics_raw_events` + `expansion_analytics_events` by `uid`. May be a manual join for the beta.
3. **Pre/post learning survey** (6.3) — `survey_templates` + triggers at enrollment and post-module. **Time-sensitive: the pre-survey must exist before invites go out.**

---

## Cross-references
This plan intentionally does not duplicate the other launch tasks; it depends on them. See `MORTAR_LAUNCH_PLANS_AND_GRADING.md`: Task 1 (security — TS-9), Task 2 (push reliability — TS-3/TS-6), Tasks 5 & 7 (Mortar/app links in invite — TS-1/TS-8), Task 6 (email templates — TS-8), Task 9 (live keys/webhooks — TS-7), Task 12 (bug-fix discipline — Section 8).
