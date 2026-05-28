import { extractContentBlocks, parseQuizQuestions } from "./parse-lesson-markdown.js";

const MAX_BULLETS_PER_SLIDE = 6;
const MAX_CHARS_PER_BODY = 420;

/**
 * @param {{ lessonTitle: string, lessonId: string, sections: import('./parse-lesson-markdown.js').ParsedSection[] }} parsed
 * @returns {import('./types.js').MigrationSlide[]}
 */
export function buildSlides(parsed) {
  /** @type {import('./types.js').MigrationSlide[]} */
  const slides = [];
  let slideNumber = 0;

  const push = (slide) => {
    slideNumber += 1;
    slides.push({
      ...slide,
      slideNumber,
      fileName: `slide-${String(slideNumber).padStart(3, "0")}-${slide.sectionId}.png`,
    });
  };

  push({
    sectionId: "lesson-overview",
    title: `Lesson 4 — ${parsed.lessonTitle}`,
    type: "lesson_overview",
    sourceMarkdownHeading: `# Lesson 4 — ${parsed.lessonTitle}`,
    layout: "title",
    subtitle: "Mortar Masters Online — Migration Export",
    bullets: [`Lesson ID: ${parsed.lessonId}`, "Source: course-content/lesson-4.md"],
    showPlaceholder: false,
  });

  for (const section of parsed.sections) {
    if (section.title.toLowerCase().includes("lesson 4 quiz")) {
      buildQuizSlides(section, push);
      continue;
    }

    buildSectionSlides(section, push);
  }

  return slides;
}

/**
 * @param {import('./parse-lesson-markdown.js').ParsedSection} section
 * @param {(s: Omit<import('./types.js').MigrationSlide, 'slideNumber'|'fileName'>) => void} push
 */
function buildSectionSlides(section, push) {
  const { fields, contentType, title, sectionId, sourceMarkdownHeading } = section;

  if (contentType === "completion") {
    push({
      sectionId,
      title,
      type: "completion",
      sourceMarkdownHeading,
      layout: "completion",
      headline: fields.mainHeading ?? title,
      body: "Congratulations — you completed Lesson 4: Fade In.",
      showPlaceholder: true,
      placeholderLabel: "Celebration GIF / confetti (upload later)",
    });
    return;
  }

  if (contentType === "video_intro" || contentType === "video_panel") {
    push({
      sectionId,
      title,
      type: contentType,
      sourceMarkdownHeading,
      layout: "video",
      headline: fields.headline ?? fields.title ?? title,
      body: extractLeadParagraph(section.body),
      videoUrl: fields.videoUrl,
      videoTitle: fields.videoTitle,
      showPlaceholder: true,
      placeholderLabel: "Embedded video + UI screenshot",
    });
    return;
  }

  if (contentType === "lesson_cover" || contentType === "section_banner") {
    push({
      sectionId,
      title,
      type: contentType,
      sourceMarkdownHeading,
      layout: "visual",
      headline: fields.title ?? title,
      body: fields.subtitle ?? "",
      showPlaceholder: true,
      placeholderLabel: "Brand / cover artwork (PNG or GIF)",
    });
    return;
  }

  if (contentType === "entrepreneur_spotlight") {
    push({
      sectionId: `${sectionId}-header`,
      title: `${title} — Quote`,
      type: "entrepreneur_spotlight",
      sourceMarkdownHeading,
      layout: "quote",
      headline: fields.quote ?? title,
      body: "Brian Girton — ReStory Studios",
      showPlaceholder: true,
      placeholderLabel: "Spotlight banner + polaroid image",
    });
    const storyBlocks = extractContentBlocks(section.body);
    chunkArray([...storyBlocks.bullets, ...storyBlocks.paragraphs], MAX_BULLETS_PER_SLIDE).forEach(
      (chunk, i) => {
        push({
          sectionId: `${sectionId}-story-${i + 1}`,
          title: `${title} — Story ${i + 1}`,
          type: "entrepreneur_spotlight",
          sourceMarkdownHeading,
          layout: "content",
          bullets: chunk,
          showPlaceholder: i === 0,
          placeholderLabel: "Long-form story screenshot",
        });
      }
    );
    return;
  }

  const isAssignment =
    contentType === "assignment" ||
    contentType === "writing_exercise" ||
    contentType === "worksheet" ||
    fields.interactionType?.toLowerCase().includes("assignment") ||
    fields.interactionType?.toLowerCase().includes("submission");

  const lead = fields.headline ?? fields.mainHeading ?? fields.title ?? title;
  const prompt = fields.prompt;

  push({
    sectionId: `${sectionId}-intro`,
    title,
    type: contentType,
    sourceMarkdownHeading,
    layout: "section_intro",
    headline: lead,
    body: prompt ?? extractLeadParagraph(section.body),
    showPlaceholder: !isAssignment,
    placeholderLabel: "Course screen capture",
  });

  const { bullets, paragraphs } = extractContentBlocks(section.body);
  const contentItems = [...bullets, ...paragraphs].filter(
    (b) => b.length > 0 && !b.toLowerCase().startsWith("type")
  );

  if (contentItems.length > 0) {
    chunkArray(contentItems, MAX_BULLETS_PER_SLIDE).forEach((chunk, i) => {
      push({
        sectionId: `${sectionId}-content-${i + 1}`,
        title: `${title} — Part ${i + 1}`,
        type: contentType,
        sourceMarkdownHeading,
        layout: "content",
        bullets: chunk,
        showPlaceholder: false,
      });
    });
  }

  if (isAssignment) {
    push({
      sectionId: `${sectionId}-assignment`,
      title: `${title} — Assignment`,
      type: "assignment",
      sourceMarkdownHeading,
      layout: "assignment",
      headline: "Assignment Submission",
      bullets: [
        "Upload your completed exercise",
        "One file maximum",
        "Max file size: 100 MB",
        "Accepted: device upload, Google Drive, Dropbox, OneDrive, or link",
      ],
      body: prompt ?? fields.prompt ?? "Complete and upload your work before continuing.",
      showPlaceholder: true,
      placeholderLabel: "Upload UI / assignment block",
    });
  }
}

function buildQuizSlides(section, push) {
  const questions = parseQuizQuestions(section.body);

  push({
    sectionId: "lesson-4-quiz-intro",
    title: "Lesson 4 Quiz",
    type: "quiz_intro",
    sourceMarkdownHeading: section.sourceMarkdownHeading,
    layout: "quiz_intro",
    headline: "Lesson 4 Quiz",
    body: `${questions.length} multiple-choice questions. Select one answer per question.`,
    showPlaceholder: false,
  });

  for (const q of questions) {
    push({
      sectionId: `quiz-q${q.number}`,
      title: `Quiz Question ${q.number}`,
      type: "quiz_question",
      sourceMarkdownHeading: `# Question ${q.number}`,
      layout: "quiz",
      headline: `Question ${q.number}`,
      body: q.prompt,
      bullets: q.choices.length > 0 ? q.choices : undefined,
      correctAnswer: q.correctAnswer,
      showPlaceholder: true,
      placeholderLabel: "Quiz UI screenshot (optional)",
    });
  }
}

function extractLeadParagraph(body) {
  const { paragraphs } = extractContentBlocks(body);
  return paragraphs[0] ?? "";
}

function chunkArray(arr, size) {
  if (arr.length === 0) return [];
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
