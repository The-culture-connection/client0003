/**
 * trackLessonTime Callable Function
 * Server-authoritative lesson time tracking
 * Clamps delta_seconds to prevent abuse
 */

import {onCall, HttpsError} from "firebase-functions/v2/https";
import {initializeApp, getApps} from "firebase-admin/app";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {z} from "zod";
import * as logger from "firebase-functions/logger";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

const trackLessonTimeSchema = z.object({
  lesson_id: z.string().min(1),
  delta_seconds: z.number().min(0).max(3600), // Max 1 hour per call
});

export const trackLessonTime = onCall(async (request) => {
  const callerUid = request.auth?.uid;

  if (!callerUid) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const validationResult = trackLessonTimeSchema.safeParse(request.data);
  if (!validationResult.success) {
    throw new HttpsError(
      "invalid-argument",
      `Invalid input: ${validationResult.error.message}`
    );
  }

  const {lesson_id, delta_seconds} = validationResult.data;

  try {
    const progressRef = db
      .collection("user_progress")
      .doc(callerUid)
      .collection("lesson_progress")
      .doc(lesson_id);

    const progressDoc = await progressRef.get();
    const currentTime = progressDoc.exists ?
      (progressDoc.data()?.time_spent_seconds || 0) : 0;

    await progressRef.set(
      {
        lesson_id,
        time_spent_seconds: currentTime + delta_seconds,
        last_accessed_at: FieldValue.serverTimestamp(),
      },
      {merge: true}
    );

    // Log analytics event (fire and forget)
    db.collection("analytics_events").doc().set({
      event_type: "lesson_time",
      user_id: callerUid,
      timestamp: FieldValue.serverTimestamp(),
      metadata: {
        lesson_id,
        delta_seconds,
        total_time: currentTime + delta_seconds,
      },
    }).catch((err) => logger.error("Failed to log analytics:", err));

    return {success: true};
  } catch (error) {
    logger.error(`Error tracking lesson time for ${callerUid}:`, error);
    throw new HttpsError(
      "internal",
      `Failed to track lesson time: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
});
