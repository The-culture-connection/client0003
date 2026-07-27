# Conference App — Integration Plan

## Context

The Expansion Network Flutter app (`ExpansionNetworkApp/expansion_network`) currently gates all access behind a single invite-code wall (`EXPANSION_INVITE_AUTH.md`): sign in → `initializeUserSession` callable → straight to `/home`. The user wants a second, parallel app — the **Conference App** — gated by **ticket purchase**, one conference at a time, each with its own content and an **expiration date** after which that conference's view closes. After signing in, users land on a **chooser** between the two apps instead of always going straight into Expansion. Things that live *outside* both apps (shared, not duplicated): authentication, profile editing, DMs, and the badge/certificate engine — though conference and expansion badge *awards* must stay visually separate per `timeline.md` line 18 ("does not see each other's awards").

The user's own planning docs (`Conference App Figma Mockup/timeline.md`, `Functionalbreakdown.md`) lay out Phases 1, 3, 4, 5, 6, 7 — **Phase 2 is missing**; confirmed with the user it should be **Ticket-Based Auth + Conference/Admin Management**.

The `Conference App Figma Mockup/` folder is a disconnected Figma "Make" React export — **reference only**, not part of the build pipeline. The real build is **native Flutter inside the existing app**. This round of planning cross-checked the phase breakdown against **both** `Functionalbreakdown.md` **and** the actual Figma page source (`src/app/pages/Conference*.tsx`, `src/app/routes.tsx`) to catch anything the two markdown docs alone missed, and reordered/annotated phases so no feature is built once and reworked later.

**Access-mechanism decision** (made mid-planning): access is granted via **passwordless email-link sign-in ("magic link")**, sent automatically the moment a ticket-purchase record exists — no typed code, no separate signup step. Reuses the existing Brevo transactional-email pipeline (`functions/src/email/sendAppAccessInviteEmail.ts` is the direct analog) and the app's existing `app_links` deep-link handling in `main.dart`.

---

## Findings from checking the Figma source directly (not just the markdown docs)

1. **Venue map is missing from the timeline entirely.** `ConferenceLobby.tsx` has a "Map" tab (static image + legend) — matches `Functionalbreakdown.md` section F's MVP exactly, but no phase in `timeline.md` mentions it. **Added to Phase 1** (static map is pure content, no backend dependency).
2. **"Badges" in the Lobby are actually progress-tracked missions**, not simple earned/not-earned flags: `ConferenceLobby.tsx:129-133` — `{ title: 'Attend 3 sessions', progress: 2, total: 3 }`, `'Connect with 5 people'`, `'Visit 2 sponsor booths'`. Each mission's *completion trigger* belongs to a different, later phase (session attendance = Phase 7, QR connect = Phase 4, sponsor booth visit = Phase 6) but the **progress-counter schema** must exist from the start or every later phase has to retrofit it. **Phase 2's badge scoping now includes progress counters, not just an earned/not-earned array.**
3. **The mockup gives the Conference app its own "Messages" tab** (`ConferenceMessages.tsx`, `ConferenceDirectMessage.tsx`, routed separately from `/messages`, `/messages/direct/:userId`). This looks like it contradicts "DMs are universal" — resolved as: it's a **conference-scoped filtered view** (e.g. "people I've met at this conference") over the **same universal `dm_threads`** backend, presented in the conference app's own nav shell for IA consistency with the mockup — not a second messaging backend. Clarified in Phase 3.
4. **Quick actions in the Lobby include "Scan QR" and "Check In" buttons** (`ConferenceLobby.tsx:105-110`) that only become functional in Phase 4 (QR) and Phase 7 (check-in). **Phase 1 ships them as visible-but-inert placeholders** in the fixed layout so Phase 4/7 wire up behavior without a UI rework.
5. **"Sponsor spotlight" appears in Base UI (Phase 1)** per `Functionalbreakdown.md`, but full sponsor profiles don't exist until Phase 6. **Phase 1 uses a minimal denormalized shape** (`conferences/{id}.heroSponsor: {name, logoUrl, link}`) that is a strict subset of Phase 6's full `sponsors` subcollection shape — no breaking change when Phase 6 lands.
6. **Ad placements** (`Functionalbreakdown.md` section G: sponsored homepage cards, sponsored feed posts, sponsored announcements) touch Phase 1 and Phase 3 layouts but the ad *engine* is Phase 6. **Phase 1/3 leave named, empty promo slots** (a generic `PromoSlot` widget rendering nothing until content exists) rather than hardcoding fake sponsor content that Phase 6 would have to tear out.
7. **"Add notes/tags after meeting"** (Functionalbreakdown section D) was in the doc but missing from `timeline.md`'s Phase 4 bullet list — **added to Phase 4**.
8. **Digital business card exchange** (section D) reuses the existing universal Profile data — just a new shareable-card view in Phase 4, no new profile fields.

---

## Cross-cutting: Push Notifications & Email, mapped per phase

| Phase | Push | Email |
|---|---|---|
| 1 | Reuse existing `push_notifications_service.dart` infra; no new notification types | — |
| 2 | — | **New**: magic-link access email (Brevo template `conference_magic_link_invite`), doubles as the welcome email |
| 3 | **New**: chat/mention push; session-starting-soon reminder push (ties bookmarked sessions from Phase 1's schedule UI to a scheduled function — built here, not Phase 1, so there's exactly one push pipeline for conference content instead of a one-off in Phase 1 rebuilt in Phase 3) | — |
| 4 | **New**: "X connected with you" QR-connect push | — |
| 5 | none new — this phase only adds tracking/dashboards over sends from other phases | none new |
| 6 | **New**: sponsored push notifications | **New**: sponsored/lead-capture confirmation emails |
| 7 | Optional: check-in confirmation push | Eventbrite-confirmed purchases flow through **Phase 2's same magic-link pipeline** (`source: 'eventbrite_sync'`), no new email system |

---

## Cross-cutting risk (address first, in Phase 2)

`AuthController._applySessionForUser` (`auth_controller.dart:98-190`) calls `_revokeAfterDenial` — a **hard sign-out** (and Auth-user delete if no `users` doc exists yet) — whenever `initializeUserSession` returns `UNAUTHORIZED`. A brand-new user who only wants conference access would be signed out before ever reaching the chooser. `initializeUserSession` must gain a `CONFERENCE_ONLY` outcome: before returning `UNAUTHORIZED`, check whether the user's normalized email matches an active `conferenceEligibleUsers` row; if so, return `CONFERENCE_ONLY` instead, and `AuthController` skips `_revokeAfterDenial` for that state. Build and manually QA this first — it's the highest-risk edit in the plan.

---

## Phase 1 — Base UI + Shared-Infra Integration + Lobby/Schedule/Map

**Data model**: `conferences/{conferenceId}` (`name`, `description`, `startDate`, `endDate`, `expiresAt`, `status`, `timezone`, `location`, `heroImageUrl`, `heroSponsor?` (minimal shape, see finding #5), `mapImageUrl`, `mapPins[]`, `createdBy/At`, `updatedAt`); `conferences/{conferenceId}/sessions/{sessionId}` (`title`, `description`, `speakerNames[]`, `startTime`, `endTime`, `roomLabel`, `capacity?`).

**Flutter — new**: `lib/models/{conference,conference_session}.dart`; `lib/services/conference_repository.dart` (read-only, mirrors `user_profile_repository.dart`); `lib/widgets/conference_shell.dart` (bottom-nav shell mirroring `expansion_shell.dart` — tabs: Lobby, Schedule, Map, Messages*(stub until Phase 3), Profile-deep-link); `lib/widgets/conference_scope.dart` (InheritedWidget for current `conferenceId`); `lib/widgets/promo_slot.dart` (empty ad placeholder, finding #6); `lib/screens/{conference_lobby,conference_schedule,conference_session_detail,conference_map}_screen.dart`.

**Router**: unguarded `/conference/:conferenceId` shell + `/conference/:conferenceId/schedule/:sessionId` (root-navigator route, same convention as `/events/:eventId`).

**Lobby content** (per finding #2 and #4): zones list, static map tab, and a "missions" strip showing the three progress-tracked badges with `progress/total` bars — reads from the badge/progress schema defined in Phase 2 (built here in UI, wired to real counters as Phase 3/4/6 features ship). Quick-action buttons Scan QR / Check In render but are disabled/"coming soon" until Phase 4/7.

**Shared-infra reuse (no new code)**: Auth — same `FirebaseAuth` instance. Profile — deep-link to `/profile/edit`. DMs — deep-link to `/messages/direct/:userId` (temporary, until Phase 3's conference-scoped Messages tab exists). Push — reuse `push_notifications_service.dart`. Analytics — reuse `ExpansionAnalytics.log` with conference-prefixed event names. Add-to-calendar — reuse the existing `add_2_calendar` package already in `pubspec.yaml`.

---

## Phase 2 — Ticket-Based Auth (Magic Link) + Conference/Admin Management

### Data model

- **`conferenceEligibleUsers/{conferenceId}_{normalizedEmail}`** (flat collection, mirrors `eligibleUsers`): `conferenceId`, `email`, `normalizedEmail`, `ticketTier`, `source: 'admin_manual_csv'|'eventbrite_sync'`, `linkedUid?`, `accessGranted: bool`, `magicLinkSentAt?`, `magicLinkSentCount`, `createdAt`, `updatedAt`.
- **`users/{uid}/conferenceEntitlements/{conferenceId}`** (subcollection — keeps `users/{uid}` small, avoids touching its delicate update rule): `conferenceId`, `grantedAt`, `ticketTier`, `role`, `status: 'active'|'revoked'`, `source`.
- **`users/{uid}/conferenceMissionProgress/{conferenceId}`** (new, per finding #2): `{missionId: {progress, total, completedAt?}}` — a generic counter map; each future phase's feature (session attendance, QR connect, booth visit) increments the relevant `missionId` via server-side logic, never client-writable directly.

### Cloud Functions — new module `functions/src/conferenceAccess.ts`

Guarded Firebase Admin init (`if (getApps().length === 0) initializeApp();`) since `expansionInvite.ts`'s unconditional init can't be relied on for load order.

Extraction: `functions/src/adminGuards.ts` — generalize `assertCallerIsNetworkAdmin` → `assertCallerIsPlatformAdmin` (same roles, reused by both modules).

**Email-link mechanics**: `admin.auth().generateSignInWithEmailLink(email, actionCodeSettings)` (Admin SDK — generates only, doesn't send); the function sends it itself via a new `functions/src/email/sendConferenceMagicLinkEmail.ts` (mirrors `sendAppAccessInviteEmail.ts`) and a new Brevo template `conference_magic_link_invite` (manual authoring step, not code). `actionCodeSettings.url` is a plain HTTPS URL the app already handles via `app_links` (no Firebase Dynamic Links — deprecated).

New trigger `functions/src/triggers/onConferenceEligibleUserWrite.ts`: on create (or unset `magicLinkSentAt`), sends the magic link — mirrors `onUserAlumniAdmittedEmail.ts`'s pattern.

New callables (`us-central1`): `resendConferenceAccessLink({email, conferenceId})` (public, rate-limited), `listMyConferenceEntitlements()` (authenticated), `createConference`/`updateConference` (admin), `bulkUploadConferenceEligibleUsers({conferenceId, rows})` (admin — CSV import, interim source before Phase 7's Eventbrite webhook), `revokeConferenceAccess({conferenceId, email})` (admin), `closeConference({conferenceId})` (admin).

Plus the additive `CONFERENCE_ONLY` state on `initializeUserSession` (the only edit to `expansionInvite.ts`).

**Known limitation**: if a user's Expansion account email differs from their ticket-purchase email, the magic link creates a second Firebase Auth identity — not solved here; mitigated via purchase-confirmation messaging, not code.

### Flutter routing/chooser

- New `lib/services/conference_session_service.dart` (mirrors `expansion_session_service.dart`) and `lib/conference/conference_access_controller.dart` (`ChangeNotifier`; does **not** open its own `authStateChanges()` listener — reuses `AuthController`'s existing stream via an `attach(AuthController)` method, avoiding the iOS Keychain race noted in `auth_controller.dart:14-18`).
- `main.dart`: construct+attach the new controller, switch to `MultiProvider`, pass both controllers into `createAppRouter`; extend the existing `AppLinks().uriLinkStream` handler to check `FirebaseAuth.instance.isSignInWithEmailLink(...)` before falling through to normal deep-link routing.
- `app_router.dart`: `refreshListenable: Listenable.merge([auth, conferenceAccess])`; shared `_postAuthHomeRoute()` helper: both apps → `/mortarverse`; Expansion-only → `/home` (unchanged); conference-only + one entitlement → `/conference/:id/lobby` directly; conference-only + multiple → `/mortarverse`; neither → `/`. Single-app users skip the chooser entirely (today's zero-friction behavior preserved); the other app is reachable via a small "Have a conference ticket?" link, not a forced chooser.
- New routes: `/mortarverse`, `/conference/link-signin`, `/conference/request-link`, `/conference/:conferenceId/ended`. Expiration guard redirects any `/conference/*` route to `/ended` once `conferenceAccess.stateFor(id)` reports closed/expired.

### Badge/DM/profile scoping

- `badge_definitions/{badgeId}` gains `scopeType: 'expansion'|'conference'` + `scopeConferenceId?`; missing `scopeType` defaults to `'expansion'` (zero migration).
- Earned badges: `users/{uid}.badges.earned` untouched; new sibling `users/{uid}.conferenceBadges.{conferenceId}.earned[]` **plus** `conferenceMissionProgress` (finding #2) for the progress-bar missions.
- `firestore.rules`: sibling `userConferenceBadgesEarnedUnchanged()` guard next to the existing `userBadgesEarnedUnchanged()` (line 96).
- **DMs**: `dm_threads` unchanged in Phases 1-2. Phase 3 adds the conference-scoped Messages *view* (finding #3), not a new backend.
- **Profile**: no changes — single shared `/profile/edit` for both apps.

### Conference expiration

Soft, router-level gate (`status:'closed'` or `expiresAt < now`); nothing hard-deleted. `ConferenceAccessController` listens live on the open conference so an admin closing it mid-session redirects immediately; any future conference-scoped callable re-checks server-side regardless of cached client state. Phase 3+ writes share a `conferenceIsOpen(conferenceId)` rules helper.

---

## Phase 3 — Social + Messaging + Session Reminders

- Chat (global/session/community/topic rooms): reuse the existing group-thread engine's moderation/trigger machinery (`chat_room_screen.dart` + triggers) rather than a new system.
- **Conference-scoped Messages tab** (finding #3): new `lib/screens/conference_messages_screen.dart` — filters/presents the same universal `dm_threads` (via existing `DmRepository.watchMyThreadDocs()`), no new backend; opens the same `/messages/direct/:userId` chat screen, just reached from the conference nav shell instead of `/messages`.
- Reactions/mentions: new fields on the conference message schema.
- **Session-reminder push** (moved here from Phase 1 per the push/email table): scheduled function checks bookmarked upcoming sessions and sends push T-minus-N-minutes.
- Polls/Q&A, Speaker AMAs: new `conferences/{id}/polls`, `.../amaSessions` collections.
- Mission progress hook: "attend 3 sessions" counter increments here (session RSVP/attendance signal) — writes to `conferenceMissionProgress` server-side only.
- All writes gated by the `conferenceIsOpen()` rules helper from Phase 2.

## Phase 4 — QR Networking + Matching

- QR gen/scan (new dependency), personal QR profile card, digital business-card exchange (reuses universal Profile data, finding #8), **connection notes/tags after meeting** (finding #7 — new field on the connection record).
- Connect flow (`completeQrConnect`) reuses `dmThreadIdForUsers`/`DmRepository.sendMessage` unchanged to create/open the chat.
- Matching: reuse the existing `runExpansionUserMatching`/`expansion_matches` weighting-function shape for a conference-scoped sibling.
- Mission progress hook: "connect with 5 people" counter increments here.
- New QR-connect push (see push/email table).

## Phase 5 — Analytics + Optimization

- Extends the existing mature admin-analytics stack (`getAdminMobileAnalyticsDashboard`, derived-metrics triggers) with an optional `conferenceId` filter rather than new ingestion infrastructure.
- Ad-analytics split (finding re: section G "high-value additions"): impression/engagement/QR-scan analytics and ROI reporting live here (reporting layer); the ad *serving* engine itself is Phase 6.
- Post-event analytics query `conferences/{id}.status == 'closed'` docs — nothing was deleted at expiry.

## Phase 6 — Sponsors + Exhibitors + Ad Engine + Interactive Map

- Genuinely greenfield: `conferences/{id}/{sponsors,exhibitors,ads}` collections.
- Wires up the Phase 1/3 `PromoSlot` placeholders (finding #6) with real sponsored content instead of building new placement UI.
- Interactive/indoor-nav venue map (Functionalbreakdown section F's own "Phase 2") lands here since "find sponsor booth" needs exhibitor location data.
- Mission progress hook: "visit 2 sponsor booths" counter increments here (booth check-in interaction).
- New sponsored push + lead-capture confirmation email (see push/email table).
- Admin authoring likely belongs in `web/`'s Next.js admin, mirroring `EligibleUsersAdminPanel`.

## Phase 7 — Eventbrite + Check-In

- Eventbrite webhook writes to the **same** `conferenceEligibleUsers` collection Phase 2 built (`source: 'eventbrite_sync'`), firing the same trigger/magic-link email — no parallel integration path.
- QR check-in reuses Phase 4's scanner/token pattern with a different payload, writing `conferences/{id}/checkIns/{uid}` and `.../sessions/{id}/attendance/{uid}`.
- Mission progress hook: "attend 3 sessions" gets its authoritative source here (session-level check-in), reconciling any earlier Phase-3 RSVP-based approximation.
- Badge-printing support (Functionalbreakdown section I) is a hardware-integration item, flagged as out of this app's software scope — needs a specific printer/vendor decision before scoping further.

---

## Full feature-coverage check (Functionalbreakdown.md × phases)

| Section | Feature | Phase |
|---|---|---|
| A Base UI | banner, Enter Event, announcements, sponsor spotlight (minimal), attendee count, missions UI, QR/check-in placeholders | 1 |
| B Social | global/session/community chat, DMs (view), reactions, mentions, push, open feed, topic rooms, polls/QA, AMAs | 3 |
| C Matching | suggested matches, sponsor recs, weighting | 4 |
| D QR Connect | QR card, scan-to-connect, auto-chat, business cards, notes/tags | 4 |
| E Schedule | agenda, session pages, bookmark, calendar | 1; push reminders → 3; attendance tracking/capacity → 7 |
| F Venue Map | static MVP | 1; interactive/indoor nav | 6 |
| G Ad System | placements/slots | 1 & 3 (slots only); engine, sponsored push/email, lead capture | 6; analytics/ROI | 5 |
| H Eventbrite | sync, auto-create users, ticket validation | 7 (reuses Phase 2 pipeline) |
| I Check-In | QR check-in, session attendance, attendance analytics | 7; badge printing | flagged, hardware TBD |
| J Analytics | all metrics | 5 |

---

## Verification

- **Phase 1**: seed a test conference in Firestore/emulator, navigate directly to `/conference/<id>`, confirm lobby/schedule/map render and shared surfaces (profile edit, DM) deep-link correctly, and quick-action placeholders don't crash when tapped.
- **Phase 2 (critical path)**: (a) Expansion-only user unaffected; (b) admin bulk-uploads a test email → magic link arrives → tapping it signs in/creates the account and lands on `/conference/:id/lobby` without being signed out (validates `CONFERENCE_ONLY`); (c) dual-access user → `/mortarverse`; (d) expired conference → redirected to `/ended`, re-verified server-side even with a stale "active" client cache; (e) badge award in one app never appears in the other's achievements screen.
- Run `flutter analyze`/existing tests after Flutter changes; run the functions emulator/tests after Cloud Functions changes.

---

# Conference App Build Plan (plain-language version)

*This is the same plan above, written for quick reference without the technical detail — organized the way you'd describe it back to me. Will be saved to `docs/conference-app-plan.md` once approved.*

### Phase 1 — Foundation
Build the conference app's screens (lobby, schedule, map) inside the existing app, and hook up everything that should already work for free: profile editing, direct messages, notifications, add-to-calendar. Add a static venue map. Put "Scan QR" and "Check In" buttons on the lobby screen now (so the design doesn't need to change later) even though they won't do anything yet. Show a simple sponsor highlight and a live attendee count.

### Phase 2 — Getting people in
Set up how someone actually gets into a conference: when they buy a ticket, we email them a one-tap "magic link" — no password, no code to type. Clicking it signs them in (creating their account automatically if it's their first time) and drops them straight into that conference. Also builds: the screen where people choose between the Expansion app and the Conference app if they have both; admin tools to create a conference, set its end date, and upload a list of ticket buyers; and what happens when a conference's date passes (it closes gently, nothing gets deleted). Badges/achievements get set up so conference badges and expansion badges never mix.

### Phase 3 — Making it feel alive
Add real chat: a general conference chat, chat rooms per session, community discussion boards, reactions, and @mentions, all with push notifications. Add a "Messages" tab inside the conference app that shows your conversations with people from that conference (using the same DM system as the rest of the app). Add reminder notifications shortly before a session starts.

### Phase 4 — Networking
Let people scan each other's QR code to instantly connect and start a chat, exchange a digital business card, and jot a note about how they met. Add "suggested people to meet" based on shared interests/industry/goals.

### Phase 5 — Insights
Build dashboards for admins: which sessions people attended most, how sponsors are performing, community health, and how many people stick around after the conference ends. Also tracks ad performance numbers (impressions, clicks) feeding into Phase 6's ad features.

### Phase 6 — Sponsors and ads
Build real sponsor and exhibitor profiles, ads/promotions that show up in the spots we reserved back in Phase 1 and 3, sponsor lead capture, and an upgraded interactive venue map that can point you to a sponsor's booth.

### Phase 7 — Ticketing automation and check-in
Connect Eventbrite so ticket buyers get their access email automatically the moment they purchase (no manual upload needed anymore). Add QR-based check-in at the door and per-session, with attendance reports.

### Along the way
- Every phase that sends a notification or email is called out above — nothing is bundled in vaguely.
- The three "missions" on the lobby screen (attend sessions, connect with people, visit booths) get counted for real as each matching phase ships (3 → sessions, 4 → connections, 6 → booths), not all at once.
