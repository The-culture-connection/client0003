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

## Deferred — decided to skip this round

- [ ] Matched-people page (who I matched, who matched me, not yet talked) — Tim, Jazmine
- [ ] Person search / start-new-chat in Commons messages — Tianna
- [ ] Calendar invite (.ics) attached to graduation meeting email — Jazmine
- [ ] Email confirmation when an event is submitted — Sean
- [ ] Mobile-optimized Digital Curriculum / mobile viewing button — Grace
- [ ] Curriculum link as a planet in the app — Grace
- [ ] Admin view-profile: analytics info + data room zip download — Grace
- [ ] Tutorial: moving highlight instead of zooming — Naimah
- [ ] Message reactions in DMs — Sean
- [ ] Short home-screen navigation tutorial — Jazmine
- [ ] Industries → tribes (marked tbd) — Shannon
- [ ] Planet artwork style (more realistic) — Shannon/triage

---

# Round 2 — Deferred Features + Mobile/Performance Pass (Aug 12, evening)

## Built

- [x] **Matched-people page** (Tim, Jazmine) — `/matches` with "Your matches" and "Haven't talked yet" + "Say hello" buttons; entry hearts on Messages and Networking Zone. "Who liked you" stays a teaser by design — the server keeps likes secret until mutual (a real count needs a small Cloud Function counter, still open)
- [x] **New message / person search in Commons messages** (Tianna) — search people by name, tap to start a chat
- [x] **DM message reactions** (Sean) — long-press a message: ❤️ 👍 😂 🔥 🙏
- [x] **Digital Curriculum planet** (Grace) — new planet on the Mortarverse chooser; confirmation sheet, opens in browser. URL lives in `lib/constants/digital_curriculum_constants.dart` (staging for now — swap when prod web exists)
- [x] **Realistic planet artwork** (Shannon) — procedural shading, atmosphere glow, surface banding
- [x] **Tutorial: moving highlight instead of zoom** (Naimah) — conference tour now glides a spotlight; no more zooming
- [x] **Short home-screen tutorial** (Jazmine) — one-time 4-step spotlight tour on the chooser, replayable via "?"
- [x] **Industries → tribes** (Shannon) — verified already implemented (tribe list, writes both fields)
- [x] **Calendar invite (.ics) on graduation meeting email** (Jazmine) — attached only when a meeting time is confirmed; ET times handled with DST
- [x] **Event-submission confirmation email** (Sean) — new `onEventSubmittedEmail` function; no Brevo template needed
- [x] **Admin view-profile: activity + data-room zip** (Grace) — last active, streaks, courses, badges; one-click zip of certificates + survey PDFs
- [x] **Mobile formatting: Dashboard + Curriculum + Community Hub + nav** (Grace) — phone-width layouts, no horizontal overflow, thumb-friendly buttons
- [x] **Slow loading fixed** (Grace) — initial download 4.1 MB → 1.5 MB (gzip 1.2 MB → 419 KB) via code splitting; parallel data loading + caching on Dashboard/Curriculum/Community Hub

## New/updated deploy notes

- [ ] `firebase deploy --only firestore:rules` — now also carries: DM reactions rule, staff read for certificates/surveyResponses/courseProgress (admin activity panel needs these)
- [ ] Functions deploy — add `onEventSubmittedEmail` (new) to the deploy list alongside the round-1 six
- [ ] Web + mobile rebuilds as before (`git add --pathspec-from-file=beta-fix-filelist.txt` now covers both rounds — 76 files)

## Still open

- [ ] "N people are waiting to match" real count (needs functions-side counter)
- [ ] Match push notification ("You matched with X")
- [ ] Prod URL for the curriculum planet once the production web app exists
