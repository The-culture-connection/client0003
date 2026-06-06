/**
 * setUserRole Callable Function
 * Allows Admin to set custom claims and update user roles in Firestore
 *
 * IMPORTANT: Clients must refresh their ID token after calling this function
 * to see the updated custom claims.
 */

import {onCall, HttpsError} from "firebase-functions/v2/https";
import {initializeApp, getApps} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {z} from "zod";
import * as logger from "firebase-functions/logger";
import {ALL_ROLES, isValidRole} from "../config/roles";
import {BREVO_API_KEY} from "../email/brevoClient";
import {sendTransactionalEmail} from "../email/sendTransactionalEmail";
import {adminRoleGrantedParams, firstNameFrom} from "../email/buildEmailParams";

// Initialize Firebase Admin (only once)
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const auth = getAuth();

const setUserRoleSchema = z.object({
  target_uid: z.string().min(1),
  role: z.string().refine((val) => isValidRole(val), {
    message: `Role must be one of: ${ALL_ROLES.join(", ")}`,
  }),
  action: z.enum(["add", "remove"]),
});

const ADMIN_ROLES = new Set(["Admin", "superAdmin"]);

export const setUserRole = onCall({secrets: [BREVO_API_KEY]}, async (request) => {
  const callerUid = request.auth?.uid;

  if (!callerUid) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  // Verify caller is Admin
  const callerRecord = await auth.getUser(callerUid);
  const callerRoles = (callerRecord.customClaims?.roles as string[]) || [];

  if (!callerRoles.includes("Admin")) {
    throw new HttpsError(
      "permission-denied",
      "Only Admin can set user roles"
    );
  }

  // Validate input
  const validationResult = setUserRoleSchema.safeParse(request.data);
  if (!validationResult.success) {
    throw new HttpsError(
      "invalid-argument",
      `Invalid input: ${validationResult.error.message}`
    );
  }

  // eslint-disable-next-line camelcase
  const {target_uid, role, action} = validationResult.data;

  // Prevent self-removal of Admin role
  // eslint-disable-next-line camelcase
  if (target_uid === callerUid && role === "Admin" && action === "remove") {
    throw new HttpsError(
      "permission-denied",
      "Cannot remove your own Admin role"
    );
  }

  try {
    // Get current user record
    // eslint-disable-next-line camelcase
    const targetUser = await auth.getUser(target_uid);
    const currentRoles = (targetUser.customClaims?.roles as string[]) || [];

    let newRoles: string[];
    if (action === "add") {
      // Add role if not already present
      newRoles = currentRoles.includes(role) ?
        currentRoles :
        [...currentRoles, role];
    } else {
      // Remove role
      newRoles = currentRoles.filter((r) => r !== role);
    }

    // Update custom claims
    // eslint-disable-next-line camelcase
    await auth.setCustomUserClaims(target_uid, {
      ...targetUser.customClaims,
      roles: newRoles,
    });

    // Update Firestore /users/{uid}.roles
    // eslint-disable-next-line camelcase
    const userRef = db.collection("users").doc(target_uid);
    await userRef.update({
      roles: newRoles,
      updated_at: FieldValue.serverTimestamp(),
    });

    // eslint-disable-next-line camelcase
    logger.info(`Role ${action}ed: ${role} for user ${target_uid} by ${callerUid}`, {
      // eslint-disable-next-line camelcase
      target_uid,
      role,
      action,
      new_roles: newRoles,
    });

    // Send notification email when an admin role is newly granted.
    // Must be awaited — Cloud Functions terminates on return, so fire-and-forget never resolves.
    if (action === "add" && ADMIN_ROLES.has(role) && !currentRoles.includes(role)) {
      const targetEmail = targetUser.email;
      if (targetEmail) {
        try {
          const callerDoc = await db.collection("users").doc(callerUid).get();
          const callerData = callerDoc.data() ?? {};
          const callerName = firstNameFrom(
            [callerData.first_name, callerData.last_name].filter(Boolean).join(" "),
            callerData.email as string | undefined
          );
          const params = adminRoleGrantedParams({
            userEmail: targetEmail,
            userName: targetUser.displayName ?? undefined,
            role,
            granted_by_name: callerName,
          });
          await sendTransactionalEmail("admin_role_granted", {
            to: targetEmail,
            params,
            tags: ["admin_role_granted"],
            skipPreferenceCheck: true,
          });
          logger.info("setUserRole: admin_role_granted email sent", {targetEmail, role});
        } catch (emailErr) {
          // Log but don't fail the role update — the role change already succeeded.
          logger.warn("setUserRole: admin_role_granted email failed", {emailErr, targetEmail, role});
        }
      }
    }

    return {
      success: true,
      // eslint-disable-next-line camelcase
      target_uid,
      role,
      action,
      roles: newRoles,
      message: "Role updated. Client must refresh ID token to see changes.",
    };
  } catch (error) {
    // eslint-disable-next-line camelcase
    logger.error(`Error setting role for ${target_uid}:`, error);
    throw new HttpsError(
      "internal",
      `Failed to set role: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
});
