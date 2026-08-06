---
title: Admin tasks
summary: Step-by-step for the recurring jobs — invites, roles, graduations, events, shop.
order: 30
tags: how-to, invites, roles, graduation, shop
---

The Command Center at `/admin` is the starting point for everything here. The
strip at the top shows live counts of things waiting on you; the tiles below
open each tool.

## Give someone access

Access is two separate things and both are required:

1. **Eligibility** — a record saying this email is allowed in, with a role.
2. **An invite code** — a single-use code they redeem at signup.

**To grant access:** open **App Access Hub**, add the person as an eligible user
with the right role, then generate an invite code and send them both the code
and the address to redeem it at.

Notes that save time later:

- Codes are **single-use**. Generating a new one **revokes the previous one** —
  do not regenerate as a "just in case", because it breaks the code the person
  is already holding.
- Eligibility is keyed on a **normalised email**. If they sign up with a
  different address, nothing matches.
- For more than a handful of people, use the bulk upload rather than adding them
  one at a time.

## Change someone's role

Open **Role & admins**, find the user, set the role.

Then tell them to **sign out and sign back in**. Their permissions do not change
until their auth token refreshes, and until then they will hit permission errors
that look like a bug. This step is not optional.

Use the exact role strings — `superAdmin`, `Admin`, `Alumni`,
`Digital Curriculum Alumni`, `Digital Curriculum Students`. Anything else is
treated as an unknown role with no access.

Note that `Admin` is not quite full access: **uploading lesson images requires
`superAdmin`**. See [Curriculum troubleshooting](/admin/docs/curriculum/troubleshooting).

## Process a graduation application

Applications land in **Alumni applications** as `pending`.

Accepting one promotes the learner to alumni, which turns on their mobile app
access and creates their eligible-user record and invite code. Send them the
code — promotion by itself does not get them into the app.

## Publish a course update to people already enrolled

In the course tools, "Publish update to assignees" pushes new content to
everyone assigned.

**Understand the side effect before you click it.** Anyone who had already
*completed* the course is re-opened and must finish it again; their certificate
is re-issued on re-completion. Learners still in progress are unaffected beyond
seeing the new content.

This is correct behaviour, but to a learner it reads as "my progress was
deleted." If you are publishing an update to a course with completions, tell
those learners first.

## Run an event

**Events** manages both web and mobile events. Ticketed events go through Stripe
like any other purchase, so the same rules apply: prices are set server-side,
and fulfilment happens by webhook rather than in the browser.

## Handle a shop order

**Shop** lists orders and their fulfilment state. Mark orders fulfilled there as
you ship them — the fulfilment state is what the learner sees on their side.

Shipping is a flat rate and tax is calculated automatically, so neither is
something you set per order.

## Moderate reports

**Reports** covers content reported on the web platform; **Expansion mobile
moderation** covers the mobile app. Child-safety reports take priority over
everything else — the published standards commit to reviewing them first, and
that commitment is registered with Google Play.

## Send email and notifications

- **Email Management** — transactional email templates and sends.
- **Email testing** — send yourself a template before it goes out. Use it.
- **Push notifications** — mobile app only; web users will not receive these.
- **MORTAR Info** — announcements and newsletters shown inside the app.

## Read the analytics

- **Analytics** — the web platform.
- **Mobile analytics** — the Expansion Network app.

They are separate pipelines with separate event definitions, so numbers are not
directly comparable between the two.

## Collect beta feedback

**Beta Testing** aggregates tester reports from both the mobile app (triggered
by shaking the device) and the web widget, each tagged with the screen it came
from and a screenshot. This is the fastest way to see what testers actually hit,
with enough context to reproduce.

## Related

- [Web app overview](/admin/docs/webapp/overview)
- [Web app troubleshooting](/admin/docs/webapp/troubleshooting)
- [Authoring courses and lessons](/admin/docs/curriculum/authoring)
