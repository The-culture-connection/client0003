import {onCall, HttpsError} from "firebase-functions/v2/https";
import {initializeApp, getApps} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {getFirestore} from "firebase-admin/firestore";
import {z} from "zod";
import {callableCorsAllowlist} from "../callableCorsAllowlist";
import {buildPhase5DashboardSnapshot} from "../analytics/queries/dashboardAggregates";

if (getApps().length === 0) {
  initializeApp();
}

const auth = getAuth();
const db = getFirestore();

const schema = z.object({
  days: z.number().int().min(1).max(90).optional(),
});

function normalizeRoles(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.filter((r): r is string => typeof r === "string");
}

async function assertAnalyticsAdmin(uid: string): Promise<void> {
  const [userRecord, userDoc] = await Promise.all([
    auth.getUser(uid),
    db.collection("users").doc(uid).get(),
  ]);
  const claimRoles = normalizeRoles(userRecord.customClaims?.roles);
  const docRoles = normalizeRoles(userDoc.data()?.roles);
  const merged = new Set<string>([...claimRoles, ...docRoles]);
  if (!merged.has("Admin") && !merged.has("superAdmin")) {
    throw new HttpsError("permission-denied", "Admin or superAdmin only");
  }
}

export const getPhase5DashboardMetrics = onCall(
  {region: "us-central1", cors: callableCorsAllowlist},
  async (request) => {
    const callerUid = request.auth?.uid;
    if (!callerUid) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }
    const parsed = schema.safeParse(request.data ?? {});
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", parsed.error.message);
    }

    await assertAnalyticsAdmin(callerUid);

    const snapshot = await buildPhase5DashboardSnapshot(db, parsed.data.days ?? 30);
    return {success: true, snapshot};
  }
);
