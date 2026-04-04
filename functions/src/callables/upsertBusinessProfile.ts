/**
 * upsertBusinessProfile Callable Function
 * Updates or creates business profile for authenticated user
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

const businessProfileSchema = z.object({
  cohort_name: z.string().min(1),
  city: z.string().min(1),
  connection_intents: z.array(z.string()),
});

export const upsertBusinessProfile = onCall(async (request) => {
  const callerUid = request.auth?.uid;

  if (!callerUid) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  // Validate input
  const validationResult = businessProfileSchema.safeParse(request.data);
  if (!validationResult.success) {
    throw new HttpsError(
      "invalid-argument",
      `Invalid input: ${validationResult.error.message}`
    );
  }

  const profile = validationResult.data;

  try {
    // Update user document with business profile
    // Use set with merge to handle case where document might not exist yet
    const userRef = db.collection("users").doc(callerUid);
    await userRef.set(
      {
        business_profile: {
          cohort_name: profile.cohort_name,
          city: profile.city,
          connection_intents: profile.connection_intents,
        },
        profile_completed: true,
        updated_at: FieldValue.serverTimestamp(),
      },
      {merge: true}
    );

    logger.info(`Business profile updated for ${callerUid}`, {
      cohort_name: profile.cohort_name,
      city: profile.city,
      connection_intents: profile.connection_intents,
    });

    return {
      success: true,
      message: "Business profile updated successfully",
    };
  } catch (error) {
    logger.error(`Error updating business profile for ${callerUid}:`, error);
    throw new HttpsError(
      "internal",
      `Failed to update business profile: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
});
