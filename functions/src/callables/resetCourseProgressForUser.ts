/**
 * Staff-only: delete a learner's Digital Curriculum progress document for one course.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { z } from "zod";
import * as logger from "firebase-functions/logger";
import { callableCorsAllowlist } from "../callableCorsAllowlist";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const auth = getAuth();

const schema = z.object({
  course_id: z.string().min(1),
  target_user_id: z.string().min(1),
});

function callerIsStaff(roles: unknown): boolean {
  if (!Array.isArray(roles)) return false;
  return roles.some((r) => r === "Admin" || r === "superAdmin");
}

export const resetCourseProgressForUser = onCall(
  { region: "us-central1", cors: callableCorsAllowlist },
  async (request) => {
    const callerUid = request.auth?.uid;
    if (!callerUid) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    let callerRoles: string[];
    try {
      const caller = await auth.getUser(callerUid);
      callerRoles = (caller.customClaims?.roles as string[]) || [];
    } catch (e) {
      logger.error("resetCourseProgressForUser: caller auth lookup failed", e);
      throw new HttpsError("internal", "Could not verify caller.");
    }

    if (!callerIsStaff(callerRoles)) {
      throw new HttpsError("permission-denied", "Admin or superAdmin only.");
    }

    const parsed = schema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError(
        "invalid-argument",
        parsed.error.issues.map((i) => i.message).join("; ")
      );
    }

    const { course_id, target_user_id } = parsed.data;

    try {
      await auth.getUser(target_user_id);
    } catch {
      throw new HttpsError(
        "not-found",
        "No Firebase user matches that user ID."
      );
    }

    const courseSnap = await db.collection("courses").doc(course_id).get();
    if (!courseSnap.exists) {
      throw new HttpsError("not-found", "Course not found.");
    }

    const progressRef = db
      .collection("courseProgress")
      .doc(`${target_user_id}_${course_id}`);
    const progressSnap = await progressRef.get();

    if (!progressSnap.exists) {
      return { deleted: false as const, message: "No progress document to remove." };
    }

    await progressRef.delete();
    logger.info("resetCourseProgressForUser: deleted progress", {
      course_id,
      target_user_id,
      staff_uid: callerUid,
    });

    return { deleted: true as const, message: "Course progress reset for that learner." };
  }
);
