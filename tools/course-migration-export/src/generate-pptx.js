import pptxgen from "pptxgenjs";

/** Mortar cinematic palette */
const COLORS = {
  bg: "1A1A1A",
  bgCard: "242424",
  accent: "9CCB5A",
  white: "FFFFFF",
  muted: "CCCCCC",
  placeholderBorder: "5A7A32",
};

/**
 * @param {import('./types.js').MigrationSlide[]} slides
 * @param {string} outputPath
 */
export async function generatePptx(slides, outputPath) {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "Mortar Course Migration Export";
  pres.title = "Lesson 4 — Fade In";

  for (const slide of slides) {
    const s = pres.addSlide();
    s.background = { color: COLORS.bg };

    addFooter(s, slide);

    switch (slide.layout) {
      case "title":
        renderTitleSlide(s, slide);
        break;
      case "completion":
        renderCompletionSlide(s, slide);
        break;
      case "video":
        renderVideoSlide(s, slide);
        break;
      case "visual":
      case "quote":
        renderVisualSlide(s, slide);
        break;
      case "assignment":
        renderAssignmentSlide(s, slide);
        break;
      case "quiz_intro":
      case "quiz":
        renderQuizSlide(s, slide);
        break;
      default:
        renderContentSlide(s, slide);
    }

    if (slide.showPlaceholder) {
      addPlaceholder(s, slide.placeholderLabel ?? "Screenshot / GIF placeholder");
    }
  }

  await pres.writeFile({ fileName: outputPath });
}

function addFooter(slide, meta) {
  slide.addText(`Slide ${meta.slideNumber} · ${meta.sectionId}`, {
    x: 0.4,
    y: 5.2,
    w: 9,
    h: 0.3,
    fontSize: 9,
    color: COLORS.muted,
  });
}

function addPlaceholder(slide, label) {
  slide.addShape("rect", {
    x: 6.8,
    y: 3.6,
    w: 2.8,
    h: 1.5,
    fill: { color: COLORS.bgCard },
    line: { color: COLORS.placeholderBorder, width: 1, dashType: "dash" },
  });
  slide.addText(label, {
    x: 6.85,
    y: 4.15,
    w: 2.7,
    h: 0.5,
    fontSize: 10,
    color: COLORS.muted,
    align: "center",
    valign: "mid",
  });
}

function renderTitleSlide(slide, data) {
  slide.addText(data.title, {
    x: 0.6,
    y: 1.8,
    w: 8.8,
    h: 1.2,
    fontSize: 40,
    bold: true,
    color: COLORS.accent,
  });
  if (data.subtitle) {
    slide.addText(data.subtitle, {
      x: 0.6,
      y: 3.1,
      w: 8.5,
      h: 0.8,
      fontSize: 20,
      color: COLORS.white,
    });
  }
  if (data.bullets?.length) {
    slide.addText(data.bullets.map((b) => `• ${b}`).join("\n"), {
      x: 0.6,
      y: 4.0,
      w: 8,
      h: 1.2,
      fontSize: 14,
      color: COLORS.muted,
    });
  }
}

function renderContentSlide(slide, data) {
  const headline = data.headline ?? data.title;
  slide.addText(headline, {
    x: 0.55,
    y: 0.45,
    w: 8.8,
    h: 0.9,
    fontSize: 28,
    bold: true,
    color: COLORS.accent,
  });

  const bodyParts = [];
  if (data.body) bodyParts.push(data.body);
  if (data.bullets?.length) bodyParts.push(data.bullets.map((b) => `• ${b}`).join("\n"));

  if (bodyParts.length) {
    slide.addText(bodyParts.join("\n\n"), {
      x: 0.55,
      y: 1.45,
      w: data.showPlaceholder ? 6.0 : 8.8,
      h: 3.8,
      fontSize: 16,
      color: COLORS.white,
      valign: "top",
      lineSpacingMultiple: 1.15,
    });
  }

  if (data.videoUrl) {
    slide.addText(`Video: ${data.videoUrl}`, {
      x: 0.55,
      y: 5.0,
      w: 6,
      h: 0.35,
      fontSize: 10,
      color: COLORS.muted,
    });
  }
}

function renderVideoSlide(slide, data) {
  renderContentSlide(slide, data);
  if (data.videoTitle) {
    slide.addShape("rect", {
      x: 0.55,
      y: 4.55,
      w: 6.0,
      h: 0.55,
      fill: { color: COLORS.bgCard },
      line: { color: COLORS.accent, width: 0.5 },
    });
    slide.addText(`▶ ${data.videoTitle}`, {
      x: 0.7,
      y: 4.62,
      w: 5.7,
      h: 0.4,
      fontSize: 12,
      color: COLORS.accent,
    });
  }
}

function renderVisualSlide(slide, data) {
  slide.addText(data.headline ?? data.title, {
    x: 0.55,
    y: 2.0,
    w: 8.5,
    h: 1.5,
    fontSize: 44,
    bold: true,
    color: COLORS.accent,
    align: "center",
  });
  if (data.body) {
    slide.addText(data.body, {
      x: 0.8,
      y: 3.6,
      w: 8.0,
      h: 1.0,
      fontSize: 20,
      color: COLORS.white,
      align: "center",
    });
  }
}

function renderAssignmentSlide(slide, data) {
  slide.addShape("rect", {
    x: 0.5,
    y: 0.4,
    w: 9.0,
    h: 1.0,
    fill: { color: COLORS.accent },
  });
  slide.addText(data.headline ?? "Assignment Submission", {
    x: 0.65,
    y: 0.55,
    w: 8.7,
    h: 0.7,
    fontSize: 24,
    bold: true,
    color: COLORS.bg,
  });

  const bullets = data.bullets ?? [];
  slide.addText(bullets.map((b) => `• ${b}`).join("\n"), {
    x: 0.6,
    y: 1.7,
    w: 6.0,
    h: 2.8,
    fontSize: 17,
    color: COLORS.white,
  });

  if (data.body) {
    slide.addText(data.body, {
      x: 0.6,
      y: 4.55,
      w: 8.5,
      h: 0.7,
      fontSize: 14,
      italic: true,
      color: COLORS.muted,
    });
  }
}

function renderQuizSlide(slide, data) {
  slide.addText(data.headline ?? "Quiz", {
    x: 0.55,
    y: 0.5,
    w: 8.8,
    h: 0.7,
    fontSize: 30,
    bold: true,
    color: COLORS.accent,
  });

  if (data.body) {
    slide.addText(data.body, {
      x: 0.55,
      y: 1.35,
      w: data.showPlaceholder ? 6.0 : 8.8,
      h: 1.5,
      fontSize: 18,
      color: COLORS.white,
    });
  }

  if (data.bullets?.length) {
    slide.addText(data.bullets.join("\n"), {
      x: 0.7,
      y: 2.9,
      w: 5.8,
      h: 2.0,
      fontSize: 16,
      color: COLORS.white,
    });
  }

  if (data.correctAnswer) {
    slide.addText(`Correct answer: ${data.correctAnswer}`, {
      x: 0.55,
      y: 5.0,
      w: 8,
      h: 0.35,
      fontSize: 11,
      color: COLORS.muted,
    });
  }
}

function renderCompletionSlide(slide, data) {
  slide.addText("🎉", {
    x: 0.55,
    y: 1.2,
    w: 1,
    h: 1,
    fontSize: 54,
  });
  slide.addText(data.headline ?? data.title, {
    x: 0.55,
    y: 2.2,
    w: 8.8,
    h: 1.4,
    fontSize: 34,
    bold: true,
    color: COLORS.accent,
  });
  slide.addText(data.body ?? "", {
    x: 0.55,
    y: 3.7,
    w: 8.5,
    h: 1.0,
    fontSize: 20,
    color: COLORS.white,
  });
}
