/**
 * Expansion Network — user-to-user matching (skills + goals + light context).
 *
 * Callable: `runExpansionUserMatching`
 * - `scope: "self"` (default): caller only; any signed-in user.
 * - `scope: "all"`: recompute for every eligible user; **Admin** or **superAdmin** only.
 *
 * Writes: `users/{uid}/expansion_matches/{matchedUserId}` (Admin SDK; client read via rules).
 *
 * Exclusions:
 * - Same uid; pairs already in **dm_threads** together; optional `expansion_dismissed_match_uids` on `users/{uid}`.
 *
 * Scoring lives in `../matching/matchScoring` and is shared with
 * `runConferenceUserMatching`.
 *
 * Gen 2 callables run on **Cloud Run**. Use **`invoker: "public"`** so the HTTPS
 * endpoint accepts client traffic; Firebase still validates **`request.auth`**
 * (same pattern as `initializeUserSession` in `expansionInvite.ts`).
 */

import {onCall, HttpsError} from "firebase-functions/v2/https";
import {initializeApp, getApps} from "firebase-admin/app";
import {getFirestore, type DocumentData} from "firebase-admin/firestore";
import {z} from "zod";
import * as logger from "firebase-functions/logger";
import {
  ALGORITHM_VERSION,
  TOP_N,
  asStringArray,
  matchDocFields,
  rankMatches,
  toMatchCandidate,
  type MatchCandidate,
} from "../matching/matchScoring";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

const MAX_ELIGIBLE_USERS = 2500;

const requestSchema = z.object({
  scope: z.enum(["self", "all"]).optional().default("self"),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isStaffRoles(roles: any): boolean {
  if (!Array.isArray(roles)) return false;
  return roles.includes("Admin") || roles.includes("superAdmin");
}

function isEligibleUser(d: DocumentData): boolean {
  if (d.networkAccess !== true) return false;
  const curriculumDone =
    d.onboardingComplete === true && d.profileCreated === true;
  const expansionDone =
    d.expansionOnboardingComplete === true ||
    d.onboarding_status === "complete" ||
    (d.profile_completed === true && d.onboarding_status === "complete");
  if (!curriculumDone && !expansionDone) return false;

  const confident = asStringArray(d.confident_skills);
  const desired = asStringArray(d.desired_skills);
  if (confident.length === 0 && desired.length === 0) return false;

  return true;
}

function toEligibleUser(uid: string, d: DocumentData): MatchCandidate | null {
  if (!isEligibleUser(d)) return null;
  return toMatchCandidate(uid, d);
}

/** uid -> set of uids already in a DM thread with uid */
async function buildDmAdjacency(): Promise<Map<string, Set<string>>> {
  const map = new Map<string, Set<string>>();
  const snap = await db.collection("dm_threads").select("participant_ids").get();
  for (const doc of snap.docs) {
    const p = doc.data().participant_ids;
    if (!Array.isArray(p)) continue;
    const ids = p.filter((x): x is string => typeof x === "string" && x.length > 0);
    for (const a of ids) {
      if (!map.has(a)) map.set(a, new Set());
      for (const b of ids) {
        if (b !== a) map.get(a)!.add(b);
      }
    }
  }
  return map;
}

function dismissedSet(d: DocumentData): Set<string> {
  const raw = d.expansion_dismissed_match_uids;
  if (!Array.isArray(raw)) return new Set();
  return new Set(raw.filter((x): x is string => typeof x === "string" && x.length > 0));
}

async function clearExpansionMatches(uid: string): Promise<void> {
  const col = db.collection("users").doc(uid).collection("expansion_matches");
  const snap = await col.get();
  let batch = db.batch();
  let n = 0;
  for (const d of snap.docs) {
    batch.delete(d.ref);
    n++;
    if (n >= 450) {
      await batch.commit();
      batch = db.batch();
      n = 0;
    }
  }
  if (n > 0) await batch.commit();
}

async function writeMatchesForUser(
  a: MatchCandidate,
  all: MatchCandidate[],
  dmAdj: Map<string, Set<string>>,
  topN: number
): Promise<number> {
  const connected = dmAdj.get(a.uid) ?? new Set();
  const dismissed = dismissedSet(a.data);

  const top = rankMatches(
    a,
    all,
    (b) => connected.has(b.uid) || dismissed.has(b.uid),
    topN
  );
  await clearExpansionMatches(a.uid);

  let batch = db.batch();
  let n = 0;
  const baseRef = db.collection("users").doc(a.uid).collection("expansion_matches");

  for (const row of top) {
    batch.set(baseRef.doc(row.b.uid), matchDocFields(row.b.uid, row.score));
    n++;
    if (n >= 450) {
      await batch.commit();
      batch = db.batch();
      n = 0;
    }
  }
  if (n > 0) await batch.commit();

  return top.length;
}

export const runExpansionUserMatching = onCall({ invoker: "public" }, async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) {
    throw new HttpsError("unauthenticated", "Must be signed in.");
  }

  const parsed = requestSchema.safeParse(request.data || {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }

  const {scope} = parsed.data;

  if (scope === "all") {
    const callerDoc = await db.collection("users").doc(callerUid).get();
    const roles = callerDoc.data()?.roles;
    if (!isStaffRoles(roles)) {
      throw new HttpsError("permission-denied", "Admins only for scope=all.");
    }
  }

  // Bound the read: we only need to know whether the eligible set exceeds the cap, so
  // cap + 1 is enough to detect "too many" below without streaming the entire users
  // collection into function memory.
  const snap = await db
    .collection("users")
    .where("networkAccess", "==", true)
    .limit(MAX_ELIGIBLE_USERS + 1)
    .get();

  const eligible: MatchCandidate[] = [];
  for (const doc of snap.docs) {
    const u = toEligibleUser(doc.id, doc.data());
    if (u) eligible.push(u);
  }

  if (eligible.length > MAX_ELIGIBLE_USERS) {
    throw new HttpsError(
      "failed-precondition",
      `Too many eligible users (${eligible.length}). Cap is ${MAX_ELIGIBLE_USERS}; run in batches or increase cap.`
    );
  }

  logger.info(`runExpansionUserMatching: ${eligible.length} eligible users, scope=${scope}`);

  const dmAdj = await buildDmAdjacency();

  let processed = 0;
  let matchWrites = 0;

  if (scope === "self") {
    const self = eligible.find((u) => u.uid === callerUid);
    if (!self) {
      throw new HttpsError(
        "failed-precondition",
        "Your profile is not eligible for matching (network access, onboarding, and skills required)."
      );
    }
    const n = await writeMatchesForUser(self, eligible, dmAdj, TOP_N);
    processed = 1;
    matchWrites = n;
  } else {
    for (const user of eligible) {
      const n = await writeMatchesForUser(user, eligible, dmAdj, TOP_N);
      processed++;
      matchWrites += n;
    }
  }

  return {
    success: true,
    scope,
    eligibleUserCount: eligible.length,
    processedUsers: processed,
    matchDocumentsWritten: matchWrites,
    algorithmVersion: ALGORITHM_VERSION,
  };
});
