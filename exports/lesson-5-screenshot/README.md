# Lesson 5 migration (same pipeline as Lesson 4)

**Canva:** https://mortarengagementengines.my.canva.site/dahk-u7ed9g

## Slide map (16 pages)

| PPT slide | Treatment |
|-----------|-----------|
| 1 | Content PNG |
| 2 | YouTube only (`CRHntr3bL9M`) — skip PNG |
| 3–4 | Content PNG |
| 5, 6, 11, 14 | Survey UI — skip PNG; native surveys in LessonPlayer |
| 7–10, 13 | Content PNG |
| 12 | Quiz UI — skip PNG; native MCQ in LessonPlayer |
| 15–16 | Content PNG |

**Expected playlist:** 11 items (10 images + 1 video), 4 surveys, 3 quiz questions.

## Prerequisite

Export the Canva deck as PowerPoint and save as:

`course-content/Lesson5.pptx`

(16 slides; script warns if slide count differs.)

## Commands

```bash
npm run migrate:lesson5
```

Or step by step:

```bash
npm run export:lesson5-screens
npm run add:lesson5
```

Adds lesson to course `5yOpMeJR9KkbNzdPtQ0E` (same chapter as Fade In). Edit survey/quiz copy in **Course Builder** or in `tools/lesson-migrate/lesson-5.config.json` then re-run `add:lesson5`.

Credentials: `mortar-stage-firebase-adminsdk-fbsvc-cf45f45ef4.json` (or `GOOGLE_APPLICATION_CREDENTIALS`).
