/**
 * setAdminOnly Callable Function
 *
 * Promotes a user to Admin (or superAdmin) by REPLACING their role set.
 * - Sets custom claims `roles` to ["Admin"] or ["Admin","superAdmin"]
 * - Writes `/users/{uid}.roles` to the same array
 * - Deletes legacy `/users/{uid}.role` (string) field to avoid fallback behavior
 *
 * IMPORTANT: Clients must refresh their ID token after calling this function
 * to see the updated custom claims.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { z } from "zod";
import * as logger from "firebase-functions/logger";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const auth = getAuth();

const setAdminOnlySchema = z.object({
  target_uid: z.string().min(1),
  level: z.enum(["Admin", "superAdmin"]).default("Admin"),
});

export const setAdminOnly = onCall(async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const callerRecord = await auth.getUser(callerUid);
  const callerRoles = (callerRecord.customClaims?.roles as string[]) || [];

  // Only existing admins can grant admin roles.
  if (!callerRoles.includes("Admin") && !callerRoles.includes("superAdmin")) {
    throw new HttpsError("permission-denied", "Only Admin can set admin roles");
  }

  const parsed = setAdminOnlySchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", `Invalid input: ${parsed.error.message}`);
  }

  // eslint-disable-next-line camelcase
  const { target_uid, level } = parsed.data;

  // Prevent self-demotion footguns: promotion only here (no remove).
  const newRoles = level === "superAdmin" ? ["Admin", "superAdmin"] : ["Admin"];

  try {
    const targetUser = await auth.getUser(target_uid);

    // Replace roles in claims while preserving other claims.
    // eslint-disable-next-line camelcase
    await auth.setCustomUserClaims(target_uid, {
      ...(targetUser.customClaims || {}),
      roles: newRoles,
    });

    // Replace roles in Firestore and delete the legacy single-role field.
    // eslint-disable-next-line camelcase
    const userRef = db.collection("users").doc(target_uid);
    await userRef.set(
      {
        roles: newRoles,
        role: FieldValue.delete(),
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    logger.info("Admin roles replaced", {
      // eslint-disable-next-line camelcase
      target_uid,
      level,
      new_roles: newRoles,
      by: callerUid,
    });

    return {
      success: true,
      // eslint-disable-next-line camelcase
      target_uid,
      level,
      roles: newRoles,
      message: "Admin roles updated. Client must refresh ID token to see changes.",
    };
  } catch (error) {
    // eslint-disable-next-line camelcase
    logger.error(`Error setting admin-only roles for ${target_uid}:`, error);
    throw new HttpsError(
      "internal",
      `Failed to set admin roles: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
});

