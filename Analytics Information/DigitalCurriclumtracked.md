# Digital Curriculum — tracked analytics events

Canonical **web** registry (snake_case wire names + TypeScript keys):  
`functions/src/analytics/webAnalyticsEventRegistry.ts` (re-exported from `functions/src/analytics/mortarAnalyticsContract.ts`). The Vite app resolves `@mortar/analytics-contract` to **`Digital Curriculum/src/mortar-analytics-contract/`** (kept in sync by `Digital Curriculum/scripts/sync-analytics-contract.mjs` during `npm run build` when the monorepo is present; standalone hosts like Railway use the committed mirror).

Secondary **raw** stream (`logAnalyticsEvent` → `analytics_raw_events`):  
`ANALYTICS_EVENTS` in the same contract file, with Zod in `functions/src/analytics/inboundAnalyticsPayload.ts`.

---

## 1. Web pipeline (`trackEvent` → `ingestWebAnalytics` → `analytics_events`)

Default metadata merged on the client (then normalized server-side): **`session_id`**, **`screen_session_id`** (when a screen session is active), **`route_path`**, **`screen_name`**, **`client_timestamp_ms`**, **`client`** (`platform`, `locale`). **`user_id`** is set only on the server from Firebase Auth when the user is signed in.

### 1.1 Screen sessions

| TS key | `event_name` (wire) | Notes |
|--------|---------------------|--------|
| `SCREEN_SESSION_STARTED` | `screen_session_started` | Emitted by `beginScreenSessionForAnalytics` / `useScreenAnalytics` |
| `SCREEN_SESSION_ENDED` | `screen_session_ended` | Emitted on screen unmount or when starting the next screen session |

### 1.2 Auth & invite (login / join)

| TS key | `event_name` (wire) | Wired in app |
|--------|---------------------|----------------|
| `LOGIN_SUBMIT_ATTEMPTED` | `login_submit_attempted` | `Login.tsx`, `Join.tsx` |
| `LOGIN_SIGN_IN_SUCCEEDED` | `login_sign_in_succeeded` | `Login.tsx` |
| `LOGIN_SIGN_IN_FAILED` | `login_sign_in_failed` | `Login.tsx`, `Join.tsx` (join errors reuse this name) |
| `LOGIN_SIGN_UP_SUCCEEDED` | `login_sign_up_succeeded` | `Login.tsx`, `Join.tsx` |
| `LOGIN_PASSWORD_RESET_SUBMITTED` | `login_password_reset_submitted` | `Login.tsx` |
| `LOGIN_PASSWORD_RESET_SUCCEEDED` | `login_password_reset_succeeded` | `Login.tsx` |

### 1.3 Onboarding

| TS key | `event_name` (wire) | Wired in app |
|--------|---------------------|----------------|
| `ONBOARDING_STEP_VIEWED` | `onboarding_step_viewed` | `Onboarding.tsx` |
| `ONBOARDING_PARTIAL_SAVE_SUCCEEDED` | `onboarding_partial_save_succeeded` | `Onboarding.tsx` |
| `ONBOARDING_SKIP_CLICKED` | `onboarding_skip_clicked` | `Onboarding.tsx` |
| `ONBOARDING_FINAL_SAVE_SUCCEEDED` | `onboarding_final_save_succeeded` | `Onboarding.tsx` |
| `ONBOARDING_COMPLETION_VIEWED` | `onboarding_completion_viewed` | `Onboarding.tsx` |

### 1.4 Navigation & gates

| TS key | `event_name` (wire) | Wired in app |
|--------|---------------------|----------------|
| `NAV_LINK_CLICKED` | `nav_link_clicked` | `WebNavigation.tsx` (main nav links) |
| `AUTH_GUARD_REDIRECT_UNAUTHENTICATED` | `auth_guard_redirect_unauthenticated` | `AuthGuard.tsx` |
| `ONBOARDING_GATE_REDIRECT_INCOMPLETE_PROFILE` | `onboarding_gate_redirect_incomplete_profile` | `OnboardingGate.tsx` |
| `ROLE_GATE_REDIRECT_DENIED` | `role_gate_redirect_denied` | `RoleGate.tsx` |

### 1.5 Learning funnel (dashboard → curriculum → course → lesson)

| TS key | `event_name` (wire) | Wired in app |
|--------|---------------------|----------------|
| `DASHBOARD_CONTINUE_LEARNING_CLICKED` | `dashboard_continue_learning_clicked` | `Dashboard.tsx` |
| `DASHBOARD_CONTINUE_URL_INVALID` | `dashboard_continue_url_invalid` | `Dashboard.tsx` (when a lesson URL was expected but not produced) |
| `CURRICULUM_COURSE_CARD_CLICKED` | `curriculum_course_card_clicked` | `WebCurriculum.tsx` (course card body) |
| `COURSE_DETAIL_START_LESSON_CLICKED` | `course_detail_start_lesson_clicked` | `CourseDetail.tsx` |
| `LESSON_PLAYER_MISSING_QUERY_PARAMS` | `lesson_player_missing_query_params` | `LessonPlayer.tsx` |
| `LESSON_PLAYER_LOAD_FAILED` | `lesson_player_load_failed` | `LessonPlayer.tsx` |
| `LESSON_PLAYER_EMPTY_CONTENT_VIEWED` | `lesson_player_empty_content_viewed` | `LessonPlayer.tsx` |
| `LESSON_SLIDE_NEXT_CLICKED` | `lesson_slide_next_clicked` | `LessonPlayer.tsx` |
| `LESSON_SLIDE_PREVIOUS_CLICKED` | `lesson_slide_previous_clicked` | `LessonPlayer.tsx` |
| `LESSON_CLOSE_CLICKED` | `lesson_close_clicked` | `LessonPlayer.tsx` |
| `LESSON_QUIZ_VIEW_OPENED` | `lesson_quiz_view_opened` | `LessonPlayer.tsx` |
| `LESSON_QUIZ_SUBMIT_CLICKED` | `lesson_quiz_submit_clicked` | `LessonPlayer.tsx` |
| `LESSON_QUIZ_PASSED` | `lesson_quiz_passed` | `LessonPlayer.tsx` |
| `LESSON_QUIZ_FAILED` | `lesson_quiz_failed` | `LessonPlayer.tsx` |
| `LESSON_QUIZ_TRY_AGAIN_CLICKED` | `lesson_quiz_try_again_clicked` | `LessonPlayer.tsx` |
| `LESSON_QUIZ_EXHAUSTED_VIEWED` | `lesson_quiz_exhausted_viewed` | `LessonPlayer.tsx` |
| `LESSON_SURVEY_SUBMIT_CLICKED` | `lesson_survey_submit_clicked` | `LessonPlayer.tsx` |
| `LESSON_COURSE_COMPLETED` | `lesson_course_completed` | `LessonPlayer.tsx` |
| `LESSON_CERTIFICATE_CREATED` | `lesson_certificate_created` | `LessonPlayer.tsx` |
| `DASHBOARD_PASSIVE_TIME_ON_SCREEN` | `dashboard_passive_time_on_screen` | `useDashboardPassiveEngagement.ts` (used by `Dashboard.tsx`) — tab-visible interval, not keystrokes |
| `CURRICULUM_CONTINUE_CLICKED` | `curriculum_continue_clicked` | `WebCurriculum.tsx` (hero **Continue**, distinct from course card navigation) |
| `COURSE_DETAIL_MODULE_EXPAND_TOGGLED` | `course_detail_module_expand_toggled` | `CourseDetail.tsx` (`module_id`, `expanded`) |
| `LESSON_QUIZ_ANSWER_SELECTED` | `lesson_quiz_answer_selected` | `LessonPlayer.tsx` (`question_index`, `option_id` A–D — no answer text) |
| `LESSON_SURVEY_FIELD_CHANGED` | `lesson_survey_field_changed` | `LessonPlayer.tsx` (debounced; counts only — `non_empty_field_count`, `total_fields`, `field_type`) |

### 1.5b Data Room (web)

| TS key | `event_name` (wire) | Wired in app |
|--------|---------------------|----------------|
| `DATA_ROOM_FILE_SEARCH_CHANGED` | `data_room_file_search_changed` | `DataRoom.tsx` (debounced; `query_length`, `has_query`, `has_matches` — no query text) |
| `DATA_ROOM_CERTIFICATE_PREVIEW_OPENED` | `data_room_certificate_preview_opened` | `DataRoom.tsx` |
| `DATA_ROOM_CERTIFICATE_DOWNLOAD_CLICKED` | `data_room_certificate_download_clicked` | `DataRoom.tsx` (opens uploaded skill-certificate PDF URL when available; falls back to legacy print view) |
| `DATA_ROOM_SURVEY_PDF_DOWNLOAD_CLICKED` | `data_room_survey_pdf_download_clicked` | `DataRoom.tsx` (per-row PDF download) |

### How the feature works (course skill certificates as PDFs)

Staff upload certificate PDFs in the **course creation flow** (`CourseCreationWizard.tsx`) per selected module skill (`skills[]`), and each selected skill now requires one PDF upload before the module step can proceed. The wizard uploads those files to Storage (`course_skill_certificates/...`) and saves each module’s `skillCertificates[]` metadata (`skill`, `pdfUrl`, `storagePath`) on the course document.

When a learner completes a course, `createSkillCertificatesForCompletedCourse` reads `modules[].skills` and `modules[].skillCertificates` and creates `users/{uid}/certificates` docs that include the skill, recipient name, and uploaded `certificatePdfUrl` when provided. In **Data Room**, download / LinkedIn actions are template-aware and self-healing: if a public PDF URL exists it opens/copies that link; if missing, the app generates a new PDF from `Certificate Template.pdf` (overlaying only learner name + skill onto the blank base design), uploads it to Storage, saves `certificatePdfUrl` back onto the certificate doc, and then opens/copies that public URL. **Add to LinkedIn** then shows: “To add a certificate to your LinkedIn profile, navigate to your profile page, click Add profile section, select Recommended, and then click Add licenses & certifications.”

### 1.6 Shop & cart

| TS key | `event_name` (wire) | Wired in app |
|--------|---------------------|----------------|
| `SHOP_FILTER_CHANGED` | `shop_filter_changed` | `Shop.tsx` |
| `SHOP_SIZE_CHANGED` | `shop_size_changed` | `Shop.tsx` |
| `SHOP_ADD_TO_CART_CLICKED` | `shop_add_to_cart_clicked` | `Shop.tsx` |
| `SHOP_ADD_TO_CART_FAILED` | `shop_add_to_cart_failed` | `Shop.tsx` |
| `CART_DROPDOWN_TOGGLED` | `cart_dropdown_toggled` | `WebNavigation.tsx` |
| `CART_LINE_REMOVE_CLICKED` | `cart_line_remove_clicked` | `WebNavigation.tsx` |
| `CART_CONTINUE_TO_SHOP_CLICKED` | `cart_continue_to_shop_clicked` | `WebNavigation.tsx` |

### 1.7 Community, discussions, groups, DMs

| TS key | `event_name` (wire) | Wired in app |
|--------|---------------------|----------------|
| `COMMUNITY_DISCUSSION_PREVIEW_CLICKED` | `community_discussion_preview_clicked` | `CommunityHub.tsx` |
| `COMMUNITY_START_DISCUSSION_CLICKED` | `community_start_discussion_clicked` | `CommunityHub.tsx`, `Discussions.tsx` |
| `DISCUSSION_CREATE_SUBMIT_CLICKED` | `discussion_create_submit_clicked` | `StartDiscussionDialog.tsx` |
| `DISCUSSION_CREATE_FAILED` | `discussion_create_failed` | `StartDiscussionDialog.tsx` |
| `DISCUSSION_REPLY_SUBMIT_CLICKED` | `discussion_reply_submit_clicked` | `DiscussionDetail.tsx` |
| `DISCUSSION_LIKE_TOGGLED` | `discussion_like_toggled` | `DiscussionDetail.tsx` |
| `MORTAR_DM_MESSAGE_SENT` | `mortar_dm_message_sent` | `MortarDMWidget.tsx` |
| `GROUP_MESSAGE_SEND_CLICKED` | `group_message_send_clicked` | `GroupDetail.tsx` |
| `GROUP_JOIN_CLICKED` | `group_join_clicked` | `GroupDetail.tsx` |
| `GROUP_JOIN_FAILED` | `group_join_failed` | `GroupDetail.tsx` |
| `DISCUSSIONS_SEARCH_CHANGED` | `discussions_search_changed` | `Discussions.tsx` (debounced; `query_length`, `has_query`, `has_results`) |
| `DISCUSSION_CATEGORY_SELECTED` | `discussion_category_selected` | `StartDiscussionDialog.tsx` |
| `DISCUSSION_DRAFT_NEXT_CLICKED` | `discussion_draft_next_clicked` | `StartDiscussionDialog.tsx` (**Next** from category step) |
| `MORTAR_DM_REPLY_THREAD_SELECTED` | `mortar_dm_reply_thread_selected` | `MortarDMWidget.tsx` (sidebar thread tap; skips duplicate selection) |
| `COMMUNITY_HERO_RSVP_CLICKED` | `community_hero_rsvp_clicked` | `CommunityHub.tsx` (hero **RSVP Now**) |
| `EVENT_REGISTER_CLICKED` | `event_register_clicked` | `EventDetail.tsx` |
| `EVENT_UNREGISTER_CLICKED` | `event_unregister_clicked` | `EventDetail.tsx` (after confirm) |

### 1.8 Approved but not auto-wired from `trackEvent` helpers

| TS key | `event_name` (wire) | Notes |
|--------|---------------------|--------|
| `EVENT_REGISTER_FAILED` | `event_register_failed` | In registry for manual / future use (no automatic emit on generic ingest failure) |

### 1.9 Anonymous callable allowlist (no Firebase Auth)

These may be sent **without** a signed-in user (see `ANONYMOUS_WEB_ANALYTICS_EVENT_NAMES` in the registry):

- `screen_session_started`
- `screen_session_ended`
- `login_submit_attempted`
- `login_sign_in_failed`
- `login_password_reset_submitted`
- `login_password_reset_succeeded`

---

## 2. Raw pipeline (`trackClientAnalyticsEvent` / `mortarWebAnalytics` → `logAnalyticsEvent` → `analytics_raw_events`)

| TS key | `event_name` (wire) | Client-ingestible | Wired in app (today) |
|--------|---------------------|-------------------|----------------------|
| `PAGE_VIEW` | `page_view` | Yes | Via `mortarWebAnalytics.recordPageView` (intent exists) |
| `NAVIGATION_TAB_SELECTED` | `navigation_tab_selected` | Yes | Intent only |
| `CURRICULUM_PAGE_VIEWED` | `curriculum_page_viewed` | Yes | Intent only |
| `LESSON_PLAYER_OPENED` | `lesson_player_opened` | Yes | Intent only |
| `ANALYTICS_DASHBOARD_VIEWED` | `analytics_dashboard_viewed` | Yes | `useRecordAnalyticsDashboardViewed` → `WebAnalytics` |
| `COMMUNITY_HUB_VIEWED` | `community_hub_viewed` | Yes | Intent only |
| `DISCUSSIONS_LIST_VIEWED` | `discussions_list_viewed` | Yes | Intent only |
| `DATA_ROOM_VIEWED` | `data_room_viewed` | Yes | Intent only |
| `UI_INTERACTION` | `ui_interaction` | Yes | Intent only |

Typed helpers live in `Digital Curriculum/src/app/analytics/intents.ts` (`mortarWebAnalytics`).

---

## 3. Screen session labels (`useScreenAnalytics`)

| Screen label | Where |
|--------------|--------|
| `login` | `LoginPage` |
| `join` | `JoinPage` |
| `onboarding` | `OnboardingPage` |
| `dashboard` | `WebDashboard` |
| `curriculum` | `WebCurriculum` |
| `course_detail` | `CourseDetail` |
| `lesson_player` | `LessonPlayer` |
| `community` | `WebCommunityHub` |
| `shop` | `WebShop` |
| `discussions` | `DiscussionsPage` |
| `discussion_detail` | `DiscussionDetailPage` |
| `group_detail` | `GroupDetailPage` |

---

*When you add or rename an event, update `webAnalyticsEventRegistry.ts`, `inboundWebAnalyticsPayload.ts` (if needed), this document, and `docs/MORTAR_ANALYTICS_SCHEMA.md`.*

---

## 4. Phase 4 — summary layer (Firestore, server-only)

| Collection | Document id | Updated by | Notes |
|------------|-------------|------------|--------|
| `user_analytics_summary` | `{userId}` | `onAnalyticsWebEventCreated` | `counts.*`, `last_active_at`, `streak_days`, `best_streak_days`, `last_activity_utc_date`, one-time `signup_counted_at` / `onboarding_completed_at` |
| `daily_metrics` | `{YYYY-MM-DD}` (UTC) | Same trigger + `scheduledPhase4DerivedMetrics` | `dau`, `counts.*`, `total_web_events`; `derived.*` after scheduler runs |
| `course_analytics_summary` | `{courseId}` | Same trigger | Requires `properties.course_id` on the web event |
| `community_analytics_summary` | `global` | Same trigger | Cross-user community funnel counters |

**Event → counter mapping (web `event_name`):** lessons started ≈ `course_detail_start_lesson_clicked` + `curriculum_continue_clicked` + **`dashboard_continue_learning_clicked`**; curriculum browse (cards) → `curriculum_course_card_clicks`; completed `lesson_course_completed`; quiz `lesson_quiz_passed` / `lesson_quiz_failed`; discussions `discussion_create_submit_clicked`; replies `discussion_reply_submit_clicked`; DMs `mortar_dm_message_sent`; groups `group_join_clicked`; events `event_register_clicked` / `event_unregister_clicked`; cart `shop_add_to_cart_clicked` / `cart_line_remove_clicked`; signups `login_sign_up_succeeded` (once per user); **`login_sign_in_succeeded` → `login_sign_ins` (each sign-in)**; onboarding `onboarding_final_save_succeeded` (once per user); community hub surface → **`community_hub_surface_interactions`** (`community_discussion_preview_clicked`, `community_start_discussion_clicked`, `community_hero_rsvp_clicked`). All other web events still refresh **last active** / **streak** / **`total_web_events`** when mapped counters are absent.

**Deploy:** deploy Cloud Functions so `onAnalyticsWebEventCreated` and `scheduledPhase4DerivedMetrics` are live. Firestore rules allow users to read their own `user_analytics_summary`; staff read on aggregates.

**Expansion mobile (same Phase 4 pattern, different stream):** `onExpansionAnalyticsEventCreated` rolls `expansion_analytics_events` into `user_analytics_summary`, `daily_metrics`, `funnel_summary`, `friction_summary`, `community_summary`, `matching_summary`, and `job_summary` (see `Analytics Information/Mobileappevents.md`). **Admin → Mobile analytics** (`MobileAnalyticsSummariesPanel.tsx`) shows full **daily** rollups (today/yesterday + optional UTC date range), per-funnel step counts, friction rows, **per-user summary lookup**, and a **JSON bundle download** for a chosen UTC range: range `daily_metrics`, cumulative funnel/friction snapshots, all raw events with `ingested_at` in the window (paginated, capped), and `user_analytics_summary` for distinct `user_id`s seen in those events (batched). Callables: `getAdminMobileAnalyticsDashboard`, `getAdminMobileAnalyticsRangeSummaries`, `getAdminUserAnalyticsSummary`, `batchGetUserAnalyticsSummaries`, `queryAdminExpansionAnalyticsEvents` (optional `ingested_after_ms` / `ingested_before_ms`). **UI:** large in-page JSON is **omitted from the DOM until expanded** (click-to-show) and the derived-metrics range block scrolls inside a **max-height** `overflow-auto` panel (no Radix scroll viewport here) so raw payloads do not paint over the metric cards.

**Phase 5 (Expansion + shared daily doc):** `derived_metrics/{YYYY-MM-DD}` is computed nightly from **`daily_metrics` only** (`writePhase5DerivedMetricsForDay`, chained after Phase 4 derived quiz pass rate on the same schedule). Holds conversion rates, funnel drop-offs for that UTC day, insight/action copy, and optional web blend fields. Admin mobile dashboard surfaces **derived_metrics_today** / **yesterday** and range export includes **derived_metrics_by_date**. Admins can backfill a UTC range via callable **`adminRunDerivedMetricsForUtcRange`** (also wired in **Admin → Mobile analytics**).

---

## 5. Phase 5 — derived metrics + funnels

- **Derived calculations (central):** `functions/src/analytics/queries/dashboardAggregates.ts`
  - onboarding completion rate
  - lesson completion rate
  - quiz pass rate
  - engagement rate
  - churn risk indicators (`dormant_users_7d`, `low_streak_users`, `churn_risk_ratio`)
- **Funnel sets (central):**
  - login → onboarding → dashboard
  - dashboard → curriculum → lesson
  - lesson → completion
  - community → engagement
  - shop → add to cart
- **Dashboard callable:** `getPhase5DashboardMetrics` (Admin/superAdmin; returns window totals + derived + funnels + **`daily_series`** per UTC day for trend charts). Optional **`include_debug: true`** returns a **`debug`** payload (`auth_path`, role sources, UTC window, full **`totals_counts`** map) for comparing against `daily_metrics` in production; the Admin Analytics panel requests it and shows JSON in a collapsible “Debug payload” block (temporary until dashboards are trusted).
- **Raw explorer callable:** `queryAdminWebAnalyticsEvents` (Admin/superAdmin; recent normalized rows from `analytics_events` for QA).
- **Date-range raw export callable:** `queryAdminAnalyticsEventsDateRange` (Admin/superAdmin; paginated `analytics_events` by inclusive UTC bounds on **`created_at`** then **`timestamp`**, max 92-day window per invocation, 500 rows per page). Wired from **Admin → Analytics → Raw Firestore export** in `AnalyticsDashboardPanel.tsx` (client loops both streams and downloads one JSON bundle).
- **Admin frontend section:** `Admin.tsx` tab `analytics` renders `components/admin/AnalyticsDashboardPanel.tsx`. Tab **`reports`** renders `components/admin/AdminGoalReportsPanel.tsx` (goal buckets: overview, conversion counters, learning, community, shop, friction, users/segments headline, admin activity, raw event table).

### 5.1 Phase 5 notification events

| TS key | `event_name` (wire) | Wired in app |
|--------|---------------------|----------------|
| `ONBOARDING_NUDGE_SENT` | `onboarding_nudge_sent` | `scheduledNudgeIncompleteProfiles.ts` (backend write to `analytics_events`) |
| `NOTIFICATION_ITEM_CLICKED` | `notification_item_clicked` | `WebNavigation.tsx` notification dropdown item click (certificate → Data Room; **`badge_earned`** → marks read and opens badge suite) |
| `NOTIFICATION_MARK_READ_BACKEND` | `notification_mark_read_backend` | `markNotificationReadBackend` callable (`dataroom.ts` client invokes callable) |

---

## 6. Phase 6 — badge system (analytics) + admin builder metrics

### 6.1 Collections (server-writes only)

| Collection | Path | Purpose |
|------------|------|--------|
| `badge_definitions` | `{badgeId}` | Staff-defined badge metadata + optional **`rule`** (metric / operator / threshold / **`timeframe: all_time`** only in v1) + **`active`**, **`award_mode`** (`one_time` \| `repeatable`), optional **`image_url`**. Legacy Expansion **`criteria`** (posts/comments) unchanged. |
| `badge_bank` | `{assetId}` | Reusable badge images: **`image_url`**, **`storage_path`**, optional **`label`**, **`created_by_uid`**. Populated from **Admin → Badges → Badge bank** uploads (`badge_bank/` in Storage). |
| `user_badges` | `{userId}/awarded/{badgeId}` | Materialized awards: **`times_awarded`**, first/last awarded timestamps, **`rule_snapshot`**. Idempotent: counts only increase. |
| `badge_progress` | `{userId}` | Last evaluation snapshot: **`by_badge`**: metric value + `times_awarded` per badge for dashboards. |

**Admin UI:** `Admin.tsx` tab **Badges** loads `components/admin/AdminBadgesPanel.tsx` — badge bank uploads, pick-from-bank or URL or one-off image for a definition, title/description/tier/order, and Phase 6 **rule** fields. **Where this badge applies** toggles **Digital Curriculum**, **Expansion app**, or **Both**, which drives the **metric_key** presets (curriculum vs Expansion mobile rollups in `user_analytics_summary.counts`, including **`total_group_thread_messages_sent`**, **`total_matching_runs_started`**, **`total_matching_runs_succeeded`**, plus existing totals like **`total_posts_created`**). **Mortar Next.js** staff use **Admin → Badges** (`web/src/components/admin/AdminBadgesPanel.tsx`) for the same Firestore collection. New badges use a Firestore doc id **derived from the title** (lowercase, spaces → underscores; punctuation stripped). Editing does not rename the doc id.

**Trigger:** `onUserAnalyticsSummaryWritten` → `evaluateAnalyticsBadgesForUser` (`functions/src/analytics/badges/analyticsBadgeEvaluator.ts`).

**Emulator test:** From repo root, `npm run test:analytics:phase6` (runs `firebase emulators:exec` and `functions/scripts/phase6-badge-emulator-check.mjs`). The script seeds two `badge_definitions` (`emulator_phase6_one_lesson` one-time, `emulator_phase6_every_two_lessons` repeatable), ingests `lesson_course_completed` via `ingestWebAnalytics`, then asserts `user_badges/{uid}/awarded/*`, `badge_progress/{uid}`, and `users.badges.earned` for the one-time badge.

### How the feature works (learner badge suite)

Signed-in learners open **Badges** from the header: click the **email** line under their display name in `WebNavigation.tsx`. That opens `UserBadgeSuiteDialog` with three tabs — **Earned**, **In progress**, and **Available** — backed by live reads of `badge_definitions`, `badge_progress/{uid}.by_badge`, `user_badges/{uid}/awarded/*`, and legacy `users/{uid}.badges.earned` when needed.

**Badge earned notifications:** When `evaluateAnalyticsBadgesForUser` increases `times_awarded` for a Phase 6 rule badge, it writes `users/{uid}/notifications` with **`type: "badge_earned"`**, **`badgeId`**, title/body from the badge **`name`**, and `badgeAwardDelta` when multiple repeatable tiers unlock in one summary pass. The header bell uses a Firestore **`onSnapshot`** on that subcollection so new items appear without refresh; tapping a badge notification marks it read and opens the badge suite dialog.

### 6.2 Admin / builder web events (derived; staff)

| TS key | `event_name` (wire) | Wired in app |
|--------|---------------------|----------------|
| `ADMIN_COURSE_BUILDER_SAVE_CLICKED` | `admin_course_builder_save_clicked` | `CourseBuilder.tsx` after successful save (create or update) |
| `ADMIN_LESSON_DECK_PUBLISH_CLICKED` | `admin_lesson_deck_publish_clicked` | `CourseBuilder.tsx` after successful publish |
| `ADMIN_EVENT_CREATE_SUBMITTED` | `admin_event_create_submitted` | `Admin.tsx` after staff `createEvent` |
| `ADMIN_SHOP_ITEM_CREATED` | `admin_shop_item_created` | `Admin.tsx` after `createShopItem` |

These increment **`user_analytics_summary`** and **`daily_metrics`** Phase 4 counters with the same snake_case keys as the wire event names (scaling / admin activity, not learner core funnel).
