import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSlides } from "./build-slides.js";
import { exportPngSlides } from "./export-png.js";
import { generatePptx } from "./generate-pptx.js";
import { parseLessonMarkdown } from "./parse-lesson-markdown.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../..");

function parseArgs() {
  const args = process.argv.slice(2);
  let lesson = "4";
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--lesson" && args[i + 1]) lesson = args[++i];
    if (args[i] === "--input" && args[i + 1]) return { lesson, input: args[++i] };
  }
  return { lesson, input: null };
}

async function main() {
  const { lesson, input } = parseArgs();
  const lessonSlug = `lesson-${lesson}`;

  const markdownPath =
    input ?? path.join(REPO_ROOT, "course-content", `${lessonSlug}.md`);

  if (!fs.existsSync(markdownPath)) {
    console.error(`Markdown not found: ${markdownPath}`);
    process.exit(1);
  }

  const exportDir = path.join(REPO_ROOT, "exports", lessonSlug);
  const pngDir = path.join(exportDir, "png");
  const pptxPath = path.join(exportDir, `${lessonSlug}-migration.pptx`);
  const manifestPath = path.join(exportDir, "manifest.json");

  fs.mkdirSync(exportDir, { recursive: true });

  const markdown = fs.readFileSync(markdownPath, "utf8");
  const parsed = parseLessonMarkdown(markdown);
  const slides = buildSlides(parsed);

  console.log(`Parsed ${parsed.sections.length} sections → ${slides.length} slides`);
  console.log(`Writing ${pptxPath}`);

  await generatePptx(slides, pptxPath);

  await exportPngSlides(pptxPath, pngDir, slides);

  const manifest = slides.map((s) => ({
    slideNumber: s.slideNumber,
    fileName: s.fileName,
    sectionId: s.sectionId,
    title: s.title,
    type: s.type,
    sourceMarkdownHeading: s.sourceMarkdownHeading,
    layout: s.layout,
    lessonOrder: parsed.sections.find((sec) => sec.sourceMarkdownHeading === s.sourceMarkdownHeading)?.lessonOrder,
  }));

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

  console.log("\nDone.");
  console.log(`  PPTX:     ${pptxPath}`);
  console.log(`  PNG dir:  ${pngDir}`);
  console.log(`  Manifest: ${manifestPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
