---
title: Digital curriculum overview
summary: How courses, modules, lessons, and slides fit together — and the two content systems that coexist.
order: 10
tags: curriculum, content-model, lessons
---

The digital curriculum is the learning half of the web app: the course catalog,
the lesson player, quizzes, surveys, progress tracking, badges, and
certificates.

## The single most important thing to know

**There are two content systems running at the same time**, and a lesson can
live in either one:

**The legacy system** — a course contains modules, a module contains lessons,
and a lesson's content is a single uploaded **PowerPoint or PDF file**. The
learner sees it in a document viewer.

**The slide-deck system** — content is structured data rather than a file. A
lesson is made of slides, and each slide is made of typed content blocks. This
is what the Lesson Deck Builder edits.

The two are bridged by a mapping on the course, and there is **no automatic
migration** between them. A course can have some lessons in one shape and some
in the other.

This matters constantly in support, because "the lesson is blank" almost always
means the lesson exists in one system while the content was authored in the
other. Whenever you are diagnosing empty or missing lesson content, establish
which system that lesson uses first.

## Content structure

In the slide-deck system, content nests like this:

```
Curriculum
└── Module
    └── Chapter
        └── Lesson          (published/unpublished, has a theme)
            ├── Slide       (a layout + styling)
            │   └── Block   (the actual content)
            └── Images
```

**Block types:** title, text, heading, bullet list, image, quote, callout.

**Slide layouts:** ten of them — title only, title and body, image left with
text right, bullet list with image, quote slide, and others. The layout decides
arrangement; the blocks provide content.

**Video** can be embedded three ways: a YouTube link, a file hosted by us, or an
external URL. The system classifies the URL and picks the right player.

**Interactive slides** support popups anchored to points on an image — used for
diagrams where clicking a region reveals an explanation.

## Courses and commerce

A course is the sellable, assignable unit. It carries:

- Its modules, each with a price, duration, associated skills, completion
  badges, and skill certificates
- Assigned roles and assigned individual users — who can see it
- A status: draft, published, or archived
- A content version (see below)

## How progress is tracked

Each learner has a progress record per course holding:

- Which lessons and modules are complete
- The last slide viewed in each lesson, and the last lesson viewed overall —
  this is what powers "Continue where you left off"
- Quiz attempts and whether the quiz was passed
- Survey submissions, answers, and AI feedback
- The content version their progress has been reconciled against

### The content-version behaviour

When an admin publishes a course update, the course's content version is bumped.
The next time a learner opens it, their progress is compared against that
version:

- **Still in progress** → nothing visible happens; they just see the new content.
- **Already completed** → their completion is **re-opened**. They must work
  through the course again, and their certificate is re-issued when they do.

That second case is intentional but is reliably reported as "my progress was
reset." See [Curriculum troubleshooting](/admin/docs/curriculum/troubleshooting).

## Assessment

**Quizzes** are multiple choice with four options. The default pass mark is
**70%**. Grading happens on the server and the correct answers are not sent to
the browser, so a learner cannot read them out of the page — which also means a
quiz cannot be "checked" client-side and any grading question needs the server
record.

**Surveys** are reflective checkpoints placed inside a lesson. A lesson can have
several. Answers are analysed to produce written AI feedback for the learner.

**To complete a lesson, a learner must submit every survey checkpoint in it and
pass the quiz.** A missed checkpoint half way through a lesson is the usual
reason a lesson refuses to complete even though the learner reached the end.

## Credentials

Completing the right combination of content issues **badges** and **skill
certificates**. Certificates get a generated PDF and a public share URL, so a
learner can link to a certificate without the recipient needing an account.
Learners collect these in the Data Room, which can also export everything as a
single ZIP.

## Related

- [Authoring courses and lessons](/admin/docs/curriculum/authoring)
- [Curriculum troubleshooting](/admin/docs/curriculum/troubleshooting)
- [Web app overview](/admin/docs/webapp/overview)
