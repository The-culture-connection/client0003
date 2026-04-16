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
| `DATA_ROOM_CERTIFICATE_DOWNLOAD_CLICKED` | `data_room_certificate_download_clicked` | `DataRoom.tsx` (print/download flow) |
| `DATA_ROOM_SURVEY_PDF_DOWNLOAD_CLICKED` | `data_room_survey_pdf_download_clicked` | `DataRoom.tsx` (per-row PDF download) |

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
