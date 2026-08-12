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
