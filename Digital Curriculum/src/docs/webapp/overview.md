---
title: Web app overview
summary: What the MORTAR web platform is, who uses it, and what lives where.
order: 10
tags: orientation, roles, routes
---

The MORTAR web app is a single React application that serves two audiences from
one deployment: **learners**, who see the curriculum, community, and shop, and
**staff**, who see the Admin Command Center. There is no separate admin build —
what you get is decided by the roles on your account.

A third product, the **Expansion Network** mobile app (also called THE
MORTARVERSE), is a separate Flutter app for alumni. It shares the same Firebase
backend, which is why several admin panels here manage things you never see on
the web — push notifications, mobile moderation, mobile analytics.

## The two surfaces

**Learner surface** — everything under `/dashboard`, `/curriculum`, `/learn`,
`/community`, `/events`, `/shop`, `/data-room`. Requires a signed-in account
that has completed onboarding.

**Admin surface** — everything under `/admin`. Requires the `Admin` or
`superAdmin` role. The landing page is the Command Center: an action-items strip
at the top with live counts (things waiting on you), then the tool tiles.

Staff accounts have a **view-mode toggle** that switches between the admin and
student views. While you are in admin mode the app redirects you to `/admin`
from most learner paths, so if you are trying to look at the learner experience
and keep getting bounced to the hub, flip the toggle to student mode.

## Roles

There are exactly five canonical roles. The spelling matters — they are matched
as literal strings, and a typo silently produces an account with no access.

| Role | What it grants |
| --- | --- |
| `superAdmin` | Everything, including lesson image uploads and role assignment |
| `Admin` | The admin hub and all panels; **not** lesson asset uploads |
| `Alumni` | Learner surface plus the mobile alumni network |
| `Digital Curriculum Alumni` | Learner surface plus the mobile alumni network |
| `Digital Curriculum Students` | Learner surface only — **no mobile app access** |

New accounts default to **Digital Curriculum Students**.

Mobile app access is not a role of its own. It is derived from the role as a
`networkAccess` flag, and it is `false` for exactly one role: Digital Curriculum
Students. Everyone else gets `true`. This is why a current student cannot sign
in to the mobile app — that is intended behaviour, not a bug.

### The one thing to know about role changes

Roles are stored in two places: the user's Firestore document, and the Firebase
auth token as a custom claim. A background trigger copies Firestore → claim.

**Security rules only read the token claim.** A token is not re-issued
instantly, so after you change someone's role they will keep the old permissions
until their token refreshes. Have them sign out and back in. This is the single
most common "you made me an admin but I still get permission denied" ticket.

## Getting an account

The intended path is invite-based:

1. In **Admin → App Access Hub**, add the person as an eligible user (this
   creates a record keyed on their normalised email) and generate an invite code.
2. They go to `/join`, enter the code with their email and a password.

Two caveats worth knowing before you troubleshoot:

- Invite codes are **single-use**, stored in plain text, and are revoked when
  you regenerate. If you generate a second code for someone, the first stops
  working.
- The **web `/join` page does not currently validate the invite code** — any
  string is accepted there. Real code validation happens in the mobile app. So
  "the code didn't work on the website" is almost never a code problem; look at
  the eligible-user record and the password instead.

## Onboarding

After signing in, a gate holds users at `/onboarding` until their profile is
complete. Complete means either `onboarding_status` is already `complete` or
`partial`, **or** all of the following are present:

- First name, last name, city, state
- A cohort, or the "not in a cohort" box ticked
- At least one business goal
- **At least three** confident skills
- **At least three** desired skills
- An industry

The two "at least three" requirements are where people get stuck — the form does
not always make the minimum obvious. See
[Web app troubleshooting](/admin/docs/webapp/troubleshooting).

If the profile check itself errors, the gate **lets the user through** rather
than trapping them. That is deliberate, but it means a user can occasionally
reach the dashboard with an incomplete profile.

## Main learner flows

**Learn** — Curriculum → module → course → lesson player → surveys and quiz →
lesson complete → module complete → badge and certificate. Covered in detail
under [Digital curriculum](/admin/docs/curriculum/overview).

**Buy** — Modules, event tickets, and shop items all route through Stripe
Checkout. Prices are set server-side, so a manipulated client cannot change
what is charged. Tax is calculated via Stripe Tax and shipping is a flat rate.

**Graduate** — A learner submits a graduation application, it appears in
**Admin → Alumni applications** as pending, and accepting it promotes them to
alumni and issues them an eligible-user record plus an invite code for the
mobile app.

## Things the web app deliberately does not do

- **There is no offline mode.** No service worker, no offline Firestore
  persistence, no PWA install. If the connection drops, the app stops working.
  Only the mobile app has meaningful local state. Do not promise offline access.
- **There is no draft autosave for learners.** Survey and quiz answers are
  submitted, not saved as you type.

## Related

- [Web app troubleshooting](/admin/docs/webapp/troubleshooting)
- [Admin tasks](/admin/docs/webapp/admin-tasks)
- [Environments and deploys](/admin/docs/operations/environments)
