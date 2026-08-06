---
title: Web app troubleshooting
summary: Organised by the symptom a user reports. Start here for support tickets.
order: 20
tags: troubleshooting, support, login, permissions
---

Each entry below starts from what the user tells you, not from what is actually
broken. Work down the checks in order — they are ordered by how often they turn
out to be the cause.

## First, always: which environment are they in?

There are three separate Firebase projects — **dev**, **stage**, and **prod** —
and they have entirely separate user lists and content. An account that exists
in prod does not exist in dev.

The app picks its project from a build-time variable, and **if that variable is
unset it silently falls back to dev**. A misconfigured deploy therefore looks
exactly like "all my data disappeared."

**Check it first, before anything else.** Ask the user for the URL they are on.
If you need certainty, open the browser console on that URL — with debug logging
on, the app prints the project it resolved at startup. A dev or stage project ID
on what should be the production URL is your answer, and it is a deploy
configuration fix, not a user account fix.

This one check resolves a surprising share of "my account doesn't exist", "my
courses are gone", and "my purchase didn't appear" reports.

## "I can't sign in" / "my account doesn't exist"

1. **Wrong environment** — see above.
2. **Wrong email spelling.** Eligible-user records are keyed on a normalised
   email. A different address than the one you were given will not match.
   Check the exact address in **Admin → App Access Hub**.
3. **Never actually completed signup.** An eligible-user record is not an
   account. Confirm they got to `/join` and set a password.
4. **Email not verified**, if the flow required it — resend from the verify
   screen.
5. **They are trying the mobile app with a student role.** See the next entry.

## "The mobile app rejects me but the website works"

This is expected for anyone whose only role is **Digital Curriculum Students**.
Mobile access is derived from role, and students do not have it. The app signs
them straight back out.

If they should have access, they need to be promoted to alumni — either through
the graduation flow, or directly in **Admin → Alumni applications** — and then
issued an invite code. Promotion alone is not enough; they need the code too.

## "I was made an admin but I get permission denied"

Their auth token still carries the old role. Security rules read the token, not
the database.

**Fix:** have them fully sign out and sign back in. A page refresh is not always
enough. If it still fails after a clean re-login, confirm the role string in
**Admin → Admins** is spelled exactly `Admin` or `superAdmin` — role matching is
literal, and `admin` in lowercase will not match in every path.

## "I'm stuck in onboarding — it won't let me finish"

The gate requires **at least three** confident skills and **at least three**
desired skills. Selecting one or two of each is the usual cause, and the form
does not always surface the minimum clearly.

Full checklist of what must be filled in:

- First name, last name, city, state
- Cohort selected, or "not in a cohort" ticked
- At least 1 business goal
- **At least 3** confident skills
- **At least 3** desired skills
- Industry

Walk them through those in order. If everything is genuinely filled in and they
are still held, the profile save may be failing — have them check for an error
toast when they hit continue.

## "It keeps sending me back to the admin hub"

You are a staff account in **admin view mode**, which redirects away from most
learner pages by design. Use the view-mode toggle to switch to student view when
you need to see what a learner sees.

## "A lesson slide or PDF won't load" / "certificate download fails"

Slide and certificate files are not served directly from storage — browsers
block that with a CORS error — so they are routed through a backend function
instead.

1. **Everything fails for everyone** → the functions URL or project ID for that
   deploy is wrong. This is a config problem, not a content problem. Escalate to
   whoever owns the deploy.
2. **One lesson fails, others work** → the file was never uploaded, or was
   uploaded to the wrong lesson. Open the lesson in the builder and confirm the
   file is attached.
3. **Only some users** → have them try another browser. An aggressive ad
   blocker or corporate proxy can block the function domain.

## "I bought something and nothing happened"

1. Confirm the payment actually succeeded in Stripe — a declined card ends the
   flow silently from the user's point of view.
2. Purchases are fulfilled by a webhook from Stripe, not by the browser. If the
   payment succeeded but nothing was granted, the webhook is the place to look —
   escalate with the Stripe payment ID.
3. **Check the environment.** A purchase made against the stage project will
   never appear in prod.
4. If the user was redirected to a broken success page, the site was probably
   reached through a proxy or an alternate domain — success and cancel URLs are
   built from the address in the browser bar.

## "The app is asking me for a password before I can even see it"

There is a site-level password gate in front of the app, separate from user
accounts. It stores its unlock in the browser session, so clearing session data,
using a private window, or switching browsers re-prompts. Give the tester the
gate password again; it is not their account password and nothing is wrong with
their account.

## "The course list is stale — I published a change and can't see it"

Course data is cached client-side. After an admin edit, a learner may see the
old list until the cache is invalidated or they reload.

Ask them to do a hard reload. If it persists across a hard reload in a private
window, the change did not save — go back to the admin panel and confirm.

## "My progress was reset"

Usually it was not reset — it was **re-opened on purpose**. When an admin uses
"Publish update to assignees" on a course, every learner who had already
completed it is re-opened so they see the new content, and their certificate is
re-issued when they finish again.

Confirm with the course owner whether an update was published recently. If yes,
this is working as designed and the user has not lost anything. See
[Curriculum troubleshooting](/admin/docs/curriculum/troubleshooting).

## "Everything is broken / nothing loads"

Before escalating, collect:

- The exact URL, including the path
- Whether it fails in a private window and in a second browser
- The browser console output — screenshot the red errors
- Whether other users are affected or only this one
- The rough time it started

A single user with a working private window is a local browser problem. Multiple
users at once, starting at a specific time, is a deploy or backend problem.

## Escalation checklist

Escalate to engineering with all of:

- Symptom, in the user's words
- Affected account email and role
- Environment (URL + resolved project, if known)
- Console errors
- Whether it reproduces on another account
- Whether it started after a known deploy
