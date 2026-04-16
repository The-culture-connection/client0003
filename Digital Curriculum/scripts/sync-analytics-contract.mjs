/**
 * When the Digital Curriculum app is built inside the full monorepo, copy the canonical
 * analytics contract from `functions/src/analytics` into `src/mortar-analytics-contract/`.
 *
 * On Railway (or any context where only the `Digital Curriculum/` tree is present),
 * `../functions` does not exist — we skip copy and rely on the committed vendor files.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const digitalCurriculumRoot = path.resolve(__dirname, "..");
const monorepoFunctionsAnalytics = path.resolve(
  digitalCurriculumRoot,
  "..",
  "functions",
  "src",
  "analytics"
);
const destDir = path.join(digitalCurriculumRoot, "src", "mortar-analytics-contract");
const files = ["mortarAnalyticsContract.ts", "webAnalyticsEventRegistry.ts"];

const srcContract = path.join(monorepoFunctionsAnalytics, "mortarAnalyticsContract.ts");
if (!fs.existsSync(srcContract)) {
  console.log(
    "[sync-analytics-contract] Monorepo functions/src/analytics not found — using committed src/mortar-analytics-contract (Railway / standalone build)."
  );
  process.exit(0);
}

fs.mkdirSync(destDir, { recursive: true });
for (const f of files) {
  const from = path.join(monorepoFunctionsAnalytics, f);
  const to = path.join(destDir, f);
  fs.copyFileSync(from, to);
}
console.log(
  "[sync-analytics-contract] Copied mortarAnalyticsContract + webAnalyticsEventRegistry from functions/ → src/mortar-analytics-contract/"
);
