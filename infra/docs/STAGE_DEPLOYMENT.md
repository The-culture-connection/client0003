# Staging (`mortar-stage`) — deployment split

Staging is **two parts**:

1. **Digital Curriculum (web)** → deploy on **[Railway](https://railway.app)** (build + host). This is the primary app delivery path for stage.
2. **Firebase backend** → deploy with **Firebase CLI** (or optional GitHub Actions): Cloud Functions, Firestore rules, indexes, Storage rules → project **`mortar-stage`**.

---

## 1. Railway — stage web app (Digital Curriculum)

Follow **[Digital Curriculum/DEPLOY_RAILWAY.md](../../Digital%20Curriculum/DEPLOY_RAILWAY.md)** for root directory, watch paths, and build/start.

### Required variables on the **staging** Railway service

Point the Vite app at **`mortar-stage`**:

| Variable | Value | Notes |
|----------|--------|--------|
| `VITE_FIREBASE_ENV` | `stage` | Selects the embedded `stage` block in `src/app/lib/firebase.ts`. |
| *(optional)* | | If you prefer env-driven keys instead of the embedded `stage` object, set `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` to the **mortar-stage** web app values from Firebase Console. |

Do **not** set `VITE_USE_EMULATOR=true` on Railway.

### Branching

Connect the Railway service to the branch you use for staging (e.g. `stage`). Pushes to that branch redeploy the site when watch paths include `Digital Curriculum`.

### After the first Railway deploy

1. **Firebase Console → Authentication → Settings → Authorized domains**  
   Add your Railway hostname, e.g. `something.up.railway.app`, and any custom domain.

2. **Callable CORS**  
   `functions/src/index.ts` already allows `https://*.up.railway.app` (regex) and `https://mortar-web-staging.up.railway.app`. If you get CORS errors, add your **exact** `https://…` origin to `defaultCallableOptions.cors` and redeploy **functions** to `mortar-stage`.

---

## 2. Firebase CLI — backend only (`mortar-stage`)

Run from **repo root** (not on Railway; from your machine or CI):

```bash
firebase use staging
firebase deploy --only functions,firestore:rules,firestore:indexes,storage
```

Or:

```bash
npm run deploy:stage
```

**Do not** point this at `mortar-dev` unless you mean to. Dev CI deploys **functions + indexes only** to dev (not these Firestore/Storage rules).

### Optional: GitHub Actions for Firebase only

Workflow **`.github/workflows/deploy-stage.yml`** can deploy the same Firebase targets when you push to `stage` / `release/*` or run it manually. It does **not** replace Railway; it only automates the Firebase half. Requires `FIREBASE_TOKEN`.

---

## 3. Post-deploy checklist (Firebase)

1. **Admin claims** (machine with access to `mortar-stage`):

   ```bash
   node infra/scripts/assign-superadmin-roles.js --env stage
   ```

2. **Next.js `web/`** (if you host it somewhere for stage) — set `NEXT_PUBLIC_*` to `mortar-stage` (see `web/README.md`).

3. **Expansion Network (Flutter)** — still points at dev until you regenerate `firebase_options` / `google-services.json` for `mortar-stage`.

---

## 4. Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| `permission-denied` on Firestore | Rules deployed; user missing claim or `users/{uid}` shape |
| Callable CORS in browser from Railway | Add exact Railway `https://` URL to function `cors`; redeploy functions |
| Blank or wrong Firebase project in UI | Railway `VITE_FIREBASE_ENV` not `stage`, or wrong `VITE_*` overrides |
| `FAILED_PRECONDITION` / missing index | Run `firebase deploy --only firestore:indexes --project mortar-stage` |

## Project alias (`.firebaserc`)

- `staging` → `mortar-stage` (`firebase use staging`)
