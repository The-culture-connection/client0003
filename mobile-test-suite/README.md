# Mobile test suite

The Mortarverse mobile app, built for the web and hosted on Railway, with two
ways to test it:

- **Manual** — open the service URL. The app runs in a phone frame (iPhone,
  Android and iPad presets) next to a checklist of flows to test. Mark each
  Pass / Fail / Blocked, add notes, then **Copy report** to paste into Slack or
  an issue. Results are saved in your browser only.
- **Automated** — Playwright tests in `e2e/` drive the same build: sign-in,
  every quick-start onboarding gate, the checkpoint, the full-profile hand-off
  and the Mortarverse complete-profile reminder.

The app talks to the live **mortar-stage** backend (the same one the store
builds use). Anything a tester creates is visible to real members.

## What runs where

| Path       | What                                                   |
|------------|--------------------------------------------------------|
| `/`        | Test page: phone frame + checklist (`public/`)         |
| `/app/`    | Flutter web build of `ExpansionNetworkApp/expansion_network` |
| `/healthz` | Health check                                           |

The web build is compiled with `--dart-define=E2E_SEMANTICS=true`, which turns
on Flutter's accessibility tree so Playwright can find buttons and fields. It
does nothing in the store builds.

Not testable in a browser: camera QR scanning and push notifications (push is
switched off on web).

## Railway service

- Service name must start with `mortar-` — the callable CORS allowlist
  (`functions/src/callableCorsAllowlist.ts`) accepts `mortar-*.up.railway.app`.
- Source: this repo, branch `staging`, root directory `/` (repo root).
- Variable `RAILWAY_DOCKERFILE_PATH=mobile-test-suite/Dockerfile`.
- Optional variable `SUITE_PASSWORD` puts the whole site behind a password
  prompt (any username).

## Adding a manual test case

Edit `public/checklist.js`. Keep `id`s stable — saved results are keyed by them.

## Running the automated tests

They sign in as one dedicated QA account and reset it to "just signed up"
before each test, using that account's own login (no admin key needed).

```sh
cd mobile-test-suite/e2e
npm install
npx playwright install chromium
# .env (git-ignored):
#   SUITE_URL=https://<the railway domain>
#   QA_EMAIL=...
#   QA_PASSWORD=...
npx playwright test
```

Against a local build instead: build with the same flags as the Dockerfile,
then `APP_DIR=<build> PORT=3000 node server.mjs` and `SUITE_URL=http://localhost:3000`.
Use port 3000 — `localhost:3000` is on the callable CORS allowlist; other
ports fail at sign-in.

In GitHub Actions (`.github/workflows/mobile-e2e.yml`) the suite runs after
each successful Railway deploy to the Stage environment, or on demand. It needs
secrets `QA_EMAIL`, `QA_PASSWORD` and variable `SUITE_URL`.
