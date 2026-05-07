/**
 * Analyze a learner's lesson survey with OpenAI, using admin-configured prompt +
 * criteria and a text summary of the lesson content from Firestore curriculum data.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import {
  getFirestore,
  FieldValue,
  type Firestore,
} from "firebase-admin/firestore";
import { z } from "zod";
import * as logger from "firebase-functions/logger";
import { callableCorsAllowlist } from "../callableCorsAllowlist";
import { OPEN_AI_KEY } from "../config/openAi";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

const MAX_LESSON_CONTEXT_CHARS = 14_000;
const MAX_OPENAI_FEEDBACK_CHARS = 8_000;
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
/** Default cheap model; override with env `OPENAI_MODEL` when deploying */
const OPENAI_MODEL_DEFAULT = "gpt-4o-mini";

const requestSchema = z.object({
  course_id: z.string().min(1),
  lesson_id: z.string().min(1),
  /** If omitted, uses `surveyAnswers` already stored on the caller's course progress doc. */
  answers: z.array(z.string()).optional(),
});

type CurriculumMapping = {
  curriculumId?: string;
  modules?: Array<{
    moduleId?: string;
    chapters?: Array<{
      chapterId?: string;
      lessons?: Array<{ lessonId?: string }>;
    }>;
  }>;
};

type LessonSurveyDoc = {
  enabled?: boolean;
  title?: string;
  questions?: Array<{ order?: number; question?: string }>;
  aiAnalysis?: {
    enabled?: boolean;
    prompt?: string;
    criteria?: string;
  };
};

function findLessonPlacement(
  mapping: CurriculumMapping | undefined,
  lessonId: string
):
  | { curriculumId: string; moduleId: string; chapterId: string }
  | null {
  const curriculumId = mapping?.curriculumId;
  if (!curriculumId) return null;
  for (const m of mapping.modules ?? []) {
    const moduleId = m.moduleId;
    if (!moduleId) continue;
    for (const c of m.chapters ?? []) {
      const chapterId = c.chapterId;
      if (!chapterId) continue;
      for (const l of c.lessons ?? []) {
        if (l.lessonId === lessonId) {
          return { curriculumId, moduleId, chapterId };
        }
      }
    }
  }
  return null;
}

function lessonDocRef(
  dbFire: Firestore,
  curriculumId: string,
  moduleId: string,
  chapterId: string,
  lessonId: string
) {
  return dbFire
    .collection("curricula")
    .doc(curriculumId)
    .collection("modules")
    .doc(moduleId)
    .collection("chapters")
    .doc(chapterId)
    .collection("lessons")
    .doc(lessonId);
}

async function summarizeLessonContent(
  dbFire: Firestore,
  curriculumId: string,
  moduleId: string,
  chapterId: string,
  lessonId: string
): Promise<string> {
  const lref = lessonDocRef(
    dbFire,
    curriculumId,
    moduleId,
    chapterId,
    lessonId
  );
  const lessonSnap = await lref.get();
  const lessonData = lessonSnap.data() ?? {};
  const title = typeof lessonData.title === "string" ? lessonData.title : "";
  const contentType =
    (lessonData.content_type as string | undefined) ?? "slides";

  const chunks: string[] = [];
  if (title.trim()) chunks.push(`Lesson title: ${title.trim()}`);

  const appendText = (s: string) => {
    if (!s.trim()) return;
    chunks.push(s.trim());
  };

  if (contentType === "slides" || contentType === undefined) {
    const slidesSnap = await lref.collection("slides").orderBy("order").get();
    for (const slideDoc of slidesSnap.docs) {
      const blocksSnap = await slideDoc.ref
        .collection("blocks")
        .orderBy("order")
        .get();
      for (const b of blocksSnap.docs) {
        const data = b.data();
        const t = typeof data.type === "string" ? data.type : "block";
        const content =
          typeof data.content === "string" ? data.content.trim() : "";
        const alt =
          typeof data.alt_text === "string" ? data.alt_text.trim() : "";
        if (content) appendText(`${t}: ${content}`);
        else if (alt) appendText(`image alt: ${alt}`);
      }
    }
  } else if (contentType === "images") {
    const imagesSnap = await lref.collection("images").orderBy("order").get();
    for (const imgDoc of imagesSnap.docs) {
      const d = imgDoc.data();
      const alt =
        typeof d.alt_text === "string" ? d.alt_text.trim() : "";
      if (alt) appendText(`Slide image description: ${alt}`);
    }
  } else if (contentType === "media") {
    const contentSnap = await lref
      .collection("lesson_content")
      .orderBy("order")
      .get();
    for (const slideDoc of contentSnap.docs) {
      const d = slideDoc.data();
      const slideType =
        typeof d.type === "string" ? d.type : "slide";
      const caption =
        typeof d.caption === "string" ? d.caption.trim() : "";
      if (slideType === "video") {
        const vid =
          typeof d.video_url === "string"
            ? d.video_url.trim()
            : typeof d.video_id === "string"
              ? `youtube:${d.video_id}`
              : "video slide";
        appendText(`video (${vid})${caption ? ` — ${caption}` : ""}`);
      } else {
        const alt =
          typeof d.alt_text === "string" ? d.alt_text.trim() : "";
        if (caption || alt)
          appendText(`media slide ${caption || alt}`);
      }
    }
  }

  let full = chunks.join("\n\n");
  if (full.length > MAX_LESSON_CONTEXT_CHARS) {
    full = `${full.slice(0, MAX_LESSON_CONTEXT_CHARS)}\n\n…[lesson content truncated for length]`;
  }
  return full || "(No extractable lesson text — give feedback based on survey answers and stated criteria.)";
}

async function callOpenAiFeedback(params: {
  apiKey: string;
  lessonContext: string;
  surveyTitle: string;
  qaLines: string;
  adminPrompt: string;
  criteria: string;
}): Promise<string> {
  const model =
    typeof process.env.OPENAI_MODEL === "string" && process.env.OPENAI_MODEL
      ? process.env.OPENAI_MODEL.trim()
      : OPENAI_MODEL_DEFAULT;

  const system = [
    "You give constructive educational feedback on a student's open-ended lesson survey.",
    "Be specific, respectful, and aligned with the facilitator's criteria.",
    "Reference the lesson content summary when helpful. Do not invent facts not supported by that summary or the student's answers.",
    "Output plain prose (no markdown code fences unless the admin prompt asks otherwise). Keep the response focused and actionable.",
  ].join(" ");

  const userContent = [
    `Survey title: ${params.surveyTitle}`,
    "",
    "### Facilitator instructions (prompt)",
    params.adminPrompt || "(none supplied)",
    "",
    "### Feedback criteria / rubric",
    params.criteria || "(none supplied)",
    "",
    "### Lesson content (extracted)",
    params.lessonContext,
    "",
    "### Student responses (Q&A)",
    params.qaLines,
  ].join("\n");

  const res = await fetch(OPENAI_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
      max_tokens: 2_048,
      temperature: 0.5,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    logger.error("OpenAI HTTP error", { status: res.status, errText });
    throw new HttpsError(
      "internal",
      "OpenAI request failed. Try again shortly or contact support."
    );
  }

  type ChatCompletion = {
    choices?: Array<{ message?: { content?: string | null } }>;
  };

  const body = (await res.json()) as ChatCompletion;
  const text =
    body.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) {
    throw new HttpsError("internal", "Empty response from the AI model.");
  }
  return text.slice(0, MAX_OPENAI_FEEDBACK_CHARS);
}

export const analyzeLessonSurvey = onCall(
  {
    region: "us-central1",
    cors: callableCorsAllowlist,
    secrets: [OPEN_AI_KEY],
    timeoutSeconds: 120,
    memory: "512MiB",
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    const parsed = requestSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError(
        "invalid-argument",
        parsed.error.issues.map((e) => e.message).join("; ")
      );
    }

    const { course_id, lesson_id, answers: answersBody } = parsed.data;

    const surveyRef = db.doc(`courses/${course_id}/lessonSurveys/${lesson_id}`);
    const surveySnap = await surveyRef.get();
    if (!surveySnap.exists) {
      throw new HttpsError("not-found", "Survey configuration not found for this lesson.");
    }

    const survey = surveySnap.data() as LessonSurveyDoc;
    if (!survey.enabled) {
      throw new HttpsError("failed-precondition", "Survey is not enabled.");
    }

    const ai = survey.aiAnalysis;
    if (!ai?.enabled) {
      throw new HttpsError(
        "failed-precondition",
        "AI analysis is not enabled for this survey."
      );
    }

    const sortedQuestions = [...(survey.questions ?? [])].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0)
    );
    const qTexts = sortedQuestions
      .map((q) => (typeof q.question === "string" ? q.question : ""))
      .filter(Boolean);
    if (qTexts.length === 0) {
      throw new HttpsError("failed-precondition", "Survey has no questions.");
    }

    const progressId = `${uid}_${course_id}`;
    const progressRef = db.doc(`courseProgress/${progressId}`);
    const progressSnap = await progressRef.get();
    if (!progressSnap.exists) {
      throw new HttpsError(
        "failed-precondition",
        "Course progress not found. Open the course once from your learner dashboard, then try again."
      );
    }
    type ProgressRow = {
      userId?: string;
      surveyAnswers?: Record<string, string[]>;
    };
    const progressRow = progressSnap.data() as ProgressRow;
    if (progressRow.userId !== uid) {
      throw new HttpsError("permission-denied", "Cannot analyze surveys for another user's progress.");
    }

    let answers: string[];
    if (answersBody !== undefined) {
      if (answersBody.length !== qTexts.length) {
        throw new HttpsError(
          "invalid-argument",
          `Expected ${qTexts.length} answers; received ${answersBody.length}.`
        );
      }
      answers = answersBody.map((a) =>
        typeof a === "string" ? a : ""
      );
    } else {
      const fromProgress = progressRow.surveyAnswers?.[lesson_id];
      if (!fromProgress || !Array.isArray(fromProgress)) {
        throw new HttpsError(
          "failed-precondition",
          "No saved answers for this lesson. Save responses first."
        );
      }
      if (fromProgress.length !== qTexts.length) {
        throw new HttpsError(
          "failed-precondition",
          "Stored answers do not match the current survey question count.",
        );
      }
      answers = fromProgress.map((a) => (typeof a === "string" ? a : ""));
    }

    const courseSnap = await db.doc(`courses/${course_id}`).get();
    if (!courseSnap.exists) {
      throw new HttpsError("not-found", "Course not found.");
    }

    const courseData = courseSnap.data() ?? {};
    const placement = findLessonPlacement(
      courseData.curriculumMapping as CurriculumMapping | undefined,
      lesson_id
    );
    if (!placement) {
      throw new HttpsError(
        "failed-precondition",
        "Course has no curriculum mapping for this lesson; cannot load lesson content."
      );
    }

    let lessonContext: string;
    try {
      lessonContext = await summarizeLessonContent(
        db,
        placement.curriculumId,
        placement.moduleId,
        placement.chapterId,
        lesson_id
      );
    } catch (e) {
      logger.warn("lesson context build failed", e);
      lessonContext =
        "(Lesson content could not be loaded automatically; rely on criteria and learner answers.)";
    }

    const qaLines = qTexts
      .map((q, i) => `Q${i + 1}: ${q}\nA${i + 1}: ${answers[i]?.trim() || "(blank)"}`)
      .join("\n\n");

    const surveyTitle =
      typeof survey.title === "string" && survey.title.trim()
        ? survey.title.trim()
        : "Survey";

    const apiKey = OPEN_AI_KEY.value()?.trim();
    if (!apiKey) {
      throw new HttpsError(
        "failed-precondition",
        "OPEN_AI_KEY is not configured for Cloud Functions.",
      );
    }

    let feedback: string;
    try {
      feedback = await callOpenAiFeedback({
        apiKey,
        lessonContext,
        surveyTitle,
        qaLines,
        adminPrompt: typeof ai.prompt === "string" ? ai.prompt : "",
        criteria: typeof ai.criteria === "string" ? ai.criteria : "",
      });
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      logger.error("OpenAI invocation error", err);
      throw new HttpsError(
        "internal",
        err instanceof Error ? err.message : "AI analysis failed."
      );
    }

    await progressRef.set(
      {
        surveyAiFeedback: { [lesson_id]: feedback },
        surveyAiAnalyzedAt: { [lesson_id]: FieldValue.serverTimestamp() },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return {
      feedback,
      lesson_id,
      course_id,
    };
  },
);
