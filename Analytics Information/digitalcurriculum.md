# Digital Curriculum (Vite) — exhaustive analytics event inventory

**Scope:** [Digital Curriculum/](Digital Curriculum/) React/Vite app only. **Excluded:** [ExpansionNetworkApp/](ExpansionNetworkApp/) (Flutter). In-repo `/mobile/*` routes are **web UI previews** (same Vite bundle), not the native app.

**Routing source:** [Digital Curriculum/src/app/routes.tsx](Digital Curriculum/src/app/routes.tsx). **Auth shells:** [AuthGuard.tsx](Digital Curriculum/src/app/components/auth/AuthGuard.tsx), [OnboardingGate.tsx](Digital Curriculum/src/app/components/auth/OnboardingGate.tsx), [RoleGate.tsx](Digital Curriculum/src/app/components/auth/RoleGate.tsx).

---

## Legend

### Goal buckets (tag every event with all that apply)

| Code | Bucket |
|------|--------|
| **B1** | Sales / revenue |
| **B2** | Community engagement |
| **B3** | Course engagement |
| **B4** | Course completion and skill gain |
| **B5** | Drop-off / friction / abandonment |
| **B6** | Conversion timing |
| **B7** | Customer profiles / habits |

### Event `category`

`screen_session_start` · `screen_session_end` · `click` · `submit` · `view` · `engagement` · `conversion` · `error` · `abandonment` · `backend` · `derived`

### `track`

`FE` = client instrumentable · `BE` = server / scheduled / trigger only · `both` = recommend duplicate-safe pairing (usually FE intent + BE outcome).

### `inst` (instrumentation in repo today)

- **missing** — no GA `logEvent`, no `httpsCallable(..., "logAnalyticsEvent")`, no `analytics_events` write from this path.
- **partial** — durable signal exists in **Firestore** (or localStorage) but not in `analytics_events` / GA; warehouse can derive.
- **instrumented** — `analytics_events` or equivalent backend writer exists **and** the Digital Curriculum client path can reach it (or auth trigger applies to all signups).

### Standard properties (attach where relevant)

**Required (minimum):** `screen_name`, `screen_session_id`, `timestamp`, `platform` (`web`), `app_version` (build/git sha or package version).

**Context:** `route_path`, `previous_screen`, `entry_source` (deep link, nav, notification), `cta_name`, `cta_location`.

**Curriculum:** `course_id`, `course_title`, `curriculum_id`, `module_id`, `chapter_id`, `lesson_id`, `lesson_title`, `content_type` (`slides`|`media`|`images`), `slide_index`, `slide_count`, `quiz_required`, `survey_required`.

**Commerce:** `product_id`, `shop_category`, `size`, `cart_line_key`, `reservation_expires_at`, `currency`, `price`.

**Community:** `discussion_id`, `reply_id`, `parent_reply_id`, `group_id`, `event_id`, `is_anonymous`.

**User traits (join or set):** `user_id`, `roles[]`, `onboarding_status`, `cohort_id`, `city`, `state`, `business_goals[]`, `confident_skills[]`, `desired_skills[]`, `industry`, `membership_status` (from `users` / claims as available).

---

## 1. Master raw event inventory (by surface)

> **Buckets:** comma-separated B1–B7. **Notes:** file anchors; `Firestore:` collection paths; **no client analytics** is present under `Digital Curriculum/` (grep: no `getAnalytics`, no `logAnalyticsEvent` callable usage).

### 1.1 Global / chrome (not a dedicated route)

| event_name | screen_page_flow | user_action_or_trigger | when_it_fires | category | buckets | track | inst | implementation_notes |
|--------------|------------------|------------------------|---------------|----------|---------|-------|------|------------------------|
| `screen_session_started` | `chrome:web_navigation` | Route renders with `WebNavigation` | Any authenticated layout load with web nav | screen_session_start | B3,B5,B6,B7 | FE | missing | [WebNavigation.tsx](Digital Curriculum/src/app/components/web/WebNavigation.tsx) |
| `screen_session_ended` | `chrome:web_navigation` | Navigate away / unload | `beforeunload` or router swap | screen_session_end | B3,B5,B7 | FE | missing | Pair with session_id |
| `nav_link_clicked` | `chrome:web_navigation` | User clicks primary nav `Link` | click on `/dashboard`, `/curriculum`, etc. | click | B3,B6,B7 | FE | missing | Items from `allNavItems` in WebNavigation |
| `notification_bell_toggled` | `chrome:web_navigation` | Bell `DropdownMenu` open/close | Radix open change | click | B2,B5,B7 | FE | missing | [WebNavigation.tsx](Digital Curriculum/src/app/components/web/WebNavigation.tsx) |
| `notification_item_clicked` | `chrome:web_navigation` | User selects notification row | `DropdownMenuItem` onClick | click | B2,B4,B6 | FE | missing | If `certificateId`: marks read + `navigate("/data-room")` |
| `notification_mark_read_backend` | `chrome:web_navigation` | Same as above | After `markNotificationRead` | backend | B2,B4 | both | partial | Firestore write in [dataroom.ts](Digital Curriculum/src/app/lib/dataroom.ts) (instrument `logEvent` + confirm write) |
| `view_data_room_from_notifications_clicked` | `chrome:web_navigation` | Footer row "View Data Room" | click | click | B3,B4,B6 | FE | missing | WebNavigation |
| `cart_dropdown_toggled` | `chrome:web_navigation` | Cart icon open/close | Radix open change | click | B1,B5,B7 | FE | missing | WebNavigation |
| `cart_line_remove_clicked` | `chrome:web_navigation` | Remove line in cart dropdown | X button: `releaseStock` + `api.removeLine` | click | B1,B5 | both | partial | [shop.ts](Digital Curriculum/src/app/lib/shop.ts) `releaseStock`; local cart [cart.ts](Digital Curriculum/src/app/lib/cart.ts) |
| `cart_continue_to_shop_clicked` | `chrome:web_navigation` | "Continue Shopping" in cart | Navigates `/shop` | click | B1,B6 | FE | missing | WebNavigation |
| `sign_out_clicked` | `chrome:web_navigation` | Sign out button | `signOut` + `/login` | click | B5,B6,B7 | FE | missing | [AuthProvider.tsx](Digital Curriculum/src/app/components/auth/AuthProvider.tsx) |
| `mobile_nav_web_app_link_clicked` | `chrome:mobile_navigation` | "Web App →" link | click | click | B3,B6,B7 | FE | missing | [MobileNavigation.tsx](Digital Curriculum/src/app/components/mobile/MobileNavigation.tsx) |

### 1.2 Auth gate & loading (shared across protected routes)

| event_name | screen_page_flow | user_action_or_trigger | when_it_fires | category | buckets | track | inst | implementation_notes |
|--------------|------------------|------------------------|---------------|----------|---------|-------|------|------------------------|
| `auth_guard_loading_viewed` | `flow:auth_guard` | `AuthGuard` loading spinner | While `loading` true | view | B5,B7 | FE | missing | [AuthGuard.tsx](Digital Curriculum/src/app/components/auth/AuthGuard.tsx) |
| `auth_guard_redirect_unauthenticated` | `flow:auth_guard` | No user | Navigate `/login` | abandonment | B5,B6 | FE | missing | Replace navigation |
| `onboarding_gate_loading_viewed` | `flow:onboarding_gate` | Gate spinner | While checking Firestore `users/{uid}` | view | B5,B7 | FE | missing | [OnboardingGate.tsx](Digital Curriculum/src/app/components/auth/OnboardingGate.tsx) |
| `onboarding_gate_redirect_incomplete_profile` | `flow:onboarding_gate` | Required profile fields missing | `navigate("/onboarding")` | abandonment | B5,B6,B7 | FE | missing | Compare: identity, goals, skills×2, industry |
| `onboarding_gate_allow_access` | `flow:onboarding_gate` | Status complete/partial or fields satisfied | Gate clears | conversion | B6,B7 | FE | missing | Success path into app |
| `role_gate_loading_viewed` | `flow:role_gate` | RoleGate spinner | loading | view | B5 | FE | missing | [RoleGate.tsx](Digital Curriculum/src/app/components/auth/RoleGate.tsx) |
| `role_gate_redirect_unauthenticated` | `flow:role_gate` | No user | `/login` | abandonment | B5,B6 | FE | missing | |
| `role_gate_redirect_denied` | `flow:role_gate` | Denied role or missing allowed role | Navigate `fallbackPath` default `/dashboard` | error | B5,B6 | FE | missing | e.g. `/analytics` denied for "Digital Curriculum Students" per routes |

### 1.3 `/login` — [Login.tsx](Digital Curriculum/src/app/pages/Login.tsx)

| event_name | screen_page_flow | user_action_or_trigger | when_it_fires | category | buckets | track | inst | implementation_notes |
|--------------|------------------|------------------------|---------------|----------|---------|-------|------|------------------------|
| `screen_session_started` | `/login` | Mount | Route enter | screen_session_start | B5,B6,B7 | FE | missing | |
| `screen_session_ended` | `/login` | Unmount / navigate away | Route exit | screen_session_end | B5,B7 | FE | missing | |
| `login_sign_in_mode_toggled` | `/login` | "Don't have an account?" toggle | `setIsSignUp` | click | B6,B7 | FE | missing | Same screen, different mode |
| `login_submit_attempted` | `/login` | Form submit | `handleAuth` start | submit | B5,B6,B7 | FE | missing | Includes sign-in + sign-up |
| `login_sign_in_succeeded` | `/login` | Firebase sign-in OK | Before `/dashboard` | conversion | B3,B6,B7 | FE | partial | Also custom claims fetch in [auth.ts](Digital Curriculum/src/app/lib/auth.ts) |
| `login_sign_in_failed` | `/login` | Auth error | catch branch | error | B5,B7 | FE | missing | Surface `err.message` |
| `login_sign_up_succeeded` | `/login` | Firebase sign-up OK | Navigate `/dashboard` | conversion | B3,B6,B7 | FE | partial | **Backend:** `user_created` in `analytics_events` from [onUserCreated.ts](functions/src/triggers/onUserCreated.ts) when Auth user created |
| `login_forgot_password_clicked` | `/login` | "Forgot password?" | `setShowForgotPassword(true)` | click | B5,B6 | FE | missing | |
| `login_password_reset_submitted` | `/login` (reset card) | Reset form submit | `sendPasswordReset` | submit | B5,B6 | FE | missing | [auth.ts](Digital Curriculum/src/app/lib/auth.ts) |
| `login_password_reset_succeeded` | `/login` (reset card) | Email sent | UI success state | conversion | B5,B6 | FE | missing | |
| `login_password_reset_failed` | `/login` (reset card) | Email send error | catch | error | B5 | FE | missing | |
| `login_back_from_reset_clicked` | `/login` (reset card) | Back to login | button | click | B5 | FE | missing | |
| `login_join_invite_link_clicked` | `/login` | Link to `/join` | `Link` click | click | B6,B7 | FE | missing | |

### 1.4 `/join` — [Join.tsx](Digital Curriculum/src/app/pages/Join.tsx)

| event_name | screen_page_flow | user_action_or_trigger | when_it_fires | category | buckets | track | inst | implementation_notes |
|--------------|------------------|------------------------|---------------|----------|---------|-------|------|------------------------|
| `screen_session_started` | `/join` | Mount | enter | screen_session_start | B6,B7 | FE | missing | |
| `screen_session_ended` | `/join` | Unmount | exit | screen_session_end | B7 | FE | missing | |
| `join_submit_attempted` | `/join` | Form submit | `handleJoin` | submit | B6,B7 | FE | missing | Invite code validated client-side only (empty check); **not** wired to `validateInviteCode` callable |
| `join_sign_up_succeeded` | `/join` | `signUp` OK | Navigate `/dashboard` | conversion | B3,B6,B7 | FE | partial | Same `user_created` backend as login sign-up |
| `join_sign_up_failed` | `/join` | Auth error | catch | error | B5,B7 | FE | missing | |
| `join_back_to_login_clicked` | `/join` | Link `/login` | click | click | B5 | FE | missing | |

### 1.5 `/verify-email` — [VerifyEmail.tsx](Digital Curriculum/src/app/pages/VerifyEmail.tsx)

| event_name | screen_page_flow | user_action_or_trigger | when_it_fires | category | buckets | track | inst | implementation_notes |
|--------------|------------------|------------------------|---------------|----------|---------|-------|------|------------------------|
| `screen_session_started` | `/verify-email` | Mount | enter | screen_session_start | B5,B6,B7 | FE | missing | |
| `verify_email_loading_viewed` | `/verify-email` | Simulated verify | `setTimeout` 2s | view | B5 | FE | missing | **Product note:** mock verification only |
| `verify_email_invalid_link_viewed` | `/verify-email` | Missing `mode`/`oobCode` | error UI | error | B5 | FE | missing | |
| `verify_email_success_viewed` | `/verify-email` | Simulated success | after timeout | conversion | B6,B7 | FE | missing | |
| `verify_email_continue_onboarding_clicked` | `/verify-email` | Button | `navigate("/onboarding")` | click | B6,B3 | FE | missing | |
| `verify_email_go_login_clicked` | `/verify-email` | Error state CTA | `/login` | click | B5,B6 | FE | missing | |

### 1.6 `/onboarding` — [Onboarding.tsx](Digital Curriculum/src/app/pages/Onboarding.tsx) + step components

| event_name | screen_page_flow | user_action_or_trigger | when_it_fires | category | buckets | track | inst | implementation_notes |
|--------------|------------------|------------------------|---------------|----------|---------|-------|------|------------------------|
| `screen_session_started` | `/onboarding` | Mount | enter | screen_session_start | B3,B5,B6,B7 | FE | missing | |
| `screen_session_ended` | `/onboarding` | Unmount | exit | screen_session_end | B5,B7 | FE | missing | |
| `onboarding_data_load_failed` | `/onboarding` | `getDoc` users/{uid} throws | catch in load | error | B5 | FE | missing | Currently logs console; still allows flow |
| `onboarding_step_viewed` | `/onboarding` | Step render | `currentStep` 1–7 | view | B3,B5,B7 | FE | missing | Prop `onboarding_step_id` |
| `onboarding_partial_save_succeeded` | `/onboarding` | Next / Skip | `saveData(true)` merges `users` doc | backend | B3,B4,B6,B7 | both | partial | Firestore `setDoc` merge [Onboarding.tsx](Digital Curriculum/src/app/pages/Onboarding.tsx) |
| `onboarding_partial_save_failed` | `/onboarding` | Save error | `alert` + throw | error | B5 | FE | missing | |
| `onboarding_skip_clicked` | `/onboarding` | "Skip for now" | `handleSkip` → partial save | abandonment | B5,B7 | FE | missing | Still writes partial |
| `onboarding_final_save_succeeded` | `/onboarding` | Step 7 complete | `saveData(false)` status `complete` | conversion | B3,B4,B6,B7 | both | partial | `onboarding_status: complete` |
| `onboarding_completion_viewed` | `/onboarding` | Step 8 | UI shown | view | B4,B6,B7 | FE | missing | Auto `navigate("/dashboard")` after 3s |
| `onboarding_go_dashboard_clicked` | `/onboarding` | Completion CTA | click | click | B3,B6 | FE | missing | |
| `onboarding_nudge_sent` | `backend:scheduled` | Scheduled incomplete profiles | Cloud Scheduler trigger | backend | B5,B7 | BE | instrumented | [scheduledNudgeIncompleteProfiles.ts](functions/src/triggers/scheduledNudgeIncompleteProfiles.ts) → `analytics_events` `onboarding_nudge_sent` (**not** invoked from DC client) |

### 1.7 `/dashboard` — [Dashboard.tsx](Digital Curriculum/src/app/pages/web/Dashboard.tsx)

| event_name | screen_page_flow | user_action_or_trigger | when_it_fires | category | buckets | track | inst | implementation_notes |
|--------------|------------------|------------------------|---------------|----------|---------|-------|------|------------------------|
| `screen_session_started` | `/dashboard` | Mount | enter | screen_session_start | B3,B6,B7 | FE | missing | |
| `screen_session_ended` | `/dashboard` | Unmount | exit | screen_session_end | B7 | FE | missing | |
| `dashboard_data_load_failed` | `/dashboard` | `loadData` catch | console.error | error | B5 | FE | missing | Silent aside from log |
| `dashboard_continue_learning_clicked` | `/dashboard` | Primary CTA | `navigate(continueUrl)` or `/curriculum` | click | B3,B6,B7 | FE | missing | **Broken deep link:** `continueUrl` is `/learn/${courseId}?lesson=${lessonId}` ([Dashboard.tsx](Digital Curriculum/src/app/pages/web/Dashboard.tsx) L198–200) but router only defines `/learn/lesson/:lessonId` ([routes.tsx](Digital Curriculum/src/app/routes.tsx) L151). Emit `dashboard_continue_url_invalid` when fixing. |
| `dashboard_open_course_clicked` | `/dashboard` | Secondary CTA | `/courses/:id` | click | B3,B6 | FE | missing | |
| `dashboard_tile_curriculum_clicked` | `/dashboard` | Curriculum tile | `/curriculum` | click | B3,B6 | FE | missing | Keyboard handler Enter/Space |
| `dashboard_tile_data_room_clicked` | `/dashboard` | Data Room tile | `/data-room` | click | B3,B4,B6 | FE | missing | |
| `dashboard_tile_community_clicked` | `/dashboard` | Community tile | `/community` | click | B2,B6 | FE | missing | |
| `dashboard_group_row_clicked` | `/dashboard` | Group row | `/groups/:id` | click | B2,B6,B7 | FE | missing | `stopPropagation` pattern |
| `dashboard_event_row_clicked` | `/dashboard` | Event row | `/events/:id` | click | B2,B6 | FE | missing | |
| `dashboard_tile_shop_clicked` | `/dashboard` | Shop tile | `/shop` | click | B1,B6 | FE | missing | |
| `dashboard_passive_time_on_screen` | `/dashboard` | Dwell | heartbeat / visibility API | engagement | B7 | FE | missing | Optional heartbeat |

### 1.8 `/curriculum` — [Curriculum.tsx](Digital Curriculum/src/app/pages/web/Curriculum.tsx)

| event_name | screen_page_flow | user_action_or_trigger | when_it_fires | category | buckets | track | inst | implementation_notes |
|--------------|------------------|------------------------|---------------|----------|---------|-------|------|------------------------|
| `screen_session_started` | `/curriculum` | Mount | enter | screen_session_start | B3,B6,B7 | FE | missing | |
| `screen_session_ended` | `/curriculum` | Unmount | exit | screen_session_end | B7 | FE | missing | |
| `curriculum_load_failed` | `/curriculum` | `loadCourses` catch | error | error | B5 | FE | missing | |
| `curriculum_course_card_clicked` | `/curriculum` | Card | `/courses/:courseId` | click | B3,B6,B7 | FE | missing | Whole card clickable |
| `curriculum_continue_clicked` | `/curriculum` | "Continue" on most recent | `getLessonUrl(course,true)` | click | B3,B4,B6,B7 | FE | missing | Builds `/learn/lesson/:lessonId?curriculumId&moduleId&chapterId&courseId&slideIndex` |
| `curriculum_graduation_apply_opened` | `/curriculum` | Opens dialog | `setApplicationDialogOpen(true)` | click | B4,B6,B7 | FE | missing | When eligible (not alumni, all courses complete — see file) |
| `curriculum_empty_state_viewed` | `/curriculum` | No courses | empty card | view | B5 | FE | missing | |

### 1.9 Modal: Graduation application — [GraduationApplicationDialog.tsx](Digital Curriculum/src/app/components/graduation/GraduationApplicationDialog.tsx)

| event_name | screen_page_flow | user_action_or_trigger | when_it_fires | category | buckets | track | inst | implementation_notes |
|--------------|------------------|------------------------|---------------|----------|---------|-------|------|------------------------|
| `screen_session_started` | `modal:graduation_application` | `open=true` | dialog open | screen_session_start | B4,B6,B7 | FE | missing | Use nested `screen_session_id` |
| `screen_session_ended` | `modal:graduation_application` | `open=false` | dialog close | screen_session_end | B5,B7 | FE | missing | |
| `graduation_slot_added` | `modal:graduation_application` | Plus button | add slot ≤3 | click | B4,B7 | FE | missing | |
| `graduation_slot_removed` | `modal:graduation_application` | Remove | click | click | B4,B7 | FE | missing | |
| `graduation_slot_field_updated` | `modal:graduation_application` | Date/time edits | change | engagement | B4,B7 | FE | missing | |
| `graduation_application_validation_failed` | `modal:graduation_application` | Client validation | before submit | error | B5 | FE | missing | `setError` messages |
| `graduation_application_submitted` | `modal:graduation_application` | Successful submit | `submitGraduationApplication` | conversion | B4,B6,B7 | both | partial | Firestore `GraduationApplications` addDoc [graduation.ts](Digital Curriculum/src/app/lib/graduation.ts) |
| `graduation_application_submit_failed` | `modal:graduation_application` | Firestore error | catch | error | B5 | FE | missing | |

### 1.10 `/curriculum/:moduleId` — [ModuleDetail.tsx](Digital Curriculum/src/app/pages/web/ModuleDetail.tsx)

| event_name | screen_page_flow | user_action_or_trigger | when_it_fires | category | buckets | track | inst | implementation_notes |
|--------------|------------------|------------------------|---------------|----------|---------|-------|------|------------------------|
| `screen_session_started` | `/curriculum/:moduleId` | Mount | enter | screen_session_start | B3,B5,B7 | FE | missing | |
| `screen_session_ended` | `/curriculum/:moduleId` | Unmount | exit | screen_session_end | B7 | FE | missing | |
| `module_detail_back_clicked` | `/curriculum/:moduleId` | Back | `/curriculum` | click | B5 | FE | missing | |
| `module_detail_mark_course_complete_clicked` | `/curriculum/:moduleId` | Per-row complete | localStorage + state | conversion | B3,B4,B7 | FE | partial | **Mock catalog** — not tied to Firestore `courseProgress` |
| `module_detail_mark_all_complete_clicked` | `/curriculum/:moduleId` | "Complete all" | localStorage | conversion | B3,B4,B7 | FE | partial | Same — demo data only |
| `module_detail_local_storage_corrupt` | `/curriculum/:moduleId` | JSON parse error | catch | error | B5 | FE | missing | |

### 1.11 `/courses/:courseId` — [CourseDetail.tsx](Digital Curriculum/src/app/pages/web/CourseDetail.tsx)

| event_name | screen_page_flow | user_action_or_trigger | when_it_fires | category | buckets | track | inst | implementation_notes |
|--------------|------------------|------------------------|---------------|----------|---------|-------|------|------------------------|
| `screen_session_started` | `/courses/:courseId` | Mount | enter | screen_session_start | B3,B6,B7 | FE | missing | |
| `screen_session_ended` | `/courses/:courseId` | Unmount | exit | screen_session_end | B7 | FE | missing | |
| `course_detail_load_failed` | `/courses/:courseId` | `loadCourse` catch | console.error | error | B5 | FE | missing | |
| `course_not_found_viewed` | `/courses/:courseId` | `!course` after load | UI | error | B5 | FE | missing | CTA back `/curriculum` |
| `course_detail_back_clicked` | `/courses/:courseId` | Back | `/curriculum` | click | B5 | FE | missing | |
| `course_detail_admin_edit_clicked` | `/courses/:courseId` | Admin only | `/admin/courses/:id` | click | B3,B7 | FE | missing | Requires `superAdmin` or `Admin` |
| `course_detail_module_expand_toggled` | `/courses/:courseId` | Show/Hide lessons | `setExpandedModule` | click | B3,B7 | FE | missing | |
| `course_detail_start_lesson_clicked` | `/courses/:courseId` | Start lesson | Navigate `/learn/lesson/:id?...` | click | B3,B4,B6,B7 | FE | missing | Query params `curriculumId`,`moduleId`,`chapterId`,`courseId` |
| `course_detail_admin_open_lesson_builder_clicked` | `/courses/:courseId` | Admin builder shortcut | `/admin/curriculum/.../builder` | click | B3,B7 | FE | missing | |
| `course_detail_debug_ingest_post` | `/courses/:courseId` | Agent debug | `fetch('http://127.0.0.1:7774/ingest/...')` | backend | B5 | FE | **unwanted** | **Remove before prod**; leaks local telemetry |

### 1.12 `/learn/lesson/:lessonId` — [LessonPlayer.tsx](Digital Curriculum/src/app/pages/learn/LessonPlayer.tsx)

| event_name | screen_page_flow | user_action_or_trigger | when_it_fires | category | buckets | track | inst | implementation_notes |
|--------------|------------------|------------------------|---------------|----------|---------|-------|------|------------------------|
| `screen_session_started` | `/learn/lesson/:lessonId` | Lesson shell mount | enter | screen_session_start | B3,B4,B6,B7 | FE | missing | |
| `screen_session_ended` | `/learn/lesson/:lessonId` | Unmount / navigate after close | exit | screen_session_end | B3,B5,B7 | FE | missing | |
| `lesson_player_load_failed` | `/learn/lesson/:lessonId` | `loadLesson` catch | error UI | error | B5 | FE | missing | Generic "Failed to load lesson" |
| `lesson_player_missing_query_params` | `/learn/lesson/:lessonId` | No curriculumId/moduleId/chapterId | `setError` | error | B5,B6 | FE | missing | **Friction:** deep links must include params |
| `lesson_player_not_published_viewed` | `/learn/lesson/:lessonId` | `!is_published` | error | error | B5 | FE | missing | |
| `lesson_player_empty_content_viewed` | `/learn/lesson/:lessonId` | `itemCount===0` | empty state | abandonment | B5 | FE | missing | |
| `lesson_slide_previous_clicked` | `/learn/lesson/:lessonId` | Previous | `handlePrevious` | click | B3,B7 | FE | missing | Updates index only until exit save |
| `lesson_slide_next_clicked` | `/learn/lesson/:lessonId` | Next | `handleNext` | click | B3,B7 | FE | missing | At end may open quiz/survey |
| `lesson_quiz_view_opened` | `/learn/lesson/:lessonId` | End + quiz + not passed | `setShowQuizView(true)` | view | B3,B4,B5 | FE | missing | |
| `lesson_survey_view_opened` | `/learn/lesson/:lessonId` | End + survey | `setShowSurveyView(true)` | view | B3,B4,B5 | FE | missing | |
| `lesson_quiz_answer_selected` | `/learn/lesson/:lessonId` | Radio change | per question | engagement | B3,B7 | FE | missing | |
| `lesson_quiz_submit_clicked` | `/learn/lesson/:lessonId` | Submit quiz | `handleQuizSubmit` | submit | B3,B4,B6 | both | partial | Writes `courseProgress` via `recordLessonQuizAttempt` [courseProgress.ts](Digital Curriculum/src/app/lib/courseProgress.ts) |
| `lesson_quiz_passed` | `/learn/lesson/:lessonId` | Score ≥ passPct | after submit | conversion | B4,B6,B7 | both | partial | Not using callable `submitQuizAttempt` / `analytics_events` quiz_passed |
| `lesson_quiz_failed` | `/learn/lesson/:lessonId` | Score < passPct | after submit | error | B5,B7 | both | partial | Attempt count incremented |
| `lesson_quiz_try_again_clicked` | `/learn/lesson/:lessonId` | Try again | resets form | click | B3,B5,B7 | FE | missing | While attempts `< maxAttempts` |
| `lesson_quiz_exhausted_viewed` | `/learn/lesson/:lessonId` | No attempts left | message | abandonment | B5,B7 | FE | missing | |
| `lesson_survey_field_changed` | `/learn/lesson/:lessonId` | textarea | onChange | engagement | B3,B4,B7 | FE | missing | |
| `lesson_survey_submit_clicked` | `/learn/lesson/:lessonId` | Submit survey | `handleSurveySubmit` | submit | B4,B6,B7 | both | partial | `recordLessonSurveySubmission`; optional PDF [dataroom.ts](Digital Curriculum/src/app/lib/dataroom.ts) |
| `lesson_close_clicked` | `/learn/lesson/:lessonId` | Close | `saveProgressAndExit` | click | B3,B5,B6,B7 | both | partial | `updateLessonSlideProgress`; may `setLessonCompleted`; may `markCourseCompleted`; may `createSkillCertificatesForCompletedCourse` |
| `lesson_course_completed` | `/learn/lesson/:lessonId` | Progress 100% | same handler | conversion | B4,B6,B7 | both | partial | Firestore `courseProgress`; alerts user |
| `lesson_certificate_created` | `/learn/lesson/:lessonId` | Certs from completed course | after `createSkillCertificatesForCompletedCourse` | conversion | B1,B4,B6 | both | partial | Data room certificates collection |
| `lesson_player_alert_shown` | `/learn/lesson/:lessonId` | `alert()` success | browser alert | view | B4 | FE | missing | Consider replacing with in-app toast for analytics |

**Callable drift (not used by DC Vite lesson):** [markLessonComplete.ts](functions/src/callables/markLessonComplete.ts) emits `lesson_completed` to `analytics_events` under **`user_progress`/`lesson_progress`** model; DC uses **`courseProgress`** doc — treat as **parallel truth** if both ever used.

### 1.13 `/quizzes` — [Quizzes.tsx](Digital Curriculum/src/app/pages/web/Quizzes.tsx)

| event_name | screen_page_flow | user_action_or_trigger | when_it_fires | category | buckets | track | inst | implementation_notes |
|--------------|------------------|------------------------|---------------|----------|---------|-------|------|------------------------|
| `screen_session_started` | `/quizzes` | Mount | enter | screen_session_start | B3,B5,B7 | FE | missing | |
| `screen_session_ended` | `/quizzes` | Unmount | exit | screen_session_end | B7 | FE | missing | |
| `quizzes_mock_list_viewed` | `/quizzes` | Static array | render | view | B3,B5 | FE | missing | **No Firestore / no `submitQuizAttempt`** |
| `quizzes_mock_start_clicked` | `/quizzes` | Start quiz | local state | click | B3,B6 | FE | missing | |
| `quizzes_mock_submit_clicked` | `/quizzes` | Submit | `handleSubmitQuiz` | submit | B3 | FE | missing | Does not hit backend quiz engine |
| `quizzes_mock_results_viewed` | `/quizzes` | Results | after submit | view | B3,B7 | FE | missing | |

**Backend quiz engine (unused here):** [submitQuizAttempt.ts](functions/src/callables/submitQuizAttempt.ts) → `analytics_events` `quiz_passed` / `quiz_failed`.

### 1.14 `/data-room` — [DataRoom.tsx](Digital Curriculum/src/app/pages/web/DataRoom.tsx)

| event_name | screen_page_flow | user_action_or_trigger | when_it_fires | category | buckets | track | inst | implementation_notes |
|--------------|------------------|------------------------|---------------|----------|---------|-------|------|------------------------|
| `screen_session_started` | `/data-room` | Mount | enter | screen_session_start | B3,B4,B7 | FE | missing | |
| `screen_session_ended` | `/data-room` | Unmount | exit | screen_session_end | B7 | FE | missing | |
| `data_room_certificates_load_failed` | `/data-room` | listCertificates error | UI + empty | error | B5 | FE | missing | Retry button |
| `data_room_certificates_retry_clicked` | `/data-room` | Retry | re-fetch | click | B5,B6 | FE | missing | |
| `data_room_certificate_preview_opened` | `/data-room` | Preview | `setPreviewCertificate` | view | B4,B7 | FE | missing | Dialog |
| `data_room_certificate_preview_closed` | `/data-room` | Dialog onOpenChange | close | click | B7 | FE | missing | |
| `data_room_certificate_download_clicked` | `/data-room` | Download / print | `handleDownloadCertificate` | click | B4,B7 | FE | missing | Opens window + print |
| `data_room_certificate_download_from_modal_clicked` | `/data-room` | Modal download | same handler | click | B4,B7 | FE | missing | |
| `data_room_file_search_changed` | `/data-room` | Search input | `setSearchQuery` | engagement | B3,B7 | FE | missing | Filters mock tree + real PDF rows |
| `data_room_folder_entered` | `/data-room` | Folder button | `navigateToFolder` | click | B3,B7 | FE | missing | |
| `data_room_breadcrumb_clicked` | `/data-room` | Crumb | `navigateToBreadcrumb` | click | B3,B7 | FE | missing | |
| `data_room_home_clicked` | `/data-room` | Home crumb | `navigateToRoot` | click | B3 | FE | missing | |
| `data_room_folder_back_clicked` | `/data-room` | Back | slice path | click | B5 | FE | missing | |
| `data_room_survey_pdf_download_clicked` | `/data-room` | File row download | `window.open(downloadUrl)` | click | B4,B7 | FE | missing | Survey PDFs from `listSurveyResponses` |
| `data_room_download_all_zip_clicked` | `/data-room` | Button present | **No onClick in repo** | click | B1,B3 | FE | missing | **Dead control** — wire or remove |

### 1.15 `/community` — [CommunityHub.tsx](Digital Curriculum/src/app/pages/web/CommunityHub.tsx)

| event_name | screen_page_flow | user_action_or_trigger | when_it_fires | category | buckets | track | inst | implementation_notes |
|--------------|------------------|------------------------|---------------|----------|---------|-------|------|------------------------|
| `screen_session_started` | `/community` | Mount | enter | screen_session_start | B2,B6,B7 | FE | missing | |
| `screen_session_ended` | `/community` | Unmount | exit | screen_session_end | B7 | FE | missing | |
| `community_events_load_failed` | `/community` | `loadEvents` catch | console.error | error | B5 | FE | missing | |
| `community_groups_load_failed` | `/community` | `loadGroups` catch | console.error | error | B5 | FE | missing | |
| `community_hero_rsvp_clicked` | `/community` | RSVP on featured event | `/events/:id` | click | B2,B6 | FE | missing | |
| `community_hero_view_all_events_clicked` | `/community` | View all | `/events` | click | B2,B6 | FE | missing | |
| `community_discussions_header_clicked` | `/community` | Header | `/discussions` | click | B2,B6 | FE | missing | |
| `community_discussion_preview_clicked` | `/community` | Row | `/discussions/:id` | click | B2,B6,B7 | FE | missing | |
| `community_start_discussion_clicked` | `/community` | Opens dialog | `setDialogOpen(true)` | click | B2,B6 | FE | missing | |
| `community_group_preview_clicked` | `/community` | Group row | `/groups/:id` | click | B2,B6,B7 | FE | missing | |
| `community_discussions_search_input_rendered` | `/community` | Search field | static | view | B2,B5 | FE | missing | **No `value`/`onChange` wired** — dead search UI |

### 1.16 Widget: Mortar DM — [MortarDMWidget.tsx](Digital Curriculum/src/app/components/dm/MortarDMWidget.tsx) (mounted on `/community`)

| event_name | screen_page_flow | user_action_or_trigger | when_it_fires | category | buckets | track | inst | implementation_notes |
|--------------|------------------|------------------------|---------------|----------|---------|-------|------|------------------------|
| `screen_session_started` | `widget:mortar_dm` | Floating widget opened | `setIsOpen(true)` | screen_session_start | B2,B7 | FE | missing | |
| `screen_session_ended` | `widget:mortar_dm` | Widget closed | `setIsOpen(false)` | screen_session_end | B7 | FE | missing | |
| `mortar_dm_conversations_loaded` | `widget:mortar_dm` | Firestore query | `getDocs` on `Digital Student DMs` | backend | B2,B7 | both | partial | Filter `uid===user` client-side |
| `mortar_dm_conversations_load_failed` | `widget:mortar_dm` | Query error | catch | error | B5 | FE | missing | |
| `mortar_dm_reply_thread_selected` | `widget:mortar_dm` | Select thread | state | click | B2,B7 | FE | missing | |
| `mortar_dm_message_sent` | `widget:mortar_dm` | Send | `addDoc` on `.../replies` + `updateDoc` parent | conversion | B2,B6,B7 | both | partial | Firestore writes |

### 1.17 Modal: Start discussion — [StartDiscussionDialog.tsx](Digital Curriculum/src/app/components/discussions/StartDiscussionDialog.tsx)

| event_name | screen_page_flow | user_action_or_trigger | when_it_fires | category | buckets | track | inst | implementation_notes |
|--------------|------------------|------------------------|---------------|----------|---------|-------|------|------------------------|
| `screen_session_started` | `modal:start_discussion` | open | dialog | screen_session_start | B2,B6,B7 | FE | missing | Two-step: category → question |
| `discussion_category_selected` | `modal:start_discussion` | Radio | `handleCategorySelect` | click | B2,B7 | FE | missing | |
| `discussion_draft_next_clicked` | `modal:start_discussion` | Next | `handleNext` | click | B2,B6 | FE | missing | |
| `discussion_create_submit_clicked` | `modal:start_discussion` | Create | `createDiscussion` | conversion | B2,B6,B7 | FE | partial | **localStorage** via [discussions.ts](Digital Curriculum/src/app/lib/discussions.ts) — not Firestore |
| `discussion_create_failed` | `modal:start_discussion` | Validation / throw | catch | error | B5 | FE | missing | |
| `screen_session_ended` | `modal:start_discussion` | close | onOpenChange false | screen_session_end | B5,B7 | FE | missing | |

### 1.18 `/discussions` — [Discussions.tsx](Digital Curriculum/src/app/pages/Discussions.tsx)

| event_name | screen_page_flow | user_action_or_trigger | when_it_fires | category | buckets | track | inst | implementation_notes |
|--------------|------------------|------------------------|---------------|----------|---------|-------|------|------------------------|
| `screen_session_started` | `/discussions` | Mount | enter | screen_session_start | B2,B7 | FE | missing | |
| `screen_session_ended` | `/discussions` | Unmount | exit | screen_session_end | B7 | FE | missing | |
| `discussions_category_filter_changed` | `/discussions` | Select | `setSelectedCategory` | click | B2,B7 | FE | missing | |
| `discussions_search_changed` | `/discussions` | Input | filters list | engagement | B2,B7 | FE | missing | |
| `discussions_row_clicked` | `/discussions` | Row | `incrementViews` + navigate detail | click | B2,B6,B7 | FE | partial | Views stored localStorage |
| `discussions_start_new_clicked` | `/discussions` | Opens dialog | `setDialogOpen(true)` | click | B2,B6 | FE | missing | |
| `discussions_back_to_community_clicked` | `/discussions` | Back | `/community` | click | B5 | FE | missing | |

### 1.19 `/discussions/:id` — [DiscussionDetail.tsx](Digital Curriculum/src/app/pages/DiscussionDetail.tsx)

| event_name | screen_page_flow | user_action_or_trigger | when_it_fires | category | buckets | track | inst | implementation_notes |
|--------------|------------------|------------------------|---------------|----------|---------|-------|------|------------------------|
| `screen_session_started` | `/discussions/:id` | Mount | enter | screen_session_start | B2,B7 | FE | missing | |
| `screen_session_ended` | `/discussions/:id` | Unmount | exit | screen_session_end | B7 | FE | missing | |
| `discussion_detail_view_incremented` | `/discussions/:id` | `useEffect` | `incrementViews(id)` | backend | B2,B7 | FE | partial | localStorage |
| `discussion_like_toggled` | `/discussions/:id` | Like on thread/reply | `toggleLike` | click | B2,B7 | FE | partial | localStorage |
| `discussion_reply_submit_clicked` | `/discussions/:id` | Top-level reply | `addReply` | conversion | B2,B6,B7 | FE | partial | |
| `discussion_nested_reply_submit_clicked` | `/discussions/:id` | Nested reply | `addReply` with parent | conversion | B2,B6,B7 | FE | partial | |
| `discussion_reply_failed` | `/discussions/:id` | alert on error | catch | error | B5 | FE | missing | |
| `discussion_back_clicked` | `/discussions/:id` | Back | `navigate("/discussions")` | click | B5 | FE | missing | [DiscussionDetail.tsx](Digital Curriculum/src/app/pages/DiscussionDetail.tsx) |

### 1.20 `/groups/:id` — [GroupDetail.tsx](Digital Curriculum/src/app/pages/GroupDetail.tsx)

| event_name | screen_page_flow | user_action_or_trigger | when_it_fires | category | buckets | track | inst | implementation_notes |
|--------------|------------------|------------------------|---------------|----------|---------|-------|------|------------------------|
| `screen_session_started` | `/groups/:id` | Mount | enter | screen_session_start | B2,B6,B7 | FE | missing | |
| `screen_session_ended` | `/groups/:id` | Unmount | exit | screen_session_end | B7 | FE | missing | |
| `group_detail_load_failed` | `/groups/:id` | `getGroup` etc. | error paths | error | B5 | FE | missing | |
| `group_join_clicked` | `/groups/:id` | Request join | `joinGroup` callable | conversion | B2,B6,B7 | both | missing | [groups.ts](Digital Curriculum/src/app/lib/groups.ts) `httpsCallable(functions,"joinGroup")` — **no `analytics_events` in** [groupMembership.ts](functions/src/callables/groupMembership.ts) |
| `group_join_failed` | `/groups/:id` | Callable error | catch | error | B5 | FE | missing | |
| `group_message_send_clicked` | `/groups/:id` | Send chat | `sendGroupMessage` Firestore | conversion | B2,B6,B7 | both | partial | `Groups/{id}/Messages` addDoc |
| `group_message_send_failed` | `/groups/:id` | Send error | catch | error | B5 | FE | missing | |
| `group_messages_subscription_error` | `/groups/:id` | `onSnapshot` | error | error | B5 | FE | missing | If listener errors |

### 1.21 `/events` — [Events.tsx](Digital Curriculum/src/app/pages/web/Events.tsx)

| event_name | screen_page_flow | user_action_or_trigger | when_it_fires | category | buckets | track | inst | implementation_notes |
|--------------|------------------|------------------------|---------------|----------|---------|-------|------|------------------------|
| `screen_session_started` | `/events` | Mount | enter | screen_session_start | B2,B6,B7 | FE | missing | |
| `screen_session_ended` | `/events` | Unmount | exit | screen_session_end | B7 | FE | missing | |
| `events_list_load_failed` | `/events` | `loadEvents` catch | console.error | error | B5 | FE | missing | |
| `events_filter_all_clicked` | `/events` | Filter | `setFilter('all')` | click | B2,B7 | FE | missing | |
| `events_filter_upcoming_clicked` | `/events` | Filter upcoming | date compare | click | B2,B6,B7 | FE | missing | |
| `events_filter_registered_clicked` | `/events` | Registered | filter | click | B2,B6,B7 | FE | missing | Uses `getRegisteredEvents` |
| `events_row_open_clicked` | `/events` | Card CTA | `/events/:id` | click | B2,B6 | FE | missing | |

### 1.22 `/events/:id` — [EventDetail.tsx](Digital Curriculum/src/app/pages/EventDetail.tsx)

| event_name | screen_page_flow | user_action_or_trigger | when_it_fires | category | buckets | track | inst | implementation_notes |
|--------------|------------------|------------------------|---------------|----------|---------|-------|------|------------------------|
| `screen_session_started` | `/events/:id` | Mount | enter | screen_session_start | B2,B6,B7 | FE | missing | |
| `screen_session_ended` | `/events/:id` | Unmount | exit | screen_session_end | B7 | FE | missing | |
| `event_detail_not_found_redirect` | `/events/:id` | Missing event | navigate `/events` | abandonment | B5,B6 | FE | missing | |
| `event_register_clicked` | `/events/:id` | Register | `registerForEvent` | conversion | B2,B6,B7 | both | partial | Firestore `events` / arrays per [events.ts](Digital Curriculum/src/app/lib/events.ts) |
| `event_register_failed` | `/events/:id` | Error | alert | error | B5 | FE | missing | |
| `event_unregister_confirm_shown` | `/events/:id` | Unregister | `confirm()` | view | B5 | FE | missing | Browser confirm |
| `event_unregister_clicked` | `/events/:id` | Confirmed cancel | `unregisterFromEvent` | conversion | B2,B5,B7 | both | partial | |
| `event_unregister_failed` | `/events/:id` | Error | alert | error | B5 | FE | missing | |

### 1.23 `/shop` — [Shop.tsx](Digital Curriculum/src/app/pages/web/Shop.tsx)

| event_name | screen_page_flow | user_action_or_trigger | when_it_fires | category | buckets | track | inst | implementation_notes |
|--------------|------------------|------------------------|---------------|----------|---------|-------|------|------------------------|
| `screen_session_started` | `/shop` | Mount | enter | screen_session_start | B1,B6,B7 | FE | missing | |
| `screen_session_ended` | `/shop` | Unmount | exit | screen_session_end | B7 | FE | missing | |
| `shop_catalog_subscription_started` | `/shop` | `subscribeShopItems` | onSnapshot / listener | backend | B1,B7 | both | partial | Real-time Firestore merch |
| `shop_filter_changed` | `/shop` | `<select>` | category filter | click | B1,B7 | FE | missing | |
| `shop_size_changed` | `/shop` | Apparel size | select | click | B1,B7 | FE | missing | |
| `shop_add_to_cart_clicked` | `/shop` | Add | `reserveStock` + `api.addLine` | conversion | B1,B6,B7 | both | partial | Stock reservation + local cart |
| `shop_add_to_cart_failed` | `/shop` | Stock / auth | alert / catch | error | B1,B5 | FE | missing | Includes unauthenticated → `/login` |
| `shop_out_of_stock_interaction` | `/shop` | Disabled add | UI | abandonment | B1,B5 | FE | missing | |
| `shop_cart_expiry_purge_ran` | `/shop` | Interval 60s | `purgeExpiredAndRelease` | backend | B1,B5,B7 | both | partial | [Shop.tsx](Digital Curriculum/src/app/pages/web/Shop.tsx) effect |

### 1.24 `/analytics` — [Analytics.tsx](Digital Curriculum/src/app/pages/web/Analytics.tsx)

| event_name | screen_page_flow | user_action_or_trigger | when_it_fires | category | buckets | track | inst | implementation_notes |
|--------------|------------------|------------------------|---------------|----------|---------|-------|------|------------------------|
| `screen_session_started` | `/analytics` | Mount (non–Digital Curriculum Students) | enter | screen_session_start | B3,B7 | FE | missing | **Mock stats only** |
| `screen_session_ended` | `/analytics` | Unmount | exit | screen_session_end | B7 | FE | missing | |
| `learner_analytics_dashboard_viewed` | `/analytics` | Static cards | render | view | B3,B7 | FE | missing | No data fetch |

### 1.25 `/admin/auth` — [AdminAuth.tsx](Digital Curriculum/src/app/pages/AdminAuth.tsx)

| event_name | screen_page_flow | user_action_or_trigger | when_it_fires | category | buckets | track | inst | implementation_notes |
|--------------|------------------|------------------------|---------------|----------|---------|-------|------|------------------------|
| `screen_session_started` | `/admin/auth` | Mount | enter | screen_session_start | B3,B7 | FE | missing | |
| `admin_auth_access_denied_viewed` | `/admin/auth` | Non-admin user | UI | error | B5,B6 | FE | missing | No Firebase role |
| `admin_password_submit_succeeded` | `/admin/auth` | Password match | sessionStorage + `/admin` | conversion | B3,B6,B7 | FE | missing | **Plain env password** `VITE_ADMIN_PASSWORD` — security risk |
| `admin_password_submit_failed` | `/admin/auth` | Wrong password | error text | error | B5,B7 | FE | missing | |
| `admin_auth_session_restored` | `/admin/auth` | Within 8h | auto redirect `/admin` | conversion | B6,B7 | FE | missing | sessionStorage keys |

### 1.26 `/admin` — [Admin.tsx](Digital Curriculum/src/app/pages/Admin.tsx) (tabs: groups, events, graduation, admins, app-access-hub, expansion-mobile, mortar-info, messages, courses, shop)

| event_name | screen_page_flow | user_action_or_trigger | when_it_fires | category | buckets | track | inst | implementation_notes |
|--------------|------------------|------------------------|---------------|----------|---------|-------|------|------------------------|
| `screen_session_started` | `/admin` | Mount | enter | screen_session_start | B2,B3,B7 | FE | missing | |
| `screen_session_ended` | `/admin` | Unmount | exit | screen_session_end | B7 | FE | missing | |
| `admin_tab_changed` | `/admin` | Tabs | `onValueChange` | click | B3,B7 | FE | missing | Values: `groups`,`events`,… per `TabsTrigger` |
| `admin_group_create_submitted` | `/admin` (groups) | Create group | `addDoc` `Groups` | conversion | B2,B6 | both | partial | |
| `admin_group_member_approved` | `/admin` | Approve pending | `updateDoc` group | conversion | B2,B6 | both | partial | |
| `admin_group_member_rejected` | `/admin` | Reject pending | callable / update | conversion | B2,B5 | both | partial | Inspect handler `handleRejectMember` |
| `admin_event_type_selected` | `/admin` (events) | In-person / Online | state | click | B2,B7 | FE | missing | |
| `admin_event_distribution_selected` | `/admin` (events) | curriculum / mobile / both | state | click | B2,B7 | FE | missing | Matches [events.ts](Digital Curriculum/src/app/lib/events.ts) model |
| `admin_event_create_submitted` | `/admin` (events) | Create event | Firestore writes | conversion | B2,B6 | both | partial | |
| `admin_member_event_approved` | `/admin` (events) | Approve member-submitted | handler | conversion | B2,B6 | both | partial | |
| `admin_member_event_rejected` | `/admin` (events) | Reject w/ reason | dialog confirm | conversion | B2,B5 | both | partial | |
| `admin_graduation_application_view_profile` | `/admin` (graduation) | Open profile | `setViewProfileUserId` | click | B4,B7 | FE | missing | |
| `admin_graduation_application_accepted` | `/admin` (graduation) | Accept / reject flows | async handlers ~L1818+ | conversion | B4,B6,B7 | both | partial | Read file for exact Firestore updates |
| `admin_add_admin_submitted` | `/admin` (admins) | Add admin | handler | conversion | B3,B6 | both | partial | Likely callable / custom claims — verify near `handleAddAdmin` |
| `admin_app_access_hub_action` | `/admin` (app-access-hub) | Various callables | [AppAccessHubPanel.tsx](Digital Curriculum/src/app/components/admin/AppAccessHubPanel.tsx) | backend | B3,B6,B7 | both | missing | Uses `httpsCallable` dynamic names |
| `admin_expansion_mobile_moderation_action` | `/admin` (expansion-mobile) | Moderation | [MobileModerationPanel.tsx](Digital Curriculum/src/app/components/admin/MobileModerationPanel.tsx) | backend | B2,B5,B7 | both | missing | |
| `admin_mortar_info_updated` | `/admin` (mortar-info) | Content edits | panel handlers | backend | B2,B3 | both | partial | |
| `admin_dm_reply_sent` | `/admin` (messages) | Reply to student DM | `addDoc` replies + `updateDoc` thread | conversion | B2,B6,B7 | both | partial | Same collection as learner widget |
| `admin_navigate_course_builder_clicked` | `/admin` (courses) | Open builder | `/admin/courses/builder` | click | B3,B6 | FE | missing | |
| `admin_navigate_course_editor_clicked` | `/admin` (courses) | Edit course | `/admin/courses/:id` | click | B3,B6 | FE | missing | |
| `admin_preview_course_as_student_clicked` | `/admin` (courses) | Student view | `window.location.href /courses/:id` | click | B3,B6,B7 | FE | missing | Full navigation |
| `admin_survey_response_open_clicked` | `/admin` (courses) | Open PDF | `window.open` | click | B3,B4 | FE | missing | |
| `admin_shop_item_created` | `/admin` (shop) | Add item | `handleAddShopItem` | conversion | B1,B6 | both | partial | Firestore product/stock schema |
| `admin_shop_item_edit_opened` | `/admin` (shop) | Edit | `openEditShopItem` | click | B1,B7 | FE | missing | |
| `admin_shop_item_save_clicked` | `/admin` (shop) | Save edits | `handleSaveEditedShopItem` | conversion | B1,B6 | both | partial | |
| `admin_shop_item_stock_adjust_clicked` | `/admin` (shop) | Stock buttons | various `onClick` ~L2531 | click | B1,B5 | FE | missing | Inspect for exact semantics |

### 1.27 `/admin/courses/create` — [CourseCreationWizard.tsx](Digital Curriculum/src/app/pages/admin/CourseCreationWizard.tsx)

| event_name | screen_page_flow | user_action_or_trigger | when_it_fires | category | buckets | track | inst | implementation_notes |
|--------------|------------------|------------------------|---------------|----------|---------|-------|------|------------------------|
| `screen_session_started` | `/admin/courses/create` | Mount | enter | screen_session_start | B3,B7 | FE | missing | Wizard steps → track `wizard_step_id` |
| `admin_course_wizard_step_completed` | `/admin/courses/create` | Next / back | navigation inside wizard | conversion | B3,B6,B7 | both | partial | Firestore writes on completion (read file for final `setDoc`) |
| `admin_course_wizard_abandoned` | `/admin/courses/create` | Close browser | unload | abandonment | B5,B7 | FE | missing | |

### 1.28 `/admin/courses/builder` & `/admin/courses/:courseId` — [CourseBuilder.tsx](Digital Curriculum/src/app/pages/admin/CourseBuilder.tsx)

| event_name | screen_page_flow | user_action_or_trigger | when_it_fires | category | buckets | track | inst | implementation_notes |
|--------------|------------------|------------------------|---------------|----------|---------|-------|------|------------------------|
| `screen_session_started` | `/admin/courses/builder` \| `/admin/courses/:courseId` | Mount | enter | screen_session_start | B3,B7 | FE | missing | |
| `admin_course_builder_field_updated` | above | Edits modules/lessons | inputs | engagement | B3,B7 | FE | missing | High-volume — sample or batch |
| `admin_course_builder_save_clicked` | above | Persist | Firestore | conversion | B3,B6 | both | partial | |
| `admin_course_builder_error` | above | validation / network | catch | error | B5 | FE | missing | |

### 1.29 `/admin/curriculum/.../lesson/.../builder` — [LessonDeckBuilder.tsx](Digital Curriculum/src/app/pages/admin/LessonDeckBuilder.tsx)

| event_name | screen_page_flow | user_action_or_trigger | when_it_fires | category | buckets | track | inst | implementation_notes |
|--------------|------------------|------------------------|---------------|----------|---------|-------|------|------------------------|
| `screen_session_started` | `/admin/curriculum/:curriculumId/module/:moduleId/chapter/:chapterId/lesson/:lessonId/builder` | Mount | enter | screen_session_start | B3,B7 | FE | missing | |
| `admin_lesson_deck_slide_added` | lesson builder | Add slide | UI | click | B3,B7 | FE | missing | |
| `admin_lesson_deck_block_edited` | lesson builder | Block edits | change | engagement | B3,B7 | FE | missing | |
| `admin_lesson_deck_preview_opened` | lesson builder | Preview modal | toggle | view | B3,B7 | FE | missing | In-file `LessonPreviewModal` |
| `admin_lesson_deck_publish_clicked` | lesson builder | Publish | Firestore `is_published` etc. | conversion | B3,B6 | both | partial | Exact path per [CURRICULUM_SYSTEM_DOCS.md](Digital Curriculum/CURRICULUM_SYSTEM_DOCS.md) |

### 1.30 `/admin/curriculum/...` PPTX import — [PptxImportPage.tsx](Digital Curriculum/src/app/pages/admin/PptxImportPage.tsx)

| event_name | screen_page_flow | user_action_or_trigger | when_it_fires | category | buckets | track | inst | implementation_notes |
|--------------|------------------|------------------------|---------------|----------|---------|-------|------|------------------------|
| `screen_session_started` | `/admin/.../pptx` (if routed) | Mount | enter | screen_session_start | B3,B7 | FE | missing | **Verify route** — may only be embedded in builder |
| `admin_pptx_import_started` | pptx import | File picked | import callable | conversion | B3,B6 | both | missing | [importPptxDeck](functions/src/callables/importPptxDeck.ts) from client |

### 1.31 Mobile preview routes `/mobile/*` — [MobileNavigation.tsx](Digital Curriculum/src/app/components/mobile/MobileNavigation.tsx), pages under [pages/mobile/](Digital Curriculum/src/app/pages/mobile/)

| event_name | screen_page_flow | user_action_or_trigger | when_it_fires | category | buckets | track | inst | implementation_notes |
|--------------|------------------|------------------------|---------------|----------|---------|-------|------|------------------------|
| `screen_session_started` | `/mobile/feed` … `/mobile/profile` | Mount | enter | screen_session_start | B2,B3,B7 | FE | missing | Feed/Groups/Events/Explore/Matching/Profile/Onboarding |
| `mobile_feed_like_clicked` | `/mobile/feed` | Heart button | **no onClick** | click | B2,B5 | FE | missing | **Dead UI** — add handler or remove |
| `mobile_feed_comment_clicked` | `/mobile/feed` | Comment | **no onClick** | click | B2,B5 | FE | missing | Dead |
| `mobile_feed_share_clicked` | `/mobile/feed` | Share | **no onClick** | click | B2,B5 | FE | missing | Dead |
| `mobile_nav_sign_out_clicked` | `chrome:mobile_navigation` | Sign out | same as web | click | B5,B6,B7 | FE | missing | |
| `mobile_nav_web_app_clicked` | `chrome:mobile_navigation` | Link `/dashboard` | click | B3,B6 | FE | missing | |

---

## 2. Backend / Firestore / scheduler events (Digital Curriculum–relevant)

| event_name | screen_page_flow | user_action_or_trigger | when_it_fires | category | buckets | track | inst | implementation_notes |
|--------------|------------------|------------------------|---------------|----------|---------|-------|------|------------------------|
| `user_created` | `backend:auth_onCreate` | New Firebase Auth user | `onUserCreated` | backend | B3,B6,B7 | BE | instrumented | [onUserCreated.ts](functions/src/triggers/onUserCreated.ts) → `analytics_events`; initializes `users`, `data_rooms`, `user_progress` |
| `lesson_completed` | `backend:callable_markLessonComplete` | Client calls callable | on success | backend | B3,B4,B6 | BE | missing-from-DC | **DC Vite does not call** this callable |
| `lesson_time` | `backend:callable_trackLessonTime` | Client sends delta seconds | callable | backend | B3,B4,B7 | BE | missing-from-DC | **DC Vite does not call** |
| `quiz_passed` | `backend:callable_submitQuizAttempt` | Legacy quiz engine | passed | backend | B3,B4,B6 | BE | missing-from-DC | DC uses lesson quizzes in Firestore `courseProgress` |
| `quiz_failed` | `backend:callable_submitQuizAttempt` | Legacy quiz engine | failed | backend | B3,B5,B7 | BE | missing-from-DC | |
| `asset_finalized` | `backend:callable_finalizeAssetDocument` | Callable success | write | backend | B1,B4,B6 | BE | missing-from-DC | No grep hit in `Digital Curriculum/` |
| `asset_generated` | `backend:callable_generateDocumentPDF` | PDF generation | write | backend | B1,B4,B6 | BE | missing-from-DC | |
| `hidden_video_unlocked` | `backend:callable_grantHiddenTrainingVideo` | Admin grant | write | backend | B3,B4,B7 | BE | missing-from-DC | |
| `module_completed` | `backend:helper_evaluateModuleCompletion` | Module completion evaluation | helper | backend | B3,B4,B6 | BE | partial | Emit when helper runs (typically tied to progress pipeline — confirm invocation paths outside DC) |
| `curriculum_graduated` | `backend:helper_evaluateGraduation` | Graduation evaluation | helper | backend | B4,B6,B7 | BE | partial | [evaluateGraduation.ts](functions/src/helpers/evaluateGraduation.ts) |
| `log_analytics_event` | `backend:callable_logAnalyticsEvent` | Authenticated client posts arbitrary `event_type` | callable | backend | all | BE | missing-from-DC | [logAnalyticsEvent.ts](functions/src/callables/logAnalyticsEvent.ts) — **not used in Digital Curriculum/** |

---

## 3. Derived events (warehouse / BigQuery / scheduled)

| event_name | screen_page_flow | user_action_or_trigger | when_it_fires | category | buckets | track | inst | implementation_notes |
|--------------|------------------|------------------------|---------------|----------|---------|-------|------|------------------------|
| `derived_daily_active_user` | `derived:daily` | Any session day | ETL on `analytics_events` + GA | derived | B6,B7 | derived | missing | Define DAU from session_start |
| `derived_course_progress_pct` | `derived:course` | `courseProgress` doc | scheduled / trigger | derived | B3,B4,B7 | derived | partial | Source: `courseProgress/{uid}_{courseId}` |
| `derived_lesson_completion_latency` | `derived:lesson` | Timestamps | diff(`startedAt`, lesson complete) | derived | B4,B6,B7 | derived | partial | Needs reliable completion timestamp |
| `derived_cart_abandonment_24h` | `derived:shop` | `expiresAt` | cart purge logs | derived | B1,B5,B7 | derived | partial | [cart.ts](Digital Curriculum/src/app/lib/cart.ts) 24h reservation |
| `derived_discussion_creator_segment` | `derived:community` | localStorage discussions | ETL impossible server-side | derived | B2,B7 | derived | missing | **localStorage-only discussions** limit server truth |

---

## 4. Per-screen session bundles (minimum contract)

For each surface below: implement **`screen_session_started`** / **`screen_session_ended`** first; attach nested `screen_session_id` on all child events.

### `/login`

- **Start / end:** `screen_session_started`, `screen_session_ended`
- **Actions:** mode toggle, submit sign-in/up, forgot password flow, join link
- **Passive:** time on screen, field error display
- **Conversion:** successful auth
- **Drop-off:** error message, abandon before submit

### `/onboarding`

- **Start / end:** session + per-step sub-sessions optional
- **Actions:** next, back, skip, final submit, completion CTA
- **Passive:** time per step, field edits (optional sampled)
- **Conversion:** `onboarding_status=complete`
- **Drop-off:** save errors, skip with partial profile

### `/learn/lesson/:lessonId`

- **Actions:** prev/next slide, open quiz/survey, answer, submit, close
- **Passive:** slide index timeline, time per slide (heartbeat), YouTube play/pause if instrumented in `YouTubeBlock`
- **Conversion:** quiz pass, survey submit, lesson marked complete, course 100%
- **Drop-off:** missing params, not published, quiz exhausted, close without passing

### `/shop` + nav cart

- **Actions:** filter, size, add to cart, remove from cart dropdown, continue shopping
- **Passive:** catalog impression counts
- **Conversion:** successful `reserveStock` + cart line
- **Drop-off:** OOS, unauthenticated redirect, reservation expiry

### `/community` + DM widget + discussion modals

- **Actions:** RSVP, navigate, start discussion, DM send
- **Passive:** scroll depth on hub
- **Conversion:** discussion created, DM sent, group navigation
- **Drop-off:** failed loads, dead search field

---

## 5. Current instrumentation (repository facts)

| Mechanism | Location | Emitted events / signals | Reached from DC Vite? |
|-----------|----------|--------------------------|------------------------|
| Firestore `analytics_events` writers | [functions/src/](functions/src/) (`lesson_completed`, `lesson_time`, `quiz_passed`/`failed`, `user_created`, `onboarding_nudge_sent`, `asset_*`, `hidden_video_unlocked`, `module_completed`, `curriculum_graduated`) | Various `event_type` strings | **Only `user_created` is universal on signup.** Others require callables/paths **not** invoked by DC lesson player or quizzes page. |
| Callable `logAnalyticsEvent` | [logAnalyticsEvent.ts](functions/src/callables/logAnalyticsEvent.ts) | Arbitrary `event_type` | **No** usage in `Digital Curriculum/` |
| Firebase Analytics (`logEvent`) | Client | — | **No** references under `Digital Curriculum/` |
| Firestore progress truth | `courseProgress`, `users`, `Groups/.../Messages`, `events`, shop stock, `GraduationApplications`, `Digital Student DMs` | Durable, queryable | **Yes** — primary behavioral backend for DC |

---

## 6. Instrumentation gaps (highest severity)

1. **No client analytics layer** in `Digital Curriculum/` (no GA4, no `logAnalyticsEvent` callable) — all recommended `FE` rows are **missing**.
2. **Dual lesson-completion models:** `courseProgress` (DC) vs `user_progress/lesson_progress` + `analytics_events.lesson_completed` (callable). Risk of **double-counting** if both are ever wired without dedup keys (`completion_source`).
3. **`/quizzes` page is mock** — does not exercise `submitQuizAttempt` or emit `quiz_passed` / `quiz_failed`.
4. **Discussions are `localStorage`–backed** — server cannot see engagement; segmentation (B7) breaks across devices.
5. **Dashboard `continueUrl`** may not match router pattern for lesson player — track routing errors explicitly.
6. **CourseDetail.tsx** contains **debug `fetch` to `127.0.0.1:7774`** — remove; if it stays, it pollutes real-user networks in dev builds.
7. **Dead controls:** Community hub discussions search (no state), mobile feed buttons (no handlers), Data Room "Download All (ZIP)" button (no handler).

---

## 7. Highest-priority events to implement first (engineering order)

1. **`screen_session_started` / `screen_session_ended` + `route_path` + `roles[]`** for `/login`, `/onboarding`, `/dashboard`, `/courses/:courseId`, `/learn/lesson/:lessonId`, `/shop` — establishes session spine and funnel timing (B6,B7).
2. **`lesson_close_clicked`** + **`lesson_quiz_submit_clicked`** + **`lesson_survey_submit_clicked`** with full curriculum IDs — core learning funnel (B3,B4,B6); pair with Firestore writes for dedup.
3. **`shop_add_to_cart_clicked`** + **`cart_line_remove_clicked`** + stock error codes — revenue funnel (B1,B5).
4. **`course_detail_start_lesson_clicked`** + **`curriculum_continue_clicked`** — entry into lesson player (B3,B6).
5. **`group_join_clicked`** + **`group_message_send_clicked`** + **`event_register_clicked`** — community/event outcomes (B2,B6) — add **backend mirror** in callable or Firestore trigger for authoritative counts.
6. **Replace or augment localStorage discussions** OR instrument **only client** with explicit limitation — otherwise B2 metrics are unreliable.
7. **Wire optional `logAnalyticsEvent` callable** as a thin client logger with schema validation — reuses [logAnalyticsEvent.ts](functions/src/callables/logAnalyticsEvent.ts) without waiting on GA.

---

## 8. Suggested `event_name` naming convention

- **Prefix by domain:** `lesson_`, `course_`, `shop_`, `group_`, `event_`, `discussion_`, `admin_`, `auth_`, `onboarding_`
- **Suffix verbs:** `_clicked`, `_submitted`, `_succeeded`, `_failed`, `_viewed`, `_started`, `_ended`
- **Session pair:** always emit `screen_session_started` before first interaction event in surface; `screen_session_ended` on route change / modal close / `visibility_hidden` (choose one consistent policy)

---

*Generated from repository scan: Digital Curriculum Vite app + selected Firebase Functions writers. Flutter app excluded per project scope.*
