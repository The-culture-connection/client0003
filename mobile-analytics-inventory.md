# Expansion Network (Flutter) — Mobile Analytics Inventory

**Scope:** `ExpansionNetworkApp/expansion_network/` — the **Expansion Network** Flutter app (`expansion_network` package).  
**Generated from:** static codebase audit (routes, screens, repositories, services). No runtime instrumentation was added.

---

## 1. Executive Summary

### Major surfaces for analytics

| Area | Maturity | Data layer |
|------|----------|------------|
| **Auth + invite claim** | Production-ready | Firebase Auth + Cloud Functions (`validateInviteCode`, `claimInviteAndCreateAccount`, `finalizeInviteClaim`) via `ExpansionSessionService` |
| **Session gate** | Production-ready | `initializeUserSession` after every auth change (`AuthController`) |
| **Onboarding (7 steps)** | Production-ready | `UserProfileRepository.saveExpansionProfile` → Firestore `users/{uid}` |
| **Feed (All / Events / Posts)** | Production-ready | Firestore `feed_posts`, `events` via `FeedPostsRepository`, `EventsRepository` |
| **Post thread** | Production-ready | Likes, nested replies, reply likes (Firestore transactions) |
| **Create post** | Production-ready | `FeedPostsRepository.createPost` |
| **Events list + detail + RSVP** | Production-ready | `EventsRepository.register` / `unregister` |
| **Profile tab + edit** | Production-ready | Firestore `users/{uid}` stream + `updateProfile` / full save |
| **Profile modal (other users)** | Production-ready | Stream + **Message** → `/messages/direct/:userId` |
| **Home, Groups, Explore, Matching, Messages, Chat, Direct chat, Event create, Admin events** | Mostly **UI shell / mock** | Local state or `mock_data.dart`; little or no Firestore writes |

### Likely funnel stages

1. **Acquisition / access:** Landing → Claim or Sign in → eligibility + session init.  
2. **Activation:** Onboarding completion → first arrival on `/home`.  
3. **Engagement:** Feed consumption → post detail → like/reply; events → RSVP; profile views → message CTA.  
4. **Habit:** Return sessions, tab usage, repeat posts/RSVPs (once features are real).  

### High-value product questions

- Where do invite claimers drop off (validate vs password vs `ALREADY_EXISTS` path)?  
- What share of sign-ins fail `initializeUserSession` (network, bridge, UNAUTHORIZED)?  
- Time-to-complete and step-level drop-off for 7-step onboarding.  
- Feed: error rate vs empty vs healthy; posts opened vs created; reply depth.  
- Events: registration conversion from list vs detail; unregister rate; “full” events.  
- How much of **Home / Explore / Matching / Groups / Messages** is used vs **Feed + Events + Profile** (surfaces mock vs real today).

---

## 2. Existing Analytics Audit

### Findings

| Item | Location | Notes |
|------|----------|--------|
| **Firebase Analytics** | Not present | `pubspec.yaml` has no `firebase_analytics`; no `FirebaseAnalytics` / `logEvent` in Dart sources. |
| **Custom telemetry wrappers** | None | No shared `AnalyticsService`, `Telemetry`, or `logScreen` helpers. |
| **Logging** | `debugPrint` only | e.g. `AuthController` on `initializeUserSession` failure; `main.dart` on Firebase init failures. |
| **“Analytics” string** | `lib/data/curriculum_onboarding_data.dart` | Skill label *“Data analytics and performance tracking”* — not product analytics. |

### Consistency

- **Fragmentation:** N/A — there is **no** client analytics layer.  
- **Gap:** All funnels and errors are invisible in product analytics until you add a SDK + thin wrapper (recommended: one `Analytics` facade + route observer for `screen_view`).

### Backend-side opportunities (out of scope for client-only audit, but note)

- Server logs for `initializeUserSession`, `claimInviteAndCreateAccount`, etc., can complement client events (especially for fraud and eligibility denials). Do **not** duplicate the same event name on client and server without a clear split (e.g. `server_session_unauthorized` vs `client_session_denied_dialog`).

---

## 3. Screen Inventory

Routes are defined in `lib/router/app_router.dart`. Shell tabs use `StatefulShellRoute` + `ExpansionShell`.

| Route / surface | Primary file(s) | Purpose | Suggested `screen_view` name | Important parameters |
|-----------------|-----------------|--------|------------------------------|----------------------|
| `/` | `lib/screens/landing_screen.dart` | Unauthenticated entry; Claim / Sign in | `screen_landing` | `logged_in` (bool) if ever shown while restoring session |
| `/auth/sign-in` | `lib/screens/auth_sign_in_screen.dart` | Email/password sign-in | `screen_auth_sign_in` | — |
| `/auth/claim` | `lib/screens/auth_claim_screen.dart` | Invite claim multi-step | `screen_auth_claim` | `claim_step` (`email_code` \| `password_new` \| `password_existing`) |
| `/onboarding` | `lib/screens/onboarding_screen.dart` | 7-step profile setup | `screen_onboarding` | `onboarding_step_index` (0–6), `onboarding_step_name` |
| `/home` (shell) | `lib/screens/home_screen.dart` | Dashboard (mock content) | `screen_home` | — |
| `/feed` (shell) | `lib/screens/feed_screen.dart` | Community feed | `screen_feed` | `feed_tab` (`all` \| `events` \| `posts`) |
| `/groups` (shell) | `lib/screens/groups_screen.dart` | Groups list (static) | `screen_groups` | — |
| `/explore` (shell) | `lib/screens/explore_screen.dart` | Opportunities (static) | `screen_explore` | — |
| `/profile` (shell) | `lib/screens/profile_screen.dart` | Own profile | `screen_profile` | `has_profile_doc` |
| `/matching` | `lib/screens/matching_screen.dart` | Smart matching (simulated) | `screen_matching` | — |
| `/messages` | `lib/screens/messages_screen.dart` | Inbox (mock) | `screen_messages` | — |
| `/messages/:id` | `lib/screens/chat_room_screen.dart` | Thread (mock) | `screen_chat_room` | `conversation_id` (mock id) |
| `/messages/direct/:userId` | `lib/screens/direct_chat_screen.dart` | DM (mock / stub users) | `screen_direct_chat` | `peer_user_id` |
| `/groups/:groupId` | `lib/screens/group_detail_screen.dart` | Group detail (mock) | `screen_group_detail` | `group_id` |
| `/events` | `lib/screens/events_screen.dart` | Events list (Firestore) | `screen_events_list` | — |
| `/events/create` | `lib/screens/event_create_screen.dart` | Create event form (stub submit) | `screen_event_create` | — |
| `/events/:eventId` | `lib/screens/event_detail_screen.dart` | Event detail + RSVP | `screen_event_detail` | `event_id` |
| `/feed/post/create` | `lib/screens/create_post_screen.dart` | New post | `screen_post_create` | — |
| `/feed/post/:postId` | `lib/screens/post_detail_screen.dart` | Post + replies | `screen_post_detail` | `post_id`, `entry_source` if known |
| `/profile/edit` | `lib/screens/profile_edit_screen.dart` | Edit profile | `screen_profile_edit` | `section` from query (`?section=`) |
| `/admin/events` | `lib/screens/admin_events_screen.dart` | Approve/reject (mock) | `screen_admin_events` | — |
| **Modal:** profile sheet | `lib/widgets/user_profile_modal.dart` | View another user | `screen_profile_modal` (or `sheet_profile_user`) | `profile_user_id`, `is_own_profile` |
| **Recovery UI** | `lib/main.dart` (`_FirebaseBridgeLostApp`) | Firebase native bridge lost | `screen_firebase_bridge_lost` | `platform` |

**Navigation note:** `pushFeedPostDetail` (`lib/router/feed_post_navigation.dart`) appends a `_` query param so the same `postId` can open again — analytics should **dedupe** `screen_post_detail` by `post_id` + short debounce if you also log every push.

---

## 4. Event Inventory by Feature Area

Convention preview: `{object}_{action}` or `screen_{name}`; parameters snake_case. Full convention in §8.

### Authentication & session

| event_name | Trigger | Likely implementation hook | Recommended parameters | Why it matters |
|------------|---------|----------------------------|------------------------|----------------|
| `tap_auth_claim_entry` | Landing “Claim with invite” | `landing_screen.dart` | `source`=`landing` | Top of invite funnel |
| `tap_auth_sign_in_entry` | Landing “Sign in” | `landing_screen.dart` | `source`=`landing` | Returning user path |
| `submit_sign_in` | Sign-in button | `auth_sign_in_screen.dart` | `success`, `error_code` (FirebaseAuthException.code) | Login health |
| `invite_validate` | Claim step 1 Continue after callable | `auth_claim_screen.dart` | `success`, `server_code` (NOT_ELIGIBLE, USED, …), `auth_account_exists` | Claim funnel diagnostics |
| `invite_claim_create_account` | Create account on new user path | `auth_claim_screen.dart` | `success`, `server_code` | Conversion to Auth user |
| `invite_finalize_existing` | Sign in & finish (existing account) | `auth_claim_screen.dart` | `success`, `server_code` | Second path completion |
| `tap_claim_edit_email_code` | “Edit email or code” | `auth_claim_screen.dart` | — | Step-back behavior |
| `tap_claim_go_sign_in` | Link to sign-in from claim | `auth_claim_screen.dart` | — | Cross-navigation |
| `session_init_result` | After `initializeUserSession` in `AuthController` | `auth_controller.dart` | `state` (READY_FOR_HOME, REQUIRES_ONBOARDING, UNAUTHORIZED), `reason` if any, `role` if returned | **Core gate**; ties to churn |
| `session_init_error` | Exception in `_applySessionForUser` | `auth_controller.dart` | `error_class`, `is_native_bridge_lost` (use `firebaseNativeBridgeLostUserMessage`) | Dev vs prod failures |
| `access_denied_dialog_shown` | `takeAccessDeniedMessage` on landing | `landing_screen.dart` | `message_key` or hashed reason | User-visible denials |
| `sign_out_from_onboarding` | Onboarding app bar | `onboarding_screen.dart` | — | Abandonment |
| `sign_out_from_profile` | Profile “Sign out” | `profile_screen.dart` | — | Intentional exits |

### Onboarding

| event_name | Trigger | Likely hook | Parameters | Notes |
|------------|---------|-------------|------------|-------|
| `onboarding_step_view` | Page becomes visible / step changes | `onboarding_screen.dart` | `step_index`, `step_name` | Funnel steps 1–7 |
| `onboarding_next` | Next validated | `onboarding_screen.dart` | `from_step`, `to_step` | Forward progression |
| `onboarding_back` | Previous | `onboarding_screen.dart` | `from_step`, `to_step` | Back tracking |
| `onboarding_goal_toggle` | Goal selected/deselected | `_toggleGoal` | `goal_id` (hash or index), `selected` | Optional; high cardinality if raw strings |
| `onboarding_skill_toggle` | Confident/desired skill | `_toggleConfidentSkill` / `_toggleDesiredSkill` | `bucket` (`confident`\|`desired`), `selected` | Optional Tier 3 |
| `onboarding_cohort_mode_change` | Cohort radio | Radio `onChanged` | `not_in_cohort` | |
| `onboarding_complete` | Successful `saveExpansionProfile` + navigate home | `onboarding_screen.dart` | `goals_count`, `confident_skills_count`, `desired_skills_count`, `has_cohort_id` | **Activation** |
| `onboarding_save_error` | Catch in `_save` | `onboarding_screen.dart` | `error_message` (truncated) | |

### Shell & global navigation

| event_name | Trigger | Likely hook | Parameters |
|------------|---------|-------------|------------|
| `tab_select` | Bottom nav branch change | `expansion_shell.dart` via `navigationShell.goBranch` | `tab_index`, `tab_name` (`home`,`feed`,`groups`,`explore`,`profile`) |

### Home (mock UI)

| event_name | Trigger | File | Parameters |
|------------|---------|------|------------|
| `tap_home_smart_matching` | Welcome card CTA | `home_screen.dart` | — |
| `tap_home_groups_see_all` | Groups card | `home_screen.dart` | — |
| `tap_home_group_preview` | Mini group row | `home_screen.dart` | `mock_group_id` |
| `tap_home_events_see_all` | Events card → currently `go('/feed')` | `home_screen.dart` | `destination`=`/feed` |
| `tap_home_recent_activity` | View all → feed | `home_screen.dart` | — |
| `tap_home_top_matches` | View all → explore | `home_screen.dart` | — |

### Feed

| event_name | Trigger | File | Parameters |
|------------|---------|------|------------|
| `feed_tab_change` | All / Events / Posts chips | `feed_screen.dart` | `tab` |
| `feed_fab_open` | FAB pressed | `feed_screen.dart` | `tab` |
| `feed_create_sheet_post` | Bottom sheet New post | `feed_screen.dart` | — |
| `feed_create_sheet_event` | Bottom sheet New event | `feed_screen.dart` | — |
| `feed_stream_error` | StreamBuilder error | `feed_screen.dart` | `stream` (`events`\|`posts`), `error_type` |
| `feed_empty_state` | No posts/events in sub-tab | `feed_screen.dart` | `tab` |
| `feed_open_event` | Navigate to event detail | `feed_screen.dart` | `event_id` |
| `feed_open_post` | Open post detail | `feed_screen.dart` | `post_id`, `surface` (`list`\|`all_grid`) |
| `feed_open_author_profile` | Avatar/name → modal | `feed_screen.dart` | `author_id` |
| `feed_see_all_events_column` | Arrow in All tab | `feed_screen.dart` | — |
| `feed_see_all_posts_column` | Arrow in All tab | `feed_screen.dart` | — |

### Posts / comments / replies

| event_name | Trigger | File | Parameters |
|------------|---------|------|------------|
| `post_detail_load` | After `getPost` | `post_detail_screen.dart` | `post_id`, `success`, `not_found` |
| `post_detail_load_error` | Catch in `_load` | `post_detail_screen.dart` | `post_id`, `error` |
| `post_like_toggle` | `togglePostLike` | `post_detail_screen.dart` / repo | `post_id`, `liked_after` | Fire after transaction |
| `post_reply_submit` | Successful `addReply` | `post_detail_screen.dart` | `post_id`, `has_parent`, `body_length_bucket` | Avoid logging raw body |
| `post_reply_submit_error` | Catch in `_sendReply` | `post_detail_screen.dart` | `post_id` |
| `post_reply_target_set` | Reply to comment | `_setReplyTarget` | `post_id`, `parent_reply_id` |
| `post_reply_like_toggle` | `toggleReplyLike` | `_ReplyTile` | `post_id`, `reply_id`, `liked_after` |

### Post creation

| event_name | Trigger | File | Parameters |
|------------|---------|------|------------|
| `post_create_category_change` | Dropdown | `create_post_screen.dart` | `category` (enum index or slug) |
| `post_publish` | Successful `createPost` | `create_post_screen.dart` | `post_id`, `category`, `title_length_bucket` |
| `post_publish_error` | Catch | `create_post_screen.dart` | `error` |

### Events

| event_name | Trigger | File | Parameters |
|------------|---------|------|------------|
| `events_list_fab_create` | FAB | `events_screen.dart` | — |
| `events_list_stream_error` | StreamBuilder | `events_screen.dart` | — |
| `events_list_empty` | No events | `events_screen.dart` | — |
| `events_list_open_detail` | Tile tap | `events_screen.dart` | `event_id` |
| `event_detail_load` | After `getEvent` | `event_detail_screen.dart` | `event_id`, `success` |
| `event_rsvp_toggle` | Register/unregister success | `event_detail_screen.dart` | `event_id`, `action` (`register`\|`unregister`), `registered_count_after` (optional) |
| `event_rsvp_error` | SnackBar path | `event_detail_screen.dart` | `event_id`, `error` |
| `event_detail_image_error` | CachedNetworkImage errorWidget | `event_detail_screen.dart` | `event_id` |
| `event_create_submit` | Form valid → navigate | `event_create_screen.dart` | **Tentative** — currently no backend; log as `event_create_submit_stub` |

### Groups / community (mostly mock)

| event_name | Trigger | File | Parameters |
|------------|---------|------|------------|
| `groups_search_focus` / `groups_search_submit` | Search field | `groups_screen.dart` | **Tentative** — no `onSubmitted` today; log when you wire search |
| `groups_open_detail` | List tap | `groups_screen.dart` | `group_id` |
| `groups_join_tap` | Join button | `groups_screen.dart` | `group_id` | **Currently `onPressed: () {}`** — event is forward-looking |
| `group_detail_join_toggle` | Join state | `group_detail_screen.dart` | `group_id`, `joined` | Local state only |
| `group_detail_notifications_tap` | Bell button | `group_detail_screen.dart` | **No-op today** |

### Explore / matching / connections (mostly mock)

| event_name | Trigger | File | Parameters |
|------------|---------|------|------------|
| `explore_notifications_tap` | Header → `/messages` | `explore_screen.dart` | — |
| `explore_run_matching` | CTA → `/matching` | `explore_screen.dart` | — |
| `explore_filter_chip_impression` | **N/A** | `explore_screen.dart` | `_FilterChip` has **no `onTap`** — not interactive; document as **UI debt** |
| `explore_opportunity_message` | Chat on connection card | `explore_screen.dart` | `opportunity_id`, `peer_user_id` |
| `explore_opportunity_primary_cta` | Apply/Connect (no-op) | `explore_screen.dart` | `opportunity_type` (`job`\|`connection`) |
| `matching_run_start` | Start delay | `matching_screen.dart` | — |
| `matching_run_complete` | After 3s fake wait | `matching_screen.dart` | `mock_jobs`, `mock_connections`, `mock_score` |
| `matching_view_results_explore` | CTA | `matching_screen.dart` | — |

### Messages / chat (mock)

| event_name | Trigger | File | Parameters |
|------------|---------|------|------------|
| `messages_open_thread` | List tap | `messages_screen.dart` | `thread_id` |
| `messages_search_changed` | **Tentative** | `messages_screen.dart` | Wire `onChanged` when implemented |
| `chat_send_message` | `_send` | `chat_room_screen.dart` | `thread_id`, `message_length_bucket` |
| `chat_schedule_open` | Calendar app bar | `chat_room_screen.dart` | `thread_id` |
| `chat_schedule_submit` | Sheet “Schedule” | `chat_room_screen.dart` | Stub |
| `chat_attach_tap` | Attach icon | `chat_room_screen.dart` | **No-op** |
| `direct_chat_action` | Phone/video/calendar/more | `direct_chat_screen.dart` | `action_id` | **No-ops today** |

### Profile & user profile modal

| event_name | Trigger | File | Parameters |
|------------|---------|------|------------|
| `profile_stream_error` | StreamBuilder error | `profile_screen.dart` | — |
| `profile_missing_doc_cta` | “Complete onboarding” | `profile_screen.dart` | — |
| `profile_tap_edit_all` | Edit icon | `profile_screen.dart` | — |
| `profile_tap_edit_section` | Section edit | `profile_section_card` callback | `section` |
| `profile_modal_open` | `showUserProfileModal` | `user_profile_modal.dart` | `profile_user_id` |
| `profile_modal_message` | Message button | `user_profile_modal.dart` | `profile_user_id` |
| `profile_modal_close` | Close | `user_profile_modal.dart` | — |
| `profile_modal_error` / `profile_modal_empty` | Stream errors / missing doc | `user_profile_modal.dart` | — |

### Profile edit

| event_name | Trigger | File | Parameters |
|------------|---------|------|------------|
| `profile_edit_load_error` | `_load` catch | `profile_edit_screen.dart` | — |
| `profile_edit_save` | Successful `_save` | `profile_edit_screen.dart` | `sections_changed_count` (if trackable) |
| `profile_edit_save_error` | Failed save | `profile_edit_screen.dart` | — |
| `profile_edit_section_nav` | Deep link `?section=` | `profile_edit_screen.dart` | `section` |

### Admin / moderation (mock)

| event_name | Trigger | File | Parameters |
|------------|---------|------|------------|
| `admin_event_approve` | `_approve` | `admin_events_screen.dart` | `event_id` |
| `admin_event_reject` | `_reject` | `admin_events_screen.dart` | `event_id` |

### App lifecycle / infrastructure

| event_name | Trigger | File | Parameters |
|------------|---------|------|------------|
| `app_firebase_init_failure` | `_initFirebase` false / exception | `main.dart` | `failure_type` |
| `screen_firebase_bridge_lost` | `_FirebaseBridgeLostApp` | `main.dart` | — |

### Notifications, deep links, share

| Topic | Status in codebase |
|-------|---------------------|
| **Push (FCM)** | No `firebase_messaging` dependency or handlers found. |
| **Deep links / universal links** | No `app_links` / `uni_links` usage in `lib/`. |
| **Share** | No `share_plus` / share intent usage found. |

**Recommended forward-looking events (when implemented):** `push_notification_received`, `push_notification_open`, `deeplink_open`, `share_open`, `share_complete`.

### Badges / gamification

- **Display only:** `badges.visible` on `users/{uid}` rendered as chips in `profile_utils.dart` (`profileRoleAndBadgeChips`).  
- **No unlock flows** in Flutter repo (no Cloud Function or client writes to badges found in this app).

**Events (tentative / server-led):** `badge_unlock` (server), `view_badge_list` (client when you add a badges screen).

---

## 5. Funnel / Conversion Events

### Funnel: Invite → first session

| Stage | Suggested events |
|-------|------------------|
| Start | `tap_auth_claim_entry` |
| Milestones | `invite_validate` (success), branch `auth_account_exists` true/false, `invite_claim_create_account` or `invite_finalize_existing` |
| Completion | `session_init_result` with `state` != UNAUTHORIZED |
| Drop-off | Failed validate; `ALREADY_EXISTS` recovery; `session_init_result` UNAUTHORIZED; `session_init_error` |

### Funnel: Email sign-in → home

| Stage | Events |
|-------|--------|
| Start | `tap_auth_sign_in_entry` |
| Submit | `submit_sign_in` |
| Gate | `session_init_result` |
| Complete | `screen_onboarding` skipped OR completed → `screen_home` |

### Funnel: Onboarding completion

| Stage | Events |
|-------|--------|
| Start | `screen_onboarding` step 0 |
| Milestones | `onboarding_step_view` / `onboarding_next` per step |
| Complete | `onboarding_complete` |
| Drop-off | `sign_out_from_onboarding`, `onboarding_save_error`, stuck on step (infer from last `onboarding_step_view`) |

### Funnel: First post

| Stage | Events |
|-------|--------|
| Open composer | `feed_fab_open` + `screen_post_create` |
| Publish | `post_publish` |
| Consume | `feed_open_post` → `screen_post_detail` |

### Funnel: RSVP

| Stage | Events |
|-------|--------|
| Discovery | `feed_open_event` / `events_list_open_detail` |
| Detail | `screen_event_detail` |
| Convert | `event_rsvp_toggle` action=register |
| Drop-off | `event_rsvp_error`, disabled “Event full” |

### Funnel: Profile → message

| Stage | Events |
|-------|--------|
| Open modal | `profile_modal_open` |
| Intent | `profile_modal_message` |
| Chat | `screen_direct_chat` (stub today) |

### Funnel: Matching (prototype)

| Stage | Events |
|-------|--------|
| Entry | `tap_home_smart_matching` / `explore_run_matching` |
| Run | `matching_run_complete` |
| Follow-through | `matching_view_results_explore` |

### Funnel: Group join (forward-looking)

- UI exists but **Join** on list is empty callback; **group_detail_join_toggle** only flips local state. Treat as **tentative** until backed by Firestore.

---

## 6. Retention / Engagement Events

| Signal | Implementation idea |
|--------|---------------------|
| **Session start** | Log once per cold start + optionally per resume after N minutes (add `WidgetsBindingObserver` in root or router). |
| **DAU proxy** | `session_init_result` success (server already sees auth; client event for product tools). |
| **Tab stickiness** | `tab_select` counts per session. |
| **Repeat feed engagement** | `feed_open_post`, `post_like_toggle`, `post_reply_submit` counts per day. |
| **Repeat RSVP** | `event_rsvp_toggle` aggregated. |
| **Return after churn risk** | Combine `access_denied_dialog_shown` with later `submit_sign_in` success (user_id in analytics). |
| **Profile updates** | `profile_edit_save` frequency. |

**Streaks:** No streak logic in app — skip unless product adds it.

---

## 7. Error / Failure Events

| error_event_name | Trigger | Likely file(s) | Parameters | Severity |
|------------------|---------|----------------|------------|----------|
| `error_feed_load` | Stream errors on feed | `feed_screen.dart` | `error_message` truncated | High (core feature) |
| `error_events_load` | Events list stream | `events_screen.dart` | | High |
| `error_post_load` | `getPost` failure | `post_detail_screen.dart` | `post_id` | Medium |
| `error_post_publish` | createPost catch | `create_post_screen.dart` | | Medium |
| `error_post_like` | toggle like catch | `post_detail_screen.dart` | `post_id` | Low |
| `error_reply_send` | addReply catch | `post_detail_screen.dart` | `post_id` | Medium |
| `error_reply_like` | toggleReplyLike catch | `post_detail_screen.dart` | | Low |
| `error_event_rsvp` | register/unregister | `event_detail_screen.dart` | `event_id` | Medium |
| `error_profile_load` | Profile stream | `profile_screen.dart` | | Medium |
| `error_profile_edit_load` | getUserDoc | `profile_edit_screen.dart` | | Medium |
| `error_profile_edit_save` | update failure | `profile_edit_screen.dart` | | Medium |
| `error_profile_modal` | watchUserDoc error | `user_profile_modal.dart` | | Low |
| `error_onboarding_save` | Firestore write | `onboarding_screen.dart` | | High |
| `error_sign_in` | FirebaseAuthException | `auth_sign_in_screen.dart` | `error_code` | High |
| `error_invite_validate` | Callable / network | `auth_claim_screen.dart` | map to user-facing bucket | High |
| `error_invite_claim` | Callable | `auth_claim_screen.dart` | | High |
| `error_session_init` | `initializeUserSession` | `auth_controller.dart` | | **Critical** |
| `error_firebase_init` | `main.dart` | `main.dart` | | Critical |
| `error_event_image_load` | CachedNetworkImage | `feed_screen.dart`, `event_detail_screen.dart` | `event_id` | Low |

**Empty states (not always errors):** `feed_empty_state`, `events_list_empty`, `post_detail` not found — use `content_status`=`empty` vs `error`.

---

## 8. Recommended Canonical Naming System

Use **lowercase_snake_case**, **≤ 40 characters** per Firebase Analytics naming limits, **one verb**, consistent prefixes:

| Prefix | Use for |
|--------|---------|
| `screen_` | Screen views (or use GA4 recommended `screen_view` with `screen_name` param only — pick one style and stick to it). |
| `tap_` | User tapped a control (no backend yet). |
| `submit_` | Form / primary action submitted (before outcome). |
| `complete_` | Successful end state (`complete_onboarding`, `complete_post_publish`). |
| `open_` | Navigate into a surface (`open_post`, `open_event`). |
| `toggle_` | Boolean flips (like, RSVP). |
| `error_` | Failures |
| `view_` | Impression-style (use sparingly; prefer screen_view + params). |

**Examples applied:** `screen_feed`, `toggle_post_like`, `complete_onboarding`, `error_session_init`, `open_post_detail`.

**Duplicate firing guard:** For `toggle_post_like`, log **after** transaction success with `liked_after` — not on tap before await.

---

## 9. Recommended Event Parameters

| Parameter | Type | Use |
|-----------|------|-----|
| `screen_name` | string | Redundant if event is screen-specific; required if using generic `screen_view`. |
| `user_id` | string | **Prefer** analytics-internal ID or Firebase `user_id` property; avoid sending raw email. |
| `role` | string | From session init or `users.roles[0]` — low cardinality set. |
| `post_id` | string | |
| `event_id` | string | |
| `reply_id` | string | |
| `profile_user_id` | string | Other user in modal |
| `feed_tab` | string | `all` / `events` / `posts` |
| `onboarding_step_index` | int | 0–6 |
| `claim_step` | string | `email_code` / `password_new` / `password_existing` |
| `success` | bool | |
| `error_code` | string | FirebaseAuth / Functions codes |
| `server_code` | string | Business codes from callables (NOT_ELIGIBLE, USED, …) |
| `session_state` | string | READY_FOR_HOME, REQUIRES_ONBOARDING, UNAUTHORIZED |
| `category` | string | Post category (consider hashing if huge) |
| `content_type` | string | `event` / `post` / `reply` |
| `action` | string | `register` / `unregister` |
| `source_surface` | string | `feed` / `events_list` / `home` |
| `is_native_bridge_lost` | bool | Callable channel errors |
| `mock_data` | bool | `true` when event originates from mock UI (home, groups, messages, etc.) — clarifies data quality |

---

## 10. Prioritized Implementation Plan

### Tier 1 — Must-track (core product truth)

1. `session_init_result` + `session_init_error` — eligibility and gate (`auth_controller.dart`, `expansion_session_service.dart`).  
2. Invite funnel: `invite_validate`, `invite_claim_create_account`, `invite_finalize_existing`, `submit_sign_in` (+ outcomes).  
3. `complete_onboarding` (or `onboarding_complete`) + step progression (`onboarding_step_view` or `onboarding_next`).  
4. `screen_view` (or `screen_*`) for `/feed`, `/events/:id`, `/feed/post/:postId`, `/profile`.  
5. `post_publish`, `toggle_post_like`, `post_reply_submit` (success/failure).  
6. `event_rsvp_toggle` (success/failure).  
7. `error_feed_load`, `error_session_init`.

### Tier 2 — Strong insight

- Tab navigation `tab_select`.  
- `feed_tab_change`, `feed_open_post`, `feed_open_event`, `profile_modal_open` + `profile_modal_message`.  
- `profile_edit_save` / error.  
- `post_detail_load` / not found.  
- Home/Explore/Matching **with** `mock_data: true` to segment prototype usage.

### Tier 3 — Diagnostic / optional

- Per-skill / per-goal toggles on onboarding (watch cardinality).  
- `event_detail_image_error`, reply likes.  
- Chat mock sends (`chat_send_message`) for UX testing only.  
- Admin mock approve/reject.

---

## 11. Risks / Notes

| Risk | Detail |
|------|--------|
| **Mock vs real** | Many high-visibility screens do not touch Firestore. Tag events with `mock_data` or restrict Tier 2+ mock events so dashboards are not misread. |
| **Duplicate screen_view** | Shell tabs keep sibling branches alive — avoid logging every rebuild; use `RouteObserver` / GoRouter notifications on **route pushed**. |
| **Post detail query param** | `feed_post_navigation.dart` uses `?_=` timestamp — normalize `post_id` for analytics. |
| **PII** | Do not log email, password, invite code plaintext, or full post/reply body. Use lengths, hashes, or category enums. |
| **Explore filter chips** | Currently non-interactive — no events until wired. |
| **Event create** | Submit does not persist — label events as stub. |
| **Groups join** | List button is no-op — event is speculative. |
| **Backend vs client** | Denied access: log `session_init_result` on client; consider server audit logs for authoritative counts. |
| **No FCM / deep links** | Inventory entries for those are **placeholders** until dependencies exist. |

---

## Appendix: Key file index

| Path | Role |
|------|------|
| `lib/main.dart` | Firebase init, recovery UI |
| `lib/router/app_router.dart` | All routes + auth redirects |
| `lib/auth/auth_controller.dart` | Session init, onboarding gate |
| `lib/services/expansion_session_service.dart` | Callables |
| `lib/services/feed_posts_repository.dart` | Posts, likes, replies |
| `lib/services/events_repository.dart` | Events RSVP |
| `lib/services/user_profile_repository.dart` | Profile CRUD, onboarding save |
| `lib/widgets/expansion_shell.dart` | Bottom navigation |
| `lib/widgets/user_profile_modal.dart` | Profile bottom sheet |
| `lib/data/mock_data.dart` | Mock messages/groups/events for UI |

---

*End of inventory.*
