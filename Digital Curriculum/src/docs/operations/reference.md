---
title: Reference and further reading
summary: How to add a doc to this section, and where the deeper engineering docs live.
order: 20
tags: reference, contributing, index
---

## Adding or editing a doc

These pages are Markdown files in the repository, bundled into the app at build
time. They are files rather than database records on purpose: the docs describe
how the app behaves at a given version, so they should be reviewed and shipped
alongside the code they document.

**To add a page**, create a `.md` file in one of:

```
Digital Curriculum/src/docs/webapp/
Digital Curriculum/src/docs/curriculum/
Digital Curriculum/src/docs/operations/
```

Start it with a frontmatter block:

```
---
title: Handling refunds
summary: One line shown on the docs index card.
order: 40
tags: shop, payments
---
```

Only `title` is required. `order` controls position within its section — leave
gaps between numbers so a page can be slotted in later without renumbering.

The folder becomes the section and the filename becomes the URL, so
`webapp/refunds.md` is served at `/admin/docs/webapp/refunds`. Nothing else
needs editing — no registry, no route. The page appears on the next build.

**Cross-link between docs** with normal Markdown links using the same paths:
`[Web app troubleshooting](/admin/docs/webapp/troubleshooting)`.

**Supported formatting:** headings, bold and italic, links, bullet and numbered
lists, tables, blockquotes, code blocks, and horizontal rules. The `##` headings
in a page automatically become its on-page table of contents, so use them for
your main sections.

**These docs go live with a deploy.** An edit is not visible to anyone until the
app is rebuilt and shipped. If you need something in front of staff right now,
send it to them directly and add it here afterwards.

## Writing guidance

The troubleshooting pages are the most-used part of this section, and they work
because they are organised **by the symptom someone reports**, not by the
subsystem at fault. A staff member arriving with "the lesson is blank" should
find that phrase as a heading. Keep that convention when you add to them.

Order the checks under each symptom by how often they turn out to be the cause,
not by how logical the sequence feels.

## Deeper engineering documentation

This section is deliberately operational. The detailed technical documents live
in the repository:

**Repository root**
- `README.md` — monorepo setup, Firebase projects, deploy commands
- `EXPANSION_INVITE_AUTH.md` — invite codes, eligible users, canonical roles
- `PPTX_IMPORT_DOCUMENTATION.md` — the PowerPoint import pipeline
- `THINKIFIC_MIGRATION_PLAN.md` — the Thinkific migration runbook

**`docs/`**
- `MORTAR_PLATFORM_CAPABILITIES.md` — the fullest feature inventory
- `BETA_TESTING_PLAN.md` and `BETA_TESTING_PLAN_SIMPLE.md`
- `MORTAR_ANALYTICS_SCHEMA.md` — analytics event definitions
- `STRIPE_SETUP.md` — payments configuration
- `PRIVACY_POLICY.md`, `PLAY_STORE_LISTING.md`, `RELEASE_BUILDS.md`

**`infra/docs/`**
- `ROLES_AND_PERMISSIONS.md` — the authoritative permission model
- `ROUTE_MAP.md` and `ONBOARDING_ROUTE_MAP.md`
- `TESTING_SECURITY_RULES.md`, `VERIFY_CUSTOM_CLAIMS.md`
- `STAGE_DEPLOYMENT.md`, `ASSIGN_SUPERADMIN_ROLE.md`

**`Digital Curriculum/`**
- `CURRICULUM_SYSTEM_DOCS.md` — the deepest treatment of the slide-deck system
- `DEPLOY_RAILWAY.md` — hosting configuration

`firestore.rules` and `storage.rules` at the repository root are the real
authority on who can do what. Where a document and the rules disagree, the rules
are correct.

## Known stale documents

Two files in the repository are out of date and will mislead you:

- **`CLAUDE.md`** at the root describes a Kotlin Android app with placeholder
  values. It has nothing to do with this project.
- **`Digital Curriculum/README.md`** says the app is UI-only with no Firebase.
  That has not been true for some time.

## Related

- [Environments and deploys](/admin/docs/operations/environments)
- [Web app overview](/admin/docs/webapp/overview)
- [Digital curriculum overview](/admin/docs/curriculum/overview)
