---
title: Authoring courses and lessons
summary: Building a course, importing decks from PowerPoint, and publishing safely.
order: 20
tags: how-to, authoring, courses, publishing
---

Three tools build content, and they operate at different levels. Picking the
wrong one is the usual reason authoring feels harder than it should.

| Tool | Use it for |
| --- | --- |
| **Course Creation Wizard** | Starting a new course from nothing, guided |
| **Course Builder** | Editing an existing course's structure, pricing, assignment |
| **Lesson Deck Builder** | Editing the slides inside one lesson |

All three are reachable from the Command Center; the builders are also in the
Quick actions on the admin side rail.

## Build a new course

1. Open **Courses → Course wizard**.
2. Set the course title and description.
3. Add modules. Each module carries its own **price**, duration, the skills it
   teaches, and the badges and skill certificates awarded on completion.
4. Add chapters and lessons within the modules.
5. Set **assignment** — which roles and which individual users can see it.
6. Leave the status on **draft** until it is ready.

Draft courses are invisible to learners. Publishing is what exposes them, and
assignment is what narrows who sees them — you need both.

## Build a lesson deck

Open the lesson in the **Lesson Deck Builder**.

A lesson is a sequence of slides. For each slide you choose a **layout** (title
only, title and body, image left with text right, bullet list with image, quote,
and so on) and then fill it with **blocks** — title, heading, text, bullet list,
image, quote, callout.

Practical notes:

- **Image uploads require the `superAdmin` role.** An `Admin` can create and
  edit slides but the image upload will fail. This is a known asymmetry, not a
  transient error — see the troubleshooting doc.
- Images must be **PNG, JPG, JPEG, or WEBP** and **5 MB or smaller**.
- Video blocks accept a YouTube link, a file we host, or an external URL. Paste
  the URL and it is classified automatically.
- A lesson has a **published** flag of its own. A published course containing an
  unpublished lesson shows learners a gap.

## Import a deck from PowerPoint

Rather than rebuilding an existing deck slide by slide, import the `.pptx`. The
importer converts slides into lesson slides with blocks.

Treat the result as a **first draft**. Complex layouts, custom fonts, and
animations do not survive conversion cleanly, so review every slide afterward
and fix what came across wrong. It saves the typing, not the reviewing.

## Add a quiz

Quizzes are multiple choice with four options. The default pass mark is **70%**,
adjustable per quiz.

Grading happens on the server and correct answers are never sent to the browser.
Two consequences:

- You cannot verify grading by inspecting the page — you need the server-side
  attempt record.
- Editing a quiz's answers after learners have attempted it does not retroactively
  regrade past attempts.

## Add survey checkpoints

Surveys are reflective prompts placed at points inside a lesson, and a lesson
can have more than one. Answers are analysed to generate written feedback for
the learner.

**Every checkpoint in a lesson must be submitted before that lesson can
complete.** If you add a checkpoint to a lesson learners are already working
through, they will hit it as a new blocker. Add checkpoints before release where
you can.

## Publish

Publishing a course exposes it to its assigned audience.

**"Publish update to assignees" is the one to be careful with.** It bumps the
course's content version, and any learner who had already *completed* the course
is re-opened — they must finish it again, and their certificate is re-issued
when they do. Learners mid-course are unaffected beyond seeing the new content.

Before using it on a course that has completions:

1. Check whether anyone has actually completed the course.
2. If they have, decide whether the change genuinely warrants making them redo
   it. A typo fix usually does not.
3. If it does, tell those learners before you publish. Otherwise they will
   report it as lost progress.

## Pre-release checklist

- Course status is **published**
- Assigned to the right roles and users
- Every lesson in it is **published**
- Every lesson opens in the player and its slides render
- Images actually appear — uploads silently fail for non-`superAdmin` authors
- Quiz pass mark is right, and the quiz can be passed
- Survey checkpoints are all intentional
- Module prices are correct, if it is sold
- Badges and certificates are attached to the right modules
- Walk it once end to end as a test learner

## Related

- [Digital curriculum overview](/admin/docs/curriculum/overview)
- [Curriculum troubleshooting](/admin/docs/curriculum/troubleshooting)
