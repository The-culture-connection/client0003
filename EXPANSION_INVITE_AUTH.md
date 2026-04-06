# Expansion Network — invite codes, eligible users, and session init

This document describes the **invite-code activation** and **session** architecture added for the Expansion Network (Flutter) app and Mortar web admin. Firebase Auth remains identity-only; **alumni network access** is granted only when `eligibleUsers/{normalizedEmail}` exists and `networkAccess == true`.

## Canonical role strings (exact — do not rename)

- `superAdmin`
- `Admin`
- `Alumni`
- `Digital Curriculum Alumni`
- `Digital Curriculum Students`

`networkAccess` is derived server-side: **false** only for `Digital Curriculum Students`; **true** for the other four.

## Firestore collections

### `eligibleUsers/{normalizedEmail}`

Document ID: `email.trim().toLowerCase()`.

Intended fields include: `email`, `normalizedEmail`, `role`, `networkAccess`, `source`, `linkedUid`, `accountClaimed`, `inviteRequired`, `latestInviteCodeId`, `createdAt`, `updatedAt`, `claimedAt`, optional `cohortId`.

### `inviteCodes/{inviteId}`

One-time invite documents. The implementation currently stores a **plaintext** `code` field (plus `codePreview`) for simplicity. **Safer follow-up:** store only `codeHash` (e.g. SHA-256 of normalized code + server secret) and compare hashes in `claimInviteAndCreateAccount` / `validateInviteCode`; return plain code only once at generation time to admins.

### `users/{uid}`

App profile and synced gate fields: `uid`, `email`, `normalizedEmail`, `role`, `roles`, `networkAccess`, `profileCreated`, `onboardingComplete`, `eligibleUserEmail`, timestamps, plus existing curriculum-shaped fields.

## Cloud Functions (`us-central1`)

| Callable | Access | Purpose |
|----------|--------|---------|
| `initializeUserSession` | Authenticated | Enforce eligibility; merge `users/{uid}`; return `READY_FOR_HOME` or `REQUIRES_ONBOARDING` or `UNAUTHORIZED`. |
| `claimInviteAndCreateAccount` | Public | Validate latest invite; create Auth user with email/password; mark invite used; link Firestore. Returns `signInWithEmailPassword: true` — client signs in with `signInWithEmailAndPassword` (no custom token / no `signBlob` IAM). Structured errors: `ALREADY_EXISTS`, etc. |
| `finalizeInviteClaim` | Authenticated | After `signInWithEmailAndPassword`, consumes the invite and links `eligibleUsers` / `users/{uid}` (for people who already had Firebase Auth). Idempotent if this user already consumed the invite. |
| `createOrUpdateEligibleUser` | Admin | Upsert eligible user; optionally generate invite (not for Students by default). |
| `generateInviteCode` | Admin | New code; revokes prior invite via `revoked: true` on old doc. |
| `revokeInviteCode` | Admin | Mark invite revoked. |
| `bulkUploadEligibleUsers` | Admin | Upsert many eligible rows (no auto-invite per row). |
| `promoteToDigitalCurriculumAlumni` | Admin | Promote Student → Alumni; optional invite; sync `users/{linkedUid}` if present. |
| `validateInviteCode` | Public | Read-only validation; when the invite is valid and unused, also returns **`authAccountExists`** so the app can show either “create password + confirm” or a **single** “sign in” password step. |

Admin authorization: caller must have `Admin` or `superAdmin` on `users/{uid}` **or** on matching `eligibleUsers` by email.

## Flutter app routing (conceptual)

After sign-in, `initializeUserSession` drives state:

- **UNAUTHORIZED** — missing `eligibleUsers` or `networkAccess == false` → sign out (and delete Auth user only if no `users` doc yet).
- **REQUIRES_ONBOARDING** — allowed; sent to onboarding until `profileCreated` / `onboardingComplete` (or legacy `expansionOnboardingComplete` / `onboarding_status`).
- **READY_FOR_HOME** — allowed; cross-checked with `UserProfileRepository.needsExpansionOnboarding`.

First-time signup: **`/auth/claim`** → `claimInviteAndCreateAccount` → **`signInWithEmailAndPassword`** with the same password (server already ran `createUser`).

## Web admin

**Digital Curriculum (Mortar Admin Panel):** **Admin → App Access Hub** tab (`Digital Curriculum/src/app/components/admin/AppAccessHubPanel.tsx`) lists `eligibleUsers` + invite status from Firestore and calls the same admin callables (no bulk JSON or promote-only forms; student rows can trigger **Alumni app invite** via `createOrUpdateEligibleUser` with role `Digital Curriculum Alumni` and `generateInvite: true`). **Graduation → Alumni Applications:** **Admit** on an accepted application runs curriculum admit, then the same eligible-user path and shows the plain invite code in a dismissible banner. Uses `functions` from `Digital Curriculum/src/app/lib/firebase.ts` (`us-central1`).

**Next.js (`web/`):** Dashboard → **Expansion invites** tab (`EligibleUsersAdminPanel`) provides **Eligible user + invite** only (save eligible user, regenerate invite). Bulk JSON and promote cards were removed for parity with the Digital Curriculum hub; use **Save eligible user** with role `Digital Curriculum Alumni` when needed. Ensure `web/src/lib/firebase.ts` uses `getFunctions(app, "us-central1")`.

**Important:** These are **`onCall` (callable)** functions. The web clients must use **`httpsCallable(functions, "functionName")`** from `firebase/functions`. Do **not** invoke them with **`fetch("https://...cloudfunctions.net/functionName")`** — raw REST calls use the wrong wire format, confuse CORS/preflight, and omit the callable protocol. If you ever need a plain HTTP endpoint, deploy a separate `onRequest` handler and add explicit CORS there.

## CORS and custom web hosts (e.g. Railway)

Callable functions are invoked from the browser. **Gen 2** runs on **Cloud Run**. Two things matter:

1. **`invoker: "public"`** on each `onCall` (see `defaultCallableOptions` in `functions/src/index.ts`). The **OPTIONS** preflight has **no** Google IAM identity; if Cloud Run only allows authenticated invokers, the edge returns **403** with **no CORS headers** → DevTools shows “No `Access-Control-Allow-Origin`”. Public invoker opens only the HTTP URL; your code still enforces **Firebase Auth** (`request.auth`) or admin checks.

2. **`cors`** — explicit origins (full `https://…` URLs) plus a RegExp for `*.up.railway.app`. Add more hosts if you use a custom domain.

**Redeploy after changing options:** `firebase deploy --only functions`.

Also add your web origin under **Firebase Console → Authentication → Settings → Authorized domains**.

**Manual IAM check (if it still fails after deploy):** Google Cloud Console → Cloud Run → select the service named like `createorupdateeligibleuser` → **Permissions** → ensure **allUsers** (or unauthenticated) has role **Cloud Run Invoker** (Firebase CLI normally sets this when `invoker: "public"` is in the deployed manifest).

## Firestore rules and migration

- **Current repo `firestore.rules`:** production-style rules (e.g. `eligibleUsers` / `inviteCodes` **client** `allow write: if false`; server-only maintenance via Admin SDK / callables). Tightening or loosening rules affects **mobile/web clients only**. **Cloud Functions use the Firebase Admin SDK and bypass Security Rules** for Firestore reads/writes from function code.
- **Data migration:** move or mirror approved emails into `eligibleUsers`; legacy `expansion_cohort_emails` can still supply `cohort_id` but **does not** grant alumni network access by itself.

### If `claimInviteAndCreateAccount` fails with Firestore `PERMISSION_DENIED`

Symptoms: app shows **`failed-precondition`** mentioning Firestore / permission (often after **`batch.commit`**).

1. **Rules are not the cause** for Admin SDK writes. Pasting “open” rules in the console does not fix this class of error if IAM is wrong.
2. **Check IAM** (Google Cloud Console → **IAM** for the same project as Firestore):
   - Identify the **Cloud Functions Gen 2 / Cloud Run** runtime identity (often **`PROJECT_ID@appspot.gserviceaccount.com`** or **`PROJECT_NUMBER-compute@developer.gserviceaccount.com`**).
   - Ensure it has **`Cloud Datastore User`**, **`Editor`**, or **`Firebase Admin`** (or equivalent) on that project. Hardening that removed default roles from the compute service account is a common cause of **`7 PERMISSION_DENIED`** from Firestore.
3. **Same project:** confirm `firebase use` and the Flutter `firebase_options` project id match the project where `eligibleUsers` / `inviteCodes` / `users` data lives.
4. **Logs:** Cloud Functions logs for `claimInviteAndCreateAccount:batch.commit` include the full gRPC error.

### Custom tokens on invite claim (removed)

**`claimInviteAndCreateAccount`** no longer calls **`createCustomToken`**. After `auth.createUser({ email, password })` and Firestore updates, the app signs in with **`signInWithEmailAndPassword`**, which avoids **`iam.serviceAccounts.signBlob`** and related IAM on the Cloud Run runtime service account.

## Invite code hashing (not implemented)

Plaintext `code` on `inviteCodes` is easier for admin copy/paste and matches the first iteration of the feature. **Risk:** anyone with Firestore read access (or leaked backups) sees active codes. **Follow-up:** hash at rest, use cryptographically random codes, and optionally rate-limit `claimInviteAndCreateAccount` / `validateInviteCode`.

## Manual QA checklist

1. **superAdmin** eligible + invite → claim → Auth created → onboarding or home per profile flags.
2. **Admin** / **Alumni** / **Digital Curriculum Alumni** — same as above.
3. **Digital Curriculum Students** — `initializeUserSession` returns no network access; cannot claim with student-only eligible row without `networkAccess` true.
4. Duplicate claim: Auth already exists → `ALREADY_EXISTS` message; user uses sign-in.
5. Stranger email → `NOT_ELIGIBLE` on claim.
6. Login with eligible user, missing `users` doc → session init creates/merges doc.
7. Stale `role` / `networkAccess` on `users` → repaired from `eligibleUsers` on login.
8. Expired / used / revoked invite → correct error messages.
9. Promote Student → Alumni → next login allows access; no second account; profile preserved.
10. Functions not deployed → user sees session error and is signed out after failed `initializeUserSession`.

## Risky areas

- **Session hard dependency on Functions:** failures sign the user out.
- **`initializeUserSession` sets `roles: [role]`** from a single eligible role; multi-role curriculum users may be flattened until edited elsewhere.
- **Claim batch:** rare partial failure could leave Auth user without Firestore consistency (operational follow-up: idempotent retries or transactions with Auth create ordering).
- **Shared Firebase project:** rules changes affect web + mobile + curriculum.
