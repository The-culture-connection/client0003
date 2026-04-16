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
  /** When true, response includes a small debug object for verifying auth + aggregated counts in live env. */
  include_debug: z.boolean().optional(),
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

    // First trust the verified token on this request (fast path),
    // then fall back to server lookups for environments where claims lag.
    const tokenRoles = normalizeRoles(request.auth?.token?.roles);
    const tokenHasAdmin = tokenRoles.includes("admin") || tokenRoles.includes("superadmin");
    if (!tokenHasAdmin) {
      await assertAnalyticsAdmin(callerUid);
    }

    const days = parsed.data.days ?? 30;
    const snapshot = await buildPhase5DashboardSnapshot(db, days);

    if (!parsed.data.include_debug) {
      return {success: true, snapshot};
    }

    const [userRecord, userDoc] = await Promise.all([
      auth.getUser(callerUid),
      db.collection("users").doc(callerUid).get(),
    ]);
    const claimRoles = normalizeRoles(userRecord.customClaims?.roles);
    const docRoles = normalizeRoles(userDoc.data()?.roles);

    return {
      success: true,
      snapshot,
      debug: {
        uid: callerUid,
        auth_path: tokenHasAdmin ? "token" : "server_lookup",
        roles_token_raw: request.auth?.token?.roles ?? null,
        roles_token_normalized: tokenRoles,
        roles_auth_custom_claims_normalized: claimRoles,
        roles_firestore_normalized: docRoles,
        window: {
          days: snapshot.window_days,
          start_date_utc: snapshot.start_date_utc,
          end_date_utc: snapshot.end_date_utc,
        },
        totals_counts: snapshot.totals.counts,
        totals_counts_key_count: Object.keys(snapshot.totals.counts).length,
      },
    };
  }
);
