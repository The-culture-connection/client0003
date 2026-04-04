/**
 * completeOnboarding Callable Function
 * Allows users to complete their onboarding by setting their role and updating onboarding status
 * This is a special function that allows users to set their own role during initial onboarding
 */

import {onCall, HttpsError} from "firebase-functions/v2/https";
import {initializeApp, getApps} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {z} from "zod";
import * as logger from "firebase-functions/logger";
import {ALL_ROLES, isValidRole} from "../config/roles";

// Initialize Firebase Admin (only once)
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const auth = getAuth();

const completeOnboardingSchema = z.object({
  role: z.string().refine((val) => isValidRole(val), {
    message: `Role must be one of: ${ALL_ROLES.join(", ")}`,
  }),
});

export const completeOnboarding = onCall(async (request) => {
  const callerUid = request.auth?.uid;

  if (!callerUid) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  // Validate input
  const validationResult = completeOnboardingSchema.safeParse(request.data);
  if (!validationResult.success) {
    throw new HttpsError(
      "invalid-argument",
      `Invalid input: ${validationResult.error.message}`
    );
  }

  const {role} = validationResult.data;

  try {
    // Get current user document to check onboarding status
    const userRef = db.collection("users").doc(callerUid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User document not found");
    }

    const userData = userDoc.data();

    // Only allow if onboarding is not already complete
    if (userData?.onboarding_status === "complete") {
      throw new HttpsError(
        "failed-precondition",
        "Onboarding is already complete"
      );
    }

    // Update user document with role and onboarding status
    await userRef.update({
      roles: [role],
      onboarding_status: "complete",
      updated_at: FieldValue.serverTimestamp(),
    });

    // Set custom claims with the role
    await auth.setCustomUserClaims(callerUid, {
      roles: [role],
    });

    logger.info(`Onboarding completed for ${callerUid} with role: ${role}`);

    return {
      success: true,
      role,
      message: "Onboarding completed successfully. Please refresh your ID token to see updated roles.",
    };
  } catch (error) {
    logger.error(`Error completing onboarding for ${callerUid}:`, error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError(
      "internal",
      `Failed to complete onboarding: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
});
