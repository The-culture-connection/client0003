import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * The external beta tester checklist for the Digital Curriculum round.
 *
 * Every step is marked off by evidence the tester actually did the thing —
 * there is no manual tick. Where a step already leaves a trace in Firestore we
 * read that trace; the two that do not (looking around the dashboard, filing a
 * report) are stamped onto the tester's own user doc at the moment they happen,
 * because `beta_feedback` is staff-read-only and a tester cannot query their
 * own reports back.
 */

export type BetaStepId =
  | "account"
  | "onboarding"
  | "dashboard"
  | "start"
  | "lesson"
  | "application"
  | "dataroom"
  | "event"
  | "dm"
  | "report"
  | "app";

export interface BetaStep {
  id: BetaStepId;
  /** Short label for the collapsed rail. */
  title: string;
  detail: string[];
  note?: { label: string; text: string };
}

/** Field on `users/{uid}` holding stamps for steps with no other trace. */
export const BETA_CHECKLIST_FIELD = "beta_checklist";

/** Seconds on the dashboard before "look around the dashboard" counts as done. */
export const DASHBOARD_DWELL_SECONDS = 30;

export const BETA_STEPS: BetaStep[] = [
  {
    id: "account",
    title: "Create your account",
    detail: [
      "Open the beta link we emailed you.",
      "Choose “Don’t have an account? Sign up”, then enter your email and a password.",
    ],
  },
  {
    id: "onboarding",
    title: "Work through onboarding",
    detail: [
      "We are deliberately not giving instructions — we want to see whether it explains itself.",
      "Anywhere you hesitate or have to guess, tell us.",
      "Check your inbox for the “Welcome to MORTAR Masters Online” email.",
    ],
  },
  {
    id: "dashboard",
    title: "Look around the dashboard",
    detail: [
      "Read it the way you would on a normal day.",
      "Anything unclear, mislabelled or missing, report it with the bug icon.",
    ],
    note: {
      label: "Ticks itself",
      text: "This one completes once you have spent a little time here.",
    },
  },
  {
    id: "start",
    title: "Start the Beta Testing course",
    detail: [
      "Open Curriculum and find the Beta Testing course.",
      "Open it and click Start Lesson — the first slide is enough to begin.",
    ],
    note: {
      label: "Already yours",
      text: "The course is free and already assigned to your account, so there is nothing to buy. This step ticks as soon as you open the first lesson.",
    },
  },
  {
    id: "lesson",
    title: "Take the lesson and both quizzes",
    detail: [
      "Click Start Lesson and read through it.",
      "Start the quiz, pick your favourite celebrity, and submit.",
      "Choose “Analyze my response with AI”, read the feedback, then Finish.",
      "Take the course quiz as well, then close it.",
    ],
  },
  {
    id: "application",
    title: "Submit your alumni application",
    detail: [
      "In Curriculum you will now see Alumni Application — click Apply Now.",
      "Add any availability slots you like. This is test data.",
    ],
    note: {
      label: "We reply later",
      text: "A real person reviews this. Expect two emails within one working day — keep the second, it carries the access code you need at step 11.",
    },
  },
  {
    id: "dataroom",
    title: "Collect your survey and certificate",
    detail: [
      "Open Data Room → Corporate Documents, find your Beta Testing Survey, and download it.",
      "Go to Skills & Certificates and check your new skill is listed.",
      "Preview the certificate, then download it.",
      "Click Add to LinkedIn and read the instructions — you do not have to post it.",
    ],
  },
  {
    id: "event",
    title: "Register for an event",
    detail: [
      "Go to the Community Hub, and in Events choose View All Events.",
      "Pick one, click View & Register, read the details, and register.",
    ],
  },
  {
    id: "dm",
    title: "Send us a direct message",
    detail: [
      "From the Community Hub, use DM MORTAR to send us anything at all.",
      "Come back later and check our reply arrived and reads properly.",
    ],
    note: {
      label: "We reply later",
      text: "Do not wait on this one — carry on. We answer within one working day.",
    },
  },
  {
    id: "report",
    title: "Report anything outstanding",
    detail: [
      "Go back to anything that confused you and report it while it is fresh.",
      "Tell us the one thing you would change first if it were up to you.",
    ],
    note: {
      label: "Bug icon",
      text: "Bottom-right of any screen. This step completes when your first report is filed.",
    },
  },
  {
    id: "app",
    title: "Install the app and sign in",
    detail: [
      "Open the email titled “Your MORTARverse App Access Code Has Arrived” and copy the code.",
      "Install the app using the download link in that email.",
      "Sign in with the same email you used here, plus your access code.",
      "Stop once you reach the Mortarverse screen — round two picks up from there.",
    ],
    note: {
      label: "Needs step 6",
      text: "This waits on your admission email. If the code is refused it has expired — reply to that email for a fresh one rather than making a second account.",
    },
  },
];

export type BetaStepState = Record<BetaStepId, boolean>;

function emptyState(): BetaStepState {
  return BETA_STEPS.reduce((acc, step) => {
    acc[step.id] = false;
    return acc;
  }, {} as BetaStepState);
}

/** True when this account has been flagged as an external beta tester. */
export function isBetaTester(userData: Record<string, unknown> | undefined): boolean {
  return userData?.beta_tester === true;
}

async function anyDocExists(
  collectionName: string,
  field: string,
  value: string
): Promise<boolean> {
  try {
    const snap = await getDocs(
      query(collection(db, collectionName), where(field, "==", value), limit(1))
    );
    return !snap.empty;
  } catch (e) {
    // A denied or offline read must not blank the whole checklist — treat the
    // single step as "not yet" and let the others resolve.
    console.warn(`[betaChecklist] ${collectionName} lookup failed`, e);
    return false;
  }
}

async function anySubcollectionDoc(uid: string, sub: string): Promise<boolean> {
  try {
    const snap = await getDocs(query(collection(db, "users", uid, sub), limit(1)));
    return !snap.empty;
  } catch (e) {
    console.warn(`[betaChecklist] users/${uid}/${sub} lookup failed`, e);
    return false;
  }
}

async function hasRegisteredForAnyEvent(uid: string): Promise<boolean> {
  const inCollection = async (name: string) => {
    try {
      const snap = await getDocs(
        query(collection(db, name), where("registered_users", "array-contains", uid), limit(1))
      );
      return !snap.empty;
    } catch (e) {
      console.warn(`[betaChecklist] ${name} registration lookup failed`, e);
      return false;
    }
  };
  const [curriculum, mobile] = await Promise.all([
    inCollection("events"),
    inCollection("events_mobile"),
  ]);
  return curriculum || mobile;
}

interface CourseProgressSummary {
  /** A progress doc exists at all — see {@link courseProgressSummary}. */
  started: boolean;
  /** At least one course reads as finished. */
  completed: boolean;
}

/**
 * Started and finished state for the tester's courses, in one query.
 *
 * `courseProgress/{uid}_{courseId}` is created lazily by
 * `initializeCourseProgress` the first time a learner views a slide, so the
 * document's mere existence is the "started the course" signal — there is no
 * separate enrolment record to look for, and the beta course is free and
 * pre-assigned, so nothing is purchased along the way.
 *
 * Filtered on `userId` alone and finished off in memory: adding `completed` to
 * the query would need a composite index, and a tester has only a handful of
 * progress docs. `completed` is the authoritative flag, but a course sitting at
 * 100 without it counts too — that gap is exactly what a beta finds.
 *
 * Assumes the beta cohort is assigned a single course, so "any progress doc"
 * means the beta course. Scope this to a course id if that stops being true.
 */
async function courseProgressSummary(uid: string): Promise<CourseProgressSummary> {
  try {
    const snap = await getDocs(
      query(collection(db, "courseProgress"), where("userId", "==", uid))
    );
    if (snap.empty) return { started: false, completed: false };
    const completed = snap.docs.some((d) => {
      const data = d.data() as { completed?: unknown; progress?: unknown };
      if (data.completed === true) return true;
      return typeof data.progress === "number" && data.progress >= 100;
    });
    return { started: true, completed };
  } catch (e) {
    console.warn("[betaChecklist] courseProgress lookup failed", e);
    return { started: false, completed: false };
  }
}

/**
 * Read every completion signal for one tester.
 *
 * `userData` is the already-loaded `users/{uid}` document where the caller has
 * one — the dashboard does — so this adds four queries rather than five reads.
 */
export async function evaluateBetaChecklist(
  uid: string,
  userData?: Record<string, unknown>
): Promise<BetaStepState> {
  const state = emptyState();
  if (!uid) return state;

  let data = userData;
  if (!data) {
    try {
      const snap = await getDoc(doc(db, "users", uid));
      data = snap.data();
    } catch (e) {
      console.warn("[betaChecklist] user doc read failed", e);
      return state;
    }
  }

  const stamps = (data?.[BETA_CHECKLIST_FIELD] ?? {}) as Record<string, unknown>;

  const [hasApplication, hasSurvey, hasCertificate, hasEvent, hasDm, course] =
    await Promise.all([
      anyDocExists("GraduationApplications", "userId", uid),
      anySubcollectionDoc(uid, "surveyResponses"),
      anySubcollectionDoc(uid, "certificates"),
      hasRegisteredForAnyEvent(uid),
      anyDocExists("Digital Student DMs", "uid", uid),
      courseProgressSummary(uid),
    ]);

  // Reaching the dashboard at all means the account exists and is usable.
  state.account = true;
  state.onboarding = data?.onboarding_status === "complete";
  state.dashboard = Boolean(stamps.dashboard_viewed_at);
  state.start = course.started;
  state.lesson = course.completed;
  state.application = hasApplication;
  state.dataroom = hasSurvey && hasCertificate;
  state.event = hasEvent;
  state.dm = hasDm;
  state.report = Boolean(stamps.reported_at);
  state.app = data?.expansion_mobile_app_account_created === true;

  return state;
}

/**
 * Record a step that leaves no other trace. Best-effort: a tester whose write
 * is rejected still gets a working checklist, just without that tick.
 */
export async function stampBetaChecklist(
  uid: string,
  key: "dashboard_viewed_at" | "reported_at"
): Promise<void> {
  if (!uid) return;
  try {
    await setDoc(
      doc(db, "users", uid),
      { [BETA_CHECKLIST_FIELD]: { [key]: serverTimestamp() } },
      { merge: true }
    );
  } catch (e) {
    console.warn(`[betaChecklist] could not stamp ${key}`, e);
  }
}
