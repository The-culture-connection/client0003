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

## 3. Build and start (automatic)

Railway will use `railway.toml` in this directory:

- **Build:** `npm run build` (Vite builds into `dist/`).
- **Start:** `npx serve -s dist -l $PORT` (serves the SPA and sends all routes to `index.html`).

No need to set build/start commands in the dashboard unless you want to override them.

## 4. Environment variables (optional)

Set these in the Railway service: **Variables** (or **Settings** → **Variables**).

For **production Firebase**, point the app at your prod project:

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

## 5. Deploy

- **Automatic:** Every push to the branch you connected will trigger a new build and deploy.
- **Manual:** In the Railway dashboard, open the latest deployment and use **Redeploy** if needed.

## 6. Custom domain (optional)

In the Railway service: **Settings** → **Networking** → **Public Networking** → **Generate Domain** (or add a custom domain).

---

**Summary:** Set **Root Directory** to `Digital Curriculum`, add any env vars you need, and Railway will build and serve the app on each push.
