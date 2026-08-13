/**
 * Admin → View profile → "Download data room (.zip)".
 *
 * Beta feedback (Admin · Panel → graduation view-profile): "Add their analytics
 * information and a way to download their data room as a zip." Reviewing an
 * alumni applicant meant opening each survey PDF in its own tab; this bundles
 * the whole picture — profile, analytics counters, certificates and every
 * survey PDF — into one file.
 *
 * Built in the browser with JSZip (already a dependency) rather than server-side,
 * because the admin is already authenticated for every source and no new
 * privileged endpoint is needed.
 *
 * NOTE: the PDFs are fetched from Firebase Storage, so the bucket's CORS
 * configuration must list the app's origin (see `cors.json` at the repo root and
 * `gsutil cors set`). Without it the metadata still exports and each failed file
 * is listed in `DOWNLOAD-ERRORS.txt` rather than failing the whole zip.
 */
import JSZip from "jszip";

export type DataRoomSurvey = {
  id: string;
  name: string;
  downloadUrl?: string;
  createdAt?: Date | null;
};

export type DataRoomInput = {
  userId: string;
  displayName: string;
  email: string;
  /** Raw `users/{uid}` document. */
  profile: Record<string, unknown> | null;
  /** Raw `user_analytics_summary/{uid}` document, when one exists. */
  analytics: Record<string, unknown> | null;
  certificates: unknown[];
  surveys: DataRoomSurvey[];
  /** Who ran the export, for the manifest. */
  exportedBy: string;
};

export type DataRoomResult = {
  blob: Blob;
  filename: string;
  /** Survey documents that could not be fetched, if any. */
  failed: { name: string; reason: string }[];
};

/** Filesystem-safe, collision-resistant name for a file inside the zip. */
function safeName(raw: string, fallback: string): string {
  const cleaned = raw
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > 0 ? cleaned.slice(0, 80) : fallback;
}

function stamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Firestore values (Timestamps, GeoPoints, DocumentReferences) don't survive
 * JSON.stringify usefully — a Timestamp becomes `{seconds, nanoseconds}`.
 * Convert the ones we care about into ISO strings so the export is readable.
 */
function toPlainJson(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return null;
  if (depth > 12) return "[nested too deeply]";
  if (Array.isArray(value)) return value.map((v) => toPlainJson(v, depth + 1));
  if (typeof value === "object") {
    const obj = value as Record<string, unknown> & {
      toDate?: () => Date;
      seconds?: number;
    };
    if (typeof obj.toDate === "function") return obj.toDate().toISOString();
    if (typeof obj.seconds === "number" && Object.keys(obj).length <= 2) {
      return new Date(obj.seconds * 1000).toISOString();
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) out[k] = toPlainJson(v, depth + 1);
    return out;
  }
  return value;
}

/**
 * Assembles the zip. Never throws for an individual missing survey file — a
 * partial export with an errors manifest is more useful to an admin reviewing
 * an application than no export at all.
 */
export async function buildUserDataRoomZip(input: DataRoomInput): Promise<DataRoomResult> {
  const zip = new JSZip();
  const now = new Date();
  const failed: { name: string; reason: string }[] = [];

  zip.file("profile.json", JSON.stringify(toPlainJson(input.profile ?? {}), null, 2));
  zip.file(
    "analytics.json",
    JSON.stringify(toPlainJson(input.analytics ?? {}), null, 2)
  );
  zip.file(
    "certificates.json",
    JSON.stringify(toPlainJson(input.certificates), null, 2)
  );

  const surveyFolder = zip.folder("surveys");
  const used = new Set<string>();

  // Sequential rather than parallel: an applicant has a handful of PDFs, and a
  // burst of parallel Storage fetches is more likely to trip rate limiting than
  // it is to save meaningful time.
  for (const [i, survey] of input.surveys.entries()) {
    if (!survey.downloadUrl) {
      failed.push({ name: survey.name, reason: "No download URL on the record" });
      continue;
    }
    try {
      const res = await fetch(survey.downloadUrl);
      if (!res.ok) {
        failed.push({ name: survey.name, reason: `HTTP ${res.status}` });
        continue;
      }
      const buf = await res.arrayBuffer();
      let base = safeName(survey.name, `survey-${i + 1}`);
      let candidate = `${base}.pdf`;
      let n = 2;
      while (used.has(candidate)) {
        candidate = `${base} (${n}).pdf`;
        n += 1;
      }
      used.add(candidate);
      surveyFolder?.file(candidate, buf);
    } catch (e) {
      failed.push({
        name: survey.name,
        // A CORS rejection surfaces here as an opaque "Failed to fetch", so
        // name the likely cause rather than leaving the admin guessing.
        reason:
          e instanceof Error && e.message.toLowerCase().includes("fetch")
            ? `${e.message} (the Storage bucket may not allow this origin — check CORS)`
            : String(e),
      });
    }
  }

  const manifest = [
    "MORTAR — user data room export",
    "",
    `User:        ${input.displayName}`,
    `Email:       ${input.email}`,
    `User ID:     ${input.userId}`,
    `Exported:    ${now.toISOString()}`,
    `Exported by: ${input.exportedBy}`,
    "",
    "Contents",
    "--------",
    "profile.json       — the member's full profile record",
    "analytics.json     — lifetime activity counters (user_analytics_summary)",
    "certificates.json  — skill certificates earned",
    `surveys/           — ${used.size} survey response PDF(s)`,
    failed.length > 0 ? "DOWNLOAD-ERRORS.txt — files that could not be included" : "",
    "",
    "This export contains personal data. Handle it according to the MORTAR",
    "privacy policy and delete local copies when you are finished with them.",
  ]
    .filter((line) => line !== "")
    .join("\n");
  zip.file("README.txt", `${manifest}\n`);

  if (failed.length > 0) {
    zip.file(
      "DOWNLOAD-ERRORS.txt",
      [
        "These files are listed on the member's record but could not be downloaded:",
        "",
        ...failed.map((f) => `- ${f.name}: ${f.reason}`),
        "",
        "They can still be opened individually from the admin panel.",
      ].join("\n")
    );
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const filename = `${safeName(input.displayName, input.userId)} — data room ${stamp(now)}.zip`;
  return { blob, filename, failed };
}

/** Triggers a browser download for a generated zip. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoked on the next tick so the click has definitely been handled.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
