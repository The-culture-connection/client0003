/**
 * Staff-only: delete a learner's Digital Curriculum progress document for one course.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, type DocumentSnapshot } from "firebase-admin/firestore";
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

/** Matches other admin callables (`getAdminUserAnalyticsSummary`): accept claims, Firestore, and JWT token roles. */
function normalizeRoles(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((r): r is string => typeof r === "string")
    .map((r) => r.trim().toLowerCase())
    .filter((r) => r.length > 0);
}

function mergedStaffRoleSet(opts: {
  tokenRoles: string[];
  claimRoles: string[];
  docRoles: string[];
  legacyRole: unknown;
}): Set<string> {
  const merged = new Set<string>([
    ...opts.tokenRoles,
    ...opts.claimRoles,
    ...opts.docRoles,
  ]);
  if (typeof opts.legacyRole === "string" && opts.legacyRole.trim()) {
    merged.add(opts.legacyRole.trim().toLowerCase());
  }
  return merged;
}

function setHasStaff(merged: Set<string>): boolean {
  return merged.has("admin") || merged.has("superadmin");
}

async function assertCallerIsStaff(
  callerUid: string,
  request: { auth?: { token?: Record<string, unknown> } }
): Promise<void> {
  const tokenRoles = normalizeRoles(request.auth?.token?.roles);
  if (setHasStaff(new Set(tokenRoles))) return;

  let userRecord: Awaited<ReturnType<typeof auth.getUser>>;
  let userDoc: DocumentSnapshot;
  try {
    [userRecord, userDoc] = await Promise.all([
      auth.getUser(callerUid),
      db.collection("users").doc(callerUid).get(),
    ]);
  } catch (e) {
    logger.error("resetCourseProgressForUser: caller lookup failed", e);
    throw new HttpsError("internal", "Could not verify caller.");
  }

  const claimRoles = normalizeRoles(userRecord.customClaims?.roles);
  const docRoles = normalizeRoles(userDoc.data()?.roles);
  const legacyRole = userDoc.data()?.role;
  const merged = mergedStaffRoleSet({
    tokenRoles,
    claimRoles,
    docRoles,
    legacyRole,
  });

  if (!setHasStaff(merged)) {
    throw new HttpsError(
      "permission-denied",
      "Admin or superAdmin only (checked Auth claims and users/{uid} document)."
    );
  }
}

export const resetCourseProgressForUser = onCall(
  { region: "us-central1", cors: callableCorsAllowlist },
  async (request) => {
    const callerUid = request.auth?.uid;
    if (!callerUid) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    await assertCallerIsStaff(callerUid, request);

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
