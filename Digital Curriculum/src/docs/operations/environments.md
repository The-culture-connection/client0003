---
title: Environments and deploys
summary: The three Firebase projects, how the app picks one, and why that is the first thing to check.
order: 10
tags: environments, config, deploy, firebase
---

> Written for developers and operators. Staff who just need to identify a
> wrong-environment problem can stop after the first section.

## Three separate worlds

There are three Firebase projects — **dev**, **stage**, and **prod** — with
completely separate users, content, purchases, and files. Nothing crosses
between them.

Because of that, "the data is missing" and "the account doesn't exist" are
usually not data problems. They are *the browser is pointed at the wrong
project*.

## How the app picks a project

The web app resolves its Firebase project at **build time**, from
`VITE_FIREBASE_ENV`:

| Value | Project |
| --- | --- |
| `dev`, `development`, empty | dev preset |
| `stage`, `staging` | stage preset |
| `prod`, `production` | prod preset |
| anything else | **dev**, with a console warning |
| **unset** | **dev** |

**The fallback to dev when unset is the important part.** A deploy that forgets
the variable does not fail — it comes up healthy, pointed at dev, and looks to
users exactly like their account and data vanished.

Alternatively, supplying the full set of `VITE_FIREBASE_*` values (API key,
project ID, app ID, and the rest) overrides the preset entirely and uses only
what you passed.

Because Vite inlines these at build time, **changing the variable requires a
rebuild**. Setting it on a running service does nothing.

## Confirming which project a deploy is on

Set `VITE_FIREBASE_DEBUG=true` and the app logs the resolved project ID, auth
domain, and where the config came from to the browser console at startup. In
local development this logging is on already.

This is the definitive check. Do it before investigating any report of missing
accounts, missing courses, or missing purchases.

## Emulators

Emulators are used only when `VITE_USE_EMULATOR=true`. They are off unless
explicitly turned on, so a developer seeing real data locally is expected, not a
mistake.

## Build and deploy

The app is a static Vite build served by a small static server on Railway.

```
npm run build:dev       # dev project
npm run build:staging   # stage project
npm run build:prod      # prod project
npm run dev             # local dev server
```

The per-environment scripts set the environment explicitly, which is safer than
relying on the ambient variable — prefer them over a bare `npm run build`.

A prebuild step prints the resolved Firebase environment and syncs the analytics
contract from the backend. **Watch the printed environment in your build logs**
— it is the cheapest possible guard against shipping a prod URL built against
dev.

## Backend

Firebase Functions in `us-central1` provide the callable API, the Stripe
webhook, scheduled jobs, email sending, analytics rollups, and CRM sync. They
deploy separately from the web app, so the frontend and backend can be at
different versions — worth remembering when a feature works in one environment
and not another.

### The storage download proxy

Files in Cloud Storage — lesson slide decks, certificates — are **not** fetched
directly by the browser. Direct fetches to the storage domain hit CORS errors,
so downloads are routed through a `getCourseFile` HTTPS function instead.

The proxy URL is built from `VITE_FUNCTIONS_URL`, or derived from the project ID
if that is unset. If either is wrong for the deploy, **every slide and every
certificate download fails** while the files themselves are perfectly fine. It
presents as universal content failure, which makes it look far worse than it is.

## Config that affects users

| Variable | Effect if wrong |
| --- | --- |
| `VITE_FIREBASE_ENV` | Silently uses dev — users see an empty, unfamiliar app |
| `VITE_FUNCTIONS_URL` | All slide and certificate downloads fail |
| `VITE_FIREBASE_PROJECT_ID` | Same as above, via the derived proxy URL |
| `VITE_USE_EMULATOR` | App talks to emulators that are not running |
| `VITE_FIREBASE_DEBUG` | Only affects logging — safe to enable anywhere |

## Related

- [Reference and further reading](/admin/docs/operations/reference)
- [Web app troubleshooting](/admin/docs/webapp/troubleshooting)
