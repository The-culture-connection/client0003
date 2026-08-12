# Beta Feedback — What's Addressed & the Exact In-App Verbiage
Fixes shipped to source Aug 12, 2026. Quotes below are the literal strings now in the app — paste them into the triage notes on the beta panel as needed.

---

## Copy that answers a tester's question directly

**"Where will ticket codes come from?" (Sean · Conference entry gate)**
New helper text under the code field:
> "Your registration code was emailed to you — check your inbox (and spam) for it."

**"How did you hear about Our North Star?" should be a dropdown (Sean, Roycelle · Entry gate)**
Now a dropdown with: *Social media · Email from MORTAR · Friend or colleague · MORTAR staff · At the event · Other* (choosing "Other" opens a small text field).

**"Needs to be instructions on what 'the commons' is" (Sean · Commons)**
One-time dismissible welcome banner:
> "Welcome to The Commons — your community space. Your profile, direct messages, and badges all live here."

**"Tell us why you're asking for this information for every survey" (Shannon · Edit profile)**
Helper line under the survey-style sections:
> "Why we ask: this helps us match you with relevant people, events, and resources."

**Onboarding step labels didn't say why we ask + were redundant (your report, today)**
The mobile "Step N of 8" subtitles no longer repeat the title; each states the purpose:
> Step 2: "Helps us serve you and fellow alumni better"
> Step 3: "Helps us serve alumni better and tailor your support"
> Step 4: "Powers the matching algorithm: what you can offer others"
> Step 5: "Powers the matching algorithm: what others can teach you"
> Step 6: "Helps us place you in the right community"
> Step 7: "Powers the matching algorithm: matches that fit how you work"
> Step 8: "Helps matched alumni get to know you"

**"Didn't recognize a difference between what you already know and what you want to learn" (multiple · Web onboarding)**
Two color-coded banners now distinguish the steps:
> Confident skills (green): "Skills you ALREADY have — Tell us what you're confident in today — we use this to personalize your curriculum, improve what we teach, and power skill-sharing matches in the alumni app."
> Desired skills (yellow): "Skills you WANT TO LEARN — different from the last step! The previous step was what you already know. This one is what you'd like to grow into — it shapes what we teach you and powers the matching algorithm in the alumni app."

**Step 6 (work structure) had no explanation (your report · Web onboarding)**
New banner:
> "How you want to work — There are no wrong answers here — drag each slider to where you'd like your work life to be, not where it is today. We use this to tailor your curriculum and to match you with alumni, mentors, and opportunities that fit the way you want to build."
Plus a helper under each slider: "How structured do you want your schedule to be?" / "How many hours a week do you want to put into your work?" / "How much of the business you work in do you want to own?"

**Step with profile links needed context (Lexie · MORTAR Info)**
> "Why we ask: these links appear on your profile and feed the alumni matching algorithm."

**"The 3 slots were confusing" + "limit to business hours" (Naimah + triage · Graduation application)**
Dialog now reads:
> "Alumni Application — Add Your Availability. Choose up to three times that work for you for your pitch meeting, during business hours (Mon–Fri, 9am–5pm ET). The Alumni Manager will confirm one of them — put the confirmed meeting on your calendar."
Slots are labeled "Preferred meeting time — option 1/2/3", inputs enforce weekdays 9–5 ET, with validation messages like "Option 2: Times must be within business hours (9:00 AM – 5:00 PM ET)."

**"Pop-up: The Alumni Manager will respond within 3 business days" + "check your emails for updates" (Sean · Curriculum)**
After submitting the application:
> "Application received! The Alumni Manager will respond within 3 business days. Check your email (including spam) for updates."

**"Make users aware how long the reset email takes / check spam" (Tim + triage · Forgot password)**
After sending a reset:
> "Reset email sent — it can take a couple of minutes to arrive. Check your spam folder."

**"Not clear how to get back to my digital certificate" (Tim · Curriculum)**
Certificate-earned message now ends with:
> "…View them in your Data Room, and check your email for instructions on accessing your certificate."

**Camera denied on Member card glitched (Ikella)**
Stable screen now reads:
> "Camera access needed — MORTAR needs your camera to scan a code. Tap 'Try again' to allow access." (Android adds: "If no prompt appears, enable it in Settings → Apps → MORTAR → Permissions → Camera, then come back.")

**Booth scan errors on non-booth codes (Audrey)**
Friendly toasts, and scanning keeps going:
> "That's a member card — opening a chat." / "That's not a booth code — point at a sponsor's QR." / "That's your own card 🙂" / "That booth isn't part of this conference."

**"Says I have a message waiting but I've opened them all" + explain 'waiting' (Lexie, Audrey · Mortarverse)**
Badge logic fixed (per-person read tracking), and tapping the waiting item opens an explainer listing exactly who it is:
> "• Unread message from {name}" with an "Open messages" button — or "Nothing waiting right now."

**Dark mode default unexplained (Jazmine · Dashboard)**
New tour step:
> "Light or dark mode — The app starts in dark mode. Prefer a lighter look? Click the sun/moon icon here anytime to switch between dark and light themes."

**Reject dialog bug + no undo (Shannon · Admin graduation panel)**
Prompt now reads: "Reject this application? Enter an optional reason, or press Cancel to keep it in review:" — and Cancel truly cancels. Rejected applications show an "Undo Rejection" button ("Move this application back to review? Its status will return to Pending.").

**No feedback adding to cart (jsnellen · Shop)**
> Toast: "Added to cart" with a "View cart" action.

**Course completion flow (multiple · Curriculum)**
Finishing a course routes to the curriculum page with:
> "Course complete — congratulations!" and the Alumni Application card pulses for ~8 seconds. The card copy: "Congratulations! You've completed all courses. Apply now to become an alumnus and unlock the benefits below."

**RSVP shown after registering (Keitha · Event detail)**
Button replaced by a "You're registered" state with a secondary "Cancel RSVP" option; confirmation snackbar: "You're registered for this event."

---

## Addressed with behavior fixes (no new copy — suggested triage-note wording)

- **Stuck in DMs / back button dead after push notification** (Tianna ×2, Shannon, Lexie ×2, Sean, Naimah, Audrey) — "Fixed: push notifications now keep your navigation history, and every screen has a working back button with a safe fallback."
- **RSVP / Send msg spinning forever** (Allen) — "Fixed: actions no longer hang; slow connections now show an error instead of an endless spinner."
- **Can't upload profile picture** (Shannon) — "Fixed: tap your avatar in Edit Profile to pick and upload a photo."
- **Compose button overlapping add-post button** (Keitha) — "Fixed: the floating compose button hides on compose screens."
- **Create-post back button** (Naimah) — "Fixed: clear back arrow at top-left."
- **Notifications not clickable / badges not clickable / lesson arrows dead** (Audrey, jsnellen, Tim) — "Fixed: notifications, earned badges, and lesson side arrows all navigate now."
- **Two View Course buttons** (twoofoo) — "Fixed: duplicate removed."
- **Dark/red-on-black contrast, dashboard button too dark** (Roycelle, Keitha, jsnellen) — "Fixed: brighter buttons and selectors across onboarding and MORTAR Info."
- **Lesson content too small** (Shannon) — "Fixed: lesson content now fills the page; texture removed."
- **Conference lobby text hard to read** (Keitha) — "Fixed: darker backdrop behind the text."
- **Shop grid alignment** (Naimah) — "Fixed: uniform photos, aligned buttons."
- **Checkout exits the app** (jsnellen) — "Fixed: Stripe checkout opens in a new tab."
- **Emails show my email instead of my name / MORTAR casing** (Keitha) — "Fixed in code: emails greet by profile name. Casing fix needs the Brevo template edits."
- **No Tech industry** (jsnellen) — "Fixed: 'Technology' added."
- **Identity 'I' glyph** (Keitha) — "Fixed: section titles restyled."
- **Transition button visibility** (Audrey) — "Fixed: larger button."
- **Commons profile navigation** (Sean) — "Fixed: obvious back arrow."

---

## Not yet addressed (deferred or needs a manual step)

Deferred by choice: matched-people page · new-message person search · calendar-invite (.ics) · event-submission confirmation email · mobile-optimized curriculum / planet link · admin profile analytics + data-room zip · tutorial highlight style · DM reactions · home-screen tutorial · industries→tribes · planet artwork.
Manual steps: Brevo template edits (MORTAR casing, application_url button) · "City" misspelling is Firestore data · forgot-password sender domain (DNS records you're adding) · deploys (rules, functions, web, mobile builds).

*Note: none of these fixes are visible to testers until the deploys/builds run.*
