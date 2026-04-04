/**
 * setUserBusinessProfile Callable Function
 * Updates user business profile (first_name, last_name, cohort, city, state)
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

const businessProfileSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  company: z.string().optional(),
  cohort_name: z.string().min(1),
  cohort_id: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  connection_intents: z.array(z.string()).optional(),
  invite_code: z.string().optional(), // If provided, lock cohort_id
});

export const setUserBusinessProfile = onCall(async (request) => {
  const callerUid = request.auth?.uid;

  if (!callerUid) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const validationResult = businessProfileSchema.safeParse(request.data);
  if (!validationResult.success) {
    throw new HttpsError(
      "invalid-argument",
      `Invalid input: ${validationResult.error.message}`
    );
  }

  const profile = validationResult.data;

  try {
    const userRef = db.collection("users").doc(callerUid);
    const userDoc = await userRef.get();
    const existingData = userDoc.data();

    // Check if cohort_id was set via invite code (lock it)
    const existingCohortId = existingData?.business_profile?.cohort_id;
    const wasSetViaInvite = existingData?.business_profile?.cohort_id &&
                            existingData?.business_profile?.cohort_id_locked;

    // If invite_code provided, set cohort_id and lock it
    let cohortId = profile.cohort_id;
    let cohortIdLocked = false;
    if (profile.invite_code) {
      // In future, validate invite_code and extract cohort_id
      // For now, if cohort_id provided with invite_code, lock it
      if (profile.cohort_id) {
        cohortId = profile.cohort_id;
        cohortIdLocked = true;
      }
    }

    // If cohort_id was locked via invite, don't allow overwrite (unless admin)
    if (wasSetViaInvite && cohortId !== existingCohortId) {
      // Check if user is admin (would need to check custom claims)
      // For now, preserve existing cohort_id if locked
      cohortId = existingCohortId;
      cohortIdLocked = true;
    }

    await userRef.update({
      first_name: profile.first_name,
      last_name: profile.last_name,
      display_name: `${profile.first_name} ${profile.last_name}`,
      company: profile.company || null,
      business_profile: {
        cohort_id: cohortId,
        cohort_id_locked: cohortIdLocked,
        cohort_name: profile.cohort_name,
        city: profile.city,
        state: profile.state,
        connection_intents: profile.connection_intents || [],
      },
      updated_at: FieldValue.serverTimestamp(),
    });

    logger.info(`Business profile updated for ${callerUid}`);

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
