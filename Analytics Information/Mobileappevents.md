# Expansion mobile app — Step 2 analytics audit (master event inventory)

**Source of truth:** Flutter app in `ExpansionNetworkApp/expansion_network` (`lib/router/app_router.dart`, `lib/widgets/expansion_shell.dart`, `lib/screens/**`, shared `lib/widgets/**`, `lib/services/**`).  
**Navigation:** [go_router](https://pub.dev/packages/go_router) with a `StatefulShellRoute` for the bottom shell (Home, Events-labeled tab on route `/feed`, Groups, Explore, Profile) plus full-screen routes for auth, onboarding, matching, messages, posts, jobs/skills, groups detail, events CRUD, Mortar info, profile edit, achievements, and staff moderation.

**Note:** Bottom nav labels in `expansion_shell.dart` are Home, **Events**, Groups, Explore, Profile; the **Events** tab is implemented as route **`/feed`** and `FeedScreen` (community events list). A separate **`/events`** route exists (`EventsScreen`) for the same `events_mobile` data with a different chrome — reachable via deep link / profile / attachments, not the primary tab.

---

## 1. Screen-by-screen audit

Event naming convention: `domain_object_action` in **snake_case**. Use shared parameters where useful: `screen`, `route`, `tab`, `step_index`, `filter`, `entity_id`, `source`, `error_code`, `duration_ms`, `attachment_type`, `match_documents_written`, etc.

---

### Screen: Session gate (`SessionGateScreen`, `/session`)

- **Purpose:** Mask flash of marketing UI while `AuthController` resolves auth + `initializeUserSession`.
- **Main user goals:** Wait for redirect to landing, onboarding, or home.
- **Possible session start event:** `session_gate_screen_started`
- **Possible session end event:** `session_gate_screen_ended` (navigated away; include `destination_hint` if known)
- **Passive behaviors:** Spinner shown; time-on-screen until redirect.
- **Conversions:** Implicit — successful handoff to `/`, `/onboarding`, `/home`, or `/welcome-intro`.
- **Drop-offs / friction / errors:** Long hang if `initializeUserSession` stalls; iOS keychain settle delay (see `auth_controller.dart`).

#### Events

| `event_name` | description | trigger | event_type | goal_buckets | why_it_matters |
| --- | --- | --- | --- | --- | --- |
| `session_gate_screen_started` | User landed on loading gate | Route `/session` built | screen_session_start | B6, B7 | Funnel timing from cold start to routed destination |
| `session_gate_screen_ended` | Left session gate | Router replaces screen | screen_session_end | B6 | Measures perceived startup / auth latency |
| `session_initialize_backend_started` | Callable `initializeUserSession` invoked | Auth pipeline | backend | B6, B7 | Server is source of onboarding flags and access |
| `session_initialize_backend_succeeded` | Session callable returned authorized | Callable success | backend | B6, B7 | Unlocks in-app state; segment by `state` payload |
| `session_initialize_backend_unauthorized` | User denied (no network access, banned, disabled, etc.) | Callable `UNAUTHORIZED` | error | B6, B7 | Explains forced sign-out / access denied dialog |

---

### Screen: Landing (`LandingScreen`, `/`)

- **Purpose:** Unauthenticated entry — claim invite or sign in.
- **Main user goals:** Start account access.
- **Possible session start event:** `landing_screen_started`
- **Possible session end event:** `landing_screen_ended`
- **Passive behaviors:** View hero copy; `AuthController` may show access-denied dialog via listener.
- **Conversions:** Tap **Claim with invite** or **Sign in**.
- **Drop-offs / friction / errors:** Access denied dialog after failed session (`takeAccessDeniedMessage`).

#### Events

| `event_name` | description | trigger | event_type | goal_buckets | why_it_matters |
| --- | --- | --- | --- | --- | --- |
| `landing_screen_started` | Marketing landing visible | Route `/` | screen_session_start | B6 | Top-of-funnel for alumni acquisition |
| `landing_claim_invite_clicked` | User chose invite flow | `FilledButton` claim | click | B6 | Primary acquisition path |
| `landing_sign_in_clicked` | User chose password sign-in | `OutlinedButton` | click | B6 | Returning user path |
| `landing_access_denied_dialog_shown` | Post–denial messaging | Dialog from auth listener | error | B6, B7 | Quality of rejection UX |

---

### Screen: Sign in (`AuthSignInScreen`, `/auth/sign-in`)

- **Purpose:** Email/password sign-in for existing Firebase users.
- **Main user goals:** Authenticate and enter app shell.
- **Possible session start event:** `auth_sign_in_screen_started`
- **Possible session end event:** `auth_sign_in_screen_ended`
- **Passive behaviors:** Form validation inline.
- **Conversions:** Successful `signInWithEmailAndPassword` → `context.go('/session')`.
- **Drop-offs / friction / errors:** `FirebaseAuthException` message shown; back to landing.

#### Events

| `event_name` | description | trigger | event_type | goal_buckets | why_it_matters |
| --- | --- | --- | --- | --- | --- |
| `auth_sign_in_screen_started` | Sign-in form shown | Route enter | screen_session_start | B6 | Returning user funnel |
| `auth_sign_in_submitted` | User attempted login | `FilledButton` submit | submit | B6 | Intent to authenticate |
| `auth_sign_in_succeeded` | Firebase sign-in OK | After `signInWithEmailAndPassword` | conversion | B6 | Login success rate |
| `auth_sign_in_failed` | Login error | Catch `FirebaseAuthException` | error | B6 | Diagnose bad credentials vs. policy |
| `auth_sign_in_back_to_landing` | Abandon sign-in | AppBar back | abandonment | B6 | Drop-off before auth |
| `auth_sign_in_navigate_to_claim` | Switch to invite flow | TextButton | click | B6 | Users correcting path |

---

### Screen: Claim account (`AuthClaimScreen`, `/auth/claim`)

- **Purpose:** Invite code + email → validate → create account or sign in existing; uses Cloud Functions `validateInviteCode`, `claimInviteAndCreateAccount` (`ExpansionSessionService`).
- **Main user goals:** Provision access with invite.
- **Possible session start event:** `auth_claim_screen_started`
- **Possible session end event:** `auth_claim_screen_ended`
- **Passive behaviors:** Multi-step UI (email/code → password).
- **Conversions:** Success → `context.go('/session')`.
- **Drop-offs / friction / errors:** Mapped codes `NOT_ELIGIBLE`, `USED`, `EXPIRED`, `ALREADY_EXISTS`, etc.; link to sign-in.

#### Events

| `event_name` | description | trigger | event_type | goal_buckets | why_it_matters |
| --- | --- | --- | --- | --- | --- |
| `auth_claim_screen_started` | Claim flow opened | Route enter | screen_session_start | B6, B7 | Invite funnel entry |
| `invite_code_validation_submitted` | Email + code sent to callable | Continue from step 1 | submit | B6 | Validates invite pipeline |
| `invite_code_validation_succeeded` | `valid: true` from server | Callable response | backend | B6, B7 | Qualified invitees |
| `invite_code_validation_failed` | Invalid / ineligible code | Callable `valid: false` | error | B6 | Fix invite ops / comms |
| `invite_account_create_submitted` | New password submitted | Step 2 new account | submit | B6 | Account creation intent |
| `invite_account_create_succeeded` | Account created + signed in | Callable ok + auth | conversion | B6, B7 | New member acquisition |
| `invite_existing_account_sign_in_submitted` | Password for existing account | Step existing | submit | B6 | Returning email on invite |
| `invite_flow_failed` | Callable / auth error | Catch | error | B6 | Technical + policy failures |
| `auth_claim_navigate_to_sign_in` | User opened sign-in from claim | TextButton | click | B6 | Path correction |

---

### Screen: Onboarding (`OnboardingScreen`, `/onboarding`)

- **Purpose:** 7-page curriculum-aligned profile capture (identity, goals, confident skills ≥3, desired skills ≥3, tribe, work sliders, links + optional photos); writes `users/{uid}` via `UserProfileRepository` (`_save` at end).
- **Main user goals:** Complete required fields; upload optional profile/business images to Storage.
- **Possible session start event:** `onboarding_screen_started`
- **Possible session end event:** `onboarding_screen_ended` (completed or abandoned)
- **Passive behaviors:** PageController paging; reading curriculum categories; slider adjustments.
- **Conversions:** Successful save → router sends user to app (and may show `WelcomeMortarverseIntroScreen`).
- **Drop-offs / friction / errors:** Per-step validation (`_validateStep1`, goals, skills, tribe); `_error` banner; alumni city program field when roles require it; cohort ID vs “Not in a cohort”.

#### Events

| `event_name` | description | trigger | event_type | goal_buckets | why_it_matters |
| --- | --- | --- | --- | --- | --- |
| `onboarding_screen_started` | Onboarding shell shown | Route enter | screen_session_start | B3, B5, B6, B7 | Activation funnel |
| `onboarding_step_viewed` | User on step N (0–6) | Page change | view | B3, B5, B6, B7 | Step-wise drop-off |
| `onboarding_step_validation_failed` | Step blocked | `_nextStep` validation | error | B6 | Field friction |
| `onboarding_goal_toggled` | Business goal chip toggled | Tap goal | engagement | B5, B7 | Goal distribution |
| `onboarding_confident_skill_toggled` | Confident skill selected/removed | Curriculum card | engagement | B3, B7 | Skill supply side |
| `onboarding_desired_skill_toggled` | Desired skill selected/removed | Curriculum card | engagement | B3, B7 | Skill demand side |
| `onboarding_tribe_selected` | Tribe / industry selected | Step 4 | engagement | B7 | Segmentation |
| `onboarding_work_structure_changed` | Flexibility / hours / ownership sliders | Slider | engagement | B5, B7 | Work-fit signals |
| `onboarding_profile_photo_picked` | User picked profile photo | Image picker | engagement | B7 | Profile richness |
| `onboarding_business_logo_picked` | User picked business logo | Image picker | engagement | B5, B7 | Business identity signal |
| `onboarding_save_submitted` | Final save pressed | `_save` | submit | B6 | Completion intent |
| `onboarding_completed` | Profile persisted; auth refreshed | Successful save | conversion | B3, B5, B6, B7 | **Time-to-profile-complete** |
| `onboarding_save_failed` | Write / storage error | Catch in `_save` | error | B6 | Data pipeline health |
| `onboarding_abandoned` | Session ended without completion | Heuristic: last step + timeout / app background | abandonment | B6 | Stalled activation |

---

### Screen: Welcome Mortarverse intro (`WelcomeMortarverseIntroScreen`, `/welcome-intro`)

- **Purpose:** Post-onboarding `Welcome.gif` playback + haptics, then navigate Home.
- **Main user goals:** Celebrate completion; land in app.
- **Possible session start event:** `welcome_intro_screen_started`
- **Possible session end event:** `welcome_intro_screen_ended`
- **Passive behaviors:** GIF decode/playback duration; scheduled haptics (`kWelcomeIntroHapticTimesSec`).
- **Conversions:** Auto navigation to `/home` after loop.
- **Drop-offs / friction / errors:** GIF decode error message; single-frame hold timing.

#### Events

| `event_name` | description | trigger | event_type | goal_buckets | why_it_matters |
| --- | --- | --- | --- | --- | --- |
| `welcome_intro_screen_started` | Intro route entered | Route | screen_session_start | B6 | Post-onboarding delight timing |
| `welcome_intro_playback_completed` | GIF loop finished | `_playOneLoop` end | engagement | B6 | Experienced full intro |
| `welcome_intro_navigated_home` | Routed to home | `_goNextIfMounted` | conversion | B6 | Handoff to first session |
| `welcome_intro_decode_failed` | Asset/codec error | Error branch | error | B6 | Asset pipeline QA |

---

### Screen: Main shell — bottom navigation (`ExpansionShell` + `StatefulShellRoute`)

- **Purpose:** Persistent tabs: `/home`, `/feed`, `/groups`, `/explore`, `/profile`.
- **Main user goals:** Switch major product areas without losing stack state per branch.
- **Possible session start event:** `main_shell_started` (first time user hits any branch after auth)
- **Possible session end event:** `main_shell_ended` (sign-out or process death)
- **Passive behaviors:** Branch index unchanged while browsing pushed routes on top of shell.
- **Conversions:** N/A (chrome).
- **Drop-offs / friction / errors:** None inherent.

#### Events

| `event_name` | description | trigger | event_type | goal_buckets | why_it_matters |
| --- | --- | --- | --- | --- | --- |
| `main_tab_selected` | User switched bottom tab | `NavigationBar.onDestinationSelected` | click | B1, B2, B3, B4, B6 | **Navigation mix** — intent across product pillars |
| `main_shell_resumed` | App resumed on shell | `WidgetsBindingObserver` (if added) | passive | B7 | Return visits |

---

### Screen: Home (`HomeScreen`, `/home`)

- **Purpose:** Dashboard — welcome card, Mortar shop external link, Mortar info preview, latest job/skill peek, recent social posts preview, “your communities” list.
- **Main user goals:** Jump to matching, shop, announcements, explore listings, posts, or a group.
- **Possible session start event:** `home_screen_started`
- **Possible session end event:** `home_screen_ended`
- **Passive behaviors:** Stream updates for cards; scroll `CustomScrollView`.
- **Conversions:** Any navigation out (matching, mortar feed, post create, group, explore filters, social feed).
- **Drop-offs / friction / errors:** Stream errors on communities/posts/Mortar/job/skill cards; `blockContentActionIfSuspended` on FAB/create post.

#### Events

| `event_name` | description | trigger | event_type | goal_buckets | why_it_matters |
| --- | --- | --- | --- | --- | --- |
| `home_screen_started` | Home tab visible | Route `/home` | screen_session_start | B1, B5, B6 | Primary dashboard entry |
| `home_screen_ended` | Left home tab | Tab change / push route | screen_session_end | B6 | Session depth on dashboard |
| `home_create_post_fab_clicked` | Start new feed post | FAB | click | B1, B6 | UGC creation intent |
| `home_create_post_blocked_suspended` | FAB blocked | `blockContentActionIfSuspended` | error | B7 | Trust & safety impact |
| `home_smart_matching_cta_clicked` | Open matching | Welcome card button | click | B3, B4, B6 | Algorithm discovery |
| `home_mortar_shop_opened` | External commerce | `safeLaunchExternalUrl` | conversion | B5 | Revenue-adjacent behavior |
| `home_mortar_info_preview_tapped` | Open Mortar feed | Card tap | click | B1 | Official comms engagement |
| `home_recent_activity_view_all_clicked` | Open full posts list | Card action | click | B1 | Social discovery |
| `home_feed_post_preview_opened` | Open post detail | `FeedPostCard` | click | B1 | Thread depth |
| `home_empty_recent_activity_create_clicked` | Create from empty state | TextButton | click | B1, B6 | Activation when quiet |
| `home_communities_see_all_groups_clicked` | Go to groups tab | “Groups” action on card | click | B1 | Community discovery |
| `home_community_preview_opened` | Open group detail | Row tap | click | B1 | Group intent |
| `home_latest_job_teaser_clicked` | Explore jobs filter | Latest card | click | B2, B3 | Job discovery |
| `home_latest_skill_teaser_clicked` | Explore skills filter | Latest card | click | B3 | Skill marketplace |
| `home_stream_load_error` | Firestore/stream failure | Stream error builder | error | B6 | Reliability |

---

### Screen: Events tab feed (`FeedScreen`, route `/feed`, nav label “Events”)

- **Purpose:** Upcoming **published** community events (`events_mobile`); tabs All vs Registered; FAB create event.
- **Main user goals:** Browse events, RSVP, create member event.
- **Possible session start event:** `events_feed_tab_started`
- **Possible session end event:** `events_feed_tab_ended`
- **Passive behaviors:** Stream list; image loading on tiles.
- **Conversions:** Open detail; FAB → create; register in detail screen.
- **Drop-offs / friction / errors:** Empty states; “Sign in” message on Registered tab when logged out; stream error.

#### Events

| `event_name` | description | trigger | event_type | goal_buckets | why_it_matters |
| --- | --- | --- | --- | --- | --- |
| `events_feed_tab_started` | Events list tab shown | `/feed` | screen_session_start | B1, B6 | Community calendar use |
| `events_feed_subtab_changed` | All vs Registered | `SegmentedButton` | engagement | B1, B7 | Registered-user engagement |
| `events_feed_create_event_fab_clicked` | Start event submission | FAB | click | B1, B6 | Member-generated programming |
| `events_feed_create_blocked_suspended` | FAB blocked | Content guard | error | B7 | Moderation |
| `events_feed_event_tile_opened` | Open detail | Tile / button | click | B1 | Event interest |
| `events_feed_stream_error` | Failed to load | Stream error | error | B6 | Data health |

---

### Screen: Events list (standalone) (`EventsScreen`, `/events`)

- **Purpose:** Alternate full-page list of published events (same repository as tab); FAB create.
- **Main user goals:** Same as tab when reached from profile attachments / deep links.
- **Possible session start / end:** `events_standalone_list_started` / `_ended`
- **Passive / conversion / friction:** Same patterns as `FeedScreen`.

#### Events

| `event_name` | description | trigger | event_type | goal_buckets | why_it_matters |
| --- | --- | --- | --- | --- | --- |
| `events_standalone_list_started` | `/events` route shown | Route | screen_session_start | B1, B6 | Deep-link / secondary entry |
| `events_standalone_event_opened` | Open event detail | Tile tap | click | B1 | Same as tab — attribute `entry_route=/events` |

*(Reuse detail/create/register events below with `source_screen` parameter.)*

---

### Screen: Event detail (`EventDetailScreen`, `/events/:eventId`)

- **Purpose:** Full event info; register/unregister; post-register calendar prompt (`showPostRegisterCalendarSheet`); shows approval state for unpublished member submissions.
- **Main user goals:** RSVP decision; add to calendar; inspect Mortar-hosted styling.
- **Possible session start event:** `event_detail_screen_started`
- **Possible session end event:** `event_detail_screen_ended`
- **Passive behaviors:** Scroll long details; view RSVP list (`EventRsvpAttendeeTile` — may open DM).
- **Conversions:** Register success; calendar sheet accepted/declined.
- **Drop-offs / friction / errors:** Register errors; disabled when unpublished/rejected/full.

#### Events

| `event_name` | description | trigger | event_type | goal_buckets | why_it_matters |
| --- | --- | --- | --- | --- | --- |
| `event_detail_screen_started` | Detail opened | Route | screen_session_start | B1, B6 | High-intent event view |
| `event_register_clicked` | Attempt register | Primary `ElevatedButton` | click | B1, B6 | RSVP funnel |
| `event_registered` | Now registered | `EventsRepository.register` success | conversion | B1, B6 | **Event conversion** |
| `event_unregistered` | RSVP removed | `unregister` success | conversion | B1 | Churn / correction |
| `event_register_failed` | RSVP error | Catch | error | B6 | Rules / network |
| `event_post_register_calendar_prompt_shown` | OS calendar sheet | After first register | engagement | B1 | Attendance follow-through |
| `event_post_register_calendar_added` | User added to calendar | Prompt success (if detectable) | conversion | B1 | Real-world attendance proxy |
| `event_rsvp_attendee_message_clicked` | DM from attendee list | Tile button | click | B1, B4 | Networking around events |

---

### Screen: Event create (`EventCreateScreen`, `/events/create`)

- **Purpose:** Member-submitted event: title, online/in-person, date (≥ today+4 days), time, location, description, optional flyer upload to Storage; checks `content_suspended` flag on load.
- **Main user goals:** Submit event for curriculum review (not approved in-app).
- **Possible session start event:** `event_create_screen_started`
- **Possible session end event:** `event_create_screen_ended`
- **Passive behaviors:** Date/time pickers; character limits.
- **Conversions:** Successful Firestore write (repository) then pop.
- **Drop-offs / friction / errors:** Suspended user banner; image size limit 10MB; validation.

#### Events

| `event_name` | description | trigger | event_type | goal_buckets | why_it_matters |
| --- | --- | --- | --- | --- | --- |
| `event_create_screen_started` | Create form opened | Route | screen_session_start | B1, B6 | Member programming supply |
| `event_create_suspended_banner_shown` | User cannot submit | `isContentSuspended` | error | B7 | Enforcement |
| `event_create_date_picked` | Chose event date | DatePicker | engagement | B1 | Form progress |
| `event_create_time_picked` | Chose time | TimePicker | engagement | B1 | Form progress |
| `event_create_flyer_picked` | Chose flyer image | Gallery picker | engagement | B1 | Rich listings |
| `event_create_submitted` | Attempt create | Submit | submit | B1, B6 | Submission intent |
| `event_create_succeeded` | Event doc created | Repo success | conversion | B1, B6 | **Supply metric** for events pipeline |
| `event_create_failed` | Write/upload error | Catch | error | B6 | Ops / Storage |

---

### Screen: Groups directory (`GroupsScreen`, `/groups`)

- **Purpose:** Search + lists: Your groups, Featured (top 2 by activity heuristic), Explore (not joined); create community.
- **Main user goals:** Find/join communities; create one.
- **Possible session start event:** `groups_directory_started`
- **Possible session end event:** `groups_directory_ended`
- **Passive behaviors:** Live `watchGroups` stream; search debounce via `onChanged` setState.
- **Conversions:** Open group detail; create community.
- **Drop-offs / friction / errors:** Stream error; empty states.

#### Events

| `event_name` | description | trigger | event_type | goal_buckets | why_it_matters |
| --- | --- | --- | --- | --- | --- |
| `groups_directory_started` | Groups tab shown | `/groups` | screen_session_start | B1, B6 | Community discovery |
| `groups_search_query_changed` | Filter list | `TextField.onChanged` | engagement | B1, B7 | Search behavior |
| `groups_create_community_clicked` | Open create | Header `+` | click | B1, B4 | Community creation intent |
| `groups_create_blocked_suspended` | Blocked | Content guard | error | B7 | Safety |
| `groups_yours_opened` | Open joined group | Card tap | click | B1 | Return to community |
| `groups_featured_opened` | Open featured group | Horizontal card | click | B1 | Editorial / activity signal |
| `groups_explore_opened` | Open not-joined group | Card tap | click | B1, B6 | Join funnel entry |
| `groups_stream_error` | Load failure | Stream error | error | B6 | Reliability |

---

### Screen: Group detail (`GroupDetailScreen`, `/groups/:groupId`)

- **Purpose:** Group hub with tabs **Feed / Members / About**; paginated threads (`fetchThreadsPage`); join/leave; create thread (sheet); sort threads; message members; staff/creator edit link.
- **Main user goals:** Participate in threads; join community; inspect members.
- **Possible session start event:** `group_detail_started`
- **Possible session end event:** `group_detail_ended`
- **Passive behaviors:** Infinite scroll near end; thread preview read.
- **Conversions:** Join success (instant or pending); thread created; comment submitted in sheet.
- **Drop-offs / friction / errors:** Group not found; join/leave errors; suspended block on post FAB.

#### Events

| `event_name` | description | trigger | event_type | goal_buckets | why_it_matters |
| --- | --- | --- | --- | --- | --- |
| `group_detail_started` | Group page opened | Route | screen_session_start | B1, B4, B6 | Community depth |
| `group_detail_tab_changed` | Feed/members/about | Local tab state | engagement | B1, B7 | IA usage |
| `group_thread_sort_changed` | Newest vs (other) | `_onSort` | engagement | B1 | Discovery mode |
| `group_join_clicked` | Join / request | Join CTA | click | B1, B6 | **Join funnel** |
| `group_join_succeeded_instant` | Immediate member | Callable/repo | conversion | B1 | Open communities |
| `group_join_pending_review` | Requested approval | Snack “admin will review” | conversion | B1 | Gated communities |
| `group_join_failed` | Join error | Catch | error | B6 | Rules / capacity |
| `group_leave_confirmed` | User left | Dialog confirm + repo | conversion | B1 | Churn |
| `group_create_thread_opened` | FAB compose | FAB | click | B1 | UGC supply |
| `group_create_thread_blocked_suspended` | FAB blocked | Guard | error | B7 | Safety |
| `group_thread_created` | New thread posted | `createThread` success | conversion | B1, B7 | **Group post created** (badges use this) |
| `group_thread_opened` | Open thread sheet | Tile tap / `showGroupThreadDetailSheet` | engagement | B1 | Read depth |
| `group_thread_upvoted` / `group_thread_downvoted` | Vote on thread | `_vote` | engagement | B1 | Quality signal |
| `group_thread_comment_submitted` | New comment | `_submitComment` | conversion | B1, B7 | **Comment created** |
| `group_comment_upvoted` / `group_comment_downvoted` | Vote on comment | `_voteComment` | engagement | B1 | Engagement depth |
| `group_member_message_clicked` | DM member | `context.push` direct chat | click | B1, B4 | 1:1 from community |
| `group_edit_opened` | Manage community | Header button (if allowed) | click | B1 | Admin behavior |
| `group_detail_not_found` | Missing / inaccessible | Empty `FsGroup` | error | B6 | Bad links / rules |

---

### Screen: Group create (`GroupCreateScreen`, `/groups/create`)

- **Purpose:** Create `groups_mobile` doc; on success `context.go('/groups/$id')`.
- **Main user goals:** Stand up a public community.
- **Possible session start / end:** `group_create_started` / `_ended`
- **Conversions:** `createGroup` success.
- **Friction:** Name required.

#### Events

| `event_name` | description | trigger | event_type | goal_buckets | why_it_matters |
| --- | --- | --- | --- | --- | --- |
| `group_create_started` | Form opened | Route | screen_session_start | B1, B4, B6 | Community supply |
| `group_create_submitted` | Attempt create | Save | submit | B1 | Intent |
| `group_create_succeeded` | Group id returned | Repo | conversion | B1, B4 | **New community** |
| `group_create_failed` | Error | Catch | error | B6 | Validation / permissions |

---

### Screen: Group edit (`GroupEditScreen`, `/groups/:groupId/edit`)

- **Purpose:** Creator/staff — update metadata or delete community.
- **Main user goals:** Maintain or remove group.
- **Possible session start / end:** `group_edit_started` / `_ended`
- **Conversions:** Save metadata; delete group.
- **Friction:** Confirm destructive delete.

#### Events

| `event_name` | description | trigger | event_type | goal_buckets | why_it_matters |
| --- | --- | --- | --- | --- | --- |
| `group_metadata_save_succeeded` | Group updated | `_save` | conversion | B1 | Ops health |
| `group_delete_confirmed` | Community removed | Delete dialog + repo | conversion | B1 | Rare but critical |

---

### Screen: Explore (`ExploreScreen`, `/explore`)

- **Purpose:** Unified discovery — job listings + skill listings + **network name search** (`UserProfileRepository.searchMembersByName`); filter query param `?filter=jobs|skills|network`; FAB menu post job/skill; header bell → messages; matching CTA.
- **Main user goals:** Find work, talent, or people; start listings; run matching.
- **Possible session start event:** `explore_screen_started`
- **Possible session end event:** `explore_screen_ended`
- **Passive behaviors:** Debounced network search (400ms); streams for jobs/skills; scrolling combined lists.
- **Conversions:** Message author from job/skill card with optional attachment query params; open profile modal from search/job author.
- **Drop-offs / friction / errors:** Empty states; “Enter 2+ chars”; search errors swallowed → empty hits.

#### Events

| `event_name` | description | trigger | event_type | goal_buckets | why_it_matters |
| --- | --- | --- | --- | --- | --- |
| `explore_screen_started` | Explore shown | `/explore` | screen_session_start | B2, B3, B4, B6 | Core marketplace |
| `explore_filter_changed` | jobs/skills/all/network | Chip `context.go` | engagement | B2, B3, B6 | Filter mix |
| `explore_matching_cta_clicked` | Run matching | FilledButton | click | B3, B4, B6 | Algorithm entry from discovery |
| `explore_notifications_shortcut_clicked` | Open messages | Header icon | click | B1 | Inbox habit |
| `explore_post_menu_opened` | FAB sheet | FAB | engagement | B2, B3 | Create intent |
| `explore_post_job_nav_started` | From sheet | Job list tile | click | B2, B6 | Job supply |
| `explore_offer_skill_nav_started` | From sheet | Skill list tile | click | B3, B6 | Skill supply |
| `explore_post_job_blocked_suspended` | Blocked | Guard | error | B7 | Safety |
| `explore_job_message_author_clicked` | DM poster w/ job attach | Job `Message` | click | B2, B3, B4 | **Hiring conversation start** |
| `explore_skill_message_author_clicked` | DM poster w/ skill attach | Skill `Message` | click | B3, B4 | Partnership / gig conversation |
| `explore_network_search_query_updated` | Debounced query | Timer after typing | engagement | B4, B7 | People search usage |
| `explore_network_search_no_results` | Zero hits | Render branch | passive | B4 | Discovery gaps |
| `explore_network_member_profile_opened` | Modal profile | Card tap | engagement | B4, B7 | Profile views from search |
| `explore_network_member_message_clicked` | DM from search | Button | click | B4 | **Connection start** |
| `explore_stream_error` | Jobs/skills stream error | Builder | error | B6 | Firestore |

---

### Screen: Post job (`JobCreateScreen`, `/explore/jobs/create`)

- **Purpose:** Create `ExploreJob` with curriculum multiselect “skills seeking”, industry, remote/in-person location, optional company/description.
- **Main user goals:** Publish hiring need.
- **Possible session start / end:** `job_create_started` / `_ended`
- **Conversions:** `ExploreListingsRepository.createJob` success → pop.
- **Friction:** Max skills per listing cap snackbar; industry required; location rules.

#### Events

| `event_name` | description | trigger | event_type | goal_buckets | why_it_matters |
| --- | --- | --- | --- | --- | --- |
| `job_create_started` | Form opened | Route | screen_session_start | B2, B3, B6 | Employer-side funnel |
| `job_skills_seeking_toggled` | Curriculum skill | Multiselect | engagement | B3 | Skill-based hiring signal |
| `job_location_mode_changed` | Remote vs in-person | SegmentedButton | engagement | B2 | Work arrangement |
| `job_create_submitted` | Attempt post | Save | submit | B2 | Intent |
| `job_create_succeeded` | Job listing live | Repo success | conversion | B2, B3, B6 | **Job post created** |
| `job_create_failed` | Error | Catch | error | B6 | Data rules |
| `job_skills_cap_reached` | UX cap hit | SnackBar | friction | B3 | UX tuning |

---

### Screen: Skills hub (`ExploreSkillsScreen`, `/explore/skills`)

- **Purpose:** Full skill-offer list + FAB “Offer skill”.
- **Main user goals:** Browse offers; start skill listing.
- **Session:** `explore_skills_hub_started` / `_ended`
- **Conversions:** Navigate to `/explore/skills/create`; message on card (same as explore list — reuse events with `source`).

---

### Screen: Offer skill (`SkillCreateScreen`, `/explore/skills/create`)

- **Purpose:** Publish `ExploreSkillListing` with “skills offering”, industry, summary, location modes.
- **Conversions:** `createSkillListing` success.

#### Events

| `event_name` | description | trigger | event_type | goal_buckets | why_it_matters |
| --- | --- | --- | --- | --- | --- |
| `skill_listing_create_started` | Form opened | Route | screen_session_start | B3, B5, B6 | Talent supply |
| `skill_offering_toggled` | Curriculum skill | Multiselect | engagement | B3 | Capability signal |
| `skill_listing_create_submitted` | Attempt post | Save | submit | B3 | Intent |
| `skill_listing_create_succeeded` | Listing live | Repo | conversion | B3, B5, B6 | **Skill listing created** |
| `skill_listing_create_failed` | Error | Catch | error | B6 | Pipeline |

---

### Screen: Smart matching (`MatchingScreen`, `/matching`)

- **Purpose:** Explain algorithm; call Cloud Function `runExpansionUserMatching` (`ExpansionMatchingRepository.runSelfMatching`); show `users/{uid}/expansion_matches` with score + rationale; open profile modal; DM match.
- **Main user goals:** Refresh suggestions; contact matches.
- **Possible session start event:** `matching_screen_started`
- **Possible session end event:** `matching_screen_ended`
- **Passive behaviors:** Read “How it works”; stream of saved matches.
- **Conversions:** Successful callable; message from card.
- **Friction:** Zero matches snackbar; dialog spinner; Firebase bridge error messaging (`userMessageForFirebaseCallableError`).

#### Events

| `event_name` | description | trigger | event_type | goal_buckets | why_it_matters |
| --- | --- | --- | --- | --- | --- |
| `matching_screen_started` | Matching UI shown | Route | screen_session_start | B3, B4, B6 | Skill/intent-based introduction |
| `matching_back_nav_clicked` | Leave screen | AppBar / back | abandonment | B6 | Bounce |
| `matching_start_clicked` | Run algorithm | `Start matching` | click | B3, B4, B6 | **Explicit matching request** |
| `matching_callable_started` | Callable in flight | Before `httpsCallable` | backend | B3 | Server load |
| `matching_callable_succeeded` | Matches written | Callable returns | backend | B3, B4 | Include `match_documents_written` |
| `matching_callable_failed` | Callable error | Catch | error | B6 | Ops / auth |
| `matching_zero_results_prompted` | Snack “No strong matches…” | `written == 0` | passive | B3, B6 | Profile / graph health |
| `matching_match_profile_opened` | Modal profile | Card tap | engagement | B3, B4, B7 | Interest in a person |
| `matching_match_message_clicked` | DM match | Button | click | B4, B6 | **Post-match outreach** |

---

### Screen: Messages inbox (`MessagesScreen`, `/messages`)

- **Purpose:** List `dm_threads` for current user; tap row → direct chat; avatar tap → profile modal.
- **Main user goals:** Resume conversations.
- **Session:** `messages_inbox_started` / `_ended`
- **Passive behaviors:** Preview text; empty state.
- **Conversions:** Open thread.
- **Friction:** Not signed in message; stream error.

#### Events

| `event_name` | description | trigger | event_type | goal_buckets | why_it_matters |
| --- | --- | --- | --- | --- | --- |
| `messages_inbox_started` | Inbox shown | Route | screen_session_start | B1, B4, B6 | Messaging habit |
| `messages_thread_opened` | Open DM | Row tap | click | B1, B4 | Conversation resume |
| `messages_thread_avatar_profile_opened` | Profile from inbox | Avatar `InkWell` | engagement | B4, B7 | Sidebar discovery |

---

### Screen: Direct message thread (`DirectChatScreen`, `/messages/direct/:userId`)

- **Purpose:** 1:1 chat via `DmRepository`; optional initial attachment type `?attach=job|skill|event` + `id` for card preview; send text clears attachment.
- **Main user goals:** Negotiate job/skill/event; relationship maintenance.
- **Session:** `direct_chat_started` / `_ended`
- **Passive behaviors:** Message list scroll; `StreamBuilder` updates.
- **Conversions:** `sendMessage` success with/without attachment.
- **Friction:** Send errors snackbar; remove attachment.

#### Events

| `event_name` | description | trigger | event_type | goal_buckets | why_it_matters |
| --- | --- | --- | --- | --- | --- |
| `direct_chat_started` | Thread opened | Route | screen_session_start | B1, B2, B3, B4 | Conversation context |
| `direct_chat_attachment_preview_removed` | User cleared attach | Remove button | engagement | B2, B3 | Changed mind |
| `direct_chat_message_sent` | Outbound message | `_send` success | conversion | B1, B2, B3, B4 | **Core comms outcome**; param `has_attachment`, `attachment_type` |
| `direct_chat_message_send_failed` | Send error | Catch | error | B6 | Reliability |
| `direct_chat_messages_stream_error` | Load failure | Stream error | error | B6 | Firestore rules / network |

---

### Screen: Legacy chat room (`ChatRoomScreen`, `/messages/:id`)

- **Purpose:** **Mock** UI ported from web basis (`mock_data.dart`); schedule sheet; local-only send.
- **Main user goals:** (Placeholder — not production backend.)
- **Recommendation:** Deprecate route or wire to real DM; until then, track separately as `legacy_chat_room_*` for completeness.

#### Events

| `event_name` | description | trigger | event_type | goal_buckets | why_it_matters |
| --- | --- | --- | --- | --- | --- |
| `legacy_chat_room_opened` | Mock thread | Route | screen_session_start | B7 | Detect accidental traffic |
| `legacy_chat_room_mock_message_sent` | Local append | `_send` | engagement | B7 | Not a business outcome |

---

### Screen: Social posts feed (`SocialFeedScreen`, `/posts`)

- **Purpose:** Full `feed_posts` list (not shell tab); FAB create post.
- **Session:** `social_feed_started` / `_ended`
- **Engagement:** Open post; like/delete via `FeedPostCard`.

#### Events

| `event_name` | description | trigger | event_type | goal_buckets | why_it_matters |
| --- | --- | --- | --- | --- | --- |
| `social_feed_started` | Posts list opened | `/posts` | screen_session_start | B1, B6 | Alternate feed entry |
| `social_feed_create_post_clicked` | FAB | FAB | click | B1, B6 | UGC |
| `social_feed_post_opened` | Detail | Card | click | B1 | Depth |

---

### Screen: Create feed post (`CreatePostScreen`, `/feed/post/create`)

- **Purpose:** Text and/or image → Storage upload → `FeedPostsRepository.createPost` → navigate to detail via `pushFeedPostDetail`.
- **Conversions:** Post created.
- **Friction:** 10MB image cap; `assertCallerNotContentSuspended`.

#### Events

| `event_name` | description | trigger | event_type | goal_buckets | why_it_matters |
| --- | --- | --- | --- | --- | --- |
| `feed_post_compose_started` | Composer opened | Route | screen_session_start | B1, B6 | UGC funnel |
| `feed_post_image_picked` | Image attached | Picker | engagement | B1 | Media posts |
| `feed_post_create_submitted` | Attempt create | Save | submit | B1 | Intent |
| `feed_post_create_succeeded` | Post id returned | Repo + nav | conversion | B1, B6 | **Community post created** |
| `feed_post_create_blocked_suspended` | Blocked | `assertCallerNotContentSuspended` | error | B7 | Safety |
| `feed_post_create_failed` | Error | Catch | error | B6 | Pipeline |

---

### Screen: Post detail (`PostDetailScreen`, `/feed/post/:postId`)

- **Purpose:** View post; nested replies via `addReply`; like still only on card in list? (likes on `FeedPostCard` in list/home — in detail, replies).
- **Session:** `post_detail_started` / `_ended`
- **Conversions:** Reply submitted.
- **Friction:** Post not found; reply failure.

#### Events

| `event_name` | description | trigger | event_type | goal_buckets | why_it_matters |
| --- | --- | --- | --- | --- | --- |
| `post_detail_started` | Detail route | Route | screen_session_start | B1 | Thread view |
| `post_reply_started` | Chose reply target | UI control | engagement | B1 | Conversation threading |
| `post_reply_submitted` | Reply posted | `_sendReply` | conversion | B1, B7 | **Comment on social post** |
| `post_reply_failed` | Error | Catch | error | B6 | Rules |
| `post_detail_not_found` | Missing id | `_load` null | error | B6 | Bad links |

*(Likes/deletes tracked on card component — see Global components.)*

---

### Screen: Mortar feed (`MortarFeedScreen`, `/mortar-feed`)

- **Purpose:** List `mortar_info_posts` announcements.
- **Session:** `mortar_feed_started` / `_ended`
- **Conversions:** Open detail.

#### Events

| `event_name` | description | trigger | event_type | goal_buckets | why_it_matters |
| --- | --- | --- | --- | --- | --- |
| `mortar_feed_started` | Official feed | Route | screen_session_start | B1, B5 | Org-to-member comms |
| `mortar_feed_item_opened` | Open post | Tile | click | B1 | Content interest |

---

### Screen: Mortar info detail (`MortarInfoDetailScreen`, `/mortar-info/:postId`)

- **Purpose:** Full `MortarInfoFeedTile` (body, media, newsletter link via `safeLaunchUrl` in tile).
- **Session:** `mortar_info_detail_started` / `_ended`
- **Passive:** Video playback if embedded.
- **Conversions:** External link taps inside tile.

#### Events

| `event_name` | description | trigger | event_type | goal_buckets | why_it_matters |
| --- | --- | --- | --- | --- | --- |
| `mortar_info_detail_started` | Detail opened | Route | screen_session_start | B1, B5 | Read depth |
| `mortar_info_external_link_opened` | Newsletter / URL | Tile link | conversion | B1, B5 | Off-platform engagement |

---

### Screen: Profile view (`ProfileScreen`, `/profile`)

- **Purpose:** Read-only grouped profile; sign out; edit; achievements; staff link to reports; “Events you submitted” with status + view; section edit shortcuts.
- **Session:** `profile_tab_started` / `_ended`
- **Conversions:** Navigate edit/achievements/admin/events detail; sign out.
- **Friction:** Missing `users` doc CTA → `/onboarding`; load errors.

#### Events

| `event_name` | description | trigger | event_type | goal_buckets | why_it_matters |
| --- | --- | --- | --- | --- | --- |
| `profile_tab_started` | Profile tab shown | `/profile` | screen_session_start | B5, B7 | Identity hub |
| `profile_sign_out_clicked` | Sign out | TextButton + Firebase | conversion | B6, B7 | Session end |
| `profile_edit_all_clicked` | Open editor | Icon | click | B5, B7 | Profile maintenance |
| `profile_section_edit_clicked` | Jump to section | `ProfileSectionCard` | click | B5, B7 | Targeted edits |
| `profile_achievements_clicked` | Open badges | TextButton | click | B7 | Gamification |
| `profile_staff_reports_clicked` | Staff queue | Staff button | click | B7 | Moderation surface |
| `profile_submitted_event_view_clicked` | Open own submission | Row `View` | click | B1 | Event pipeline transparency |
| `profile_no_document_prompted_onboarding` | Missing profile | Empty doc UI | passive | B6 | Activation gap |

---

### Screen: Profile edit (`ProfileEditScreen`, `/profile/edit`)

- **Purpose:** Same curriculum fields as onboarding; optional deep link `?section=` scroll; saves `users/{uid}`.
- **Session:** `profile_edit_started` / `_ended`
- **Conversions:** Save success (pop or stay per implementation).
- **Friction:** Full validation `_validateFull`; scroll-to-section.

#### Events

| `event_name` | description | trigger | event_type | goal_buckets | why_it_matters |
| --- | --- | --- | --- | --- | --- |
| `profile_edit_started` | Editor opened | Route | screen_session_start | B3, B5, B7 | Profile updates drive matching |
| `profile_edit_section_param_applied` | Deep link section | Query param | passive | B6 | Support / email links |
| `profile_save_submitted` | Save pressed | Save | submit | B5, B7 | Maintenance intent |
| `profile_save_succeeded` | Firestore updated | Repo | conversion | B3, B5, B7 | **Profile updated** |
| `profile_save_failed` | Error | Catch | error | B6 | Data health |

---

### Screen: Achievements (`AchievementsScreen`, `/profile/achievements`)

- **Purpose:** `badge_definitions` stream + user `badges.earned` + counters (`UserGamificationCounters`: group posts created, group comments).
- **Session:** `achievements_screen_started` / `_ended`
- **Passive:** View locked/unlocked badges; empty definitions message.

#### Events

| `event_name` | description | trigger | event_type | goal_buckets | why_it_matters |
| --- | --- | --- | --- | --- | --- |
| `achievements_screen_started` | Achievements opened | Route | screen_session_start | B7 | Gamification engagement |
| `achievements_definitions_empty_shown` | No defs in Firestore | UI branch | passive | B7 | Admin config gap |

---

### Screen: Admin events stub (`AdminEventsScreen`, `/admin/events`)

- **Purpose:** Explains approvals happen in Digital Curriculum; button to `/admin/reports`.
- **Session:** `admin_events_stub_started`
- **Events:** `admin_events_nav_to_reports_clicked`

---

### Screen: Admin reports (`AdminReportsScreen`, `/admin/reports`)

- **Purpose:** Staff (`currentUserHasStaffClaim`) triage `user_reports`: expand card, load moderation snapshot (`AdminModerationRepository.getUserModerationSnapshot`), **Ban** / **Unsuspend** via `finalizeStaffModeration`.
- **Session:** `admin_reports_started` / `_ended`
- **Conversions:** Finalize moderation.
- **Friction:** Non-staff gated view.

#### Events

| `event_name` | description | trigger | event_type | goal_buckets | why_it_matters |
| --- | --- | --- | --- | --- | --- |
| `admin_reports_opened` | Staff queue | Route | screen_session_start | B7 | Safety operations |
| `admin_reports_access_denied` | No claim | FutureBuilder false | error | B7 | Security |
| `admin_report_expanded` | Triage detail | Toggle | engagement | B7 | Staff workload |
| `admin_report_snapshot_load_succeeded` | Snapshot available | Callable/Firestore | backend | B7 | Investigation depth |
| `admin_report_ban_finalized` | Ban recorded | `_finalize(ban:true)` | conversion | B7 | **Account outcome** |
| `admin_report_unsuspend_finalized` | Unsuspend recorded | `_finalize(ban:false)` | conversion | B7 | **Restoration outcome** |

---

### Global components & cross-cutting

#### `UserProfileModal` (`widgets/user_profile_modal.dart`)

- Profile summary; **Message** → `/messages/direct/...`; **Report** → `UserReportsRepository.submitReport`; may list user’s events → open `/events/:id`.

#### `FeedPostCard` (`widgets/feed_post_card.dart`)

- Card tap → post detail; avatar/name → profile modal; **like** `togglePostLike`; author **delete** with confirm.

#### `MessagingAttachmentPreview`

- Taps navigate to explore / skills / event depending on type.

#### Content suspension (`content_action_guard.dart`, `UserProfileRepository.isContentSuspended`)

| `event_name` | description | trigger | event_type | goal_buckets |
| --- | --- | --- | --- | --- |
| `content_action_blocked_suspended` | User tried blocked action | Guard true | error | B7 |
| `user_profile_modal_opened` | View another member | `showUserProfileModal` | view | B4, B7 |
| `user_profile_modal_message_clicked` | Start DM from modal | Button | click | B1, B4 |
| `user_profile_modal_report_submitted` | Safety report filed | Dialog submit | conversion | B7 |
| `user_profile_modal_event_link_opened` | Event from profile | List tap | click | B1 |
| `feed_post_like_toggled` | Like/unlike | `togglePostLike` | engagement | B1, B7 |
| `feed_post_delete_confirmed` | Author deleted post | Dialog + repo | conversion | B1 |
| `messaging_attachment_card_opened_target_explore` | Open job context | Preview tap | click | B2, B3 |

---

## 2. Master event table (consolidated)

Columns: **event_name** | **screen / flow** | **event_type** | **goal_buckets** | **short description**

| event_name | screen / flow | event_type | goal_buckets | short description |
| --- | --- | --- | --- | --- |
| `session_gate_screen_started` | Session gate | screen_session_start | B6, B7 | Auth/session loading surface |
| `session_initialize_backend_succeeded` | Auth controller | backend | B6, B7 | `initializeUserSession` OK |
| `session_initialize_backend_unauthorized` | Auth controller | error | B6, B7 | Access denied path |
| `landing_screen_started` | Landing | screen_session_start | B6 | Pre-auth marketing |
| `landing_claim_invite_clicked` | Landing | click | B6 | Start invite |
| `landing_sign_in_clicked` | Landing | click | B6 | Start sign-in |
| `auth_sign_in_submitted` | Sign in | submit | B6 | Login attempt |
| `auth_sign_in_succeeded` | Sign in | conversion | B6 | Login OK |
| `auth_sign_in_failed` | Sign in | error | B6 | Login failed |
| `invite_code_validation_succeeded` | Claim | backend | B6, B7 | Valid invite |
| `invite_account_create_succeeded` | Claim | conversion | B6, B7 | New account |
| `onboarding_screen_started` | Onboarding | screen_session_start | B3,B5,B6,B7 | Profile wizard |
| `onboarding_step_viewed` | Onboarding | view | B3,B5,B6,B7 | Funnel steps |
| `onboarding_completed` | Onboarding | conversion | B3,B5,B6,B7 | Profile complete |
| `welcome_intro_screen_started` | Welcome GIF | screen_session_start | B6 | Post-onboarding |
| `welcome_intro_navigated_home` | Welcome GIF | conversion | B6 | Enter shell |
| `main_tab_selected` | Shell | click | B1–B4,B6 | Tab switches |
| `home_screen_started` | Home | screen_session_start | B1,B5,B6 | Dashboard |
| `home_smart_matching_cta_clicked` | Home | click | B3,B4,B6 | Matching entry |
| `home_mortar_shop_opened` | Home | conversion | B5 | External shop |
| `home_feed_post_preview_opened` | Home | click | B1 | Post detail |
| `home_community_preview_opened` | Home | click | B1 | Group detail |
| `events_feed_tab_started` | Feed tab | screen_session_start | B1,B6 | Events list |
| `events_feed_subtab_changed` | Feed tab | engagement | B1,B7 | All vs registered |
| `events_feed_create_event_fab_clicked` | Feed tab | click | B1,B6 | Create event |
| `event_detail_screen_started` | Event detail | screen_session_start | B1,B6 | RSVP surface |
| `event_registered` | Event detail | conversion | B1,B6 | RSVP yes |
| `event_unregistered` | Event detail | conversion | B1 | RSVP no |
| `event_create_succeeded` | Event create | conversion | B1,B6 | Submitted member event |
| `groups_directory_started` | Groups | screen_session_start | B1,B6 | Community list |
| `groups_create_community_clicked` | Groups | click | B1,B4 | Create group |
| `group_detail_started` | Group detail | screen_session_start | B1,B4,B6 | Community hub |
| `group_join_succeeded_instant` | Group detail | conversion | B1 | Joined open group |
| `group_join_pending_review` | Group detail | conversion | B1 | Join request |
| `group_thread_created` | Group detail | conversion | B1,B7 | New thread |
| `group_thread_comment_submitted` | Group thread sheet | conversion | B1,B7 | New comment |
| `group_thread_upvoted` | Group thread | engagement | B1 | Upvote |
| `group_create_succeeded` | Group create | conversion | B1,B4 | New community |
| `group_metadata_save_succeeded` | Group edit | conversion | B1 | Metadata update |
| `group_delete_confirmed` | Group edit | conversion | B1 | Community deleted |
| `explore_screen_started` | Explore | screen_session_start | B2,B3,B4,B6 | Marketplace |
| `explore_filter_changed` | Explore | engagement | B2,B3,B6 | Filter |
| `explore_job_message_author_clicked` | Explore | click | B2,B3,B4 | Job DM |
| `explore_skill_message_author_clicked` | Explore | click | B3,B4 | Skill DM |
| `explore_network_search_query_updated` | Explore | engagement | B4,B7 | People search |
| `job_create_succeeded` | Job create | conversion | B2,B3,B6 | Job listing live |
| `skill_listing_create_succeeded` | Skill create | conversion | B3,B5,B6 | Skill listing live |
| `matching_start_clicked` | Matching | click | B3,B4,B6 | Run matcher |
| `matching_callable_succeeded` | Matching | backend | B3,B4 | Matches written |
| `matching_match_message_clicked` | Matching | click | B4,B6 | DM from match |
| `messages_inbox_started` | Messages | screen_session_start | B1,B4,B6 | Inbox |
| `messages_thread_opened` | Messages | click | B1,B4 | Open DM |
| `direct_chat_message_sent` | Direct chat | conversion | B1,B2,B3,B4 | Message sent |
| `social_feed_started` | Social feed | screen_session_start | B1,B6 | Posts list |
| `feed_post_create_succeeded` | Create post | conversion | B1,B6 | New social post |
| `post_reply_submitted` | Post detail | conversion | B1,B7 | Reply created |
| `feed_post_like_toggled` | Feed card | engagement | B1,B7 | Like |
| `feed_post_delete_confirmed` | Feed card | conversion | B1 | Author delete |
| `mortar_feed_started` | Mortar feed | screen_session_start | B1,B5 | Official posts |
| `mortar_info_external_link_opened` | Mortar detail | conversion | B1,B5 | External link |
| `profile_tab_started` | Profile | screen_session_start | B5,B7 | Own profile |
| `profile_save_succeeded` | Profile edit | conversion | B3,B5,B7 | Profile updated |
| `profile_sign_out_clicked` | Profile | conversion | B6,B7 | Sign out |
| `user_profile_modal_report_submitted` | Profile modal | conversion | B7 | Member report |
| `admin_report_ban_finalized` | Admin reports | conversion | B7 | Ban |
| `admin_report_unsuspend_finalized` | Admin reports | conversion | B7 | Unsuspend |
| `content_action_blocked_suspended` | Global guard | error | B7 | Suspended user blocked |

*(Table is representative; the screen sections above list the full intended instrumentation set.)*

---

## 3. Bucket summary (B1–B7)

### B1 — Community Engagement

**Events (representative):** `main_tab_selected` (tabs), `home_*`, `events_*`, `group_*`, `social_feed_*`, `feed_post_*`, `post_reply_*`, `mortar_*`, `messages_*`, `direct_chat_message_sent`, `event_rsvp_attendee_message_clicked`, `user_profile_modal_opened`, `explore_notifications_shortcut_clicked`, `group_thread_*`, `home_mortar_info_preview_tapped`.

**Gaps:** No explicit “session duration in group feed” beyond generic screen timers; **Share** on group thread footer is **non-functional UI** (icon only) — no event to hook; no RSVP **waitlist** analytics.

### B2 — Job Fulfillment

**Events:** `explore_job_message_author_clicked`, `job_create_*`, `messaging_attachment_card_opened_target_explore`, `direct_chat_message_sent` (with `attachment_type=job`).

**Gaps:** **No first-class job pipeline** in mobile UI (no apply, interview, hired, completed states). Fulfillment is **proxied by DMs**. Recommend Cloud Function / Firestore workflow events (`job_filled`, `job_closed`) if product adds status.

### B3 — Hiring Based on Skills

**Events:** `onboarding_*` skills, `profile_save_succeeded`, `job_skills_seeking_*`, `skill_offering_*`, `explore_filter_changed`, `matching_*`, `explore_job_message_author_clicked`, `explore_skill_message_author_clicked`.

**Gaps:** No employer-side **applicant queue**; matching scores shown but **no log of score components** unless you add params to events.

### B4 — Partnership Creation

**Events:** `matching_match_message_clicked`, `explore_network_member_message_clicked`, `group_member_message_clicked`, `user_profile_modal_message_clicked`, `event_rsvp_attendee_message_clicked`, `group_join_*`.

**Gaps:** No explicit **partnership record** (confirmed collaboration) in app schema surfaced to UI — partnerships are **implicit via messaging + groups**.

### B5 — User Business Success

**Events:** `home_mortar_shop_opened`, `onboarding_work_structure_changed`, `skill_listing_create_succeeded`, `profile_tab_started` (business logo), `mortar_info_external_link_opened`, profile links edited.

**Gaps:** **No revenue attribution** in-app; shop is external URL only. No CRM/pipeline for “deal won”.

### B6 — Conversion Timing & Funnels

**Events:** All `*_screen_started/ended`, auth + onboarding completion, `main_tab_selected`, `job_create_succeeded`, `event_registered`, `group_join_*`, `feed_post_create_succeeded`, `matching_callable_succeeded`, `session_*`.

**Gaps:** **No centralized funnel dashboard params** yet — implement consistent `funnel_step` user property. **ChatRoom mock route** could pollute funnels if linked.

### B7 — Behavior / User Profiles

**Events:** `achievements_*`, `feed_post_like_toggled`, `group_thread_comment_submitted`, `content_action_blocked_suspended`, `user_profile_modal_report_submitted`, `admin_*`, `explore_network_search_query_updated`, badge-related profile fields, `profile_staff_reports_clicked`.

**Gaps:** Core Phase 2 events are now emitted from the Flutter app via `ExpansionAnalytics` / `AnalyticsService` (see **How the feature works** below). Remaining gaps: **session replay** / automatic scroll depth, and many **optional** event names in this dossier that are not yet wired.

---

## 4. Missing or weak tracking opportunities (repo-specific)

1. **Client analytics (Phase 2 done):** `expansion_network` uses `AnalyticsService.logEvent` → Firestore `expansion_analytics_events` with schema validation. Pre–sign-in events are skipped for Firestore when `skipFirestoreWhenLoggedOut` is true unless rules allow anonymous writes (see `AnalyticsService` in the app).
2. **`/messages/:id` mock `ChatRoomScreen`** — misleading for real comms; instrument separately or remove from router for production analytics purity.
3. **Group thread “Share”** row is visual-only in `FirestoreThreadTile` — either implement share or remove to avoid false expectations.
4. **Job “fulfillment”** only measurable via **DM threads** and optional **attachment metadata** — add server-side milestones if hires matter.
5. **`initializeUserSession` outcomes** — log `state`, `reason`, latency; critical for access control diagnostics.
6. **`runExpansionUserMatching` results** — log `match_documents_written`, error codes, time-to-response; ties B3/B4 to backend health.
7. **Moderation**: pair `user_profile_modal_report_submitted` with **staff resolution latency** (already staff UI — add timestamps server-side if missing).
8. **Passive engagement**: scroll depth / time on **Explore** and **Matching** cards — not present; use `VisibilityDetector` or periodic heartbeat if product needs it.
9. **Mortar video/media** in `MortarInfoFeedTile` — add `mortar_media_play_started`, `mortar_newsletter_click` with URL host.
10. **Deep links**: `GoRouter` query `filter` on Explore and `section` on profile edit — log `deep_link_opened` with full URI once analytics exists.

---

## 5. All events **filtered by bucket** (master list for implementation)

Each bullet is an **`event_name`** assigned to that bucket (events can appear under multiple buckets above; here they are listed under **every** bucket they support).

### B1 — Community Engagement

- `session_gate_screen_started` *(peripheral)*
- `main_tab_selected` *(when tab is home, feed, groups)*
- `home_screen_started`, `home_create_post_fab_clicked`, `home_recent_activity_view_all_clicked`, `home_feed_post_preview_opened`, `home_empty_recent_activity_create_clicked`, `home_communities_see_all_groups_clicked`, `home_community_preview_opened`, `home_mortar_info_preview_tapped`, `home_stream_load_error`
- `events_feed_tab_started`, `events_feed_subtab_changed`, `events_feed_create_event_fab_clicked`, `events_feed_event_tile_opened`, `events_standalone_list_started`, `events_standalone_event_opened`
- `event_detail_screen_started`, `event_register_clicked`, `event_registered`, `event_unregistered`, `event_post_register_calendar_prompt_shown`, `event_post_register_calendar_added`, `event_rsvp_attendee_message_clicked`
- `event_create_screen_started`, `event_create_flyer_picked`, `event_create_submitted`, `event_create_succeeded`, `event_create_failed`
- `groups_directory_started`, `groups_search_query_changed`, `groups_yours_opened`, `groups_featured_opened`, `groups_explore_opened`, `groups_create_community_clicked`, `groups_stream_error`
- `group_detail_started`, `group_detail_tab_changed`, `group_thread_sort_changed`, `group_create_thread_opened`, `group_thread_created`, `group_thread_opened`, `group_thread_upvoted`, `group_thread_downvoted`, `group_thread_comment_submitted`, `group_comment_upvoted`, `group_comment_downvoted`, `group_member_message_clicked`, `group_join_clicked`, `group_join_succeeded_instant`, `group_join_pending_review`, `group_leave_confirmed`
- `group_create_started`, `group_create_succeeded`, `group_metadata_save_succeeded`, `group_delete_confirmed`
- `social_feed_started`, `social_feed_post_opened`, `social_feed_create_post_clicked`
- `feed_post_compose_started`, `feed_post_image_picked`, `feed_post_create_submitted`, `feed_post_create_succeeded`, `feed_post_create_failed`
- `post_detail_started`, `post_reply_submitted`, `post_reply_failed`
- `feed_post_like_toggled`, `feed_post_delete_confirmed`
- `mortar_feed_started`, `mortar_feed_item_opened`, `mortar_info_detail_started`, `mortar_info_external_link_opened`
- `messages_inbox_started`, `messages_thread_opened`, `messages_thread_avatar_profile_opened`
- `direct_chat_started`, `direct_chat_message_sent`, `direct_chat_attachment_preview_removed`
- `explore_notifications_shortcut_clicked`
- `user_profile_modal_opened`, `user_profile_modal_message_clicked`, `user_profile_modal_event_link_opened`
- `legacy_chat_room_opened`, `legacy_chat_room_mock_message_sent`

### B2 — Job Fulfillment

- `main_tab_selected` *(explore / messaging context)*
- `explore_screen_started`, `explore_filter_changed` *(jobs)*
- `home_latest_job_teaser_clicked`
- `explore_post_menu_opened`, `explore_post_job_nav_started`
- `job_create_started`, `job_skills_seeking_toggled`, `job_location_mode_changed`, `job_create_submitted`, `job_create_succeeded`, `job_create_failed`, `job_skills_cap_reached`
- `explore_job_message_author_clicked`
- `direct_chat_message_sent` *(param `attachment_type=job`)*
- `messaging_attachment_card_opened_target_explore`

### B3 — Hiring Based on Skills

- `onboarding_confident_skill_toggled`, `onboarding_desired_skill_toggled`, `onboarding_completed`
- `profile_save_succeeded`, `profile_edit_started`
- `explore_screen_started`, `explore_filter_changed` *(jobs/skills)*
- `home_latest_job_teaser_clicked`, `home_latest_skill_teaser_clicked`
- `job_skills_seeking_toggled`, `job_create_succeeded`
- `skill_offering_toggled`, `skill_listing_create_succeeded`
- `explore_job_message_author_clicked`, `explore_skill_message_author_clicked`
- `matching_screen_started`, `matching_start_clicked`, `matching_callable_started`, `matching_callable_succeeded`, `matching_callable_failed`, `matching_zero_results_prompted`, `matching_match_profile_opened`, `matching_match_message_clicked`
- `direct_chat_message_sent` *(params for attachment job/skill)*

### B4 — Partnership Creation

- `matching_screen_started`, `matching_start_clicked`, `matching_callable_succeeded`, `matching_match_profile_opened`, `matching_match_message_clicked`
- `explore_network_member_profile_opened`, `explore_network_member_message_clicked`, `explore_network_search_query_updated`, `explore_network_search_no_results`
- `explore_job_message_author_clicked`, `explore_skill_message_author_clicked`
- `group_member_message_clicked`, `group_join_succeeded_instant`, `group_join_pending_review`
- `user_profile_modal_message_clicked`, `event_rsvp_attendee_message_clicked`
- `direct_chat_message_sent`
- `group_create_succeeded` *(community partnership infrastructure)*

### B5 — User Business Success

- `onboarding_work_structure_changed`, `onboarding_business_logo_picked`, `onboarding_goal_toggled`, `onboarding_completed`
- `home_mortar_shop_opened`
- `skill_listing_create_succeeded`
- `profile_tab_started`, `profile_section_edit_clicked`, `profile_save_succeeded`, `profile_edit_started`
- `mortar_info_external_link_opened`, `mortar_feed_item_opened`

### B6 — Conversion Timing & Funnels

- `session_gate_screen_started`, `session_gate_screen_ended`, `session_initialize_backend_started`, `session_initialize_backend_succeeded`, `session_initialize_backend_unauthorized`
- `landing_screen_started`, `landing_claim_invite_clicked`, `landing_sign_in_clicked`, `landing_access_denied_dialog_shown`
- `auth_sign_in_screen_started`, `auth_sign_in_submitted`, `auth_sign_in_succeeded`, `auth_sign_in_failed`, `auth_sign_in_back_to_landing`, `auth_sign_in_navigate_to_claim`
- `auth_claim_screen_started`, `invite_code_validation_submitted`, `invite_code_validation_succeeded`, `invite_code_validation_failed`, `invite_account_create_submitted`, `invite_account_create_succeeded`, `invite_existing_account_sign_in_submitted`, `invite_flow_failed`, `auth_claim_navigate_to_sign_in`
- `onboarding_screen_started`, `onboarding_step_viewed`, `onboarding_step_validation_failed`, `onboarding_save_submitted`, `onboarding_completed`, `onboarding_save_failed`, `onboarding_abandoned`
- `welcome_intro_screen_started`, `welcome_intro_playback_completed`, `welcome_intro_navigated_home`, `welcome_intro_decode_failed`
- `main_tab_selected`, `main_shell_resumed`
- All major `*_screen_started` / `*_screen_ended` pairs listed in sections above
- `home_smart_matching_cta_clicked`, `explore_matching_cta_clicked`
- `event_registered`, `group_join_succeeded_instant`, `group_join_pending_review`
- `job_create_succeeded`, `skill_listing_create_succeeded`, `feed_post_create_succeeded`, `event_create_succeeded`
- `matching_callable_succeeded`, `direct_chat_message_sent`

### B7 — Behavior / User Profiles

- `session_initialize_backend_unauthorized`, `landing_access_denied_dialog_shown`
- `onboarding_step_viewed`, `onboarding_goal_toggled`, `onboarding_confident_skill_toggled`, `onboarding_desired_skill_toggled`, `onboarding_tribe_selected`, `onboarding_profile_photo_picked`, `onboarding_business_logo_picked`, `onboarding_abandoned`
- `main_tab_selected`, `events_feed_subtab_changed`, `explore_filter_changed`, `explore_network_search_query_updated`
- `achievements_screen_started`, `achievements_definitions_empty_shown`
- `feed_post_like_toggled`, `group_thread_comment_submitted`, `group_thread_created`
- `content_action_blocked_suspended`, `home_create_post_blocked_suspended`, `events_feed_create_blocked_suspended`, `groups_create_blocked_suspended`, `group_create_thread_blocked_suspended`, `feed_post_create_blocked_suspended`, `explore_post_job_blocked_suspended`
- `user_profile_modal_opened`, `user_profile_modal_report_submitted`
- `profile_staff_reports_clicked`, `admin_reports_opened`, `admin_reports_access_denied`, `admin_report_expanded`, `admin_report_snapshot_load_succeeded`, `admin_report_ban_finalized`, `admin_report_unsuspend_finalized`
- `matching_zero_results_prompted`, `matching_callable_failed`, `legacy_chat_room_opened`

---

### How the feature works (Phase 2 — Expansion mobile client analytics)

- **Helper:** `ExpansionNetworkApp/expansion_network/lib/analytics/expansion_analytics.dart` exposes `ExpansionAnalytics.log(eventName, { entityId, sourceScreen, attachmentType, extra })`. Dart uses camelCase; documents store **`entity_id`**, **`source_screen`**, and **`attachment_type`** under `properties` (plus any `extra` keys) for funnel queries.
- **Delivery:** `AnalyticsService.instance.logEvent` (Phase 1) validates, merges `screen` / `route` / `session_id`, and writes to **`expansion_analytics_events`** when the user is signed in (configurable skip when logged out).
- **Coverage:** Phase 2 wires the conversion and core action names listed in the user’s B6–B7 checklist: session gate + `initializeUserSession` outcomes, landing/auth/claim/onboarding/welcome/shell tab selection, home/events/groups/explore/matching/messages/DMs/social feed/mortar info, jobs/skills/events/groups/thread and post flows, matching callable + message CTAs, shop + external newsletter links, profile tab + sign out. **Conversion deduping:** examples include `onboarding_completed` (once per screen state) and distinct success vs click events for events and group join.
- **How to verify:** Run the app signed in, perform flows in the Phase 2 test plan, and query **`expansion_analytics_events`** in Firebase Console (or export). Pre-auth funnel steps may appear only in debug logs until rules or auth strategy allow logged-out writes.

### How the feature works (Phase 3 — validation, friction, behavior depth)

- **Errors (`error_code` / `error_message`):** `ExpansionAnalytics.errorExtras(Object e, {String? code})` attaches compact payloads to failure events (for example `session_initialize_backend_failed`, callable/stream/send failures, invite validation/flow failures, onboarding save failures).
- **Suspension surfaces:** `blockContentActionIfSuspended(context, blockedSurfaceEvent: ...)` emits the **surface-specific** blocked event when supplied; otherwise it logs `content_action_blocked_suspended`.
- **Streams (no spam):** Home cards, events list/feed stream, group directory, group watch, explore jobs/skills streams, and DM messages log at most **one** error event per widget/session via local flags and/or a post-frame callback.
- **Engagement depth:** Post/reply like toggles and confirmed post delete, thread/comment votes, group leave after confirm, events feed subtab changes, post-RSVP calendar prompt + native add success, explore filter/search (search query debounced ~550ms; no-results throttled per query ~90s).
- **Onboarding depth:** Step validation failures, save failure, abandon-on-dispose unless profile save completed, confident/desired skill toggles (counts without raw skill strings in PII-sensitive paths), goal toggles, `onChangeEnd` work sliders (throttled naturally by release), business logo picked.
- **Staff / moderation / achievements:** Admin reports opened/denied/expand/snapshot loaded/ban-unsuspend finalized; profile staff CTA; achievements screen started + empty-definitions shown once; user profile modal opened + report submitted.

### How the feature works (Phase 4 — summary layer & admin visibility)

- **Trigger:** `onExpansionAnalyticsEventCreated` runs once per new document in **`expansion_analytics_events`** and calls `applyExpansionMobileRollupsForEvent` in a **single Firestore transaction** (no double counting from retries unless the event doc is recreated).
- **Rollups:** Updates **`user_analytics_summary/{userId}`** (per-event counters, `last_active_at`, UTC-day streak fields), **`daily_metrics/{YYYY-MM-DD}`** (DAU first touch that UTC day, `new_users` on `invite_account_create_succeeded`, posts/messages/jobs/skills/RSVPs, per-`event_name` tallies under `counts`), **`funnel_summary`** (`auth`, `onboarding`, `matching`, `job_to_message`, `event_to_rsvp`), **`friction_summary/{event_name}`** for error-style names, **`community_summary/{groupId}`**, **`matching_summary/{userId}`**, **`job_summary/{jobId}`** when `properties.entity_id` is present for job create / job message CTA.
- **Client IDs for job summaries:** `job_create_succeeded` logs **`entity_id`** as the new job document id so **`job_summary/{jobId}`** updates; `explore_job_message_author_clicked` should also pass the job id as **`entity_id`**. `skill_listing_create_succeeded` logs **`entity_id`** as the skill listing id for raw queries and future listing-level rollups (not written to `job_summary` today).
- **Admin UI:** **Digital Curriculum → Admin Panel → Mobile analytics** and **Mortar Next.js → Admin → Mobile analytics** (`MobileAnalyticsSummariesPanel.tsx` in each app) call **`getAdminMobileAnalyticsDashboard`** (today/yesterday + funnels + friction), **`getAdminMobileAnalyticsRangeSummaries`** (one `daily_metrics` doc per UTC day in a range, max 62 days), **`getAdminUserAnalyticsSummary`** / **`batchGetUserAnalyticsSummaries`** (per-user lifetime `user_analytics_summary`), and **`queryAdminExpansionAnalyticsEvents`** with optional **`ingested_after_ms`** / **`ingested_before_ms`** (max 92-day window per query). **Download JSON bundle** merges range summaries, all raw events in the UTC window (cap 120k events), and batched user summaries for distinct `user_id`s in those events (up to 5k users). **Note:** `funnel_summary` and `friction_summary` are **cumulative** Firestore counters, not recomputed per calendar day; per-day behavior is in **`daily_metrics`** and raw events.

### How the feature works (Phase 5 — derived metrics & funnels, Expansion-facing)

- **Collection:** **`derived_metrics/{YYYY-MM-DD}`** (UTC), staff-read only. Written from **`daily_metrics/{date}`** only (no raw `expansion_analytics_events` reads in the job).
- **Scheduler:** **`scheduledPhase4DerivedMetrics`** (01:30 UTC) runs **`writePhase4DerivedMetricsForDay`** then **`writePhase5DerivedMetricsForDay`** for the **previous** UTC calendar day so the day’s counters are complete.
- **Manual backfill (admin):** Callable **`adminRunDerivedMetricsForUtcRange`** with **`start_date_utc`** / **`end_date_utc`** (inclusive, max 62 days) — same writers; skips days with no **`daily_metrics`** doc. **Admin → Mobile analytics** exposes **Run Phase 4 + 5 derived for range** using the date inputs in that tab (deploy the function first).
- **Metrics:** Per-day onboarding conversion (mobile `raw_event` steps), event RSVP rate, group join rate, job→message and match→message rates, posts/messages per DAU, web blend `onboarding_completions` / `signups`, funnel drop-off objects (`funnel_dropoffs_daily`), plus **status / insight / action** strings for dashboard cards.
- **First-touch timestamps (for drill-down):** On first **`direct_chat_message_sent`** / **`matching_match_message_clicked`**, **`user_analytics_summary`** sets **`expansion_first_direct_message_at`** / **`expansion_first_match_message_click_at`** (ISO in admin exports). Aggregate “time to first message” distributions are not in `derived_metrics` v1.

---

*End of Step 2 deliverable for Expansion mobile (`ExpansionNetworkApp/expansion_network`).*
