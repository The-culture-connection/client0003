/**
 * Write an implicit survey / feedback response from a learner.
 * Auth-required. Validates payload with Zod, writes to `survey_responses`.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import * as logger from "firebase-functions/logger";
import { callableCorsAllowlist } from "../callableCorsAllowlist";
import { ANALYTICS_COLLECTIONS } from "../analytics/mortarAnalyticsContract";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

const CONTEXT_TYPES = ["lesson", "quiz", "checkout", "navigation", "community", "general"] as const;
type ContextType = (typeof CONTEXT_TYPES)[number];

const responseSchema = z.object({
  type: z.enum(["reaction", "sentiment", "slider"]),
  value: z.union([z.string().max(128), z.number().int().min(1).max(10)]),
  label: z.string().max(128),
});

const metadataSchema = z
  .object({
    lesson_id: z.string().max(256).optional(),
    course_id: z.string().max(256).optional(),
    slide_index: z.number().int().min(0).optional(),
    quiz_attempt_count: z.number().int().min(0).optional(),
  })
  .strict();

const requestSchema = z.object({
  session_id: z.string().min(4).max(128),
  screen_name: z.string().max(128).optional(),
  context_type: z.enum(CONTEXT_TYPES),
  trigger_event: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z][a-z0-9_]{0,62}$/, "trigger_event must be snake_case"),
  response: responseSchema,
  metadata: metadataSchema.optional(),
});

export const writeSurveyResponse = onCall(
  {
    region: "us-central1",
    cors: callableCorsAllowlist,
    timeoutSeconds: 15,
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

    const { session_id, screen_name, context_type, trigger_event, response, metadata } = parsed.data;

    const docRef = db.collection(ANALYTICS_COLLECTIONS.SURVEY_RESPONSES).doc();

    try {
      await docRef.set({
        schema_version: 1,
        user_id: uid,
        session_id,
        screen_name: screen_name ?? null,
        context_type,
        trigger_event,
        response: {
          type: response.type,
          value: response.value,
          label: response.label,
        },
        metadata: metadata ?? {},
        created_at: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      logger.error("writeSurveyResponse: Firestore write failed", { uid, context_type, err });
      throw new HttpsError("internal", "Failed to save survey response.");
    }

    return { success: true, doc_id: docRef.id };
  }
);
