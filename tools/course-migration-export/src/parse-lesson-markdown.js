/**
 * Parse structured lesson markdown (# Section: ...) into section objects.
 */

const SKIP_SECTIONS = new Set([
  "design system notes",
  "suggested json structure",
  "additional structured json",
  "additional structured metadata",
  "quiz structure",
  "quiz ui characteristics",
]);

/**
 * @param {string} markdown
 * @returns {{ lessonTitle: string, lessonId: string, sections: import('./types.js').ParsedSection[] }}
 */
export function parseLessonMarkdown(markdown) {
  const lessonTitleMatch = markdown.match(/^#\s+Lesson\s+(\d+)\s*[—–-]\s*(.+)$/m);
  const lessonNum = lessonTitleMatch?.[1] ?? "4";
  const lessonTitle = lessonTitleMatch?.[2]?.trim() ?? "Fade In";

  const metaId = markdown.match(/Lesson ID:\s*(\S+)/i)?.[1];
  const lessonId = metaId ?? `L${lessonNum}`;

  const rawParts = markdown.split(/^#\s+Section:\s*/m).slice(1);
  const sections = [];

  for (const part of rawParts) {
    const firstNewline = part.indexOf("\n");
    const title = (firstNewline === -1 ? part : part.slice(0, firstNewline)).trim();
    const body = (firstNewline === -1 ? "" : part.slice(firstNewline + 1)).trim();

    if (!title || SKIP_SECTIONS.has(title.toLowerCase())) continue;
    if (body.startsWith("```")) continue;

    const fields = extractFields(body);
    const sectionId = slugifySectionId(title);
    const contentType = inferContentType(title, fields);

    sections.push({
      title,
      sectionId,
      body,
      fields,
      contentType,
      sourceMarkdownHeading: `# Section: ${title}`,
      lessonOrder: sections.length + 1,
    });
  }

  return { lessonTitle, lessonId, lessonNum, sections };
}

function extractFields(body) {
  /** @type {Record<string, string>} */
  const fields = {};

  const typeMatch = body.match(/^##\s+Type\s*\n+([\s\S]*?)(?=\n##\s+|\n#\s+|$)/m);
  if (typeMatch) fields.type = typeMatch[1].trim();

  const headline = body.match(/^##\s+Headline\s*\n+([\s\S]*?)(?=\n##\s+|\n#\s+|$)/m);
  if (headline) fields.headline = headline[1].trim();

  const mainHeading = body.match(/^##\s+Main Heading\s*\n+([\s\S]*?)(?=\n##\s+|\n#\s+|$)/m);
  if (mainHeading) fields.mainHeading = mainHeading[1].trim();

  const titleField = body.match(/^##\s+Title\s*\n+([\s\S]*?)(?=\n##\s+|\n#\s+|$)/m);
  if (titleField) fields.title = titleField[1].trim();

  const quote = body.match(/^##\s+Quote\s*\n+([\s\S]*?)(?=\n##\s+|\n#\s+|$)/m);
  if (quote) fields.quote = quote[1].trim();

  const prompt = body.match(/^##\s+(?:Writing Prompt|Prompt|Core Prompt|Main Prompt)\s*\n+([\s\S]*?)(?=\n##\s+|\n#\s+|$)/m);
  if (prompt) fields.prompt = prompt[1].trim();

  const interaction = body.match(/^##\s+Interaction Type\s*\n+([\s\S]*?)(?=\n##\s+|\n#\s+|$)/m);
  if (interaction) fields.interactionType = interaction[1].trim();

  const mediaBlock = body.match(/^##\s+Media\s*\n+([\s\S]*?)(?=\n##\s+|\n#\s+|$)/m);
  if (mediaBlock) {
    const url = mediaBlock[1].match(/https?:\/\/[^\s)]+/);
    if (url) fields.videoUrl = url[0];
    const videoTitle = mediaBlock[1].match(/Title:\s*(.+)/);
    if (videoTitle) fields.videoTitle = videoTitle[1].trim();
  }

  return fields;
}

function inferContentType(title, fields) {
  const t = `${title} ${fields.type ?? ""}`.toLowerCase();

  if (title.toLowerCase().includes("quiz")) return "quiz";
  if (title.toLowerCase().includes("end of lesson")) return "completion";
  if (t.includes("video introduction") || title.toLowerCase() === "intro") return "video_intro";
  if (t.includes("visual cover")) return "lesson_cover";
  if (t.includes("assignment") || fields.interactionType?.toLowerCase().includes("assignment"))
    return "assignment";
  if (t.includes("quiz") || t.includes("knowledge assessment")) return "quiz_section";
  if (t.includes("writing exercise") || t.includes("reflection assignment")) return "writing_exercise";
  if (t.includes("worksheet") || t.includes("guided reflection")) return "worksheet";
  if (t.includes("storytelling") || t.includes("case study")) return "entrepreneur_spotlight";
  if (t.includes("visual divider")) return "section_banner";
  if (t.includes("panel discussion")) return "video_panel";
  if (t.includes("motivational summary")) return "summary";
  if (t.includes("instructional")) return "instructional_content";
  if (t.includes("customer") || t.includes("segmentation")) return "customer_analysis";
  if (t.includes("psychology") || t.includes("maslow")) return "educational_content";

  return "content_block";
}

export function slugifySectionId(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

/**
 * Extract bullet lines and paragraph blocks from section body for slide splitting.
 * @param {string} body
 */
export function extractContentBlocks(body) {
  const lines = body.split("\n");
  const bullets = [];
  const paragraphs = [];

  let paraBuf = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("```")) continue;
    if (/^#{1,6}\s/.test(trimmed)) {
      const headingText = trimmed.replace(/^#+\s*/, "");
      if (paraBuf.length) {
        paragraphs.push(paraBuf.join(" "));
        paraBuf = [];
      }
      bullets.push(headingText);
      continue;
    }
    if (/^[-*]\s+/.test(trimmed)) {
      if (paraBuf.length) {
        paragraphs.push(paraBuf.join(" "));
        paraBuf = [];
      }
      bullets.push(trimmed.replace(/^[-*]\s+/, ""));
      continue;
    }
    if (/^\d+\.\s+/.test(trimmed)) {
      if (paraBuf.length) {
        paragraphs.push(paraBuf.join(" "));
        paraBuf = [];
      }
      bullets.push(trimmed);
      continue;
    }
    paraBuf.push(trimmed);
  }
  if (paraBuf.length) paragraphs.push(paraBuf.join(" "));

  return { bullets, paragraphs };
}

/**
 * Parse quiz questions from Lesson 4 Quiz section body.
 * @param {string} body
 */
export function parseQuizQuestions(body) {
  const parts = body.split(/^#\s+Question\s+(\d+)\s*$/m).slice(1);
  const questions = [];

  for (let i = 0; i < parts.length; i += 2) {
    const num = parts[i];
    const qBody = parts[i + 1] ?? "";
    const prompt = qBody.match(/^##\s+Prompt\s*\n+([\s\S]*?)(?=\n##\s+|\n#\s+|$)/m)?.[1]?.trim();
    const correct = qBody.match(/^##\s+Correct Answer\s*\n+([\s\S]*?)(?=\n##\s+|\n#\s+|$)/m)?.[1]?.trim();
    const choicesBlock = qBody.match(/^##\s+Answer Choices\s*\n+([\s\S]*?)(?=\n##\s+Correct|\n#\s+|$)/m)?.[1];
    const choices = [];
    if (choicesBlock) {
      for (const line of choicesBlock.split("\n")) {
        const m = line.match(/^###\s+([A-D])\s*\n+(.+)/);
        if (m) choices.push(`${m[1]}) ${m[2].trim()}`);
        else if (/^[A-D]\)/.test(line.trim())) choices.push(line.trim());
      }
    }
    if (prompt) {
      questions.push({ number: Number(num), prompt, choices, correctAnswer: correct ?? "" });
    }
  }

  return questions;
}
