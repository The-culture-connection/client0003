# Mortar — Pre-Launch Task Plans & Code Grading Criteria

**Repo:** `mortar-monorepo` (Next.js web · Flutter mobile · Firebase Functions v2 / Firestore · Brevo email · FCM push · Stripe)
**Date:** 2026-06-16
**Purpose:** For each task below: an implementation **plan** plus a **grading rubric** used to evaluate the code an AI coding agent produces. Each rubric scores out of 100. A submission **passes** at ≥ 80 with **no failed "must" (gate) criterion**. Gate criteria are marked 🔒 — failing any one is an automatic fail regardless of total score.

> **Owner note:** Grace is handling **Task 5 (Add actual Mortar link)**, **Task 6 (Edit Brevo email templates)**, **Task 7 (Add public link to Brevo invite-code template)**, and **Task 9 (Update API & webhook keys)** directly. Their rubrics below double as a self-check / acceptance checklist. The remaining tasks (1–4, 8, 10–12) are for the coding agent and are graded with the 🔒 gate rules.

## How to use the rubrics

Each task lists weighted criteria. For each criterion, score the agent's diff as: **Full** (full points), **Partial** (half), or **None** (0). Gate criteria (🔒) are pass/fail — if not fully met, the whole task fails. Always run the criteria against the *actual diff and test output*, not the agent's self-description.

Cross-cutting expectations that apply to **every** task (deduct up to 10 pts globally if violated):

- Changes are scoped to the task; no unrelated refactors or dependency bumps.
- No secrets, API keys, or service-account JSON committed to the repo or logs.
- TypeScript compiles (`functions` builds), Flutter analyzes clean (`flutter analyze`), web builds.
- New behavior is covered by at least one test or a documented manual test path.
- User-facing copy is spell-checked and matches Mortar's voice.

---

## 1. Security Enhancements

**Objective.** Close gaps in Firestore rules, Cloud Function authorization, and client token handling before public launch.

**Scope.** `firestore.rules`, callable/HTTP functions in `functions/src` (esp. `callableCorsAllowlist.ts`, `pushNotifications.ts`, `expansionInvite.ts`, `stripe/`), Flutter/web auth and secret handling.

**Plan.**
1. Audit `firestore.rules` per collection: confirm read/write rules check `request.auth` and role/ownership; no collection is world-writable. Add deny-by-default for unlisted paths.
2. Audit every `onCall`/`onRequest` function for an explicit auth check (caller authenticated + role-gated where privileged, e.g. `assertCallerIsNetworkAdmin`). Validate all inputs with `zod`.
3. Tighten CORS: confirm `callableCorsAllowlist` lists only known web origins; remove wildcards.
4. Verify App Check is enforced on callables and that FCM tokens / invite codes are not exposed to non-owners.
5. Move any hardcoded secrets to Functions config / Secret Manager; rotate anything previously committed.
6. Add rules unit tests (`@firebase/rules-unit-testing`) for the highest-risk collections.

**Grading rubric (100).**
- 🔒 **(25) No privilege escalation path.** No new rule or function lets a non-admin perform admin actions or read another user's private data. Reviewer can articulate why each changed rule is safe.
- 🔒 **(15) No secrets in code/logs.** No keys, tokens, or service-account files added; no secrets logged.
- **(20) Auth + input validation.** Every touched callable/HTTP function checks `request.auth`, gates privileged paths by role, and validates input (zod or equivalent). (Partial if some are missed.)
- **(15) Deny-by-default rules.** Unlisted Firestore paths denied; ownership/role conditions on read and write, not just one.
- **(10) CORS/App Check tightened.** Allowlist contains only real origins; App Check enforced where applicable.
- **(10) Rules/security tests added** and passing for at least the riskiest collections.
- **(5) Change log / rationale** documenting what changed and the threat each mitigates.

---

## 2. Notification Reliability

**Objective.** Ensure push notifications (FCM) deliver exactly once, survive stale tokens, and degrade gracefully.

**Scope.** `functions/src/pushNotifications.ts` (uses `push_notifications_activity`, `push_notification_dedupes`, multi-token `fcm_token`/`fcm_tokens`), Flutter token registration/refresh, event-reminder schedulers.

**Plan.**
1. Confirm dedupe keys (`PUSH_DEDUPE`) cover every event type and are idempotent under retries/duplicate triggers.
2. Handle multicast results: on `messaging/registration-token-not-registered` and `invalid-argument`, prune the dead token from the user doc; never throw on partial failure.
3. Verify token lifecycle on the client: register on login, refresh on `onTokenRefresh`, remove on logout, support multiple devices.
4. Ensure scheduled reminders (`event_reminder_1d`, `event_reminder_2h`) compute windows correctly across time zones and don't double-fire.
5. Add structured logging + a counter for sent/failed/pruned so reliability is observable.
6. Retry transient errors with backoff; record permanent failures to activity log.

**Grading rubric (100).**
- 🔒 **(20) No duplicate sends.** Dedupe is enforced for all event types; replaying the same trigger does not send twice.
- 🔒 **(15) Partial failures don't crash the function.** A bad token in a batch never aborts delivery to good tokens.
- **(20) Stale-token pruning.** Unregistered/invalid tokens are removed from the user doc on the documented error codes.
- **(15) Client token lifecycle** correct: register/refresh/logout and multi-device handled.
- **(15) Reminder scheduling** correct across time zones with no double-fire; covered by a test.
- **(10) Observability**: sent/failed/pruned counts logged with enough context to debug.
- **(5) Tests** for dedupe and token-pruning paths.

---

## 3. Onboarding Tutorial Polish (Students & Alumni)

**Objective.** Make first-run onboarding clear, role-aware, and skippable, with distinct flows for students vs. alumni.

**Scope.** Flutter `lib/screens` onboarding, `WelcomGif.tsx`/welcome assets, role detection, persisted "completed onboarding" flag.

**Plan.**
1. Branch onboarding content by role (student vs. alumni) — copy, screenshots, and CTAs differ.
2. Persist completion per user so the tutorial doesn't reappear; add a "replay tutorial" entry in settings.
3. Polish UI: consistent spacing/typography, working progress indicator, Skip and Back, no layout overflow on small devices.
4. Ensure assets (GIF/images) are optimized and have accessibility labels.
5. Verify deep-link / first-launch routing shows onboarding only once, before the main shell.

**Grading rubric (100).**
- 🔒 **(20) Correct role branching.** Students and alumni each see their intended flow; role is read reliably, with a safe default.
- **(20) Completion persisted.** Tutorial shows once per user, survives app restart, and is replayable from settings.
- **(20) UI polish.** No overflow/clipping on small screens; Skip/Back/progress all work; matches design system.
- **(15) Copy quality.** Role-appropriate, typo-free, on-brand.
- **(10) Accessibility.** Images have semantic labels; text scales; tap targets adequate.
- **(10) Asset optimization.** Media compressed; no jank on load.
- **(5) Widget/golden test** or documented manual test for both roles.

---

## 4. Upload App to Apple App Store & Google Play

**Objective.** Ship signed, store-compliant builds to App Store Connect (TestFlight) and Google Play (internal/closed track).

**Scope.** `mobile` / `ExpansionNetworkApp/expansion_network` iOS & Android config, `pubspec.yaml`, signing, store metadata, privacy disclosures.

**Plan.**
1. iOS: set bundle id, version/build, signing & capabilities (push, App Check), privacy manifest, and required usage strings; archive and upload to TestFlight.
2. Android: set applicationId, versionCode/Name, release signing config (no debug keys), upload AAB to a closed track.
3. Complete store listings: name, description, screenshots, icons, age rating, data-safety / privacy nutrition labels matching actual data use.
4. Point release builds at production Firebase config and the production API/webhook keys (see Task 9).
5. Verify a clean install of each build passes a smoke test (login, core flow, push permission).

**Grading rubric (100).**
- 🔒 **(20) Release signing only.** No debug/ad-hoc keys in release config; secrets not committed.
- 🔒 **(15) Production config.** Builds use prod Firebase + prod keys, not dev/stage.
- **(20) Both builds produced & uploaded** to TestFlight and a Play track (or fully scripted/documented to do so).
- **(15) Store compliance.** Privacy/data-safety labels match real data collection; required usage strings present.
- **(15) Versioning** bumped and consistent across iOS/Android and `pubspec.yaml`.
- **(10) Listing assets** (icons, screenshots, descriptions) complete and correct.
- **(5) Smoke test** of installed build documented as passing.

---

## 5. Add Actual Mortar Link  *(Grace handling)*

**Objective.** Replace placeholder/dev URLs with the real Mortar production link everywhere it appears.

**Scope.** Email templates, invite/share flows, deep links, web config, app store listings, `EXPANSION_INVITE_AUTH.md` and related docs.

**Plan.**
1. Grep the repo for placeholder hosts (localhost, dev/stage domains, TODO link markers) and enumerate every occurrence.
2. Centralize the canonical URL in one config/constant (per platform) rather than hardcoding repeatedly.
3. Update email templates, invite-code deep links, universal/app links, and any QR/share URLs.
4. Verify the link resolves and routes correctly on web, iOS, and Android (including cold-start deep link).

**Acceptance checklist (100).**
- 🔒 **(25) No placeholder/dev links remain** in user-facing surfaces (emails, invites, listings, deep links). Verified by grep.
- **(25) Single source of truth.** URL defined once per platform and referenced, not copy-pasted.
- **(25) Deep link works** end-to-end on at least web + one mobile platform, including cold start.
- **(15) All surfaces updated**: email, invite, share, docs.
- **(10) No broken links** — destination resolves (2xx / correct route).

---

## 6. Edit Email Templates with New Email Template  *(Grace handling)*

> Parent item "add new domain" is complete; this sub-task updates email templates to the new domain/branding.

**Objective.** Update all Brevo email templates to the new sending domain and current branding, and confirm deliverability.

**Scope.** `docs/brevo-templates/html`, `functions/src/email/*` (`brevoTemplates.ts`, `buildEmailParams.ts`, `sendTransactionalEmail.ts`, `sendAppAccessInviteEmail.ts`), Brevo template IDs.

**Plan.**
1. Inventory every template and the template IDs referenced in code; map old → new.
2. Update sender domain, from-name/address, reply-to, and footer/links to the new domain.
3. Refresh branding (logo, colors, links) and ensure merge params (`buildEmailParams`) still resolve.
4. Confirm SPF/DKIM/DMARC for the new domain are verified in Brevo so mail isn't spam-foldered.
5. Send live test renders to a seed inbox for each template type.

**Acceptance checklist (100).**
- 🔒 **(20) New domain everywhere.** No old-domain from/reply-to/links remain in templates or code.
- **(20) Template IDs consistent.** Code references match the updated Brevo templates; no orphaned IDs.
- **(20) Merge params resolve.** All placeholders populate; no raw `{{ }}` leaks in rendered output.
- **(15) Auth records noted/verified** (SPF/DKIM/DMARC) for the new domain.
- **(15) Branding correct** and links point to the real Mortar URL (ties to Task 5).
- **(10) Test renders** captured for each template type.

---

## 7. Add App Public Link to Brevo Invite-Code Template  *(Grace handling)*

**Objective.** Insert the public app/store link into the Brevo invite-code email so recipients can install and redeem.

**Scope.** Invite-code Brevo template + `sendAppAccessInviteEmail.ts` / `buildEmailParams.ts`, `expansionInvite.ts`.

**Plan.**
1. Add a `app_link` (and store-specific links if needed) merge param to the invite template.
2. Populate it from a single config value (reuse Task 5's canonical URL).
3. Ensure CTA button + fallback text URL render in both HTML and plain-text parts.
4. Send a test invite end-to-end and confirm the link opens the app/store and the code still redeems.

**Grading rubric (100).**
- 🔒 **(25) Public link present & correct** in the invite template, sourced from the canonical config.
- **(25) Merge param wired** through `buildEmailParams`/send function; populated for real sends.
- **(20) Renders in HTML + plain text** with a clear CTA and visible fallback URL.
- **(20) End-to-end test**: invite email received, link opens install path, code redeems.
- **(10) No hardcoded one-off URL** duplicating Task 5.

---

## 8. Beta Testing Plan

> **Delivered:** see `docs/BETA_TESTING_PLAN.md` — a combined functional + business-outcome runbook (6 weeks: 2 internal / 1 adjust / 3 external; ~30 external testers; alumni-symbiosis primary goal). It supersedes the narrow scope below, which remains as the grading rubric.

**Objective.** Produce a written, executable beta plan (this is a **document deliverable**, not code).

**Scope.** New doc under `docs/` (e.g. `docs/BETA_TESTING_PLAN.md`).

**Plan.**
1. Define cohorts (students, alumni, admins), size, and recruitment via invite codes.
2. Define channels: TestFlight (iOS), Play closed track (Android), web staging.
3. Specify scope, entry/exit criteria, timeline, and a feedback intake path (form/Slack/issue tracker).
4. Define severity levels, triage cadence, and a go/no-go checklist for public launch.
5. List metrics to watch (crash-free rate, activation, notification delivery, invite redemption).

**Grading rubric (100).**
- 🔒 **(20) Clear exit/go-live criteria** — objective thresholds, not vibes.
- **(20) Cohorts & recruitment** defined with target counts and invite mechanism.
- **(20) Distribution channels** specified per platform with access steps.
- **(15) Feedback & triage** process with severity levels and owners.
- **(15) Timeline & milestones** with dates/durations.
- **(10) Metrics & instrumentation** to judge readiness, tied to real analytics.

---

## 9. Update API & Webhook Keys with Active Values  *(Grace handling)*

**Objective.** Replace test/placeholder API keys and webhook secrets with live production values, stored securely.

**Scope.** Functions config / Secret Manager, `.env.*` files, Stripe (`functions/src/stripe`), Brevo, Thinkific, FCM, and any webhook signature secrets.

**Plan.**
1. Enumerate every integration key and webhook secret and where it's read.
2. Move all to Functions config / Secret Manager; ensure `.env*` with secrets are git-ignored and not committed.
3. Set live values per environment (dev/stage/prod isolated); confirm prod uses live keys.
4. Verify webhook signature verification uses the live signing secret (e.g. Stripe `whsec_`).
5. Smoke-test each integration: a real webhook event is received, verified, and processed.

**Grading rubric (100).**
- 🔒 **(30) No secrets committed.** Live keys live in config/Secret Manager; repo and history clean; `.env*` ignored.
- 🔒 **(20) Webhook signatures verified** with the live signing secret; unsigned/invalid payloads rejected.
- **(20) Env isolation.** Prod uses live keys; dev/stage use their own; no cross-wiring.
- **(15) All integrations covered** (Stripe, Brevo, Thinkific, FCM, others present).
- **(15) Smoke tests** show each webhook/integration works post-rotation.

---

## 10. Performance Optimization

**Objective.** Reduce app/function latency and cost on the hottest paths without changing behavior.

**Scope.** Flutter rendering/list/image paths, Cloud Function cold starts & query patterns, web bundle/loading, Firestore read volume.

**Plan.**
1. Measure first: capture baseline metrics (key screen load times, function p95, web LCP/bundle size, Firestore reads/op).
2. Identify top offenders: N+1 Firestore reads, unbounded queries, oversized images, heavy rebuilds, cold-start-heavy functions.
3. Fix highest-impact items: add pagination/limits, batch/parallelize reads, cache, lazy-load assets, memoize widgets, set min instances where justified.
4. Re-measure and report before/after deltas; confirm no functional regressions.

**Grading rubric (100).**
- 🔒 **(20) No behavior change / regression.** Existing tests pass; outputs unchanged.
- 🔒 **(20) Measured improvement.** Before/after numbers provided for the targeted path; a real, non-trivial gain.
- **(20) Targets the real bottleneck**, evidenced by profiling, not guesswork.
- **(15) Query efficiency**: limits/pagination/batching reduce Firestore reads; no unbounded scans introduced.
- **(15) Client efficiency**: reduced rebuilds, lazy/optimized assets, smaller bundle where applicable.
- **(10) Cost awareness**: min-instances/caching changes justified against cost.

---

## 11. Query Indexing

**Objective.** Ensure every production query has a backing composite index; remove unused ones.

**Scope.** `firestore.indexes.json`, the queries in `functions/src` and Flutter/web data layers.

**Plan.**
1. Enumerate composite queries across functions and clients (e.g. `analytics_events`, `courses`, `dm_threads`, `Groups`).
2. Cross-check each against `firestore.indexes.json`; add missing composites, drop indexes no query uses.
3. Run queries against the emulator/staging to confirm no `FAILED_PRECONDITION` missing-index errors.
4. Verify index field order matches query equality-then-range/orderBy semantics.

**Grading rubric (100).**
- 🔒 **(30) No missing-index errors.** Every production composite query has a matching index; verified by running them.
- **(25) Field order correct** per Firestore composite rules (equality → range/orderBy).
- **(20) No orphan indexes** — unused composites removed; file stays minimal.
- **(15) Coverage** across all collections with composite queries, not just analytics.
- **(10) Verification evidence** (emulator/staging run or query log) included.

---

## 12. Bug Fixes

**Objective.** Resolve tracked bugs with minimal, well-tested changes. (Apply per-bug.)

**Scope.** Wherever each tracked defect lives.

**Plan.**
1. Reproduce the bug and capture the failing condition.
2. Write a failing test that encodes the bug.
3. Fix root cause (not just the symptom); keep the change minimal.
4. Confirm the new test passes and no existing tests regress.
5. Note the cause and fix in the PR description.

**Grading rubric (100, per bug).**
- 🔒 **(30) Bug actually fixed.** The reported scenario no longer reproduces.
- 🔒 **(20) No regressions.** Existing test suite passes.
- **(25) Root-cause fix**, not a symptom patch or `try/catch` swallow.
- **(15) Regression test** added that fails without the fix.
- **(10) Scoped & explained**: minimal diff, clear cause/fix note.

---

## Quick reference — gate criteria at a glance

| # | Task | Hard gates (auto-fail if unmet) |
|---|------|----------------------------------|
| 1 | Security | No privilege escalation · No secrets in code/logs |
| 2 | Notification reliability | No duplicate sends · Partial failures don't crash |
| 3 | Onboarding polish | Correct student/alumni branching |
| 4 | App store upload | Release signing only · Production config |
| 5 | Actual Mortar link *(Grace)* | No placeholder/dev links remain |
| 6 | Email templates *(Grace)* | New domain everywhere |
| 7 | Brevo invite link *(Grace)* | Public link present & correct |
| 8 | Beta plan | Clear exit/go-live criteria |
| 9 | API/webhook keys *(Grace)* | No secrets committed · Webhook signatures verified |
| 10 | Performance | No regression · Measured improvement |
| 11 | Query indexing | No missing-index errors |
| 12 | Bug fixes | Bug fixed · No regressions |
