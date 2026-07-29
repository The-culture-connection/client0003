# Google Play Console — entries for the five blocking errors

Copy-paste answers for the errors blocking the internal-testing release, with
the reasoning behind each declaration. **The declarations are legal statements
about your app — read the reasoning and confirm it matches reality before
submitting.** Everything below is derived from the code in
`ExpansionNetworkApp/expansion_network`.

---

## 1. "Add a full description to save"

**Store presence → Main store listing → Full description** (max 4000 characters).

> MORTAR Alumni Network keeps the MORTAR community connected between classes, events, and conferences.
>
> Built for graduates of MORTAR's entrepreneurship programs, the app is where alumni find each other, trade skills and opportunities, and show up together — online and in the room.
>
> YOUR NETWORK, IN ONE PLACE
> • Member profiles with the businesses, skills, and industries behind them
> • Direct messages with any member
> • A digital member card with a scannable QR code — scan someone's code to open a chat instantly, instead of typing out contact details
> • Suggested connections based on what you do and what you are looking for
>
> GROUPS AND CONVERSATION
> • Join groups around industries, interests, and cohorts
> • Post updates to the community feed, add a photo, and reply in threads
> • Upvote what is useful so the best of it surfaces
>
> OPPORTUNITIES
> • Post and browse jobs from across the network
> • Offer a skill, or find the member who has the one you need
>
> EVENTS
> • Browse upcoming MORTAR events and RSVP
> • Buy tickets to paid events
> • Add an event straight to your calendar
>
> CONFERENCE COMPANION
> When MORTAR runs a conference, enter your ticket code to unlock a space built for it:
> • A live lobby showing what is happening right now
> • The full schedule — RSVP to sessions and get a reminder before yours starts
> • Chat rooms for the sessions you are attending
> • A community hub for everyone at the event
> • Sponsor hall — scan a booth's QR code to log your visit and see what they offer
> • Missions and badges that reward showing up and taking part
> • On-site networking that points you to the attendees worth meeting
>
> BADGES
> Earn badges for participation and milestones, and keep them on your profile.
>
> MORTAR Alumni Network is for members of the MORTAR alumni community. An account is required, and conference features need a ticket code for that event.

**Short description** (max 80 characters), if it is not already filled in:

> Connect, learn, and show up with the MORTAR alumni community.

---

## 2. "No countries or regions have been selected for this track"

Not a text entry — a selection on the track itself.

**Release → Testing → Internal testing → open the release → Countries / regions
→ Add countries / regions → United States → Save, then Review and roll out.**

Internal testing still requires at least one country even though access is
controlled by your tester email list. MORTAR operates out of Cincinnati, so
United States alone is right for the beta; add more only if you have testers
abroad.

---

## 3. "You must let us know whether your app includes any financial features"

**Policy → App content → Financial features.**

**Answer: "My app doesn't provide any financial features."**

Reasoning — that declaration covers lending and personal loans, banking or
e-money services, crypto exchanges and wallets, investments or portfolio
management, insurance, tax preparation, and money transfer *between users*. The
app does none of these. Its only payment flow is MORTAR selling its own event
and conference tickets through Stripe Checkout
(`lib/services/stripe_checkout_service.dart`, reached from the events list,
event detail, and the conference gate). That is ordinary commerce, not a
financial service.

**Confirm before submitting:** there is no member-to-member payment, payout, or
money-transfer feature anywhere in the product roadmap you are shipping. If one
exists outside this codebase, this answer changes.

**Related, and worth knowing:** selling event tickets via Stripe rather than
Google Play Billing is *permitted* — Play Billing is only mandatory for in-app
digital content. Tickets to a real-world event are exempt. This is a common
rejection reason, and you are on the right side of it.

---

## 4. "You must complete the health declaration"

**Policy → App content → Health apps.**

**Answer: declare that the app is not a health app — none of the health
categories apply.** There is no health, medical, fitness, or wellness
functionality in the codebase, and the app collects no health data.

**Check this first:** this declaration is normally triggered by the store
category. If **Store presence → Main store listing → Category** is set to
*Health & Fitness* or *Medical*, change it — **Social** or **Business** matches
what the app actually is (networking, groups, events, messaging). Fixing the
category may clear this error on its own.

---

## 5. "All developers requesting access to the photo and video permissions..."

This one is triggered by two lines in the manifest, and you have a choice.

### Recommended: remove the permissions instead of declaring them

`android/app/src/main/AndroidManifest.xml` lines 10–11 declare:

```xml
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
```

**The app does not need either.** Every image pick in the codebase is a one-off,
user-initiated `pickImage(source: ImageSource.gallery)` — three call sites, in
`onboarding_screen.dart`, `create_post_screen.dart`, and
`event_create_screen.dart`. `image_picker_android` routes those through the
Android Photo Picker (falling back to `ACTION_GET_CONTENT` on older devices),
and neither requires a permission. The plugin does not declare these
permissions itself; they were added by hand to the app manifest.

Google's photo and video permissions policy says that apps whose use case is
one-off selection **must** use the photo picker rather than broad media
permissions. Declaring "core functionality" for a use case that qualifies for
the picker is itself a rejection risk. Deleting the two lines makes this
requirement disappear entirely.

Cost: a manifest edit, a `versionCode` bump, and a rebuild — so a new upload.

### If you would rather ship the bundle already uploaded

The build in Play *does* contain the permission, so you must complete the
declaration. For the core-functionality description:

> Members choose a photo from their device to set their profile picture, attach an image to a post in the community feed, or add a cover image when creating an event. Photos are selected one at a time by the member and uploaded only to that profile, post, or event. The app never browses, scans, or reads the device photo library in the background.

When asked whether a more privacy-protective alternative (the system photo
picker) could be used, answer honestly — for this app it could. Expect Google
to point that out, which is why removing the permissions is the cleaner path.

---

## Also on the dashboard, before you can publish

These were not in the error list but block the "Complete the steps listed on
the Dashboard" item: privacy policy URL (there is a draft at
[PRIVACY_POLICY.md](PRIVACY_POLICY.md) — it needs to be publicly hosted),
Data safety form, app access instructions (give Google a test account and a
conference ticket code, since sign-in and the conference are both gated),
content rating questionnaire, ads declaration, target audience, and the store
graphics.
