/**
 * Admin → graduation "View User Profile" dialog extensions:
 *
 * 1. `AdminUserActivitySection` — per-user activity summary loaded on dialog
 *    open only (no N+1 over the applications list). Sources, most
 *    authoritative first:
 *      - `courseProgress` (query by userId): courses started / completed.
 *      - `user_analytics_summary/{uid}` (Phase 4 rollups, staff-readable):
 *        last active, streaks, lifetime event counters.
 *      - `user_badges/{uid}/awarded` (Phase 6, staff-readable): badges earned.
 *
 * 2. `DownloadDataroomZipButton` — bundles the user's Data Room (certificate
 *    PDFs + survey-response PDFs) into `<name>-dataroom.zip`, preserving the
 *    Data Room folder structure. Files are fetched through the existing
 *    `getCourseFile` HTTPS proxy (CORS-safe; Admin SDK, so owner-only Storage
 *    rules do not block staff) with a `getBlob` fallback.
 */

import { useEffect, useState } from "react";
import JSZip from "jszip";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { ref, getBlob } from "firebase/storage";
import { Activity, Download, Loader2 } from "lucide-react";
import { db, storage } from "../../lib/firebase";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { getStorageObjectViaFunctionsProxy } from "../../lib/storageDownloadProxy";
import { getDataroomFolderName } from "../../lib/dataroomFolders";
import type { SkillCertificate, SurveyResponseDocument } from "../../lib/dataroom";
import type { CourseProgress } from "../../lib/courseProgress";

/* ------------------------------------------------------------------ */
/* Activity section                                                    */
/* ------------------------------------------------------------------ */

interface UserAnalyticsSummaryDoc {
  last_active_at?: Timestamp;
  last_activity_utc_date?: string;
  streak_days?: number;
  best_streak_days?: number;
  counts?: Record<string, unknown>;
}

interface AwardedBadgeRow {
  id: string;
  timesAwarded: number;
  firstAwardedAt?: Timestamp;
}

interface ActivityData {
  summary: UserAnalyticsSummaryDoc | null;
  summaryError: boolean;
  progress: CourseProgress[] | null; // null = not readable (rules)
  badges: AwardedBadgeRow[] | null; // null = not readable (rules)
}

function toDateSafe(value: unknown): Date | null {
  if (!value) return null;
  const v = value as { toDate?: () => Date; seconds?: number };
  if (typeof v.toDate === "function") return v.toDate();
  if (typeof v.seconds === "number") return new Date(v.seconds * 1000);
  return null;
}

function numberOrZero(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** Friendly labels for the lifetime counters most useful when reviewing an applicant. */
const HIGHLIGHT_COUNTERS: Array<{ key: string; label: string }> = [
  { key: "lessons_completed", label: "Lessons completed" },
  { key: "lessons_started", label: "Lessons started" },
  { key: "quizzes_passed", label: "Quizzes passed" },
  { key: "login_sign_ins", label: "Sign-ins" },
  { key: "screen_session_started", label: "Screen sessions" },
  { key: "discussions_created", label: "Discussions created" },
  { key: "event_registrations", label: "Event registrations" },
];

export function AdminUserActivitySection({
  userId,
  courseTitles,
}: {
  userId: string;
  /** courseId → title map so completed courses show human names. */
  courseTitles?: Record<string, string>;
}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ActivityData>({
    summary: null,
    summaryError: false,
    progress: null,
    badges: null,
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      // Fetch each source independently so one blocked collection (Firestore
      // rules) does not hide the others.
      const [summaryRes, progressRes, badgesRes] = await Promise.allSettled([
        getDoc(doc(db, "user_analytics_summary", userId)),
        getDocs(query(collection(db, "courseProgress"), where("userId", "==", userId))),
        getDocs(collection(db, "user_badges", userId, "awarded")),
      ]);
      if (cancelled) return;

      const summary =
        summaryRes.status === "fulfilled" && summaryRes.value.exists()
          ? (summaryRes.value.data() as UserAnalyticsSummaryDoc)
          : null;
      const summaryError = summaryRes.status === "rejected";

      const progress: CourseProgress[] | null =
        progressRes.status === "fulfilled"
          ? progressRes.value.docs.map((d) => d.data() as CourseProgress)
          : null;

      const badges: AwardedBadgeRow[] | null =
        badgesRes.status === "fulfilled"
          ? badgesRes.value.docs.map((d) => {
              const raw = d.data() as Record<string, unknown>;
              return {
                id: d.id,
                timesAwarded: Math.max(1, numberOrZero(raw.times_awarded)),
                firstAwardedAt: (raw.first_awarded_at as Timestamp | undefined) ?? undefined,
              };
            })
          : null;

      setData({ summary, summaryError, progress, badges });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="rounded-lg border border-border p-4 bg-muted/30">
        <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
          <Activity className="w-4 h-4 text-accent" />
          Activity
        </h4>
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading activity…
        </div>
      </div>
    );
  }

  const { summary, summaryError, progress, badges } = data;
  const counts = (summary?.counts && typeof summary.counts === "object" ? summary.counts : {}) as Record<
    string,
    unknown
  >;
  const totalTrackedEvents = Object.values(counts).reduce<number>(
    (acc, v) => acc + numberOrZero(v),
    0
  );

  // Last active: prefer the analytics rollup; fall back to the newest
  // courseProgress.updatedAt (authoritative learning activity).
  let lastActive = toDateSafe(summary?.last_active_at);
  if (!lastActive && progress) {
    for (const p of progress) {
      const d = toDateSafe(p.updatedAt);
      if (d && (!lastActive || d > lastActive)) lastActive = d;
    }
  }

  const startedCourses = progress ?? [];
  const completedCourses = startedCourses.filter((p) => p.completed === true || !!p.completedAt);
  const inProgressCourses = startedCourses.filter((p) => !(p.completed === true || !!p.completedAt));
  const highlightCounters = HIGHLIGHT_COUNTERS.map(({ key, label }) => ({
    key,
    label,
    value: numberOrZero(counts[key]),
  })).filter((c) => c.value > 0);

  const nothingAvailable =
    !summary && (progress === null || progress.length === 0) && (badges === null || badges.length === 0);

  return (
    <div className="rounded-lg border border-border p-4 bg-muted/30">
      <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
        <Activity className="w-4 h-4 text-accent" />
        Activity
      </h4>

      {nothingAvailable ? (
        <p className="text-sm text-muted-foreground">No activity data for this user yet.</p>
      ) : (
        <div className="space-y-3">
          {/* Last active + engagement rollups (user_analytics_summary) */}
          <div className="text-sm text-muted-foreground space-y-1">
            <p>
              <strong className="text-foreground">Last active:</strong>{" "}
              {lastActive ? format(lastActive, "MMM d, yyyy 'at' h:mm a") : "No activity data"}
            </p>
            {summary ? (
              <>
                <p>
                  <strong className="text-foreground">Tracked events (lifetime):</strong>{" "}
                  {totalTrackedEvents.toLocaleString()}
                </p>
                <p>
                  <strong className="text-foreground">Streak:</strong>{" "}
                  {numberOrZero(summary.streak_days)} day
                  {numberOrZero(summary.streak_days) === 1 ? "" : "s"} (best{" "}
                  {numberOrZero(summary.best_streak_days)})
                </p>
              </>
            ) : (
              <p className="italic">
                {summaryError
                  ? "Analytics summary not readable (check Firestore rules for user_analytics_summary)."
                  : "No analytics summary recorded for this user yet."}
              </p>
            )}
          </div>

          {highlightCounters.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {highlightCounters.map((c) => (
                <Badge key={c.key} variant="secondary" className="font-normal">
                  {c.label}: {c.value.toLocaleString()}
                </Badge>
              ))}
            </div>
          )}

          {/* Courses (courseProgress collection) */}
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Courses</p>
            {progress === null ? (
              <p className="italic">
                Course progress not readable by admins (courseProgress reads are owner-only in
                Firestore rules).
              </p>
            ) : startedCourses.length === 0 ? (
              <p className="italic">No courses started yet.</p>
            ) : (
              <>
                <p>
                  Started {startedCourses.length} · Completed {completedCourses.length}
                </p>
                {completedCourses.length > 0 && (
                  <ul className="list-disc pl-5 space-y-0.5">
                    {completedCourses.map((p) => {
                      const completedAt = toDateSafe(p.completedAt);
                      return (
                        <li key={p.courseId}>
                          <span className="text-foreground">
                            {courseTitles?.[p.courseId] ?? p.courseId}
                          </span>{" "}
                          — completed{completedAt ? ` ${format(completedAt, "MMM d, yyyy")}` : ""}
                        </li>
                      );
                    })}
                  </ul>
                )}
                {inProgressCourses.length > 0 && (
                  <ul className="list-disc pl-5 space-y-0.5">
                    {inProgressCourses.map((p) => (
                      <li key={p.courseId}>
                        {courseTitles?.[p.courseId] ?? p.courseId} — in progress (
                        {Math.max(0, Math.min(100, numberOrZero(p.progress)))}%)
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          {/* Badges (user_badges/{uid}/awarded) */}
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Badges earned</p>
            {badges === null ? (
              <p className="italic">Badges not readable (check Firestore rules for user_badges).</p>
            ) : badges.length === 0 ? (
              <p className="italic">No badges earned yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {badges.map((b) => (
                  <Badge key={b.id} variant="outline" className="font-normal capitalize">
                    {b.id.replace(/[_-]+/g, " ")}
                    {b.timesAwarded > 1 ? ` ×${b.timesAwarded}` : ""}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Data Room ZIP download                                              */
/* ------------------------------------------------------------------ */

function sanitizeFileName(value: string, fallback: string): string {
  const safe = value
    .trim()
    .replace(/[^\w\d\- .]+/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^[_ .]+|[_ .]+$/g, "")
    .slice(0, 80);
  return safe || fallback;
}

/** Extract the Storage object path from a Firebase download URL (…/o/<encoded-path>?…). */
function storagePathFromDownloadUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/o\/([^?]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

async function fetchStorageBlob(storagePath: string): Promise<Blob> {
  // Primary: the app's existing CORS-safe download path (`getCourseFile`
  // HTTPS proxy — Admin SDK, so it also works for staff reading another
  // user's dataroom files regardless of Storage rules).
  try {
    const res = await fetch(getStorageObjectViaFunctionsProxy(storagePath));
    if (!res.ok) throw new Error(`Proxy responded ${res.status}`);
    return await res.blob();
  } catch (proxyError) {
    // Fallback: direct SDK read. Requires Storage rules to grant the caller
    // read on users/{uid}/dataroom/** (owner or staff claim).
    try {
      return await getBlob(ref(storage, storagePath));
    } catch {
      throw proxyError instanceof Error ? proxyError : new Error("Download failed");
    }
  }
}

export function DownloadDataroomZipButton({
  userId,
  userName,
  certificates,
  surveyResponses,
}: {
  userId: string;
  userName: string;
  certificates: SkillCertificate[];
  surveyResponses: SurveyResponseDocument[];
}) {
  const [zipping, setZipping] = useState(false);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);

  const entries: Array<{ storagePath: string; zipPath: string }> = [];
  const usedNames = new Set<string>();
  const uniqueZipPath = (folder: string, base: string): string => {
    let candidate = `${folder}/${base}.pdf`;
    let n = 2;
    while (usedNames.has(candidate)) {
      candidate = `${folder}/${base} (${n}).pdf`;
      n += 1;
    }
    usedNames.add(candidate);
    return candidate;
  };

  for (const cert of certificates) {
    const storagePath =
      cert.certificateStoragePath || storagePathFromDownloadUrl(cert.certificatePdfUrl);
    if (!storagePath) continue;
    const base = sanitizeFileName(`${cert.skill} - ${cert.courseTitle}`, "certificate");
    entries.push({ storagePath, zipPath: uniqueZipPath("Certificates", base) });
  }
  for (const sr of surveyResponses) {
    const storagePath = sr.storagePath || storagePathFromDownloadUrl(sr.downloadUrl);
    if (!storagePath) continue;
    const folder = sanitizeFileName(getDataroomFolderName(sr.dataroomFolderId), "Miscellaneous");
    const base = sanitizeFileName(sr.surveyTitle || sr.lessonTitle || "Survey", "survey");
    entries.push({ storagePath, zipPath: uniqueZipPath(folder, base) });
  }

  const handleDownload = async () => {
    if (zipping || entries.length === 0) return;
    setZipping(true);
    const failures: string[] = [];
    try {
      const zip = new JSZip();
      let added = 0;
      for (let i = 0; i < entries.length; i++) {
        setProgressLabel(`Zipping ${i + 1} of ${entries.length}…`);
        const entry = entries[i];
        try {
          const blob = await fetchStorageBlob(entry.storagePath);
          zip.file(entry.zipPath, blob);
          added += 1;
        } catch {
          failures.push(entry.zipPath);
        }
      }
      if (added === 0) {
        toast.error("Could not read any Data Room files.", {
          description:
            "Downloads may be blocked by Storage permissions, or the files no longer exist.",
        });
        return;
      }
      setProgressLabel("Building ZIP…");
      const out = await zip.generateAsync({ type: "blob" });
      const safeName = sanitizeFileName(userName, userId).replace(/\s+/g, "-").toLowerCase();
      const url = URL.createObjectURL(out);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeName}-dataroom.zip`;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      if (failures.length > 0) {
        toast.warning(`Downloaded ${added} of ${entries.length} files — ${failures.length} skipped.`, {
          description: `Skipped: ${failures.slice(0, 5).join(", ")}${
            failures.length > 5 ? ` and ${failures.length - 5} more` : ""
          }`,
        });
      } else {
        toast.success(`Downloaded ${added} file${added === 1 ? "" : "s"} as ZIP.`);
      }
    } catch (e) {
      console.error("Data room ZIP build failed:", e);
      toast.error("ZIP build failed. Please try again.");
    } finally {
      setZipping(false);
      setProgressLabel(null);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="border-border text-foreground"
      disabled={zipping || entries.length === 0}
      onClick={() => void handleDownload()}
      title={
        entries.length === 0
          ? "This user has no downloadable Data Room files yet."
          : `Download ${entries.length} file${entries.length === 1 ? "" : "s"} as a ZIP`
      }
    >
      {zipping ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Download className="w-4 h-4 mr-2" />
      )}
      {zipping ? progressLabel ?? "Zipping…" : "Download data room (.zip)"}
    </Button>
  );
}
