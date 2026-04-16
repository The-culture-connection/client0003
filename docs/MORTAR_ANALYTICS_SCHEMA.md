# Mortar analytics schema and conventions

This document is the **human-readable companion** to the canonical TypeScript contract:

`functions/src/analytics/mortarAnalyticsContract.ts`

The Digital Curriculum app imports the contract via the Vite alias `@mortar/analytics-contract` → **`Digital Curriculum/src/mortar-analytics-contract/`** (a mirror of `functions/src/analytics` for standalone builds). `npm run build` runs **`scripts/sync-analytics-contract.mjs`** when the monorepo `functions/` tree is present so the mirror stays aligned; Railway and other single-package contexts use the committed copy. Cloud Functions validation lives in `functions/src/analytics/inboundAnalyticsPayload.ts` (Zod) for `logAnalyticsEvent`, and `functions/src/analytics/inboundWebAnalyticsPayload.ts` for **`ingestWebAnalytics`**. When you add a **web** event, update **`webAnalyticsEventRegistry.ts`**, the web inbound Zod schema (if shape rules change), and redeploy functions.

### How the feature works (web `trackEvent` + screen sessions)

- **Client:** `Digital Curriculum/src/app/analytics/trackEvent.ts` merges **`session_id`** (tab), **`screen_session_id`** (active screen session from `useScreenAnalytics`), **`route_path`**, **`screen_name`**, **`client_timestamp_ms`**, and **`client`** (`platform: web`, `locale`), then runs **`prepareIngestWebAnalyticsRequest`** (`prepareIngestPayload.ts`) so **`properties` never contains `undefined`** (Zod only allows string/number/boolean/null) and **`locale`** is truncated to 32 chars, then calls **`ingestWebAnalytics`**. Failures are swallowed (dev-only `console.warn`); the UI never depends on analytics success.
- **Screen sessions:** `useScreenAnalytics("dashboard")` (and similar) calls `beginScreenSessionForAnalytics` / `endScreenSessionForAnalytics` in `screenSession.ts`, which emit **`screen_session_started`** / **`screen_session_ended`** and keep a **`screen_session_id`** that `trackEvent` attaches to child events until unmount.
- **Phase 3 (behavior depth):** High-frequency signals use **debouncing** (e.g. Data Room and Discussions search) or **fixed visibility-gated intervals** (dashboard passive time). Properties avoid **PII and free-text** (query length vs text; quiz `option_id` only; survey **counts** after debounce). **`group_join_clicked`** remains only on `GroupDetail.tsx` (no duplicate Phase 3 emit).
- **Phase 4 (summary layer):** On each new normalized doc in **`analytics_events`** (`schema_version: 2`, including `web_curriculum_vite` and backend writers such as scheduled nudges / notification-read callable), **`onAnalyticsWebEventCreated`** updates **`user_analytics_summary/{userId}`** (per-user counts, `last_active_at`, UTC **streak** fields), **`daily_metrics/{YYYY-MM-DD}`** (UTC day bucket: **DAU** on first touch per user per day, funnel counters, `total_web_events`), **`course_analytics_summary/{courseId}`** when `properties.course_id` is set, and **`community_analytics_summary/global`**. **`scheduledPhase4DerivedMetrics`** (01:30 UTC) writes **`derived_*`** fields on yesterday’s `daily_metrics` (quiz pass rate, DAU mirror; placeholders `null` for cart abandonment, lesson latency, course progress % until extended). Raw **`analytics_raw_events`** rollups remain in `onAnalyticsRawEventCreated` / `analytics_daily_summaries` — Phase 4 web summaries are separate collections as specified.
- **Phase 5 (derived + funnels):** Central query helpers in `functions/src/analytics/queries/dashboardAggregates.ts` compute onboarding / lesson / quiz / engagement rates, churn risk indicators, and funnel conversions over a date window from `daily_metrics` + `user_analytics_summary`. Callable **`getPhase5DashboardMetrics`** exposes this to dashboards (Admin / superAdmin). Funnel step definitions align with Phase 4 counters (e.g. first step uses **signups + `login_sign_ins`**, lesson starts include **dashboard continue learning**, curriculum step adds **course card clicks**, community “surface” includes hub preview/start/RSVP rollups, shop visits use **max(filter/size signals, add-to-cart)** so carts without filter tweaks still show a sensible funnel). Optional request field **`include_debug: true`** adds a small **`debug`** object (caller `uid`, `auth_path` token vs server lookup, normalized role arrays from token / Auth custom claims / Firestore `users/{uid}.roles`, UTC window dates, and the aggregated **`totals.counts`** map) for live verification; the Admin Analytics panel currently requests it and shows it in a collapsible block—remove when no longer needed. Notification events are tracked via `notification_item_clicked` (client ingest) and `notification_mark_read_backend` (server callable write).
- **Admin UI surface:** `Digital Curriculum/src/app/components/admin/AnalyticsDashboardPanel.tsx` renders the Phase 5 snapshot by calling `getPhase5DashboardMetrics` and is mounted in `Admin.tsx` under the **Analytics** tab.
- **Phase 6 (badges + admin metrics):** **`badge_definitions`** with a **`rule`** drives **`onUserAnalyticsSummaryWritten`** → **`evaluateAnalyticsBadgesForUser`**, which writes **`user_badges/{uid}/awarded/{badgeId}`**, **`badge_progress/{uid}`**, and on first **one-time** award merges **`users/{uid}.badges.earned`**. Admin-only web events (**`admin_*`**) are emitted from Course Builder / Admin shop & events and roll up like other web counters.
- **Server:** `ingestWebAnalytics` validates auth (or a small **anonymous allowlist** for pre-auth login/password-reset + screen session events), normalizes/strips reserved property keys, sets **`created_at`** (server timestamp) and **`user_id`** from Auth when present, and writes **`analytics_events`** documents with **`schema_version: 2`**, **`source: web_curriculum_vite`**, and **`ingested_via: callable_ingest_web_analytics`**.
- **Registry:** Approved wire names live in `functions/src/analytics/webAnalyticsEventRegistry.ts` as **`WEB_ANALYTICS_EVENTS`** (re-exported from the contract module).

---

## Storage strategy

| Collection | Purpose | Writers | Readers |
|------------|---------|---------|---------|
| `analytics_raw_events` | Append-only canonical stream (`schema_version`, `event_name`, `user_id`, `client`, `properties`, …) | Admin SDK (validated `logAnalyticsEvent` callable, system jobs) | Admin / reporting callables (not direct client) |
| `analytics_daily_summaries` | Rollups (e.g. `counts.<event_name>`, `total_events`) | Triggers / batch on raw writes | Staff (`hasStaffClaim`) |
| `analytics_user_badges` | Legacy / reserved materialized badge doc per user | Triggers / batch | Owner or staff |
| `user_badges` | Phase 6 awards: **`{uid}/awarded/{badgeId}`** (`times_awarded`, timestamps) | `onUserAnalyticsSummaryWritten` | Owner or staff |
| `badge_progress` | Phase 6 last evaluation snapshot per user | Same | Owner or staff |
| `user_analytics_summary` | Phase 4 per-user rollup (`counts`, streaks, …) | `onAnalyticsWebEventCreated` | Owner or staff |
| `analytics_events` | **Normalized web** events (`schema_version: 2`, `ingest_via: callable_ingest_web_analytics`) plus any legacy mixed-shape docs | `ingestWebAnalytics` callable (Admin SDK) | Admin tooling / reporting |

Firestore rules deny client writes on server-owned analytics paths; clients may read own summaries / badge progress where rules allow.

---

## Naming

- **`event_name`**: **snake_case**, lowercase start, only `[a-z0-9_]`, max **63** chars after the first letter (regex `^[a-z][a-z0-9_]{0,62}$`).
- **TypeScript registry keys**: `SCREAMING_SNAKE` in `ANALYTICS_EVENTS`; **values** are the wire / Firestore `event_name`.
- **Do not** scatter raw event name strings in app code. Use `ANALYTICS_EVENTS` or `mortarWebAnalytics` intents (`Digital Curriculum/src/app/analytics/intents.ts`).

---

## Canonical raw document (`analytics_raw_events`)

### Required fields

| Field | Type | Notes |
|-------|------|--------|
| `schema_version` | number | Current: `1` (`ANALYTICS_SCHEMA_VERSION`) |
| `event_name` | string | Must be in `ANALYTICS_EVENTS` universe; client path must be in `CLIENT_INGESTIBLE_EVENT_NAMES` |
| `user_id` | string | Set server-side from Firebase Auth (never trust client) |
| `created_at` | server timestamp | Set when persisting |
| `ingested_via` | string | `"callable_log_analytics_event"` or `"system"` |
| `client` | object | `platform`: `web` \| `ios` \| `android`; optional `app_version`, `locale` |
| `session_id` | string or null | Optional correlation id (web: tab session) |
| `properties` | object | JSON-safe shallow map (see callable limits) |
| `dedupe_key` | string or null | Optional idempotency hint from client |

### Optional / event-specific

Put domain fields only under **`properties`**. Keep values **string | number | boolean | null** (enforced on the callable). Recommended keys (all snake_case):

| `event_name` | Suggested `properties` |
|--------------|-------------------------|
| `page_view` | `route` (string, required in product code) |
| `navigation_tab_selected` | `tab_id` |
| `curriculum_page_viewed` | `course_id` |
| `lesson_player_opened` | `lesson_id`, optional `course_id` |
| `analytics_dashboard_viewed` | _(empty)_ |
| `community_hub_viewed` | _(empty)_ |
| `discussions_list_viewed` | _(empty)_ |
| `data_room_viewed` | _(empty)_ |
| `ui_interaction` | `component_id`, `action` |

The backend currently validates **shape + allowlist + primitive types + max 48 keys**; stricter per-event required keys can be added in Zod as the product matures.

---

## Client callable: `logAnalyticsEvent`

**Request (authenticated):**

```json
{
  "event_name": "page_view",
  "properties": { "route": "/learn" },
  "client": { "platform": "web", "locale": "en-US" },
  "session_id": "optional-string",
  "dedupe_key": "optional-string"
}
```

**Validation failures** → `invalid-argument` (malformed / unknown client event / bad `properties`).

---

## Folder layout (reference)

```
functions/src/analytics/
  mortarAnalyticsContract.ts     # types + registry + collection names (canonical)

Digital Curriculum/src/app/analytics/
  client.ts                        # httpsCallable → logAnalyticsEvent
  session.ts                       # session id helper
  intents.ts                       # mortarWebAnalytics.* (no raw names)
  hooks/                           # screen-level hooks (thin, no UI markup)
  index.ts                         # public exports

functions/src/analytics/
  inboundAnalyticsPayload.ts       # Zod mirror of callable body
  writeRawAnalyticsEvent.ts        # Admin write to analytics_raw_events
  summary/rollupFromRawEvent.ts    # rollup hooks (stub-friendly)
  badges/badgeRulesEngine.ts       # badge materialization (stub-friendly)
  queries/dashboardAggregates.ts   # admin read helpers
  triggers/onAnalyticsRawEventCreated.ts
```

---

## Summary and badge layers

- **Summary**: `onAnalyticsRawEventCreated` increments `analytics_daily_summaries/day_YYYY_MM_DD` using dynamic `counts.<event_name>` fields. Extend `summary/rollupFromRawEvent.ts` for richer facets.
- **Phase 6 badges (analytics):** Staff-authored **`badge_definitions/{badgeId}`** may include a **`rule`** object: `{ metric_key, operator (gte|gt|lte|lt|eq), threshold, timeframe }` plus **`active`** (default true) and **`award_mode`**: `one_time` or `repeatable`. **`timeframe`** v1 supports only **`all_time`**, reading **`user_analytics_summary/{uid}.counts.{metric_key}`**. On each **`user_analytics_summary`** write, **`onUserAnalyticsSummaryWritten`** runs **`evaluateAnalyticsBadgesForUser`**, which updates **`user_badges/{uid}/awarded/{badgeId}`** (`times_awarded`, timestamps, idempotent monotonic increases), **`badge_progress/{uid}`** (`by_badge` snapshot for UI), and for **one-time** first awards **`users/{uid}.badges.earned`** (`arrayUnion`). Legacy **`criteria`** on definitions (posts/comments) remains handled by **`groupThreadTriggers`**, not this engine. **`analytics_user_badges`** is unchanged / reserved.

---

## Deploy checklist

1. `firebase deploy --only firestore:rules,firestore:indexes,functions`
2. Confirm `logAnalyticsEvent` and `onAnalyticsRawEventCreated` are deployed in the same project your Vite app targets.

## Automated tests (two layers)

### Unit layer (no emulators)

From `functions/`:

```bash
npm run test:analytics:unit
```

(`npm run verify:analytics` is the same command.)

This checks: contract file readable, TypeScript accepts a valid `LogAnalyticsEventRequest` and rejects an invalid `event_name`, and the compiled **Zod** schema (same as the callable) accepts a valid mock payload and rejects malformed cases (missing `client`, bad `event_name`, unknown event, strict-object extra fields, nested `properties`).

### Integration layer (emulator round-trip)

From the **repo root** (where `firebase.json` lives):

```bash
npm run test:analytics:integration
```

This runs `firebase emulators:exec` with **functions + auth + firestore**, then `functions/scripts/analytics-callable-integration.mjs`, which:

1. Creates a test user (if needed), exchanges a **custom token** for an **ID token** via the Auth emulator.
2. **POST**s to the real callable URL `http://127.0.0.1:5001/<project>/us-central1-logAnalyticsEvent` with `Authorization: Bearer <idToken>`.
3. Asserts a **valid** payload is accepted and the document exists in **`analytics_raw_events`**.
4. Asserts **malformed** payloads are rejected (missing `client`, unknown `event_name`, non-snake_case name).

Run both:

```bash
npm run test:analytics
```
