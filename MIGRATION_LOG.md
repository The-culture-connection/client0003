# MIGRATION_LOG — Thinkific → MORTAR Digital Curriculum

Companion to `THINKIFIC_MIGRATION_PLAN.md` (the runbook). Newest entries at the bottom. Every future session appends here.

## 2026-07-20 — Session 1 (Cowork cloud)

**Phase 0 progress:**

| Step | Status | Notes |
|---|---|---|
| 0.1 Cookie refresh | ✅ | `.env` updated by Grace 2026-07-20 16:01 UTC |
| 0.2 Stage pipeline | ✅ | Cloud staging works: `npm install` + `firebase-admin` OK; Chromium OK at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` (set `CHROME_PATH` in `.env` after staging — the repo `.env` keeps the Windows path) |
| 0.3 Connectivity | ⚠ BLOCKED → fix pending | Cloud egress allowlist blocked Thinkific + Firebase hosts. Grace added the hosts to network settings; **settings only apply to NEW sessions** → this session cannot proceed. Resume in a fresh cloud session and re-run the connectivity test first. |
| 0.4 Course remap | ✅ | `course-ids.json` remapped from old course **2418972** → live course **2695023**; all 15 content lessons matched by title; `3.4 Pitching & Alternatives` → `thinkificChapterId: null` (no live chapter; stays shell). Verse chapter ids recorded under `moduleIntroChapters` (Foundations 12307647, The Core 12307652, Really Real 12307658) for gap-fix 1.3. Committed to repo. |
| 0.5 Firestore audit | ⏸ not started | Needs Firebase egress — first task for next session |

**Verified this session (live browser walkthrough of course 2695023):**
- 18 chapters / 277 content items: 186 HtmlItem, 65 Assignment, 13 Quiz, 10 Survey, 3 Download; 3 draft items to skip.
- All five course-player API content endpoints return full bodies with a logged-in session.
- Media: 160 images (21 GIFs), 13 YouTube iframes, 12 Thinkific-hosted iframes still to classify (gap-fix 1.2).

**Resume instructions for next session (cloud, after allowlist fix):**
1. Stage `tools/thinkific-migrate/*` + repo-root `mortar-stage-firebase-adminsdk-fbsvc-c7748b6158.json` to the workspace; `npm install && npm install firebase-admin`; append `CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome` (or current version) to `.env`.
2. Connectivity retest (Step 0.3): `mortarmastersonline.thinkific.com`, `files.cdn.thinkific.com`, `firestore.googleapis.com`, `storage.googleapis.com`, `oauth2.googleapis.com`, `fonts.googleapis.com` — then `node inspect-player.js` (cookie smoke test).
3. Step 0.5: write + run `status.js` (audit `lesson_content`/`lessonSurveys`/`lessonQuizzes`/`is_published` for all 16 lessons); append the baseline table here.
4. Continue with Phase 1 gap fixes (runbook §Phase 1), then the per-lesson loop.

## 2026-07-20 — Session 2 (Cowork cloud)

**Phase 0 progress:**

| Step | Status | Notes |
|---|---|---|
| 0.2 Stage pipeline (redo) | ✅ | Staged to fresh cloud workspace. ⚠ `firebase-admin` compat: scripts use the legacy namespace API (`admin.credential.cert`) which is removed in v14 (`package.json` says `^14.2.0`) — cloud run pinned **firebase-admin@13**. Phase 1 should either pin `^13` in `package.json` or modernize the imports. |
| 0.3 Connectivity retest | ✅ / ⚠ cookie | Egress allowlist fix confirmed — all 6 hosts reachable from cloud (Thinkific 302, CDN 403-root, Google APIs responding). But `inspect-player.js` → **401** on all endpoints: the captured `THINKIFIC_COOKIE` contains only analytics/Cloudflare cookies — **the Thinkific session cookie is missing** (it's HttpOnly and host-only; the capture was likely taken from a request that didn't carry it). Verified via Grace's logged-in Chrome that the session itself is valid: in-page fetch of `/api/course_player/v2/contents/51873999` → **200**. → Recapture needed (see below). |
| 0.5 Firestore audit | ✅ | `tools/thinkific-migrate/status.js` written (read-only; `--md` for table). Baseline below. |

**Step 0.5 baseline — `mortar-stage`, curriculum `lA5KRk3YYiSLMHllA4XW` (2026-07-20 ~16:45 UTC):**

| Lesson | Title | Lesson doc | content_type | Slides | Surveys (checkpoints) | Quiz (questions) | is_published |
|---|---|---|---|---|---|---|---|
| M1.1 | Welcome to the MORTAR Entrepreneurship Academy | yes | media | 7 | yes (0) | yes (0) | true |
| M1.2 | The Release Party | yes | media | 17 | yes (2) | yes (0) | true |
| M1.3 | Expect the Unexpected | yes | media | 15 | yes (4) | yes (3) | true |
| M1.4 | Dollars and Sense | yes | media | 29 | yes (3) | yes (3) | true |
| M1.5 | Fade In | yes | media | 16 | yes (8) | yes (1) | true |
| M1.6 | Reflection | yes | media | 10 | yes (3) | yes (1) | true |
| M2.1 | The Medium Is the Message | yes | media | 22 | yes (3) | yes (0) | true |
| M2.2 | Always Be Closing | yes | media | 22 | yes (4) | yes (0) | true |
| M2.3 | All Eyes on Them | yes | media | 11 | yes (5) | yes (0) | true |
| M2.4 | Balancing Act | yes | media | 13 | yes (6) | yes (0) | true |
| M2.5 | Make Me Care | yes | media | 17 | yes (4) | yes (0) | true |
| M3.1 | Game Recognize Game | yes | media | 19 | yes (2) | yes (0) | true |
| M3.2 | Legit or Quit | yes | media | 14 | yes (0) | yes (0) | true |
| M3.3 | C.R.E.A.M. | yes | media | 11 | yes (0) | yes (0) | true |
| M3.4 | Pitching & Alternatives | yes | — | 0 | yes (0) | yes (0) | true |
| M3.5 | The End of the Beginning | yes | media | 5 | yes (0) | yes (0) | true |

**Baseline findings (differ from the plan's assumption of empty shells):**
- All 16 lessons already carry content — **228 slides total**, presumably from the June 10 runs against old course **2418972** (matches `preview/M1L2_*.png`). Re-migration will replace it lesson-by-lesson (idempotent write path).
- **All lessons are `is_published: true`** — the old-course content is live on stage right now. Plan expected everything unpublished until Phase 4. Decision needed: unpublish during re-migration, or replace in place.
- Quiz docs exist for all lessons but are mostly **empty scaffolds** (0 questions); only M1.3/M1.4 (3), M1.5/M1.6 (1) have any. Thinkific has 13 real quizzes to bring over. Several survey docs also have 0 checkpoints.

**Cookie recapture (blocks Thinkific-side work — Phase 1 gate + Phase 2):**
DevTools (F12) → Network tab → filter `course_player` → click a request to **mortarmastersonline.thinkific.com** (not www/api hosts) → Request Headers → copy the **entire** `cookie:` value → replace `THINKIFIC_COOKIE=` line in `tools/thinkific-migrate/.env`. A good capture is ~2×+ longer than the current one and includes session cookie names beyond `_ga*/_gcl*/cf_*`.

### Session 2 (cont.) — Phase 0 closed, Phase 1 done, Phase 2 batch 1 written

**Step 0.3 resolution:** two manual cookie captures failed identically because the copied request was a **CDN asset** — cross-origin requests only carry the shared `.thinkific.com` analytics cookies, never the host-only (HttpOnly) session cookies. Fixed via screen-guided **Copy as cURL** on a same-origin `/api/course_player/...` request; `.env` now holds a cookie with `_thinkific_session` + `remember_user_token` (remember token valid to 2026-08-19). `inspect-player.js` ✅ all five content endpoints. ⚠ Cloud .env write-back is blocked by platform policy — cloud workspace copy is authoritative this session; local `.env` still has the dead cookie (replacement provided in chat).

**Approved decisions (Grace, 2026-07-20):** (1) unpublish all 16 lessons, migrate clean, publish in Phase 4 — done, all `is_published: false`; (2) old-course content (228 slides) is replaced lesson-by-lesson.

**Phase 1 — all six gap fixes merged; gate (M1.2 preview clean) PASSED:**
| Fix | Result |
|---|---|
| 1.1 Download re-host | At write time each Thinkific `download_url` is fetched and uploaded to `curriculum_content/.../downloads/`; slide html + link buttons point at `storage.googleapis.com`. Exercised live on M1.4 (`monthly-budget-01.png`). |
| 1.2 Unknown iframes | All 11 classified: **Thinkific-hosted Wistia videos** (`/api/course_player/v2/contents/{id}/play/{mediaId}`) — lesson intros for M2.1–M3.3 + the 3 Verse dividers. Mapped to `video_provider: "hosted"` slides via `wistia-map.json` (to be filled by re-host step). Zero `unknown` flags on full-course scan (`scan-course.js`). ⚠ Wistia hosts are NOT on the cloud egress allowlist — Grace added them 2026-07-20 (plus `www.googleapis.com` etc. pending); takes effect next session → re-host + the 9 blocked lessons are the first task then. |
| 1.3 Verse dividers | `migrate-lesson.js` prepends the module's Verse chapter slides to lesson 1 of each module (checkpoint indices shifted). NOTE: all 3 divider chapters are Wistia videos → M1.1/M2.1/M3.1 wait for the re-host step. |
| 1.4 Quiz explanations | **Consciously dropped** — the app's `QuizQuestion` shape (`Digital Curriculum/src/app/lib/curriculum.ts`) has no explanation field. Follow-up (Phase 4.4): add `explanation?` to the app, then backfill from cached Thinkific `text_explanation`. |
| 1.5 Global draft skip | `draft: true` skipped course-wide; scan confirms exactly the 3 expected draft items. |
| 1.6 Idempotency | Surveys + quiz docs now ALWAYS written as full replacements (no merge; quiz absent → `enabled:false, questions:[]`). M1.2 written twice → identical state. |

Also fixed: `lib-render.js` resolved `CHROME_PATH` at module load (before `.env` parse) — silent misconfig on cloud; now resolved at call time. Cloud-only patch: `gtoken` token URL `www.googleapis.com/oauth2/v4/token` (blocked) → equivalent `oauth2.googleapis.com/token` (allowlisted) — needed for Storage uploads; re-apply after any `npm install` in cloud until `www.googleapis.com` is allowlisted.

**Full-course dry scan (`scan-course.js`, cached in `scan-cache/`):** 277 items → 258 slides, 52 checkpoints, 13 quizzes. Notable NEEDS-REVIEW quiz flags: M1.6 Q2 (9 options/5 correct), M3.2 Q5 (5 options/4 correct), several multi-answer→single-answer truncations (M2.1, M2.2×2, M2.5, M3.1×3, M3.2, M3.3).

**Phase 2 — batch 1 WRITTEN to mortar-stage (all unpublished):**
| Lesson | Slides | Checkpoints | Quiz | Notes |
|---|---|---|---|---|
| M1.2 | 17 ✓ | 2 | — | idempotency-verified (double write) |
| M1.3 | 14 ✓ | 4 | 3q | flip-cards flattened on one slide |
| M1.4 | 31 ✓ | 3 | 3q | download re-hosted |
| M1.5 | 18 ✓ | 8 | 3q | |
| M1.6 | 12 ✓ | 4 | 2q | Q2 truncated — review |
| M3.5 | 5 ✓ | 4 | 1q | |

97 slides, 25 checkpoints, 12 quiz questions. Review pack (contact sheet of every slide + flags) delivered to Grace 2026-07-20 — **batch 1 sign-off pending**.

**Next session:**
1. Verify egress: `fast.wistia.net`, `fast.wistia.com`, `*.wistia.com/.net`, `embed-cloudfront.wistia.com`, `embedwistia-a.akamaihd.net`, `www.googleapis.com` (+ `iamcredentials.googleapis.com`, `accounts.google.com`).
2. Wistia re-host: for each of the 11 ids (resolve via `/play/` pages; e.g. first = `h7dxmu6tpz` "L6 - TAREN_v4.mp4"): `fast.wistia.net/embed/medias/{id}.json` → best mp4 asset → upload to `curriculum_content/.../videos/` → fill `wistia-map.json`.
3. Migrate M1.1, M2.1–M2.5, M3.1–M3.3 (dividers prepend automatically on M1.1/M2.1/M3.1).
4. Then Phase 3 verification.

### Session 2 (cont.) — Admin preview course (Grace request)

Created `courses/demoStudentTestUpload` — **"Digital Curriculum Student Demo Test Upload"**, `assignedRoles: [Admin, admin, superAdmin]`, `status: published` — exposing batch 1 (M1.2–M1.6, M3.5) with copied lessonSurveys/lessonQuizzes. The 6 migrated lessons are now **is_published: true** (LessonPlayer requires it). Original course untouched (still `published` with 4 assignedUserIds — its users could open the 6 published lessons through it; set it to `draft` if that's a concern during the migration window). Remove the demo course after review by deleting `courses/demoStudentTestUpload` (+ its two subcollections); re-unpublish the 6 lessons if Phase 3/4 sequencing requires.

### Session 2 (cont.) — Render fixes after Grace's visual review

Grace's walkthrough caught two defects in every rendered slide: (1) **all remote images broken** and Montserrat not loading — headless Chromium ignores the sandbox's proxy env vars and `--proxy-server` CONNECTs are reset, so every asset request silently failed; (2) **white background** — `lib-render.js` hardcoded white, but the course player theme is dark (measured live: content pane `#2e2e2e`, default text `#e5e5e5`), leaving the theme's light body text unreadable.

Fix (lib-render.js, committed): render with ZERO browser network — all `<img>` and CSS `url()` assets plus Montserrat woff2s are fetched in Node (proxy works there) and inlined as data: URIs; dark-theme wrapper (`#2e2e2e`/`#e5e5e5`, white headings, light flip-card flatten); HARD GUARD that aborts any render where an image has `naturalWidth === 0` — broken-image slides can never be written silently again. All 6 batch-1 lessons re-written and verified (same counts).

⚠ Known issue for Phase 3: slide PNGs are overwritten at the SAME Storage path with `cache-control: max-age=31536000` — anyone who loaded the old render sees the cached one until hard refresh. Consider versioned filenames on rewrite, or drop max-age. (Grace: Ctrl+Shift+R in the demo course to see the fixed slides.)

### Session 2 (cont.) — Phase 2 COMPLETE: Wistia re-host + remaining 9 lessons

Wistia/googleapis allowlist additions turned out to apply to the RUNNING session for curl (env-proxy path) — only node-fetch keeps a stale session-start snapshot. `rehost-wistia.js` (committed) therefore shells out to curl for Wistia; all **12 videos re-hosted** to `curriculum_content/{cur}/videos/{wistiaId}.mp4` (720p mp4s, 3–13MB; ids + titles in `wistia-map.json`, committed). Two quirks handled: domain-restricted media need a Thinkific Referer; some older media (`embed-ssl` deliveries) need candidate fallback (md/hd/mp4/iphone → original). Also hardened `fetchChapterItems`: draft/removed items can now return `content: null` (seen on 3 ids today) — skipped with a warning.

**All 9 remaining lessons written** (M1.1 9 slides incl. Foundations divider; M2.1 27 incl. The Core divider; M2.2 28; M2.3 16; M2.4 17; M2.5 22; M3.1 23 incl. Really Real divider; M3.2 16; M3.3 13). Course totals now: **268 slides, 52 checkpoints, 13 quizzes / 55 questions**, 12 hosted video slides, 3 verse dividers. M3.4 shell as planned. status.js table verified.

Demo course `demoStudentTestUpload` extended to all 15 lessons; all 15 `is_published: true` (demo review state — Phase 4 decides the real course's publish flow). Full review pack delivered to Grace.

**Remaining:** Grace's batch sign-off on M2/M3 renders → Phase 3 verification (status re-check done; stage-app walkthrough §3.2, PDF export §3.3, style spot-check §3.4) → Phase 4 publish decisions + follow-ups (quiz truncation reviews, quiz explanations app field, slide cache versioning, delete demo course).

### Session 2 (cont.) — Demo course "missing lessons" investigation

Grace reported modules 2/3 looked empty. Verified live in the deployed app (mortar-stage-stage.up.railway.app) with her account: all 15 lessons present — The Core expands to 5, Really Real to 4. Root cause of the confusion: `CourseDetail.tsx` renders `{module.durationMonths && module.durationMonths > 0 && …}` — with `durationMonths: 0` JSX prints a literal **"0"** next to the module badge, reading like "0 lessons". Removed `durationMonths` from the demo course's modules (data-side). **App follow-up:** change that guard to `module.durationMonths > 0 &&` (same pattern worth checking elsewhere: `{count && …}` renders 0 in React). Also note the module accordion opens ONE module at a time — collapsed cards show no lesson count, which compounds the confusion; consider showing `Lessons (n)` on collapsed cards.

### Session 2 (cont.) — Grace's walkthrough feedback (round 2)

Four issues, four fixes:
1. **Viewer too small / white filler under short slides** — `LessonSlideScreen.tsx` used a fixed 16:9 `aspect-video` letterbox with `bg-white`. Patched (needs app redeploy): viewer is now `h-[72vh]` (fills the window height, scrolls for the rest) and `bg-[#2e2e2e]` to match the slide theme, so short slides blend instead of showing a white block ("The Studio" case). Alternative if 72vh feels wrong: a fullscreen toggle — noted as an option, not implemented.
2. **Quizzes always show 4 options** — migration writes `optionC/D: ""` for 2–3-choice questions (the `QuizQuestion` shape requires all four keys); `LessonPlayer.tsx` rendered all four unconditionally. Patched: options with empty text are filtered out.
3. **"Document generation" never completes** — `CourseDetail.tsx` chip checked legacy `surveySubmitted[lessonId]`, but checkpoint submissions are stored under `lessonId::checkpointId` keys. Patched to use `isLessonSurveysCompleteByCount(...)` (same helper the Completed badge already uses).
4. **M1.2 still showed old white/broken renders** — the predicted stale-cache issue (same URL + `max-age=1y`). Pipeline fixed for good: `migrate-lesson.js` now clears the lesson's `screens/` prefix and writes **content-addressed filenames** (`slide_{i}_{md5:8}.png`) — every re-render gets new URLs. Also `lib-render.js` now clips trailing blank space (empty fitvids wrappers left by extracted videos) via DOM content-bottom measurement, and waits on `load`+`img.decode()` (networkidle0 stalls on large data-URI documents). M1.2 + M2.1 re-written under the new scheme.

⚠ The three app patches (`LessonSlideScreen.tsx`, `LessonPlayer.tsx`, `CourseDetail.tsx`) are committed to the repo but need a **redeploy of the Digital Curriculum web app** (Railway) to take effect. Other 13 lessons keep their old-style filenames until next re-render — harmless (their content is current), and any future re-render auto-migrates them.

### Session 2 (cont.) — Skills, badges, certificates, subtitles (Phase 4.4 items)

Grace-approved scope: skills on the 4 skill lessons; module certs+badges triggered by ALL lessons complete (no end-of-module test exists); course cert+badge with "Digital MORTAR MASTER" honorific; subtitles displayed in app. Challenges list deferred (marked draft).

**Data (live now on mortar-stage):**
- Badge artwork generated (MORTAR-styled, 1024px) → Storage `badge_bank/*` + `badge_bank` docs + `badge_definitions`: `module-foundations-complete`, `module-the-core-complete`, `module-really-real-complete` (Tier I, awarded via existing `awardCourseModuleBadges` callable through `modules[].completionBadgeIds`), `digital-mortar-master` (course badge; metric rule lessons_completed≥15 + conditions quizzes_passed≥13 as engine-driven safety net).
- Both courses (original + demo): `modules[].skills` (Foundations→Personal Finance I; The Core→Branding & Marketing I, Business Finance I, Pitch Your Business I), `modules[].completionBadgeIds`, `modules[].lessons[].subtitle/skill`.
- 16 curriculum lesson docs: `subtitle` + `skill` fields set from course-ids.json.
- Scripts committed: `make-badges.js`, `wire-skills-badges.js`.

**App (committed, needs redeploy — same deploy as earlier UI patches):**
- `dataroom.ts`: new `awardSkillAndCertificate()` (template-PDF cert into dataroom, idempotent; optional `confident_skills` profile add).
- `LessonPlayer.tsx`: per-lesson skill cert+profile skill when a skill lesson fully completes (both completion paths); module completion certificate on newly-completed module (alongside badge callable); course certificate "Digital MORTAR MASTER" at 100%; lesson subtitle in player header.
- `CourseDetail.tsx`: subtitle under lesson titles (module skills chips already rendered by existing code).
- `curriculum.ts`/`courses.ts`: Lesson types gained `subtitle`/`skill`.

⚠ Known gap: in the ORIGINAL course, module 3 mapping includes the M3.4 shell (0 slides, can't be completed) → Really Real badge/cert and course 100% unreachable there until M3.4 is excluded from `curriculumMapping` or given content (Phase 4 decision). The demo course excludes M3.4, so the full flow is testable there end-to-end.
⚠ Certificate wording: the PDF template draws recipient name + one line (skill/module/honorific). If the printed template text doesn't read "For Successfully Completing the MORTAR Masters: Online Entrepreneurship Academy", adjust template or drawing in `dataroom.ts` `generateTemplateCertificatePdfUpload`.

### Session 2 (cont.) — Challenge badges (Grace's engagement list)

8 `badge_definitions` created (tier "Challenge", platform digital_curriculum) with generated artwork in `badge_bank`. Script: `make-challenge-badges.js`.

ACTIVE (metric exists in the badge engine):
| Badge | Rule |
|---|---|
| All About You | onboarding_completions ≥ 1 |
| Opening Track | lessons_completed ≥ 2 — closest proxy for "completed The Release Party" (engine has no per-lesson metric; Welcome + Release Party = first 2 lessons) |
| Freestyle Session | discussions_created ≥ 1 |
| Call & Response *(suggested name)* | discussion_replies ≥ 1 |
| Wrapped | lessons_completed ≥ 15 (all three modules) |

INACTIVE drafts (visible in Badge Management; rename + activate when ready):
- **Studio Time** — learning-hours goal: no hours metric in `user_analytics_summary.counts` yet (though `trackLessonTime` callable exists — a rollup counter would enable it); threshold needs avg-completion-time data.
- **Album Drop** — full course within N days: engine timeframe is `all_time` in v1; needs a windowed rule + timing data.
- **Outro** — end-of-course survey: survey submissions aren't rolled up as a metric; needs a counter added.

Follow-up options for the three drafts: add `lesson_time_minutes` / `surveys_submitted` counters to the analytics rollup, and a windowed-timeframe rule mode. Per-lesson badge targeting ("completed lesson X") would also make Opening Track exact instead of a proxy.

### Session 2 (cont.) — MORTAR branding sweep

Replaced user-facing "Mortar" → "MORTAR" (word-boundary, exact-case, comment lines untouched, identifiers/URLs/bundle-ids unaffected) across:
- **Digital Curriculum** `src/` (~54 strings: nav/headers, Login, PasswordGate, tour, DM widget, weekly activity, Terms of Use, email defaults "MORTAR Team"/"Open MORTAR", shop, admin panels) + `index.html` title ("Overall Project UI" → "MORTAR").
- **Cloud Functions** `src/` (transactional email test payloads, email defaults, push notification copy, mobile payment return page, "MORTAR Expansion Network" display default).
- **Expansion mobile (Flutter)** `lib/` (~20 strings: app title, landing "MORTAR Alumni Network", home/feed/onboarding/Terms, event calendar text) + **launcher names**: Android `android:label` and iOS `CFBundleDisplayName`/`CFBundleName` → "MORTAR Alumni Network".
- **web/** Next.js app + **UI/** prototype `src/` (same treatment).
- **Firestore display data**: curricula description ("MORTAR Masters"), 2 events ("MORTAR HQ"). Courses/badges already used MORTAR.

Verification: zero non-comment `\bMortar\b` matches remain in the four codebases. Edits were made in place on disk (git diff shows the full change set for review). Takes effect on: Digital Curriculum redeploy (pending anyway), functions deploy, next mobile app build (launcher name change requires reinstall), web/ redeploy if that surface is used.
