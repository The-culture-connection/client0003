# Lesson 4 — mortar-stage seed result

Seeded: 2026-05-28

| Field | Value |
|-------|-------|
| **courseId** | `5yOpMeJR9KkbNzdPtQ0E` |
| **curriculumId** | `SLpBKFr786sTNwaRMbUF` |
| **moduleId** | `kCUhSJJI0mg3cDaTVDTN` |
| **chapterId** | `VDINgFM0Q2GEFUSo1uLu` |
| **lessonId** | `WhIpw7eIjAyWAEMSiOq6` |

## Content (v2 — updated)

- **21 playlist items**: 19 content PNGs + **2 YouTube videos** (after PPT slides 1 & 12)
- **Skipped PPT slides**: survey UI 6,8,10,16,18,23–25,27–30 + quiz UI 26
- **12 survey checkpoints** with lesson-specific questions (native UI, not survey PNG slides)
- **3-question quiz** at end (native MCQ in player)

## Learn URL (local dev)

```
/learn/lesson/WhIpw7eIjAyWAEMSiOq6?courseId=5yOpMeJR9KkbNzdPtQ0E&curriculumId=SLpBKFr786sTNwaRMbUF&moduleId=kCUhSJJI0mg3cDaTVDTN&chapterId=VDINgFM0Q2GEFUSo1uLu
```

## Re-seed

```bash
npm run export:lesson4-screens
npm run seed:lesson4
```

Survey question text uses placeholders (3 open-text questions per checkpoint). Edit in **Course Builder** or update `build-manifest.js` and re-seed.
