---
title: Curriculum troubleshooting
summary: Blank lessons, stuck completions, quiz and certificate problems.
order: 30
tags: troubleshooting, lessons, quizzes, certificates, progress
---

Organised by what the learner or author reports. For anything that might be
environment-related, run the environment check in
[Web app troubleshooting](/admin/docs/webapp/troubleshooting) first — a wrong
Firebase project explains an empty course list faster than anything here.

## "The lesson is blank" / "there's no content"

Work through these in order.

1. **Which content system is the lesson in?** Content authored as a slide deck
   does not appear if the lesson is set up as a file-based legacy lesson, and
   vice versa. This is the most common cause by a wide margin. Open the lesson in
   the builder and confirm the content is where the lesson expects it.
2. **Is the lesson published?** Lessons have their own published flag,
   independent of the course. An unpublished lesson inside a published course
   shows as a gap.
3. **Did the file fail to load rather than fail to exist?** If it is a legacy
   file-based lesson, see the next entry.
4. **Did the images fail to upload?** If the author was an `Admin` rather than a
   `superAdmin`, the text will be there and the images will not.

## "The slides won't load" (spinner, or an error where the document should be)

Slide files and PDFs are served through a backend proxy rather than directly
from storage, because browsers block the direct route.

- **Every document fails, for everyone** → the deploy's function URL or project
  ID is misconfigured. It is a deploy problem; escalate. Nothing is wrong with
  the content.
- **One lesson fails, others work** → the file was never attached, or was
  attached to a different lesson. Check in the builder.
- **One user only** → have them try a different browser or disable extensions.
  Ad blockers and corporate proxies sometimes block the function domain.

## "I can't upload an image to a slide"

If the author's role is `Admin` rather than `superAdmin`, this is expected:
**lesson asset uploads require `superAdmin`.** Firestore lets an `Admin` create
the slide, but storage rejects the file. The result is a lesson that saves fine
and has no images.

Either have a `superAdmin` do the uploads, or grant the author `superAdmin` — and
remember they must sign out and back in before the new role takes effect.

If they already are `superAdmin`, check the file itself: **PNG, JPG, JPEG, or
WEBP**, and **5 MB or under**. Oversized files and unsupported formats (HEIC
from an iPhone is a frequent one) are rejected.

## "I finished the lesson but it won't mark complete"

A lesson completes only when **both** conditions are met:

1. **Every survey checkpoint in the lesson has been submitted.** Checkpoints sit
   *inside* the lesson, not at the end — a learner can scroll past one and reach
   the final slide with an unsubmitted checkpoint behind them. This is the usual
   cause.
2. **The quiz has been passed** at the required mark, 70% by default.

Have them scroll back through the lesson looking for an unanswered checkpoint.
If a checkpoint was added after they started the lesson, it will appear as a new
blocker part way through content they thought they had finished.

## "I passed the quiz but it says I failed" / "the grade is wrong"

Grading is done on the server and correct answers are never sent to the browser,
so the learner's own view is not evidence either way. You need the stored
attempt record.

Check:

- The **pass mark** on that quiz — 70% is the default but it can be set higher.
- Whether the **quiz was edited after their attempt**. Editing answers does not
  regrade past attempts, so an old attempt is graded against the old answer key.
- The attempt count, in case they are looking at an older attempt than they
  think.

## "My progress was reset"

Almost always this is the content-version re-open, and it is deliberate: when an
admin publishes a course update, learners who had **already completed** that
course are re-opened so they see the new material. Their certificate is
re-issued when they finish again.

**To confirm:** ask the course owner whether an update was published recently.
If yes, explain that nothing was lost and the certificate returns on
re-completion.

If **no** update was published, that is a genuine problem — collect the account
email, the course, and roughly when it happened, and escalate.

Note that learners who were mid-course are never re-opened; only completions
are. So a report of lost progress from someone who had *not* finished is not
this, and should be escalated.

## "My certificate hasn't appeared"

1. Confirm the course is actually complete — every lesson, every survey
   checkpoint, quiz passed. Partial completion issues nothing.
2. Certificates are generated as PDFs and given a public share link. Generation
   is not instant; give it a few minutes and reload.
3. If the download fails rather than the certificate being absent, it is the
   same proxy issue as the slides — see above.
4. Check the Data Room, which is where certificates and survey PDFs collect. The
   "download all as ZIP" export there is the quickest way to see what they
   actually hold.

## "The course doesn't show up for me"

Visibility needs all of:

- Course status is **published**, not draft or archived
- The learner's **role** is in the assigned roles, **or** they are individually
  assigned
- If the module is paid, they have purchased it
- They are in the **right environment** — the same course in dev and prod are
  different records

Role changes only take effect after the learner signs out and back in, so a
newly-assigned role is a common reason a course stays hidden.

## "The imported PowerPoint looks wrong"

Expected, to a degree. The importer converts slides to blocks, and complex
layouts, custom fonts, and animations do not survive. Review and fix the deck
after import — the import saves the retyping, not the design work.

If it is badly wrong across every slide rather than on a few, the source file
may use features the importer cannot read at all; rebuilding those slides by
hand is faster than fighting it.

## Escalation checklist

- Course, module, and lesson names — and which content system the lesson uses
- Learner account email and role
- Environment
- What the learner sees versus what they expect
- Whether it reproduces for a second account
- Whether a course update was published recently

## Related

- [Digital curriculum overview](/admin/docs/curriculum/overview)
- [Authoring courses and lessons](/admin/docs/curriculum/authoring)
- [Web app troubleshooting](/admin/docs/webapp/troubleshooting)
