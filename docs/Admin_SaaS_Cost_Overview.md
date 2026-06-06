# Mortar Platform — Admin SaaS & API Cost Overview
**Prepared by:** The Culture Connection Technology Solutions  
**Date:** June 2026  
**Audience:** Mortar HQ Internal / Trains Admin

---

## Overview

The Mortar platform runs on four primary paid services: **Firebase (Google Cloud)**, **Brevo (email)**, **OpenAI (AI feedback)**, and **Railway (hosting)**. This document outlines what each service does, what drives cost, and what to monitor per user.

---

## 1. Firebase (Google Cloud)

Firebase powers the entire backend: authentication, database, file storage, and server functions for both the Digital Curriculum web app and the Expansion Network mobile app.

### Services Used

| Service | What It Does |
|---|---|
| Firebase Authentication | User sign-in / sign-up (email & password) |
| Cloud Firestore | NoSQL database — all user data, progress, content, analytics |
| Cloud Storage | File storage — lesson assets, profile photos, certificates, shop images |
| Cloud Functions v2 | Server-side logic — 100+ backend functions running on Google Cloud Run |
| Firebase Hosting | Not used (Railway handles web hosting) |

### Firestore — Cost Drivers

Firestore bills on **reads, writes, and deletes** (not storage size).

**High-write operations per user:**
- Lesson progress updates (`courseProgress/{uid_course_id}`) — written on each lesson interaction
- Analytics events — every user action logs to `analytics_raw_events` and `analytics_events`
- Per-user daily summaries (`user_analytics_summary/{uid}`) — aggregated daily
- Email activity logs — every email send writes to `email_activity/`
- Push notification logs — every push writes to `push_notifications_activity/`

**Per-user Firestore documents:**
```
/users/{uid}                          — Core profile (~50+ fields)
/users/{uid}/certificates/{certId}    — Earned certificates
/users/{uid}/notifications/{notifId}  — In-app notifications
/users/{uid}/surveyResponses/{docId}  — Survey answers
/users/{uid}/expansion_matches/{uid}  — Alumni match profiles
/courseProgress/{uid_course_id}       — Lesson/quiz progress per course
/user_analytics_summary/{uid}         — Aggregated activity stats
/analytics_daily_summaries/{uid_date} — Daily activity counters
```

**Indexed queries (157 composite indexes)** — complex admin analytics queries and dashboard reads generate higher read volume. Monitor admin dashboard usage during reporting periods.

**Approximate Firestore cost signals to watch:**
- New user onboarding: ~15–25 writes (profile creation, initial fields)
- Per lesson completed: ~3–5 writes (progress, analytics event, daily summary)
- Admin dashboard load: ~50–200 reads (KPI queries across multiple collections)
- Scheduled email nudge sweep: reads every active user record daily

### Cloud Storage — Per User

Storage bills on **GB stored + download bandwidth**.

| Path | Content | Cost Driver |
|---|---|---|
| `/users/{uid}/profile/` | Avatar photo, business logo | Small; ~100–500 KB per user |
| `/certificates/` | Generated certificate PDFs | ~200–500 KB per certificate |
| `/lesson_assets/{...}/` | Curriculum slide images, videos | Largest bucket — shared, not per-user |
| `/shop/` | Product images | Small, static |
| `/data_rooms/{uid}/` | User-generated documents | Grows with Data Room usage |

**Key note:** Lesson assets are the largest storage cost and are shared across all users. Per-user storage is primarily profile photos and certificates.

**Bandwidth** is charged on downloads. Video lesson assets and PDF downloads are the main bandwidth drivers.

### Cloud Functions v2

Functions run on Google Cloud Run — billed on **invocations + compute time (CPU/memory/ms)**.

**Highest-frequency callables (per user session):**
- `logAnalyticsEvent` — called on every user action
- `trackLessonTime` — called during lesson playback
- `markLessonComplete` — on lesson completion
- `submitQuizAttempt` — quiz submissions
- `initializeUserSession` — every sign-in

**Scheduled functions (run daily/regularly regardless of user count):**
- `scheduledCourseInactiveEmailNudges` — sweeps all active users daily
- `scheduledNudgeIncompleteProfiles` — sweeps incomplete profiles
- `scheduledEventReminderPushes` — fires before each event

**Cost scaling:** Functions cost scales linearly with user activity and event volume. Analytics-heavy usage (all actions logged) is the primary driver.

### Firebase Billing Summary

| Tier | Free Allowance | Overage Rate |
|---|---|---|
| Firestore Reads | 50,000/day | $0.06 per 100,000 |
| Firestore Writes | 20,000/day | $0.18 per 100,000 |
| Firestore Deletes | 20,000/day | $0.02 per 100,000 |
| Cloud Storage | 5 GB | $0.026/GB/month |
| Storage Bandwidth | 1 GB/day | $0.12/GB |
| Functions Invocations | 2M/month | $0.40 per million |
| Functions Compute | 400K GB-sec/month | $0.0000025/GB-sec |

> **Recommendation:** Enable Firebase billing alerts at $50 and $150 thresholds. Review Firestore usage in the Firebase console monthly. The analytics event pipeline is the highest write driver — consider batching client-side events to reduce write volume at scale.

---

## 2. Brevo (Transactional Email)

Brevo handles all outbound email: welcome messages, nudges, event announcements, graduation notifications, and order confirmations.

### Integration

- **Method:** REST API (`https://api.brevo.com/v3/smtp/email`)
- **Auth:** API key stored in Firebase Secret Manager (`BREVO_API_KEY`)
- **Logging:** Every send attempt logged to Firestore `/email_activity/`
- **Retry logic:** Auto-retries on 429 rate limit and 5xx errors (max 3 attempts)

### Email Templates (15 Active)

| ID | Template Name | Trigger |
|---|---|---|
| 3 | `course_inactive_7_days` | Scheduled — 7-day inactivity |
| 4 | `course_inactive_14_days` | Scheduled — 14-day inactivity |
| 5 | `event_announcement_to_registrants` | Admin sends to event RSVPs |
| 6 | `admin_custom_announcement` | Admin manual broadcast |
| 7 | `app_access_code_invite` | Expansion Network invite |
| 8 | `graduation_meeting_time_selected` | Graduation workflow |
| 9 | `graduation_admitted_to_alumni` | Alumni admission |
| 10 | `graduation_not_admitted` | Graduation rejection |
| 11 | `masters_onboarding_welcome` | New user welcome |
| 12 | `payment_shop_order_confirmed` | Shop purchase |
| 13 | `payment_event_registration_confirmed` | Event ticket |
| 14 | `payment_module_purchase_confirmed` | Course module purchase |
| 15 | `shop_order_fulfillment_update` | Order shipped/fulfilled |

### Volume Drivers

**Per new user:** 1 welcome email (Template 11) on onboarding completion

**Per inactive user (ongoing):**
- 1 email at 7-day inactivity mark
- 1 email at 14-day inactivity mark
- These run daily via scheduled function across all qualifying users

**Per event:** 1 announcement email × all RSVPs per event (admin-triggered)

**Per graduation cycle:** 2–3 emails per applicant (meeting, admit/reject)

**User preference controls** (opt-outs reduce sends):
- `email_opt_out_all`
- `email_pref_course_nudges`
- `email_pref_graduation_updates`
- `email_pref_events`
- `email_pref_admin_messages`

### Brevo Pricing Reference

| Plan | Monthly Emails | Cost |
|---|---|---|
| Free | 300/day (9,000/mo) | $0 |
| Starter | 20,000/mo | ~$25/mo |
| Business | 100,000/mo | ~$65/mo |
| Enterprise | Custom | Custom |

> **Tracking tip:** Query Firestore `/email_activity/` collection to get exact send counts by template, user, and status. The `status` field records `sent`, `failed`, or `skipped_preferences` for every attempt.

---

## 3. OpenAI API

OpenAI is used for a single, focused feature: **AI-powered lesson survey feedback**. It is not used broadly across the platform.

### What It Does

When a user completes a lesson survey (written reflection/answers), the system can optionally call OpenAI to analyze their responses and return personalized feedback. This is configured per-lesson by admins.

### Configuration

| Parameter | Value |
|---|---|
| Model | `gpt-4o-mini` (default; overridable via `OPENAI_MODEL` env var) |
| Max tokens | 2,048 per call |
| Max lesson content sent | 14,000 characters |
| Max feedback generated | 8,000 characters |
| Secret | `OPEN_AI_KEY` in Firebase Secret Manager |

### Cost Per Use

**gpt-4o-mini pricing (as of mid-2025):**
- Input: ~$0.00015 per 1,000 tokens
- Output: ~$0.00060 per 1,000 tokens

**Estimated cost per survey analysis call:**
- Input: ~1,500–3,000 tokens (lesson context + user answers + system prompt)
- Output: ~500–1,500 tokens (feedback text)
- **Estimated cost per call: $0.001–$0.003 (less than half a cent)**

**Cost scenario examples:**

| Users | Surveys Analyzed | Estimated Cost |
|---|---|---|
| 50 users × 1 survey | 50 calls | ~$0.10 |
| 200 users × 4 surveys | 800 calls | ~$1.60 |
| 500 users × 8 surveys | 4,000 calls | ~$8.00 |

### Cost Controls

- AI analysis is **opt-in per lesson** — admin enables/disables per `courses/{course_id}/lessonSurveys/{lesson_id}.aiAnalysis.enabled`
- Only fires when a user submits survey answers and AI is enabled for that lesson
- Results are cached in Firestore (`courseProgress/{uid_course_id}.surveyAiFeedback`) — not re-called on re-view
- No real-time usage; fully async callable

> **Recommendation:** OpenAI cost is negligible at current usage. If AI feedback is expanded to all lessons for all users, re-evaluate and set a spend cap in the OpenAI dashboard.

---

## 4. Railway (Hosting — Digital Curriculum)

Railway hosts the Digital Curriculum web app as a static SPA (single-page application).

### What Is Deployed

| App | Hosted On | Type |
|---|---|---|
| Digital Curriculum | Railway | Vite/React SPA (static files) |
| Expansion Network | Apple App Store / Google Play | Flutter native mobile app |
| Cloud Functions | Google Cloud (Firebase) | Auto-managed |

### Railway Configuration

```toml
[build]
builder = "nixpacks"
buildCommand = "npm install --include=dev && npm run build"

[deploy]
startCommand = "npx serve -s dist -l $PORT"
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 10
```

- **Build:** Nixpacks detects Node.js, runs Vite build
- **Runtime:** `npx serve` — lightweight static file server
- **Auto-deploy:** Triggers on git push to watched branch
- **Environments:** Controlled via `VITE_FIREBASE_ENV` env var (`dev` / `stage` / `prod`)

### Railway Pricing Reference

| Plan | Included | Cost |
|---|---|---|
| Hobby | $5 credit/month | $5/mo |
| Pro | $10/seat/month + usage | $10+/mo per seat |
| Usage | CPU: $0.000463/vCPU/min; RAM: $0.000231/GB/min | Variable |

**For a static SPA like Digital Curriculum**, Railway usage is minimal — the server is idle between requests and only serves pre-built HTML/JS/CSS. Estimated cost at moderate traffic: **$5–$20/month**.

> **Note:** Expansion Network mobile app distribution costs (Apple Developer: $99/year; Google Play: $25 one-time) are separate from Railway.

---

## 5. Additional Services

### Stripe (Payments)
- **Purpose:** Shop purchases, module unlocks, event tickets
- **Cost:** 2.9% + $0.30 per successful transaction
- **Integration:** Webhook-based; fulfillment tracked in Firestore
- **No monthly fee** — pay-per-transaction only

### Firebase Secret Manager
- Stores: `BREVO_API_KEY`, `OPEN_AI_KEY`, `STRIPE_SECRET_KEY`
- **Cost:** $0.06 per 10,000 access operations (negligible)

---

## 6. Cost Monitoring Recommendations

| Service | Where to Check | What to Monitor |
|---|---|---|
| Firebase | Firebase Console → Usage & Billing | Firestore reads/writes, Storage GB, Function invocations |
| Brevo | Brevo Dashboard → Statistics | Sends by template, delivery rate, opt-outs |
| OpenAI | OpenAI Dashboard → Usage | Token usage by day, spend by model |
| Railway | Railway Dashboard → Metrics | Deploy frequency, CPU/memory per service |
| Stripe | Stripe Dashboard → Reports | Transaction volume, dispute rate |

**Firestore query to get email send counts:**
```
Collection: email_activity
Filter by: status == "sent"
Group by: template_id
```

---

## 7. Cost Summary (Estimated Monthly at ~200 Active Users)

| Service | Estimated Monthly Cost | Notes |
|---|---|---|
| Firebase (Firestore + Functions + Storage) | $30–$80 | Scales with active user count & analytics volume |
| Brevo | $25–$65 | Depends on plan tier and monthly send volume |
| OpenAI | $1–$5 | Only fires on AI-enabled surveys |
| Railway | $5–$20 | Static SPA; minimal compute |
| Stripe | 2.9% + $0.30/txn | No monthly fee |
| **Total Platform Estimate** | **~$60–$170/month** | Excluding Stripe transaction fees |

> Costs will scale with user growth. The primary scaling factors are: (1) Firestore read/write volume from the analytics event pipeline, and (2) Brevo email sends from scheduled nudge campaigns.
