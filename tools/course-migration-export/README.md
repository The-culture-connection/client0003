# Course Migration Export System

Generates a Mortar-ready migration pack from structured lesson markdown:

1. **PowerPoint deck** (`.pptx`) — dark cinematic style, one logical block per slide
2. **PNG exports** — one PNG per slide in `exports/lesson-4/png/`
3. **JSON manifest** — maps each PNG to section metadata

## Source of truth

- `course-content/lesson-4.md` (synced from `Mortar Masters Online Course/Lesson 4/Coursestructuredmarkdown.txt`)

## Output layout

```text
exports/lesson-4/
  lesson-4-migration.pptx
  manifest.json
  png/
    slide-001-lesson-overview.png
    slide-002-intro.png
    ...
```

## Prerequisites

- **Node.js 18+**
- **PNG export** (one of):
  - Microsoft PowerPoint (Windows — recommended, uses COM export)
  - LibreOffice (`soffice` on PATH or default install path)

## Install

From repo root:

```bash
npm install --prefix tools/course-migration-export
```

## Run (Lesson 4)

From repo root:

```bash
npm run export:lesson-4
```

Or directly:

```bash
cd tools/course-migration-export
npm install
npm run export:lesson-4
```

Custom input path:

```bash
node tools/course-migration-export/src/index.js --lesson 4 --input "path/to/lesson.md"
```

## Manifest format

```json
[
  {
    "slideNumber": 1,
    "fileName": "slide-001-lesson-overview.png",
    "sectionId": "lesson-overview",
    "title": "Lesson 4 — Fade In",
    "type": "lesson_overview",
    "sourceMarkdownHeading": "# Lesson 4 — Fade In",
    "layout": "title"
  }
]
```

## Slide rules

- Parses `# Section: …` blocks from markdown
- Splits long sections into multiple slides (max ~6 bullets per slide)
- Adds **assignment** slides when submission/upload is required
- Adds **quiz** slides (intro + one slide per question)
- Adds **completion** slide at end
- Dark background (`#1A1A1A`), green headings (`#9CCB5A`), white body text
- Screenshot/GIF placeholders on visual and assignment slides

## Updating content

1. Edit `course-content/lesson-4.md` (or the structured markdown in `Mortar Masters Online Course/Lesson 4/`)
2. Re-run `npm run export:lesson-4`
3. Use `exports/lesson-4/manifest.json` to import slides into Mortar Course Builder in order

## Troubleshooting

| Issue | Fix |
|--------|-----|
| PNG export fails | Install PowerPoint or LibreOffice; on Windows, PowerPoint is used automatically |
| Only one PNG from LibreOffice | Use PowerPoint export script (included) for per-slide PNGs |
| Missing sections | Ensure sections use `# Section: Title` heading format |
