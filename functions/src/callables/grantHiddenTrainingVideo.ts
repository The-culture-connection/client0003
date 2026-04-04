/**
 * grantHiddenTrainingVideo Callable Function
 * Admin-only function to grant access to hidden training videos
 */

import {onCall, HttpsError} from "firebase-functions/v2/https";
import {initializeApp, getApps} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {z} from "zod";
import * as logger from "firebase-functions/logger";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const auth = getAuth();

const grantHiddenTrainingVideoSchema = z.object({
  target_uid: z.string().min(1),
  video_id: z.string().min(1),
});

export const grantHiddenTrainingVideo = onCall(async (request) => {
  const callerUid = request.auth?.uid;

  if (!callerUid) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  // Verify caller is Admin
  const callerRecord = await auth.getUser(callerUid);
  const callerRoles = callerRecord.customClaims?.roles || [];

  if (!callerRoles.includes("Admin")) {
    throw new HttpsError(
      "permission-denied",
      "Only Admin can grant hidden training video access"
    );
  }

  const validationResult = grantHiddenTrainingVideoSchema.safeParse(request.data);
  if (!validationResult.success) {
    throw new HttpsError(
      "invalid-argument",
      `Invalid input: ${validationResult.error.message}`
    );
  }

  const {target_uid, video_id} = validationResult.data;

  try {
    const userRef = db.collection("users").doc(target_uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User not found");
    }

    const userData = userDoc.data();
    const currentPermissions = userData?.permissions || {};
    const hiddenVideos = currentPermissions.hidden_videos || [];

    if (!hiddenVideos.includes(video_id)) {
      await userRef.update({
        permissions: {
          ...currentPermissions,
          hidden_videos: [...hiddenVideos, video_id],
        },
        updated_at: FieldValue.serverTimestamp(),
      });

      // Log analytics
      db.collection("analytics_events").doc().set({
        event_type: "hidden_video_unlocked",
        user_id: target_uid,
        timestamp: FieldValue.serverTimestamp(),
        metadata: {
          video_id,
          granted_by: callerUid,
        },
      }).catch((err) => logger.error("Failed to log analytics:", err));

      logger.info(`Hidden video ${video_id} granted to ${target_uid} by ${callerUid}`);
    }

    return {
      success: true,
      target_uid,
      video_id,
      message: "Hidden training video access granted",
    };
  } catch (error) {
    logger.error(`Error granting hidden video for ${target_uid}:`, error);
    throw new HttpsError(
      "internal",
      `Failed to grant hidden video: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
});
