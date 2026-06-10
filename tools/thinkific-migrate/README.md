# Thinkific → MORTAR course migration

Migrates the **MORTAR MASTERS Online** course from Thinkific into the Digital
Curriculum (Firestore). This creates a **brand-new** course with fresh IDs.

## What gets created

The 3-module / 15-lesson structure from the Thinkific outline:

| Module | Title | Lessons |
| ------ | ----- | ------- |
| 1 | First Verse: Foundations | The Release Party · Expect the Unexpected · Dollars and Sense · Fade In · Reflection |
| 2 | The Core | The Medium Is the Message · Always Be Closing · All Eyes on Them · Balancing Act · Make Me Care |
| 3 | Really Real | Game Recognize Game · Legit or Quit · C.R.E.A.M. · Pitching & Alternatives · The End of the Beginning |

Each module gets one auto-chapter ("Main Chapter") and the lessons are created
as **shells** (titles + order + parent refs, `is_published: false`). Slide/media
content is filled in during the content-migration phase (below).

Firestore layout (matches `Digital Curriculum/src/app/lib/curriculum.ts`):

```
courses/{courseId}                                    legacy course doc + curriculumMapping
curricula/{curriculumId}
  modules/{moduleId}
    chapters/{chapterId}            ("Main Chapter")
      lessons/{lessonId}            (shell)
```

## Setup

1. **Install nothing** — these scripts use `firebase-admin` (already a repo
   dependency) and the built-in `fetch`. Just make sure `npm install` has been
   run at the repo root.

2. **Add your keys.** Copy the env template and fill it in:

   ```bash
   cd tools/thinkific-migrate
   cp .env.example .env
   ```

   Then edit `.env`:
   - `THINKIFIC_API_KEY` — Thinkific Admin → Settings → Code & Analytics → API.
   - `THINKIFIC_SUBDOMAIN` — the part before `.thinkific.com` in your admin URL.
   - `FIREBASE_PROJECT_ID` — defaults to `mortar-stage`.

   `.env` is gitignored. Never commit it.

3. **Firestore credentials.** Place the service-account JSON at the **repo root**
   as `mortar-stage-firebase-adminsdk-fbsvc-67e746a43d.json`, or set
   `GOOGLE_APPLICATION_CREDENTIALS` in `.env` to its path. (Same mechanism as
   `infra/scripts/*`.)

## Run order

```bash
# 0. (optional) confirm your Thinkific keys work and see the real content tree
node tools/thinkific-migrate/list-thinkific.js                 # list courses
node tools/thinkific-migrate/list-thinkific.js <courseId>      # one course's tree

# 1. preview the structure that will be written — NO writes
node tools/thinkific-migrate/setup-course.js --dry-run

# 2. create the course structure in Firestore
node tools/thinkific-migrate/setup-course.js
```

`setup-course.js` prints every generated ID and writes them to
`tools/thinkific-migrate/course-ids.json` (gitignored) for the content phase.

## Content migration (slides) — authenticated course-player API

The public REST API returns only metadata (no HTML bodies, no quiz/survey
questions — confirmed: those endpoints 404, and lesson `take_url`s redirect to
sign-in). Content lives behind Thinkific's **internal course-player API**
(`/api/course_player/v2/contents/{id}`), which authenticates with a logged-in
session cookie.

### Capturing a session cookie

1. Log in to your Thinkific admin at `https://mortarmastersonline.thinkific.com`
   with an account that can **view the course content** (owner/admin, or a user
   enrolled in the course).
2. Open the course and start any lesson so you're on a `…/courses/take/…` page.
3. Open DevTools (F12) → **Network** tab → click any request to your
   `mortarmastersonline.thinkific.com` domain (e.g. a `course_player` XHR).
4. Under **Request Headers**, find **`cookie:`** and copy its **entire value**.
5. Paste it into `.env` as `THINKIFIC_COOKIE=<paste>` (one line, no quotes).

The cookie expires after a while — if a run reports "redirected to sign-in",
just recapture it. (Alternatively we can automate login via your SSO signing
secret; cookie is simpler for a one-time run.)

### Run

```bash
# confirm the cookie works + see the real content shapes
node tools/thinkific-migrate/inspect-player.js
```

Then the per-lesson content migration is built on top of the shapes that prints.

## Deferred (not done yet, on purpose)

- **Badges** — left out per request.
- **Skills** — the "Skill Earned" annotations (Personal Finance, Branding &
  Marketing, Business Finance, Pitch Your Business — all Tier I) are recorded in
  `setup-course.js` comments and kept off the module docs (`skills: []`), because
  the app's course flow expects a **certificate PDF per skill** which we don't
  have yet. Map: Dollars and Sense → Personal Finance · The Medium Is the
  Message → Branding & Marketing · Balancing Act → Business Finance · Make Me
  Care → Pitch Your Business.
- **Pricing / duration** — set to `0` / `0`; edit in the admin UI later.
- **Lesson content** — shells only. The content-migration phase pulls each
  Thinkific content item (HTML lessons, videos, quizzes, surveys) via the API in
  `thinkific-client.js` and writes slides/media onto the matching lesson. Once
  content is reviewed, flip the course `status` to `published` and publish each
  lesson (`is_published: true`).

⚠ **Reflection** (Module 1, lesson 5) — verify against Thinkific for changes
before migrating its content.
```
