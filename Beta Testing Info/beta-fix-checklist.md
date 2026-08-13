# Beta Feedback Fix Checklist
**Internal beta session:** Aug 10, 2026 · **Fixes shipped to source:** Aug 12, 2026
**Repo:** `MORTAR\WorkingMortarProj` · Originals backed up in `beta_fixes_backup_originals.tgz`

---

## Expansion Mobile App (Flutter)

- [x] **Stuck in Direct Chat / back button dead** (Tianna ×2, Shannon, Lexie ×2, Sean ×2, Naimah, Audrey) — push notifications and app links now `push()` instead of replacing the nav stack; every push-reachable screen (DM, chat room, group detail, achievements, admin, conference session) has a back button with a safe fallback
- [x] **Member card camera glitch** (Ikella) — denying camera access showed a blinking error with an unclickable "try again"; now a stable screen with a working retry + open-settings path
- [x] **RSVP just spinning** (Allen) — analytics writes were blocking the action forever when offline/flaky; now fire-and-forget with 15s timeouts and honest error messages
- [x] **Send msg just spinning** (Allen) — same root cause, same fix (12s timeout on send with "queued offline" notice)
- [x] **RSVP button still shown after registering** (Keitha) — now shows "You're registered ✓" with a Cancel RSVP option
- [x] **"Message waiting" badge wrong** (Lexie) — badge counted any thread where the other person spoke last, forever; now tracks per-user read state
- [x] **"Waiting" states unexplained** (Audrey + triage note) — tapping the waiting indicator shows an explainer of who/what is waiting
- [x] **Big button overlapping the add-post button** (Keitha) — the shared compose button now hides itself on all compose screens
- [x] **Create-post back button more noticeable, on the left** (Naimah) — clear top-left back arrow
- [x] **Booth scan breaks on wrong code type** (Audrey) — scanning a member card from the booth scanner now opens chat; unknown codes show a friendly message and scanning resumes
- [x] **"How did you hear about Our North Star?" dropdown** (Sean, Roycelle) — dropdown with Social media / Email from MORTAR / Friend or colleague / MORTAR staff / At the event / Other (+ free text)
- [x] **"Where will ticket codes come from?"** (Sean + triage note) — helper text: your registration code was emailed to you, check inbox and spam
- [x] **Conference lobby text hard to read** (Keitha) — darker scrim behind text over imagery
- [x] **"What is the Commons?"** (Sean) — one-time welcome banner explaining the Commons
- [x] **Commons profile hard to navigate out of** (Sean) — obvious top-left back arrow
- [x] **Can't upload profile picture** (Shannon) — upload was never actually built ("coming soon" stub); now pick → upload → save with progress and errors
- [x] **The "I" in Identity looks like another character** (Keitha) — section titles restyled so the glyph reads correctly
- [x] **Why are you asking this for every survey?** (Shannon) — "Why we ask" helper line under profile survey sections
- [x] **Transition button bigger for visibility** (Audrey) — larger tap target and label on the Mortarverse chooser
- [ ] **City misspelling on group detail** (Lexie) — ⚠️ not a code issue: the typo is in the group's stored name/description in Firestore — edit it in the admin panel

## Digital Curriculum (Web)

- [x] **Cancel still rejects graduation applicants** (Shannon) — Cancel now truly cancels
- [x] **No way to undo an accidental rejection** (Shannon) — new "Undo Rejection" button moves the application back to review
- [x] **Notifications not clickable** (Audrey) — every notification row navigates to its target (badges open the badge dialog, the rest go to the Data Room)
- [x] **Earned badges not clickable** (jsnellen) — badges open a detail dialog with image, description, and earned date
- [x] **Lesson scroll arrows don't do anything** (Tim) — real side arrows wired to prev/next, plus arrow-key navigation
- [x] **No feedback when adding to cart** (jsnellen) — "Added to cart" toast with a View-cart action
- [x] **Checkout exits the app** (jsnellen) — shop checkout opens Stripe in a new tab
- [x] **Shop photos/buttons misaligned** (Naimah) — uniform image sizes, buttons pinned to the same level
- [x] **Two "View Course" buttons** (twoofoo) — duplicate removed
- [x] **Dashboard button too dark** (jsnellen, Keitha) — high-contrast styling on the MORTAR Info buttons
- [x] **Red-on-black / dark onboarding hard to read** (Roycelle + triage note) — brighter CTAs, brighter selectors and borders throughout onboarding
- [x] **Lesson content takes up too little room** (Shannon) — viewer widened, decorative texture removed
- [x] **No flow to certificate after finishing a course** (Audrey, Tim, Sean) — finishing a course routes to the curriculum page with a congrats toast and a pulsing highlight on the Alumni Application card
- [x] **Grad application time slots confusing** (Naimah) — slots labeled "Preferred meeting time — option 1/2/3" with helper copy
- [x] **Meetings limited to business hours** (triage note) — 9am–5pm ET, weekdays only, validated
- [x] **"Alumni Manager will respond within 3 business days" popup** (Sean) — shown after submitting, with check-your-email reminder
- [x] **"Check your emails for updates" popup** (Sean) — folded into the submit confirmation
- [x] **Unclear how to get back to certificate** (Tim + triage note) — completion messages now say to check email for certificate instructions
- [x] **Forgot-password: timing + spam warning** (Tim) — "can take a couple of minutes… check your spam folder"
- [x] **Skills "already know" vs "want to learn" confusion** (jsnellen, Naimah, Lexie) — distinct color-coded banners explaining each step and why we ask
- [x] **Step 6 needs more context** (Lexie) — "why we ask" line added (feeds the alumni matching algorithm)
- [x] **No Tech industry option** (jsnellen) — "Technology" added
- [x] **Dark mode by default unexplained** (Jazmine) — tour step pointing out the light/dark toggle
- [x] **Emails greet with email address instead of name** (Keitha) — emails now resolve the person's real name from their profile

## Deploy Steps — Grace's to-dos (fixes aren't live until these are done)

- [ ] `firebase deploy --only firestore:rules` — required for the message-waiting badge fix
- [ ] Deploy Cloud Functions — required for the email name/deep-link fixes
- [ ] Rebuild + redeploy the web app
- [ ] Run `flutter analyze`, then rebuild the mobile app (Dart was syntax-checked only)
- [ ] Brevo: fix "Mortar" → "MORTAR" casing in templates (IDs 3–18)
- [ ] Brevo: in templates 8, 9, 10 change the "View my Application" button link from `{{ params.platform_url }}` to `{{ params.application_url }}`
- [ ] Fix the misspelled group name/description in Firestore (the "City mispelling" report)
- [ ] Verify Storage rules allow `users/{uid}/profile/**` owner writes (profile-photo upload reuses the onboarding path)
- [ ] Forgot-password sender address (so it skips spam) — Firebase console SMTP settings, not code

## Round 2 — previously-deferred items, shipped to source Aug 13, 2026

- [x] **Matched-people page** (Tim, Jazmine) — new My Connections screen at
  `/conference/connections`, reachable from the networking deck's top bar and
  its caught-up state. Three groups: *Waiting on you* (people who liked you,
  which you can answer straight from the list), *No reply yet*, and *Talking*.
  Inbound likes need the new `listConferenceInboundLikes` callable, because
  swipes are owner-read-only and no client query can see them.
- [x] **Person search / start-new-chat in messages** (Tianna) — `+` button and
  empty-state CTA on the Messages tab open `/messages/new`, a name search reusing
  Explore's member lookup; tapping a result opens the chat.
- [x] **Message reactions in DMs** (Sean) — long-press a bubble to react, tap a
  reaction chip to toggle. Rules let each participant write only their own key
  in the `reactions` map; covered by `tools/rules-tests/dm-reactions.test.mjs`
  (14 cases, all passing).
- [x] **Curriculum link as a planet** (Grace) — fourth planet on the Mortarverse
  street, opening Digital Curriculum in the browser. ⚠️ **Needs artwork** — see
  the deploy list below.
- [x] **Tutorial: moving highlight instead of zooming** (Naimah) — the coach-mark
  package could only collapse and re-expand the spotlight between steps, so the
  tour now runs on our own overlay that slides one highlight from target to
  target. `tutorial_coach_mark` dropped from `pubspec.yaml`.
- [x] **Short home-screen navigation tutorial** (Jazmine) — first-visit
  walkthrough of the Mortarverse chooser (focus card → street → events → member
  card), replayable from the `?` button beside the wordmark.
- [x] **Email confirmation when an event is submitted** (Sean) — new
  `onEventSubmittedEmail` trigger on `events_mobile` create, for member
  submissions only. ⚠️ **Needs the Brevo template created** — see below.
- [x] **Calendar invite for the graduation meeting** (Jazmine) — the meeting
  email now carries an `.ics` attachment (America/New_York, 30 min, 30-min
  reminder), so it's one tap onto the recipient's calendar. Sends without the
  attachment, and logs a warning, if the stored time can't be parsed.
- [x] **Admin view-profile: analytics + data room zip** (Grace) — the view-profile
  dialog now shows the full profile (profession, business, location, tribe,
  cohort, goals/skills, joined) plus an Activity & analytics card from
  `user_analytics_summary`, and a "Download data room (.zip)" button bundling
  profile, analytics, certificates and every survey PDF. ⚠️ **Needs a CORS
  update** — see below.
- [x] **Mobile-optimized Digital Curriculum** (Grace) — the curriculum's web
  header was unusable on a phone: six nav links, the staff toggle and the account
  controls all in one 64px row. Below `md` the destinations now collapse into a
  drawer, the header controls shrink, and page padding steps down on small
  screens. *Scope note:* this makes the app navigable and readable on a phone; a
  page-by-page responsive pass (tables, the lesson player, admin panels) is
  still outstanding and is a much larger piece of work.

### Still needs a decision from you

- [ ] **Industries → tribes** (Shannon, marked tbd) — blocked on the actual tribe
  list. Send it over and it's a small change: `lib/constants/` on mobile plus the
  onboarding options in `Digital Curriculum/src/app/lib/onboardingData.ts`.
- [ ] **Planet artwork style, more realistic** (Shannon/triage) — art direction,
  not code. The renderer takes whatever PNGs are in `assets/planets/`.

## Round 3 — fixes from Grace's Aug 13 pass

- [x] **Networking card overflowed by 67px** — the deck card rendered every skill
  chip, so a member with a dozen long skills grew the info panel past the card
  and squeezed the photo out. Chips are now capped at 3 with a `+N more` chip and
  ellipsized; the full lists are still in the profile sheet, which scrolls.
- [x] **"Waiting on you" was invisible on My Connections** — the section was only
  drawn when it had rows, so a failed fetch looked identical to "nobody is
  waiting" (which is how the un-deployed callable went unnoticed). It now always
  renders, with a distinct empty state and a real error + retry. Section renamed
  to **MATCHED — NO REPLY YET** so it can't be mistaken for the inbound list.
- [x] **"1 waiting on you" removed from the Networking Hall planet** — the street
  is destinations; the focus card above it already owns "what needs you".
- [x] **"Could not load user data" on alumni applications** — ⚠️ *pre-existing,
  not from round 2.* `users/{uid}/certificates` and `users/{uid}/surveyResponses`
  were owner-read-only, so the admin view-profile dialog could never load anyone
  but yourself. Staff read added (writes stay owner-only). The dialog now also
  loads each source independently and names what failed instead of collapsing to
  one dead-end message.
- [x] **Digital Curriculum taking ~a minute to load** — `getCourseSlideCounts`
  walked modules → chapters → lessons awaiting one lesson at a time, at two
  Firestore round-trips per lesson. A course with 60 lessons meant 120 strictly
  serialized requests. Now flattened and fetched 12-at-a-time, which is what
  Dashboard *and* Curriculum were both blocked on.
- [x] **Grad application: what are the 3 slots for** (Naimah) — the dialog now
  opens with a numbered "How this works" panel (three *alternative* windows, only
  one becomes a meeting, nothing is booked until we email you), slots are
  relabelled "Availability window N of 3", and each finished window is read back
  in words — "You're free on Monday, August 17 between 9:00 AM and 11:00 AM ET".
  Every time is echoed in 12-hour with ET attached, because `<input type="time">`
  renders 24-hour on some machines and 12-hour on others, which is what made the
  format confusing.

## Round 4 — Aug 13, later

- [x] **Networking planet artwork** — all four planets replaced from
  `pickerplanetphotos/`, including the real Digital Curriculum planet (the blue
  placeholder sphere is gone). Geometry verified identical to the old art:
  1920×1080 canvas, sphere occupying y 108–971 (864px), so every planet renders
  at exactly the same size as before.
- [x] **My Connections is now matches only** — the "Waiting on you" section and
  the whole inbound-likes feature are removed, along with the
  `listConferenceInboundLikes` callable, its Dart service method and the
  `InboundLike` model. One list of every match, newest first, each with a button
  into the conversation, whether or not anyone has spoken.
- [x] **`View my application` button removed** from the graduation meeting email;
  replaced with a line pointing at the attached calendar invite.
- [x] **Alumni application banner** (Naimah, round 2) — the round-3 fix explained
  the slots *inside* the dialog, but the decision to click Apply happens on the
  card, so an eligible applicant still met the slot picker cold. The Alumni
  Application card now carries a "Before you apply — here's how it works" panel
  covering all four beats: you pick up to three *alternative* windows, we book
  one meeting inside one of them, you pitch your business, you get a confirmed
  time by email within 3 business days with a calendar invite. The pending state
  repeats the same model ("one meeting inside one of these windows") so it holds
  while people wait.

## Deploy Steps — round 2

All commands are run from the repo root. Pick the environment first — the alias
comes from `.firebaserc` (`staging` = mortar-stage, `prod` = mortar-9d29d):

```powershell
firebase use staging
```

> ⚠️ **The default alias is `mortar-dev`.** A bare `firebase deploy` goes to dev,
> not to the staging project the beta is running against — which looks exactly
> like "I deployed and nothing changed". Pass `--project` explicitly, or run
> `firebase use staging` first and confirm with `firebase use` (it prints the
> active alias). The beta web app at `mortar-stage-stage.up.railway.app` talks to
> **mortar-stage**.

- [ ] **Firestore rules** — required for DM reactions *and* for the admin
      view-profile dialog (staff read on certificates / surveyResponses):
      ```powershell
      firebase deploy --only firestore:rules --project mortar-stage
      ```
      Verify afterwards in the console — Firestore → Rules → the History tab
      shows the deployed ruleset and its timestamp. `users/{userId}/certificates`
      and `users/{userId}/surveyResponses` must both read
      `allow read: if isOwner(userId) || hasStaffClaim();`.
- [ ] **Cloud Functions:**
      ```powershell
      firebase deploy --only functions:onEventSubmittedEmail,functions:onGraduationApplicationEmail --project mortar-stage
      ```
      `onGraduationApplicationEmail` is in the list because the `.ics` invite is
      attached inside it — the calendar invite does not go out until that one
      redeploys.
- [ ] **Delete the retired callable** — `listConferenceInboundLikes` was removed
      from the source. If it was ever deployed, drop the dangling function:
      ```powershell
      firebase functions:delete listConferenceInboundLikes --project mortar-stage
      ```
- [ ] **Create Brevo template 19** `event_submitted_confirmation` — copy and HTML
      in `docs/brevo-transactional-email-templates.md` §11. Until it exists the
      trigger's sends fail and are logged in `email_activity`; nothing else breaks.
- [ ] **Storage CORS** for the data-room zip — `cors.json` now lists the Railway
      origin; apply it with
      `gsutil cors set cors.json gs://<bucket>`. Without it the zip still exports
      the metadata but every PDF lands in `DOWNLOAD-ERRORS.txt`.
- [ ] **Digital Curriculum planet artwork** — drop a 1920×1080 PNG (sphere 858px
      tall, centred, transparent) at
      `ExpansionNetworkApp/expansion_network/assets/planets/digital_curriculum.png`
      and add it to `pubspec.yaml` assets. Until then the tile renders a plain
      blue sphere so the street still lines up.
- [ ] **Confirm the curriculum URL** — `lib/constants/app_links.dart` defaults to
      the staging host, matching `functions/src/email/emailConfig.ts`. If
      production has its own domain, set both (or build with
      `--dart-define=DIGITAL_CURRICULUM_URL=…`).
- [ ] `flutter pub get` then rebuild the mobile app (a dependency was removed)
- [ ] Rebuild + redeploy the web app
- [ ] Mark the 16 open reports in Admin → Beta Testing as Fixed. Three of them
      (Ikella's camera glitch, Sean's "can't back out of this screen", Naimah's
      grad time slots) were already fixed in the Aug 12 round and only needed
      deploying.
