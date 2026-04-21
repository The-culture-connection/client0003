# Deploy Digital Curriculum to Railway

This app is a Vite + React SPA that builds to static files and is served with `serve` in production.

## 1. Prerequisites

- A [Railway](https://railway.app) account (GitHub login is easiest).
- This repo pushed to GitHub (or another provider Railway supports).

## 2. Create a new project on Railway

1. Go to [railway.app](https://railway.app) and sign in.
2. Click **New Project**.
3. Choose **Deploy from GitHub repo** and select your repository.
4. When prompted for the **root directory**, set it to **`Digital Curriculum`** (the folder containing this `package.json` and `railway.toml`).  
   - If you don’t set this, set it later: select the service → **Settings** → **Root Directory** → `Digital Curriculum`.

## 3. Fix “No deployment needed – watched paths not modified”

If pushes to `main` don’t trigger a build and you see **“No deployment needed - watched paths not modified”**, the service is only watching other paths (e.g. `web`, `functions`). Do one of the following:

**Option A – Set Watch Paths in the dashboard (recommended)**

1. Open your project on Railway → select the **mortar-web** (or this app’s) service.
2. Go to **Settings** → **Build** (or **Triggers** / **Source**).
3. Find **Watch Paths** (or **Watch Patterns**).
4. Either:
   - **Clear all watch paths** so every push triggers a deploy, or
   - **Add** the path to this app (paths are from **repo root**):
     - If the repo root is the `Technology` folder: add **`Digital Curriculum`** (and optionally **`Digital Curriculum/**`).
     - If the repo root is the parent of `Technology`: add **`Technology/Digital Curriculum`** (and optionally **`Technology/Digital Curriculum/**`).
5. Save. The next push that touches this folder should trigger a build.

**Option B – Rely on config in code**

`railway.toml` in this folder sets `watchPatterns = ["Digital Curriculum", "Digital Curriculum/**"]` (relative to repo root). Some Railway builders ignore watch patterns from config; if builds still don’t run, use Option A.

## 4. Build and start (automatic)

Railway will use `railway.toml` in this directory:

- **Build:** `npm install --include=dev --no-audit --no-fund && npm run build` (Vite and the Tailwind/Vite plugins are **devDependencies**; production-style installs skip them. We use **`npm install --include=dev`** instead of a second **`npm ci`**: a second `npm ci` tries to delete the whole `node_modules` tree and often fails with **`EBUSY: rmdir .../node_modules/.cache`** when the builder already ran an install step.)
- **Start:** `npx serve -s dist -l $PORT` (serves the SPA and sends all routes to `index.html`).

No need to set build/start commands in the dashboard unless you want to override them.

During **build**, `npm run build` runs **`prebuild`** first (`scripts/print-firebase-env.mjs`), which prints lines between `MORTAR_FIREBASE_BUILD_TARGET_START` and `MORTAR_FIREBASE_BUILD_TARGET_END`, including **`BUNDLED_FIREBASE_PROJECT_ID=`**. Search the deployment **Build Logs** for `MORTAR_FIREBASE` (Railway sometimes truncates long logs — search helps).

## 5. Environment variables (optional)

Set these in the Railway service: **Variables** (or **Settings** → **Variables**).

### Staging (`mortar-stage`)

Use a **dedicated Railway service** (or environment) for staging and connect it to your staging branch (e.g. `stage`).

| Variable | Value |
|----------|--------|
| `VITE_FIREBASE_ENV` | `stage` |

That selects the built-in **`stage`** Firebase config in `src/app/lib/firebase.ts` (project `mortar-stage`). You only need the extra `VITE_FIREBASE_*` variables below if you want to override those defaults.

Backend (Functions, Firestore rules, Storage) for `mortar-stage` is **not** deployed by Railway — use Firebase CLI from the monorepo root. See [infra/docs/STAGE_DEPLOYMENT.md](../infra/docs/STAGE_DEPLOYMENT.md).

### Production Firebase

For **production**, point the app at your prod project:

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_FIREBASE_ENV` | Firebase config set: `dev`, `stage`, or `prod` | `prod` |
| `VITE_FIREBASE_API_KEY` | Firebase API key (prod) | (from Firebase Console) |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auth domain | `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Project ID | `your-project-id` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage bucket | `your-project.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Messaging sender ID | (from Firebase Console) |
| `VITE_FIREBASE_APP_ID` | Firebase app ID | (from Firebase Console) |

If these are not set, the app falls back to the defaults in `src/app/lib/firebase.ts` (e.g. `prod` config with hardcoded values).

For **admin login** (optional):

| Variable | Description |
|----------|-------------|
| `VITE_ADMIN_PASSWORD` | Password for the admin login page. |

Do **not** set `VITE_USE_EMULATOR` to `true` in production.

## 6. Deploy

- **Automatic:** Every push to the branch you connected will trigger a new build and deploy (once Watch Paths are fixed as above).
- **Manual:** In the Railway dashboard, open the latest deployment and use **Redeploy** if needed.

## 7. Custom domain (optional)

In the Railway service: **Settings** → **Networking** → **Public Networking** → **Generate Domain** (or add a custom domain).

---

**Summary:** Set **Root Directory** to `Digital Curriculum`, fix **Watch Paths** so changes under `Digital Curriculum` trigger builds, add any env vars you need, and Railway will build and serve the app on each push.
