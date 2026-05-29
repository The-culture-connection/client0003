/**
 * Build manifest.json from lesson-N.config.json + export-meta.json
 */
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "../..");
const configPath =
  process.env.LESSON_CONFIG ||
  path.join(__dirname, process.argv[2] || "lesson-5.config.json");

function loadConfig() {
  const abs = path.isAbsolute(configPath)
    ? configPath
    : path.join(__dirname, configPath);
  if (!fs.existsSync(abs)) throw new Error(`Config not found: ${abs}`);
  return JSON.parse(fs.readFileSync(abs, "utf8"));
}

function afterScreenIndexBeforeMarker(markerSlide, playlist) {
  let idx = -1;
  for (let i = 0; i < playlist.length; i++) {
    const src = playlist[i].sourceSlide;
    if (src != null && src < markerSlide) idx = i;
  }
  return Math.max(0, idx);
}

function main() {
  const cfg = loadConfig();
  const exportDir = path.join(repoRoot, cfg.exportDir);
  const metaPath = path.join(exportDir, "export-meta.json");
  const manifestPath = path.join(exportDir, "manifest.json");

  const surveyUi = new Set(cfg.surveyUiSlides || []);
  const quizUi = cfg.quizUiSlide;
  const videoUi = cfg.videoUiSlides || {};
  const skipSlides = new Set([
    ...surveyUi,
    quizUi,
    ...Object.keys(videoUi).map(Number),
  ].filter(Boolean));

  const metaRaw = fs.readFileSync(metaPath, "utf8").replace(/^\uFEFF/, "");
  const meta = JSON.parse(metaRaw);
  const slidesByNum = new Map();
  for (const s of Array.isArray(meta) ? meta : [meta]) {
    slidesByNum.set(s.sourceSlide ?? s.screenNumber, s);
  }

  const playlist = [];
  let screenNumber = 0;
  const total = cfg.totalPptSlides;

  for (let pptSlide = 1; pptSlide <= total; pptSlide++) {
    if (surveyUi.has(pptSlide) || pptSlide === quizUi) continue;

    const videoOnly = videoUi[String(pptSlide)] || videoUi[pptSlide];
    if (videoOnly) {
      screenNumber++;
      playlist.push({
        screenNumber,
        sourceSlide: pptSlide,
        type: "video",
        youtubeId: videoOnly.youtubeId,
        videoUrl: videoOnly.videoUrl,
        caption: videoOnly.caption || "",
        skipCanvaPlaceholder: true,
      });
      continue;
    }

    const metaSlide = slidesByNum.get(pptSlide);
    if (!metaSlide) continue;

    screenNumber++;
    playlist.push({
      screenNumber,
      sourceSlide: pptSlide,
      fileName: metaSlide.fileName,
      type: "content",
      widthPx: metaSlide.widthPx,
      heightPx: metaSlide.heightPx,
    });
  }

  const surveys = (cfg.surveys || []).map((def, order) => ({
    id: `lesson${cfg.lessonNumber}_survey_${String(order + 1).padStart(2, "0")}`,
    enabled: true,
    title: def.title,
    afterScreenIndex: afterScreenIndexBeforeMarker(def.markerSlide, playlist),
    order,
    markerSlide: def.markerSlide,
    questions: def.questions.map((q, i) => ({
      order: i,
      question: typeof q === "string" ? q : q.question,
    })),
  }));

  const manifest = {
    version: 2,
    lessonId: cfg.lessonId || `L${cfg.lessonNumber}`,
    lessonTitle: cfg.lessonTitle,
    lessonNumber: cfg.lessonNumber,
    terminology: "screen",
    sourcePptx: cfg.sourcePptx,
    canvaUrl: cfg.canvaUrl,
    totalPptSlides: total,
    skippedSlides: [...skipSlides].sort((a, b) => a - b),
    skippedSurveyUiSlides: [...surveyUi].sort((a, b) => a - b),
    videoUiSlides: Object.keys(videoUi).map(Number).sort((a, b) => a - b),
    playlist,
    surveys,
    quiz: {
      ...cfg.quiz,
      canvaSlide: quizUi,
    },
    course: cfg.course,
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`Wrote ${manifestPath}`);
  console.log(
    `Playlist: ${playlist.length} (${playlist.filter((p) => p.type === "content").length} images, ${playlist.filter((p) => p.type === "video").length} videos)`
  );
  surveys.forEach((s) => {
    console.log(`  Survey "${s.title}" afterScreenIndex=${s.afterScreenIndex} (before UI slide ${s.markerSlide})`);
  });
}

main();
