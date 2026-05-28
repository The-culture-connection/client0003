import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Export PPTX slides to PNG and rename to manifest file names.
 * @param {string} pptxPath
 * @param {string} pngDir
 * @param {import('./types.js').MigrationSlide[]} slides
 */
export async function exportPngSlides(pptxPath, pngDir, slides) {
  fs.mkdirSync(pngDir, { recursive: true });

  const existing = fs.readdirSync(pngDir).filter((f) => /\.png$/i.test(f));
  for (const f of existing) fs.unlinkSync(path.join(pngDir, f));

  // Prefer PowerPoint on Windows for per-slide PNG export.
  const method =
    (process.platform === "win32" ? tryPowerPoint(pptxPath, pngDir) : null) ??
    tryLibreOffice(pptxPath, pngDir) ??
    tryPowerPoint(pptxPath, pngDir);

  if (!method) {
    throw new Error(
      "PNG export failed. Install LibreOffice (soffice) or Microsoft PowerPoint, then re-run."
    );
  }

  renameExportedSlides(pngDir, slides, method);
  console.log(`PNG export complete via ${method}.`);
}

function tryLibreOffice(pptxPath, pngDir) {
  const candidates = [
    process.env.SOFFICE_PATH,
    "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
    "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
    "soffice",
  ].filter(Boolean);

  for (const bin of candidates) {
    const result = spawnSync(
      bin,
      ["--headless", "--convert-to", "png", "--outdir", pngDir, pptxPath],
      { encoding: "utf8", windowsHide: true }
    );
    if (result.status === 0 && hasAnyPng(pngDir)) {
      return "libreoffice";
    }
  }
  return null;
}

function tryPowerPoint(pptxPath, pngDir) {
  const psScript = path.join(__dirname, "..", "scripts", "export-png-pptx.ps1");
  if (!fs.existsSync(psScript)) return null;

  const result = spawnSync(
    "powershell",
    ["-ExecutionPolicy", "Bypass", "-File", psScript, "-PptxPath", pptxPath, "-OutDir", pngDir],
    { encoding: "utf8", windowsHide: true }
  );

  if (result.status === 0 && hasAnyPng(pngDir)) {
    return "powerpoint";
  }
  if (result.stderr) console.warn(result.stderr);
  return null;
}

function hasAnyPng(dir) {
  return fs.readdirSync(dir).some((f) => /\.png$/i.test(f));
}

/**
 * LibreOffice may emit one PNG or SlideN.PNG; PowerPoint emits SlideN.PNG.
 */
function renameExportedSlides(pngDir, slides, method) {
  let files = fs
    .readdirSync(pngDir)
    .filter((f) => /\.png$/i.test(f))
    .sort((a, b) => sortSlideFiles(a, b));

  if (files.length === 1 && slides.length > 1 && method === "libreoffice") {
    console.warn(
      "LibreOffice produced a single PNG. Use PowerPoint export for per-slide PNGs, or install Impress export filters."
    );
    const only = files[0];
    const target = path.join(pngDir, slides[0].fileName);
    fs.renameSync(path.join(pngDir, only), target);
    return;
  }

  if (files.length < slides.length) {
    console.warn(`Expected ${slides.length} PNG files, found ${files.length}.`);
  }

  const count = Math.min(files.length, slides.length);
  for (let i = 0; i < count; i++) {
    const src = path.join(pngDir, files[i]);
    const dest = path.join(pngDir, slides[i].fileName);
    if (path.resolve(src) !== path.resolve(dest)) {
      fs.renameSync(src, dest);
    }
  }

  files = fs.readdirSync(pngDir).filter((f) => /\.png$/i.test(f));
  const keep = new Set(slides.map((s) => s.fileName));
  for (const f of files) {
    if (!keep.has(f)) fs.unlinkSync(path.join(pngDir, f));
  }
}

function sortSlideFiles(a, b) {
  const na = a.match(/(\d+)/);
  const nb = b.match(/(\d+)/);
  if (na && nb) return Number(na[1]) - Number(nb[1]);
  return a.localeCompare(b);
}
