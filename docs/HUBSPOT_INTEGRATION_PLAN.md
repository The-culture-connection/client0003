# HubSpot Integration Plan — MORTAR Platform

**Goal:** Get every MORTAR user (mobile app + Digital Curriculum webapp) into HubSpot as a CRM contact with profile and engagement data, so the team can segment, manage relationships, and (later) run marketing automation. HubSpot runs **alongside Brevo** — Brevo keeps transactional email; HubSpot is CRM/marketing.

**Cadence:** Nightly batch sync via a scheduled Cloud Function.

**Tier assumption:** Plan is built to work on **HubSpot Free/Starter**, with clearly marked upgrade paths (Professional unlocks workflows, lists automation, and custom events — custom events no longer require Enterprise as of 2026).

---

## 1. The key architectural insight

**You do not need to touch the Flutter app or the Digital Curriculum webapp at all.**

Both clients already funnel everything into the same Firebase project:

- Profile data → `users/{uid}` (email, first/last name, city, state, industry, roles, onboarding_status, membership, cohort flag, email preferences)
- Behavior → `analytics_events` / `analytics_raw_events`, rolled up per-user into `user_analytics_summary/{uid}` (counts, streaks, `last_active_at`) by your existing Phase 4 pipeline

So the integration is **one server-side sync** in `functions/`, reading Firestore and pushing to HubSpot. One codebase covers both apps, nothing ships to clients, and no HubSpot SDK or tracking script is needed anywhere.

```
Flutter app ──┐
              ├─► Firestore (users + user_analytics_summary)
Curriculum ───┘            │
                           ▼  (nightly, 03:00 UTC — after the 01:30 UTC
                           │   scheduledPhase4DerivedMetrics run)
              syncUsersToHubspot (scheduled Cloud Function)
                           │
                           ▼
        HubSpot Contacts API  POST /crm/v3/objects/contacts/batch/upsert
                           (idProperty=email, 100 contacts per batch)
```

---

## 2. HubSpot-side setup (no code)

### 2.1 Account + private app

1. Confirm/create the HubSpot account. If you're on Free, everything in Phases 1–3 below still works.
2. **Settings → Integrations → Private Apps → Create private app.** Name it `MORTAR Firebase Sync`.
3. Scopes:
   - `crm.objects.contacts.read`
   - `crm.objects.contacts.write`
   - `crm.schemas.contacts.read` + `crm.schemas.contacts.write` (only needed if you create properties via the setup script in §3.4; you can drop these after setup)
4. Copy the access token (`pat-na1-…`). This goes into Firebase Secret Manager (§3.1) — never into `.env` files or the repo.
5. If you use separate dev/stage/prod Firebase projects (you have `.env.dev` / `.env.stage`), create a **HubSpot developer test account** (free, developers.hubspot.com) and a second private app there so staging never writes to the real CRM.

### 2.2 Custom contact properties

Create a property group **“MORTAR”** and these properties (all lowercase internal names; HubSpot requires lowercase). This is the **v1 set** — deliberately trimmed to profile basics; the engagement fields moved to §2.2.3 as a later add.

| Property | Type | Source |
|---|---|---|
| `mortar_uid` | single-line text, **set as unique** | `users.uid` |
| `mortar_roles` | multiple checkboxes (options in §2.2.1) | `users.roles` (mapped) |
| `mortar_onboarding_status` | dropdown select (options in §2.2.2) | `users.onboarding_status` |
| `mortar_membership_status` | dropdown select (options in §2.2.2) | `users.membership.status` |
| `mortar_profile_completed` | single checkbox (boolean) | `users.profile_completed` |
| `mortar_in_cohort` | single checkbox (boolean) | `!users.not_in_cohort` |
| `mortar_industry` | single-line text | `users.industry` |
| `mortar_signup_date` | date picker | `users.created_at` |
| `mortar_email_opt_out_all` | single checkbox (boolean) | `users.email_opt_out_all` — the consent/suppression flag (§2.4) |

Standard HubSpot properties map directly: `email`, `firstname` (`first_name`), `lastname` (`last_name`), `city`, `state` (industry stays only in `mortar_industry` to avoid fighting HubSpot's picklist).

The "Source" column is documentation for the sync code (`contactMapper.ts`), not something entered in HubSpot. Optional but recommended: paste it into each property's HubSpot description, e.g. *"Synced nightly from MORTAR (users.industry). Do not edit by hand."*

Notes:

- **Don't sync free-text or sensitive content** (business goals, skills arrays, survey answers). Start with the operational fields above; add later if a real segmentation need appears.
- `mortar_uid` marked *unique* gives you a durable fallback identifier if a user ever changes their email in Firebase (see §3.3).

#### 2.2.1 `mortar_roles` — multiple checkboxes options

The six roles come from `functions/src/config/roles.ts` (five defined roles) plus `superAdmin` (granted via `config/superAdmins.ts`):

| Option label | Internal name | Firestore role string |
|---|---|---|
| Admin | `admin` | `Admin` |
| Super Admin | `superadmin` | `superAdmin` |
| Digital Curriculum Students | `digital_curriculum_students` | `Digital Curriculum Students` |
| Digital Curriculum Alumni | `digital_curriculum_alumni` | `Digital Curriculum Alumni` |
| In Person Curriculum Students | `in_person_curriculum_students` | `In Person Curriculum Students` |
| In Person Curriculum Alumni | `in_person_curriculum_alumni` | `In Person Curriculum Alumni` |

Internal names are slugified, so `contactMapper.ts` carries a small role→option translation table (third column → second column). If a new role is ever added in the app, add a matching option here too — the mapper skips unknown roles rather than failing the contact, but the role won't appear in HubSpot until the option exists.

#### 2.2.2 Dropdown options

**`mortar_onboarding_status`** — matches the Zod enum in `callables/updateOnboardingStatus.ts` exactly, so internal names pass through with no translation:

| Option label | Internal name |
|---|---|
| Needs Profile | `needs_profile` |
| Partial | `partial` |
| Complete | `complete` |

**`mortar_membership_status`** — `active` is the only value the app writes today (`onUserCreated.ts`); `removed` is sync-owned, set when a MORTAR user is deleted/banned (§3.3):

| Option label | Internal name |
|---|---|
| Active | `active` |
| Removed | `removed` |

Dropdown options are easy to extend later if the app adds membership states.

#### 2.2.3 Deferred properties (create later, when needed)

Held back from v1 to keep setup small. The engagement block is what Phase 3 needs; create these before starting that phase:

| Property | Type | Source | Needed for |
|---|---|---|---|
| `mortar_last_active_at` | date picker | `user_analytics_summary.last_active_at` | Phase 3 |
| `mortar_current_streak` | number | `user_analytics_summary` streak fields | Phase 3 |
| `mortar_lessons_completed` | number | `user_analytics_summary.counts.*` | Phase 3 |
| `mortar_courses_completed` | number | `user_analytics_summary.counts.*` | Phase 3 |
| `mortar_badges_earned` | number | `users.badges.earned.length` | Phase 3 |
| `mortar_paid_modules` | single-line text (joined) | `users.membership.paid_modules` | Phase 6 / revenue visibility |
| `mortar_last_synced_at` | date picker | set by the sync itself | Nice-to-have for sync-health debugging |

### 2.3 Marketing vs. non-marketing contacts (billing!)

If your portal has the marketing-contacts pricing model, contacts created via API default to **non-marketing** — they're free and unlimited. Keep it that way: only flip people to "marketing" when you actually intend to email them from HubSpot. This prevents the sync from inflating your bill.

### 2.4 Consent + Brevo coexistence

- Sync `email_opt_out_all` into `mortar_email_opt_out_all` (in the v1 property set) and build a suppression view/list on it. Anyone doing manual sends from HubSpot must respect it. (On Pro you'd enforce this automatically with a workflow that sets subscription status.)
- Brevo remains the sender for transactional/course emails; your existing per-category preference flags stay authoritative in Firestore. Don't let HubSpot send anything automated until you're on Pro and have deliberately mapped subscription types.
- Add a line to your privacy policy noting CRM processing of profile/engagement data (you already have `docs/PRIVACY_POLICY.md`).

### 2.5 Manual segmentation you get immediately (even on Free)

Saved filters/views on the properties above: "In cohort, inactive since \<date\>", "Completed onboarding, zero lessons", "Has paid modules", per-role views. On Pro these become **active lists** feeding workflows.

---

## 3. Code-side work (all in `functions/`)

Model everything on the existing Brevo module — it already has the right patterns (secret via `defineSecret`, fetch + retry, activity logging to Firestore).

### 3.1 New module: `functions/src/hubspot/`

```
functions/src/hubspot/
  hubspotClient.ts        # token secret, fetch wrapper, retry, activity logging
  contactMapper.ts        # users doc + summary doc -> HubSpot properties object
  syncUsersToHubspot.ts   # the scheduled function
```

**`hubspotClient.ts`** — mirror `email/brevoClient.ts`:

- `export const HUBSPOT_TOKEN = defineSecret("HUBSPOT_PRIVATE_APP_TOKEN");` attach with `{secrets: [HUBSPOT_TOKEN]}`.
- `postBatchUpsert(contacts)` → `POST https://api.hubapi.com/crm/v3/objects/contacts/batch/upsert` with `Authorization: Bearer <token>`, body `{ inputs: [{ idProperty: "email", id: "<email>", properties: {...} }] }`, **max 100 per call**.
- Retry on 429 (honor the `Retry-After` header) and 5xx, same backoff shape as `postBrevoEmail`. Note batch upsert responds 207/handled-per-row in some cases — record per-row errors.
- Log each batch to a `hubspot_sync_activity` collection (status, counts, error rows, timestamps) exactly like `email_activity`.
- One caveat from HubSpot's docs: **partial upserts aren't supported with `idProperty=email`** — each upsert should send the full property set you own (which the mapper naturally does), not a sparse diff.

**`contactMapper.ts`**:

- Input: the `users/{uid}` doc + optional `user_analytics_summary/{uid}` doc. Output: `{ idProperty: "email", id, properties }`.
- Skip users with no email; normalize (trim/lowercase — reuse the Brevo `normalizeEmail`).
- Dates must be sent as midnight-UTC millisecond timestamps for HubSpot `date` properties.
- Keep the mapping table (§2.2) in one place here so adding a property is a one-line change.

**`syncUsersToHubspot.ts`**:

- v2 scheduled function: `onSchedule({schedule: "0 3 * * *", timeZone: "Etc/UTC", secrets: [HUBSPOT_TOKEN]}, …)` — 03:00 UTC, after your 01:30 UTC derived-metrics job so engagement numbers are fresh.
- **Strategy: full-scan upsert.** Stream the whole `users` collection, join each to its `user_analytics_summary`, map, chunk into 100s, upsert. At your current scale this is trivial: even 5,000 users = 50 API calls ≈ one burst window (Free tier allows 100 calls/10s, 250k/day). Full-scan is self-healing (a missed night fixes itself) and needs no watermark bookkeeping. Revisit with an `updated_at` watermark only if you pass ~50k users.
- Write a status doc `integration_state/hubspot_sync` (`last_run_at`, `synced`, `failed`, `skipped_no_email`) so the admin panel can show sync health later.
- Fail soft per user, hard-log per batch — never let one bad record kill the run.

Register the export in `functions/src/index.ts` like the other triggers.

### 3.2 Admin test callable: `callables/adminRunHubspotSync.ts`

Mirror `adminSendTestBrevoEmail.ts`: superAdmin-gated callable with `{ dryRun: true, limit: 10 }` options that runs the same code path and returns the mapped payloads (dry run) or actually syncs a small slice. This is how you verify the mapping before the first full run — from the existing Admin panel or `firebase functions:shell`.

### 3.3 Edge cases to handle (cheap now, painful later)

- **Email changes:** upsert-by-email would create a duplicate contact under the new address. Mitigation: after each successful upsert, store the returned HubSpot contact id on `users/{uid}.hubspot_contact_id`. If a user doc has a stored id AND its email changed since last sync, `PATCH /crm/v3/objects/contacts/{id}` instead of upserting. (Phase 2 — skip for the backfill.)
- **Deleted/banned users:** decide whether to archive the HubSpot contact (`DELETE /crm/v3/objects/contacts/{id}` = recycle bin) or set a `mortar_membership_status = removed`. Recommend the status flag — keeps history.
- **Test/emulator users:** guard the scheduled function so it no-ops when `FUNCTIONS_EMULATOR` is set, and filter obvious test domains if your prod DB has any.

### 3.4 One-time scripts (`functions/scripts/`)

- `hubspot-create-properties.mjs` — creates the property group + properties from §2.2 via the Properties API (`POST /crm/v3/properties/contacts`). Running this against dev and prod portals keeps them identical; doing it by hand in two portals drifts.
- `hubspot-backfill.mjs` — one-time full sync of all existing users (same mapper, run locally with a service account + the token). Run with `--dry-run` first; eyeball the output; then run live and spot-check ~10 contacts in HubSpot.

### 3.5 Secrets + deploy

```bash
firebase functions:secrets:set HUBSPOT_PRIVATE_APP_TOKEN   # paste pat-na1-…
firebase deploy --only functions:syncUsersToHubspot,functions:adminRunHubspotSync
```

### 3.6 Testing checklist

1. Unit: mapper tests (user doc → properties; missing email; date conversion) alongside your existing analytics unit tests.
2. Dry run via `adminRunHubspotSync {dryRun: true}` — inspect payloads.
3. Live run of 5–10 users against the **developer test portal**; verify properties render correctly in the contact record.
4. Backfill prod; verify counts in `hubspot_sync_activity` vs. HubSpot contact total.
5. Let the schedule run for a few nights; check `integration_state/hubspot_sync`.

---

## 4. Phased rollout

| Phase | What ships | Needs |
|---|---|---|
| **1. Foundation** | HubSpot account, private app, properties script, backfill of all users (profile fields only) | Free tier; ~1 day |
| **2. Nightly sync** | `syncUsersToHubspot` scheduled fn + admin callable + activity logging + email-change handling | Free tier; ~1–2 days |
| **3. Engagement data** | Create the deferred §2.2.3 properties, then join `user_analytics_summary` into the mapper (last active, streak, lessons/courses completed, badges) | Free tier; ~half day |
| **4. Automation** | Active lists + workflows (re-engagement nudges, completion congrats), subscription-type mapping | **Marketing Hub Pro** |
| **5. Behavioral events** (optional) | Push key milestones (course completed, purchase, graduation) as HubSpot **custom events** via the events API — enables event-based reports and workflow triggers | **Pro** (no longer Enterprise-only) |
| **6. Revenue** (optional) | Create HubSpot deals from Stripe fulfillment (`stripe/fulfillStripePayment.ts` is the natural hook) | Sales Hub (Starter+) |

Phases 1–3 deliver the stated goal (CRM contacts with profile + engagement visibility) entirely on the free tier. Decide on Pro only when you actually want Phase 4/5.

---

## 5. Rate-limit reality check

Nightly full sync of N users ≈ ⌈N/100⌉ API calls. Free/Starter private-app limits are **100 requests per 10 seconds and 250,000/day** (Pro: 190/10s, 625k/day). You would need ~25 million users to threaten the daily cap. Rate limits are a non-issue for this design; the retry-on-429 handling is belt-and-suspenders.

---

## 6. What deliberately stays out of scope

- **No HubSpot tracking code** in the webapp, no HubSpot SDK in Flutter — your own analytics pipeline is richer and already built; HubSpot receives rollups, not raw traffic.
- **No two-way sync** (HubSpot → Firestore). If marketers edit contact fields in HubSpot, the nightly sync overwrites MORTAR-owned properties. Rule: MORTAR is the source of truth for everything in the `mortar_*` group; HubSpot owns notes, tasks, deal data, and any properties the sync doesn't touch.
- **No per-event streaming** on the free tier — engagement arrives as nightly summary numbers, which is what CRM users actually read.
