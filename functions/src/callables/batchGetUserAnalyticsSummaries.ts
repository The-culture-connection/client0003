/**
 * Admin-only: batch-read `user_analytics_summary` for export bundles (bounded list).
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
  user_ids: z.array(z.string().min(1).max(200)).min(1).max(200),
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

export const batchGetUserAnalyticsSummaries = onCall(
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

    const summaries: Record<string, Record<string, unknown> | null> = {};
    const snaps = await Promise.all(
      parsed.data.user_ids.map((id) => db.collection(ANALYTICS_COLLECTIONS.USER_ANALYTICS_SUMMARY).doc(id).get())
    );
    parsed.data.user_ids.forEach((id, i) => {
      const s = snaps[i];
      summaries[id] = s.exists ? (serializeFirestoreValue(s.data()) as Record<string, unknown>) : null;
    });

    return { success: true, summaries };
  }
);
