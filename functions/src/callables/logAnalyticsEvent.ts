/**
 * logAnalyticsEvent Callable Function
 * Allows authenticated users to log analytics events
 */

import {onCall, HttpsError} from "firebase-functions/v2/https";
import {initializeApp, getApps} from "firebase-admin/app";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {z} from "zod";
import * as logger from "firebase-functions/logger";

// Initialize Firebase Admin (only once)
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

const logAnalyticsEventSchema = z.object({
  event_type: z.string().min(1),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const logAnalyticsEvent = onCall(async (request) => {
  const callerUid = request.auth?.uid;

  if (!callerUid) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  // Validate input
  const validationResult = logAnalyticsEventSchema.safeParse(request.data);
  if (!validationResult.success) {
    throw new HttpsError(
      "invalid-argument",
      `Invalid input: ${validationResult.error.message}`
    );
  }

  // eslint-disable-next-line camelcase
  const {event_type, metadata} = validationResult.data;

  try {
    const eventRef = db.collection("analytics_events").doc();
    await eventRef.set({
      event_type,
      user_id: callerUid,
      timestamp: FieldValue.serverTimestamp(),
      metadata: metadata || {},
    });

    // eslint-disable-next-line camelcase
    logger.info(`Analytics event logged: ${event_type} by ${callerUid}`);

    return {
      success: true,
      event_id: eventRef.id,
      event_type,
    };
  } catch (error) {
    logger.error("Error logging analytics event:", error);
    throw new HttpsError(
      "internal",
      `Failed to log event: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
});
