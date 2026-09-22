/**
 * Beta testing feedback — shared model for the tester-facing widget and the
 * Admin → Beta Testing triage panel.
 *
 * One collection (`beta_feedback`) holds reports from both surfaces; `source`
 * says which. Screenshots live in Cloud Storage under
 * `beta_feedback/{uid}/{docId}.png` and the doc carries the download URL.
 */

import { matchPath } from "react-router";
import {
  collection,
  doc,
  serverTimestamp,
  setDoc,
  type Timestamp,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, db, storage } from "./firebase";

export const BETA_FEEDBACK_COLLECTION = "beta_feedback";
export const BETA_FEEDBACK_STORAGE_FOLDER = "beta_feedback";

/** Matches the Firestore rule on `comment.size()`. */
export const BETA_FEEDBACK_MAX_COMMENT = 4000;

/** Attribute marking nodes the screenshot must leave out (the widget itself). */
export const BETA_FEEDBACK_UI_ATTR = "data-beta-feedback-ui";

export type BetaFeedbackStatus = "new" | "in_progress" | "resolved" | "wont_fix";

export const BETA_FEEDBACK_STATUSES: readonly BetaFeedbackStatus[] = [
  "new",
  "in_progress",
  "resolved",
  "wont_fix",
] as const;

export const BETA_FEEDBACK_STATUS_LABELS: Record<BetaFeedbackStatus, string> = {
  new: "New",
  in_progress: "In progress",
  resolved: "Resolved",
  wont_fix: "Won't fix",
};

export type BetaFeedbackSource = "mobile" | "web";

export type BetaFeedbackReport = {
  id: string;
  comment: string;
  /** Route pattern, e.g. `/curriculum/:moduleId`. */
  screen: string;
  /** Human name for [screen], e.g. "Curriculum · Module detail". */
  screen_label: string;
  /** Location actually visited, e.g. `/curriculum/abc123`. */
  route: string;
  source: BetaFeedbackSource;
  trigger: string;
  status: BetaFeedbackStatus;
  user_id: string;
  user_email: string;
  user_name: string;
  platform: string;
  os_version: string;
  app_version: string;
  user_agent: string;
  viewport_width: number | null;
  viewport_height: number | null;
  /** Whether the client produced an image at all, regardless of upload success. */
  screenshot_captured: boolean;
  screenshot_url: string | null;
  screenshot_path: string | null;
  screenshot_error: string | null;
  admin_note: string;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  resolved_by: string | null;
};

/**
 * Route pattern → human label, ordered most specific first because
 * [resolveBetaFeedbackScreen] returns the first pattern that matches.
 */
const SCREEN_PATTERNS: readonly (readonly [string, string])[] = [
  // Admin
  ["/admin/curriculum/:curriculumId/module/:moduleId/chapter/:chapterId/lesson/:lessonId/builder", "Admin · Lesson deck builder"],
  ["/admin/courses/create", "Admin · Course wizard"],
  ["/admin/courses/builder", "Admin · Course builder"],
  ["/admin/courses/:courseId", "Admin · Course builder"],
  ["/admin/panel/:tab", "Admin · Panel"],
  ["/admin/auth", "Admin · Password gate"],
  ["/admin", "Admin · Command center"],

  // Learner
  ["/learn/lesson/:lessonId", "Lesson player"],
  ["/curriculum/:moduleId", "Curriculum · Module detail"],
  ["/curriculum", "Curriculum"],
  ["/courses/:courseId", "Course detail"],
  ["/quizzes", "Quizzes"],
  ["/data-room", "Data room"],
  ["/certificates", "Certificates"],
  ["/certificate/:shareId", "Public certificate"],
  ["/community", "Community hub"],
  ["/shop", "Shop"],
  ["/discussions/:id", "Discussion detail"],
  ["/discussions", "Discussions"],
  ["/groups/:id", "Group detail"],
  ["/events/:id", "Event detail"],
  ["/events", "Events"],
  ["/mortar-info", "MORTAR Info"],
  ["/dashboard", "Dashboard"],
  ["/payment/success", "Payment · Success"],
  ["/payment/cancel", "Payment · Cancelled"],

  // Mobile-web previews
  ["/mobile/feed", "Mobile preview · Feed"],
  ["/mobile/groups", "Mobile preview · Groups"],
  ["/mobile/events", "Mobile preview · Events"],
  ["/mobile/explore", "Mobile preview · Explore"],
  ["/mobile/matching", "Mobile preview · Matching"],
  ["/mobile/profile", "Mobile preview · Profile"],
  ["/mobile/onboarding", "Mobile preview · Onboarding"],

  // Entry
  ["/onboarding", "Onboarding"],
  ["/login", "Log in"],
  ["/join", "Join"],
  ["/verify-email", "Verify email"],
  ["/delete-account", "Delete account"],
  ["/child-safety", "Child safety"],
  ["/", "Landing"],
];

/** Route pattern + human label for a pathname. */
export function resolveBetaFeedbackScreen(pathname: string): {
  screen: string;
  screenLabel: string;
} {
  for (const [pattern, label] of SCREEN_PATTERNS) {
    if (matchPath({ path: pattern, end: true }, pathname)) {
      return { screen: pattern, screenLabel: label };
    }
  }
  return { screen: pathname, screenLabel: pathname };
}

/** Widest edge of the captured PNG, in CSS pixels before device scaling. */
const CAPTURE_TARGET_WIDTH = 1400;

/**
 * PNG data URL of what the tester currently sees, or null if the page could
 * not be rasterised.
 *
 * Captures the **viewport**, not the whole document, so a long page does not
 * produce a multi-megabyte strip; the scroll offset is undone with a transform
 * so the shot starts at what is actually on screen. Nodes tagged with
 * [BETA_FEEDBACK_UI_ATTR] are filtered out, which is what keeps the widget
 * itself out of the picture.
 */
export async function captureViewportPng(): Promise<string | null> {
  try {
    const { domToPng } = await import("modern-screenshot");
    const width = window.innerWidth;
    const height = window.innerHeight;
    const scale = Math.min(1.5, Math.max(0.5, CAPTURE_TARGET_WIDTH / Math.max(width, 1)));

    return await domToPng(document.body, {
      width,
      height,
      scale,
      backgroundColor: "#000000",
      style: {
        transform: `translate(${-window.scrollX}px, ${-window.scrollY}px)`,
        transformOrigin: "top left",
      },
      filter: (node: Node) =>
        !(node instanceof Element && node.hasAttribute(BETA_FEEDBACK_UI_ATTR)),
    });
  } catch (e) {
    console.warn("[beta_feedback] screenshot capture failed", e);
    return null;
  }
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, encoded] = dataUrl.split(",");
  const mime = /:(.*?);/.exec(header)?.[1] ?? "image/png";
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export type SubmitBetaFeedbackInput = {
  comment: string;
  screen: string;
  screenLabel: string;
  route: string;
  /** PNG data URL from [captureViewportPng], if one was produced. */
  screenshotDataUrl?: string | null;
  appVersion?: string;
};

/**
 * Files one report and returns its document id.
 *
 * The screenshot is uploaded first so the doc never points at a file that
 * failed; if the upload fails the report is still filed without an image,
 * because the comment is the part that cannot be reconstructed later.
 */
export async function submitBetaFeedback(input: SubmitBetaFeedbackInput): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in before sending feedback.");

  const comment = input.comment.trim();
  if (!comment) throw new Error("Tell us what you would change.");
  if (comment.length > BETA_FEEDBACK_MAX_COMMENT) {
    throw new Error(`Please keep it under ${BETA_FEEDBACK_MAX_COMMENT} characters.`);
  }

  const docRef = doc(collection(db, BETA_FEEDBACK_COLLECTION));

  let screenshotPath: string | null = null;
  let screenshotUrl: string | null = null;
  let screenshotError: string | null = null;

  if (input.screenshotDataUrl) {
    const path = `${BETA_FEEDBACK_STORAGE_FOLDER}/${user.uid}/${docRef.id}.png`;
    try {
      const blob = dataUrlToBlob(input.screenshotDataUrl);
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, blob, { contentType: "image/png" });
      screenshotUrl = await getDownloadURL(storageRef);
      screenshotPath = path;
    } catch (e) {
      console.warn("[beta_feedback] screenshot upload failed", e);
      screenshotError = e instanceof Error ? e.message : String(e);
    }
  }

  await setDoc(docRef, {
    comment,
    screen: input.screen,
    screen_label: input.screenLabel,
    route: input.route,
    trigger: "button",
    source: "web" satisfies BetaFeedbackSource,
    status: "new" satisfies BetaFeedbackStatus,
    user_id: user.uid,
    user_email: user.email ?? "",
    user_name: user.displayName ?? "",
    platform: "web",
    os_version: "",
    app_version: input.appVersion ?? "",
    user_agent: navigator.userAgent,
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
    screenshot_captured: Boolean(input.screenshotDataUrl),
    screenshot_path: screenshotPath,
    screenshot_url: screenshotUrl,
    ...(screenshotError ? { screenshot_error: screenshotError } : {}),
    created_at: serverTimestamp(),
  });

  return docRef.id;
}
