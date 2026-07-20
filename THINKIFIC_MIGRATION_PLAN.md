# Thinkific → MORTAR Digital Curriculum: Migration Runbook

**Date:** July 20, 2026
**Source:** MORTAR MASTERS Online — `mortarmastersonline.thinkific.com` (live course id **2695023**)
**Target:** Digital Curriculum on Firebase **`mortar-stage`** (curriculum `lA5KRk3YYiSLMHllA4XW`)
**Toolchain:** `tools/thinkific-migrate/` (already in the repo — this runbook executes and hardens it, not rebuilds it)

Every step lists **Owner** (You / Claude), **Action**, and **Done when**. Steps run in order; a phase doesn't start until the previous phase's gate passes. Appendix A holds the background findings that justify the design.

---

## Phase 0 — Preflight (≈30 min, mostly Claude)

**Gate to pass:** pipeline can reach Thinkific + Firebase, cookie works, and we know exactly what's already migrated.

### Step 0.1 — Refresh the Thinkific session cookie
- **Owner:** You (only manual credential step in the whole runbook)
- **Action:** Log in to Thinkific admin → open any lesson page → DevTools (F12) → Network → click any `course_player` request → copy the full `cookie:` request header → paste into `tools/thinkific-migrate/.env` as `THINKIFIC_COOKIE=...` (one line). Full instructions are in the tool's README.
- **Done when:** `.env` saved. (Current cookie is from June 10 — assume expired.)

### Step 0.2 — Stage the pipeline into the run environment
- **Owner:** Claude
- **Action:** Copy `tools/thinkific-migrate/`, the service-account JSON, and `.env` from the connected folder into the Cowork cloud workspace; `npm install`; set `CHROME_PATH=/opt/pw-browsers/chromium`.
- **Done when:** `node -e "require('firebase-admin')"` and a Chromium launch both succeed.
- **Fallback:** if any of Step 0.3's endpoints are unreachable from the cloud sandbox, switch the run environment to your machine (Claude Code / Cowork "On your computer") — same steps, no staging.

### Step 0.3 — Connectivity + auth smoke test
- **Owner:** Claude
- **Action:** Test reachability of `mortarmastersonline.thinkific.com`, `files.cdn.thinkific.com`, `firestore.googleapis.com`, `storage.googleapis.com`; then run `node inspect-player.js`.
- **Done when:** inspect-player prints real content shapes (no sign-in redirect). If redirected → cookie recapture (Step 0.1) and retry.

### Step 0.4 — ⚠ Remap `course-ids.json` to the live course (**blocking**)
- **Owner:** Claude
- **Action:** `course-ids.json` currently points at Thinkific course **2418972** (an older copy); the course you linked is **2695023** with different chapter ids. Run `node list-thinkific.js`, confirm 2695023 is canonical (you confirm in one sentence), then rewrite each lesson's `thinkificChapterId` by chapter-title match. All MORTAR-side ids stay untouched.
- **Done when:** every one of the 16 lessons maps to a 2695023 chapter id, verified by a title-by-title diff printed for your sign-off.

### Step 0.5 — Audit current Firestore state
- **Owner:** Claude
- **Action:** Write and run `status.js`: for each of the 16 lessons, report `lesson_content` slide count, `lessonSurveys`/`lessonQuizzes` presence, `is_published`.
- **Done when:** a status table is in `MIGRATION_LOG.md` — this is the baseline the whole run is tracked against.

---

## Phase 1 — Pipeline gap fixes (≈half a day, Claude)

**Gate to pass:** all six fixes merged; Lesson M1.2 preview runs clean with them active.

| Step | Fix | Done when |
|---|---|---|
| 1.1 | **Re-host Download files** — fetch each Thinkific `download_url` (signed, expiring) at migration time and upload to `curriculum_content/.../downloads/`, linking the Storage URL instead | The 3 Download items produce slides whose links point at `storage.googleapis.com` |
| 1.2 | **Classify the 12 unknown Thinkific-hosted iframes** — scan script lists each one's target; map embedded PDFs → download-style slide, embedded pages → render or link button | Zero `unknown` flags remain on a full-course dry scan |
| 1.3 | **Verse divider pages** — prepend "Foundations" / "The Core" / "Really Real" intro pages as slide 0 of each module's first lesson (recommended; zero content loss) | Dry-run shows the 3 intro slides in M1.1 / M2.1 / M3.1 |
| 1.4 | **Quiz explanations** — verify Thinkific `text_explanation` per question lands in the LessonQuiz shape (add field if the app supports it; else log as consciously dropped) | Decision recorded + mapping updated |
| 1.5 | **Global draft skip** — skip all `draft: true` items (3 in this course) instead of per-lesson overrides | Dry-run flags them as skipped |
| 1.6 | **Idempotency guard** — confirm `--write` replace-then-verify logic (already present) covers surveys/quizzes too, so any lesson can be re-run safely | Re-running a lesson twice yields identical Firestore state |

---

## Phase 2 — Per-lesson migration loop (the core; ≈2–4 h pipeline time)

Run for each lesson in order: **M1.1 → M1.6, M2.1 → M2.5, M3.1 → M3.5** (skip M3.4 *Pitching & Alternatives* — its Thinkific chapter is intentionally empty; it stays a shell).

For **each** lesson:

### Step 2.L.1 — Preview mapping
- **Owner:** Claude — `node migrate-lesson.js --module M --lesson L` (no `--write`)
- **Done when:** item list, slide plan, checkpoint placement, quiz summary, and flags all reviewed; unexpected flags resolved via `LESSON_OVERRIDES` before proceeding.

### Step 2.L.2 — Render + visual QA
- **Owner:** Claude — `node review-lesson.js --module M --lesson L`, then diff each PNG in `preview/` against the live Thinkific page (browser screenshots), checking: typography/spacing, images present, flip-cards flattened legibly, GIF/video slides positioned correctly, checkpoint after the right slide.
- **Done when:** every slide passes, or fixes are applied and re-rendered.

### Step 2.L.3 — Write to Firestore
- **Owner:** Claude — re-run with `--write`.
- **Done when:** built-in slide-count verification passes; surveys/quiz docs written; result appended to `MIGRATION_LOG.md`.

### Step 2.L.4 — Batched sign-off (every 3–4 lessons)
- **Owner:** You
- **Action:** Claude sends a review pack (contact sheet of renders + flags + log excerpt). You reply approve / change-requests.
- **Done when:** batch approved. (Prefer fully hands-off? Say so and this becomes one end-of-run review.)

**Expected end-of-phase totals:** ~250–300 PNG slides, 13 video slides, 21 re-hosted GIFs, ~75 survey checkpoints, 13 quizzes — all unpublished.

---

## Phase 3 — Verification (≈1–2 h)

| Step | Action | Owner | Done when |
|---|---|---|---|
| 3.1 | Re-run `status.js`; compare against `MIGRATION_LOG.md` | Claude | Every lesson (except M3.4) has matching slide counts, `content_type: "media"` |
| 3.2 | Stage-app walkthrough: load Digital Curriculum against `mortar-stage`; walk 2–3 full lessons — slide nav, GIF animation, YouTube playback, link buttons, mid-lesson checkpoints, quiz submit/pass | Claude (browser) | All behaviors work; issues filed and fixed |
| 3.3 | **PDF export check:** complete a `generatePdfOnComplete` checkpoint; confirm the PDF lands in the learner dataroom | Claude | PDF present and readable |
| 3.4 | Style spot-check: before/after contact sheet, ≥1 slide per lesson vs live Thinkific | Claude → You | You confirm fidelity is acceptable |

---

## Phase 4 — Publish (≈30 min)

| Step | Action | Owner | Done when |
|---|---|---|---|
| 4.1 | `node publish-lesson.js` per approved lesson | Claude | All 15 content lessons `is_published: true` |
| 4.2 | Flip course `status` to published | Claude | Course visible to learners on stage |
| 4.3 | Decide promotion to prod (`mortar-9d29d`) — separate, explicit step; nothing in this runbook touches prod | You | Go/no-go recorded |
| 4.4 | Deferred items logged as follow-ups: badges, skills + certificate PDFs (template exists), pricing/duration, M3.4 content | Claude | Follow-up list at the end of `MIGRATION_LOG.md` |

---

## Failure playbook

| If | Then |
|---|---|
| Cookie expires mid-run | Pipeline detects sign-in redirect → you recapture (Step 0.1), Claude resumes at the last incomplete lesson (idempotent) |
| Cloud sandbox can't reach Thinkific/Firebase | Move run to your machine (Step 0.2 fallback), or Claude extracts a JSON+assets bundle through your logged-in Chrome and the pipeline runs from the bundle |
| A render looks wrong | Fix in `LESSON_OVERRIDES` / `lib-render.js` CSS, re-run that lesson only |
| Slide-count mismatch on write | Script already throws — re-run the lesson |
| Thinkific content edited mid-migration | Re-run affected lesson; `status.js` shows drift |

---

## Appendix A — Findings the plan is built on (reference)

**Source inventory (live walkthrough, Jul 20, 2026):** 18 chapters → 3 modules / 16 lessons; **277 items** = 186 HtmlItem, 65 Assignment, 13 Quiz (Lessons 2–14), 10 Survey, 3 Download; 3 draft items (skipped). Media: 160 images (131 PNG / 21 GIF / 4 WebP / 4 JPG-JPEG), 25 iframes (13 YouTube, 12 to classify), 66 flip-card/button interactives, Montserrat throughout, 1,000+ inline styles + 263 `<style>` blocks.

**Why the course-player API:** Thinkific has no bulk export, and the Admin REST API (your Grow-plan key in `Thinkificapiinfo`) returns metadata only — no HTML bodies or quiz questions. Full bodies come from the session-cookie `/api/course_player/v2/...` endpoints — validated live this session for all five content types.

**Why PNG snapshots match style "to a T":** lesson bodies are heavily inline-styled Froala HTML; converting to the app's structured blocks would be lossy. `lib-render.js` reproduces Thinkific's reading pane (900px, Montserrat, white, 2× retina) so the render *is* the Thinkific look. Videos stay native YouTube slides; GIFs stay animated; hyperlinks become link buttons under the slide (already supported by `LessonSlideScreen`).

**Target model:** `curricula/.../lessons/{l}/lesson_content` media slides; `courses/{id}/lessonSurveys/{lessonId}` checkpoints (with `generatePdfOnComplete` → jsPDF → learner dataroom = your exportable-document feature); `courses/{id}/lessonQuizzes/{lessonId}`. Structure shells + id map already exist (`course-ids.json`), created against the older course copy — hence blocking Step 0.4.

**Run-environment constraints:** the local device bridge has no network, so the pipeline runs either in the Cowork cloud workspace (Chromium preinstalled; `CHROME_PATH` override supported by `lib-render.js`) or directly on your machine via Claude Code / Cowork-on-computer.
