/**
 * Shared helpers for content migration: fetch a Thinkific chapter's full content
 * (via the authenticated course-player API) and map it to MORTAR shapes.
 */

const { ThinkificClient } = require("./thinkific-client");
const { ThinkificPlayer, sleep } = require("./thinkific-player");

const SPACING = 300;

// Map Thinkific contentable_type -> course-player endpoint segment.
const SEG = {
  HtmlItem: "html_items",
  Survey: "surveys",
  Quiz: "quizzes",
  Assignment: "assignments",
  Download: "downloads",
  Video: "videos",
  Multimedia: "multimedia",
  Lesson: "lessons",
};

// ── HTML helpers ─────────────────────────────────────────────────────────────

const ENTITIES = {
  "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"',
  "&#39;": "'", "&rsquo;": "’", "&lsquo;": "‘", "&ldquo;": "“",
  "&rdquo;": "”", "&mdash;": "—", "&ndash;": "–", "&hellip;": "…",
};

function decodeEntities(s) {
  return String(s || "").replace(/&[a-z#0-9]+;/gi, (m) => ENTITIES[m] ?? m);
}

/** Strip all HTML tags and collapse whitespace → plain text (for prompts/choices). */
function htmlToText(html) {
  return decodeEntities(
    String(html || "")
      .replace(/<style[\s\S]*?<\/style>/gi, "") // drop leaked CSS blocks
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<span class="count">\s*\d+\s*<\/span>/gi, "") // PlayerSnips list numbers
      .replace(/<\s*br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Remove PlayerSnips / SuperPowerUps popup widgets that won't render in MORTAR. */
function stripPlayerSnips(html) {
  return String(html || "")
    .replace(/<!--\s*PU-[\s\S]*?END PU-\d+\s*-->/gi, "")
    .replace(/<div class="ps-popup"[\s\S]*?<\/div>/gi, "")
    .trim();
}

/** True if the decoded `credited` token marks a quiz choice as correct. */
function isChoiceCorrect(credited) {
  try {
    return /true/i.test(Buffer.from(String(credited), "base64").toString("utf8"));
  } catch {
    return false;
  }
}

/** Extract clickable http(s) links from slide HTML → [{label, url}] (deduped). */
function extractLinks(html) {
  const out = [];
  const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    const url = m[1].replace(/&amp;/g, "&").trim();
    if (!/^https?:\/\//i.test(url)) continue;
    const label = htmlToText(m[2]).replace(/\s+/g, " ").trim();
    if (!label) continue;
    out.push({ label: label.slice(0, 60), url });
  }
  return out.filter((l, i) => out.findIndex((x) => x.url === l.url) === i);
}

/** Extract a YouTube video id from a watch/embed/youtu.be URL. */
function extractYouTubeId(url) {
  const m = String(url || "").match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return m ? m[1] : null;
}

/** True if a chunk of HTML has rendered content (visible text or a non-gif image). */
function htmlHasContent(html) {
  if (htmlToText(html)) return true;
  return /<img\b[^>]*src=/i.test(html); // a static image with no text still counts
}

/**
 * Split slide HTML into ordered segments, separating embedded media that must
 * NOT be screenshotted:
 *   { kind: "render", html }          → text + static images → render to PNG
 *   { kind: "video", videoId, url }   → YouTube embed → MORTAR video slide
 *   { kind: "gif", url }              → animated GIF → MORTAR image slide
 *   { kind: "unknown", html, note }   → unrecognized media → flagged
 * Order is preserved so a mixed page becomes a faithful sequence of slides.
 */
function htmlToSegments(html) {
  if (!html) return [];
  const tokenRe =
    /<iframe\b[^>]*>(?:[\s\S]*?<\/iframe>)?|<img\b[^>]*>|<video\b[\s\S]*?<\/video>/gi;
  const segs = [];
  let last = 0;
  let m;
  const pushHtml = (chunk) => {
    if (chunk && htmlHasContent(chunk)) segs.push({ kind: "render", html: chunk });
  };
  while ((m = tokenRe.exec(html))) {
    const tok = m[0];
    const srcMatch = tok.match(/src=["']([^"']+)["']/i);
    const src = srcMatch ? srcMatch[1].replace(/&amp;/g, "&") : "";

    if (/^<img/i.test(tok)) {
      if (/\.gif(\?|$|["'])/i.test(src)) {
        pushHtml(html.slice(last, m.index));
        segs.push({ kind: "gif", url: src });
        last = m.index + tok.length;
      }
      // non-gif <img> stays inline in the surrounding render chunk
      continue;
    }
    if (/^<iframe/i.test(tok)) {
      pushHtml(html.slice(last, m.index));
      const ytId = extractYouTubeId(src);
      if (ytId) segs.push({ kind: "video", provider: "youtube", videoId: ytId, url: src });
      // Gap-fix 1.2: Thinkific-hosted media player embeds (Wistia-backed).
      // Classified 2026-07-20: all 11 unknowns in this course are
      // /api/course_player/v2/contents/{id}/play/{mediaId} lesson-intro videos.
      // migrate-lesson.js resolves the Wistia id and re-hosts via wistia-map.json.
      else if (/\/api\/course_player\/v2\/contents\/\d+\/play\//.test(src))
        segs.push({ kind: "thinkific_video", url: src });
      else segs.push({ kind: "unknown", html: tok, note: `iframe ${src || "(no src)"}` });
      last = m.index + tok.length;
      continue;
    }
    if (/^<video/i.test(tok)) {
      pushHtml(html.slice(last, m.index));
      const fileSrc = src || (tok.match(/<source[^>]*src=["']([^"']+)["']/i) || [])[1] || "";
      segs.push({ kind: "unknown", html: tok, note: `hosted <video> ${fileSrc}` });
      last = m.index + tok.length;
      continue;
    }
  }
  pushHtml(html.slice(last));
  return segs;
}

// ── Fetch ────────────────────────────────────────────────────────────────────

/**
 * Fetch a chapter's ordered content items, each expanded with its contentable
 * body. Returns [{ content, type, body }].
 */
async function fetchChapterItems(chapterId) {
  const api = new ThinkificClient();
  const player = new ThinkificPlayer();

  const chapter = await api.getChapter(chapterId);
  const contentIds = chapter.content_ids || [];
  const items = [];
  for (const cid of contentIds) {
    await sleep(SPACING);
    const meta = (await player.content(cid)).content;
    if (!meta) {
      // Draft/removed items can return { content: null } — skip (they're
      // excluded by the global draft skip anyway).
      console.warn(`  (content ${cid} returned null meta — skipped; draft or removed in Thinkific)`);
      continue;
    }
    const seg = SEG[meta.contentable_type];
    let body = null;
    if (seg && meta.contentable_id) {
      await sleep(SPACING);
      try {
        body = await player.get(`/api/course_player/v2/${seg}/${meta.contentable_id}`);
      } catch (e) {
        body = { __error: e.message };
      }
    }
    items.push({ content: meta, type: meta.contentable_type, body });
  }
  return { chapter, items };
}

// ── Map Thinkific items → MORTAR payloads ────────────────────────────────────

/**
 * Convert ordered Thinkific items into MORTAR media-lesson payloads:
 *   { slides[], checkpoints[], quiz|null, flags[] }
 * - HtmlItem / Download  -> html slide
 * - Survey / Assignment  -> survey checkpoint anchored after the current slide
 * - Quiz                 -> the lesson's single LessonQuiz
 */
function mapItemsToMortar(items, opts = {}) {
  const slides = [];
  const checkpoints = [];
  const flags = [];
  let quiz = null;
  // Per-lesson manual edits: drop specific source slides by name.
  const skipNames = new Set((opts.skipContentNames || []).map((s) => s.toLowerCase().trim()));

  // Expand a content item's HTML into ordered media-aware slides.
  const pushSegments = (html, name) => {
    const segs = htmlToSegments(stripPlayerSnips(html || ""));
    let part = 0;
    for (const seg of segs) {
      const label = segs.length > 1 ? `${name} (${++part})` : name;
      if (seg.kind === "render") {
        if (/flip-card/.test(seg.html))
          flags.push(`Slide "${label}" has interactive flip-cards — static render flattens them (front+back shown); may want manual polish.`);
        slides.push({ kind: "render", html: seg.html, _name: label, links: extractLinks(seg.html) });
      }
      else if (seg.kind === "video")
        slides.push({ kind: "video", provider: seg.provider, videoId: seg.videoId, url: seg.url, _name: label });
      else if (seg.kind === "thinkific_video")
        slides.push({ kind: "thinkific_video", url: seg.url, _name: label });
      else if (seg.kind === "gif") slides.push({ kind: "gif", url: seg.url, _name: label });
      else flags.push(`Unrecognized media in "${name}" → ${seg.note}. NEEDS REVIEW (not migrated).`);
    }
  };

  for (const it of items) {
    const name = it.content.name || it.type;
    // Gap-fix 1.5: globally skip draft items (not visible to learners in Thinkific).
    if (it.content.draft === true) {
      flags.push(`Slide "${name}" is draft in Thinkific → skipped (global draft skip).`);
      continue;
    }
    if (skipNames.has(name.toLowerCase().trim())) {
      flags.push(`Slide "${name}" dropped per manual override.`);
      continue;
    }
    const afterSlideIndex = slides.length - 1; // checkpoint shows after the last slide so far

    if (it.type === "HtmlItem") {
      pushSegments(it.body?.html_item?.html_text || "", name);
      continue;
    }

    if (it.type === "Download") {
      const d = it.body?.download || {};
      const files = it.body?.download_files || [];
      const links = files
        .map((f) => `<p><a href="${f.download_url}" target="_blank" rel="noopener">⬇ ${htmlToText(f.label || f.file_name || "Download")}</a></p>`)
        .join("");
      const before = slides.length;
      pushSegments((d.html_description || "") + links, name);
      // Gap-fix 1.1: mark download files for re-hosting at write time (the
      // Thinkific download_url is signed and expires). migrate-lesson.js
      // fetches each file, uploads it to Storage, and swaps the URL in the
      // slide html + link buttons before rendering.
      const dlMeta = files.map((f, i) => ({
        url: f.download_url,
        file_name: String(f.file_name || f.label || `download_${i}`).replace(/[^\w.\-]+/g, "_"),
        label: htmlToText(f.label || f.file_name || "Download"),
      }));
      for (let si = before; si < slides.length; si++) {
        const s = slides[si];
        if (s.kind !== "render") continue;
        const mine = dlMeta.filter((m) => s.html.includes(m.url));
        if (mine.length) s._downloads = mine;
      }
      continue;
    }

    if (it.type === "Assignment") {
      const a = it.body?.assignment || {};
      const raw = a.assignment_content || "";

      // "Putting In Work" items are take-home activities / external resources,
      // not in-app survey questions → render as informational slide(s).
      if (/putting in work/i.test(name)) {
        pushSegments(raw, name);
        flags.push(`Assignment "${name}" → informational slide (take-home activity), not a survey.`);
        continue;
      }

      // Thinkific assignments take a SINGLE free-text response → one survey
      // question carrying the full cleaned prompt (faithful + avoids mis-splitting).
      const prompt = htmlToText(stripPlayerSnips(raw)) || name;
      checkpoints.push({
        id: `tk_assignment_${it.content.id}`,
        enabled: true,
        title: a.title || name,
        afterSlideIndex,
        order: checkpoints.length,
        questions: [{ order: 0, question: prompt }],
        generatePdfOnComplete: true,
        _source: "Assignment",
      });
      continue;
    }

    if (it.type === "Survey") {
      const qs = (it.body?.survey_questions || []).sort((x, y) => x.position - y.position);
      const choicesByQ = {};
      for (const ch of it.body?.survey_choices || []) {
        (choicesByQ[ch.survey_question_id] ||= []).push(ch);
      }
      // MORTAR surveys are free-text: keep only the question prompt, drop the
      // Thinkific multiple-choice options (per migration decision).
      const questions = qs.map((q, i) => ({ order: i, question: htmlToText(q.prompt) }));
      if (qs.some((q) => (choicesByQ[q.id] || []).length)) {
        flags.push(`Survey "${name}" had multiple-choice options → dropped; question kept as free-text.`);
      }
      checkpoints.push({
        id: `tk_survey_${it.content.id}`,
        enabled: true,
        title: name,
        afterSlideIndex,
        order: checkpoints.length,
        questions,
        generatePdfOnComplete: true,
        _source: "Survey",
      });
      continue;
    }

    if (it.type === "Quiz") {
      if (quiz) {
        flags.push(`Lesson has more than one Quiz ("${name}") — MORTAR supports one quiz per lesson; extra quiz skipped.`);
        continue;
      }
      const q = it.body?.quiz || {};
      const choicesByQ = {};
      for (const ch of it.body?.choices || []) {
        (choicesByQ[ch.question_id] ||= []).push(ch);
      }
      const questions = (it.body?.questions || [])
        .sort((a, b) => a.position - b.position)
        .map((qq, i) => {
          const choices = (choicesByQ[qq.id] || []).sort((a, b) => a.position - b.position);
          const correctIdxs = choices
            .map((c, idx) => (isChoiceCorrect(c.credited) ? idx : -1))
            .filter((x) => x >= 0);
          if (choices.length > 4) flags.push(`Quiz "${name}" Q${i + 1} has ${choices.length} options — MORTAR supports 4; extra options dropped. NEEDS REVIEW.`);
          if (qq.display_type !== "radio" || correctIdxs.length !== 1) flags.push(`Quiz "${name}" Q${i + 1} is multi-answer or has ${correctIdxs.length} correct — MORTAR supports single-answer; review.`);
          const letters = ["A", "B", "C", "D"];
          const opt = { optionA: "", optionB: "", optionC: "", optionD: "" };
          choices.slice(0, 4).forEach((c, idx) => { opt["option" + letters[idx]] = htmlToText(c.text); });
          const correct = correctIdxs.length ? letters[Math.min(correctIdxs[0], 3)] : "A";
          return { order: i, question: htmlToText(qq.prompt), ...opt, correctAnswer: correct };
        });
      quiz = {
        enabled: true,
        maxAttempts: 3, // Thinkific doesn't expose this — default; adjust if needed
        passPercentage: typeof q.passing_score === "number" ? q.passing_score : 100,
        questions,
      };
      continue;
    }

    // Video / Multimedia / unknown → flag, skip for now
    flags.push(`Unhandled content type "${it.type}" ("${name}") — skipped.`);
  }

  return { slides, checkpoints, quiz, flags };
}

module.exports = {
  fetchChapterItems,
  mapItemsToMortar,
  htmlToText,
  stripPlayerSnips,
  isChoiceCorrect,
};
