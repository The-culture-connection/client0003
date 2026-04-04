/**
 * updateOnboardingStatus Callable Function
 * Updates user onboarding status
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

const onboardingStatusSchema = z.object({
  status: z.enum(["needs_profile", "partial", "complete"]),
});

export const updateOnboardingStatus = onCall(async (request) => {
  const callerUid = request.auth?.uid;

  if (!callerUid) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const validationResult = onboardingStatusSchema.safeParse(request.data);
  if (!validationResult.success) {
    throw new HttpsError(
      "invalid-argument",
      `Invalid input: ${validationResult.error.message}`
    );
  }

  const {status} = validationResult.data;

  try {
    const userRef = db.collection("users").doc(callerUid);
    await userRef.update({
      onboarding_status: status,
      profile_completed: status === "complete",
      updated_at: FieldValue.serverTimestamp(),
    });

    logger.info(`Onboarding status updated for ${callerUid}: ${status}`);

    return {
      success: true,
      status,
      message: "Onboarding status updated successfully",
    };
  } catch (error) {
    logger.error(`Error updating onboarding status for ${callerUid}:`, error);
    throw new HttpsError(
      "internal",
      `Failed to update onboarding status: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
});
