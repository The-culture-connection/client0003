/**
 * Admin-only: read one `user_analytics_summary/{userId}` (Phase 4 mobile + web rollups).
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { z } from "zod";
import { callableCorsAllowlist } from "../callableCorsAllowlist";
import { ANALYTICS_COLLECTIONS } from "../analytics/mortarAnalyticsContract";
import { serializeFirestoreValue } from "./adminAnalyticsSerialize";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const auth = getAuth();

const schema = z.object({
  user_id: z.string().min(1).max(200),
});

function normalizeRoles(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((r): r is string => typeof r === "string")
    .map((r) => r.trim().toLowerCase())
    .filter((r) => r.length > 0);
}

async function assertAnalyticsAdmin(uid: string): Promise<void> {
  const [userRecord, userDoc] = await Promise.all([
    auth.getUser(uid),
    db.collection("users").doc(uid).get(),
  ]);
  const claimRoles = normalizeRoles(userRecord.customClaims?.roles);
  const docRoles = normalizeRoles(userDoc.data()?.roles);
  const merged = new Set<string>([...claimRoles, ...docRoles]);
  if (!merged.has("admin") && !merged.has("superadmin")) {
    throw new HttpsError("permission-denied", "Admin or superAdmin only");
  }
}

export const getAdminUserAnalyticsSummary = onCall(
  { region: "us-central1", cors: callableCorsAllowlist },
  async (request) => {
    const callerUid = request.auth?.uid;
    if (!callerUid) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }
    const parsed = schema.safeParse(request.data ?? {});
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", parsed.error.message);
    }

    const tokenRoles = normalizeRoles(request.auth?.token?.roles);
    const tokenHasAdmin = tokenRoles.includes("admin") || tokenRoles.includes("superadmin");
    if (!tokenHasAdmin) {
      await assertAnalyticsAdmin(callerUid);
    }

    const uid = parsed.data.user_id;
    const snap = await db.collection(ANALYTICS_COLLECTIONS.USER_ANALYTICS_SUMMARY).doc(uid).get();
    if (!snap.exists) {
      return { success: true, user_id: uid, summary: null };
    }
    return {
      success: true,
      user_id: uid,
      summary: serializeFirestoreValue(snap.data()) as Record<string, unknown>,
    };
  }
);
