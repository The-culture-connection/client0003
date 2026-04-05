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
 * Gen 2 callables run on **Cloud Run**. Use **`invoker: "public"`** so the HTTPS
 * endpoint accepts client traffic; Firebase still validates **`request.auth`**
 * (same pattern as `initializeUserSession` in `expansionInvite.ts`).
 */

import {onCall, HttpsError} from "firebase-functions/v2/https";
import {initializeApp, getApps} from "firebase-admin/app";
import {getFirestore, FieldValue, type DocumentData} from "firebase-admin/firestore";
import {z} from "zod";
import * as logger from "firebase-functions/logger";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

const ALGORITHM_VERSION = 2;
const TOP_N = 10;
const MAX_ELIGIBLE_USERS = 2500;
const MIN_RAW_SCORE = 15;

/** Normalize components before applying 70% / 20% / 10% weights. */
const SKILL_CAP = 150;
const GOAL_CAP = 70;
const CONTEXT_CAP = 15;

const requestSchema = z.object({
  scope: z.enum(["self", "all"]).optional().default("self"),
});

const LEARN_TECH_GOAL = "Learn more technical skills";
const TECH_CONFIDENT_HINTS = [
  "Digital tool",
  "Data analytics",
  "Automation",
  "E-commerce",
  "AI tools",
  "technology",
  "Technology",
  "MVP",
  "software",
  "Technical",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isStaffRoles(roles: any): boolean {
  if (!Array.isArray(roles)) return false;
  return roles.includes("Admin") || roles.includes("superAdmin");
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

function overlap(arr1: string[], arr2: string[]): string[] {
  const set2 = new Set(arr2);
  return arr1.filter((x) => set2.has(x));
}

function hasTechnicalDepth(confident: string[]): boolean {
  if (confident.length >= 4) return true;
  return confident.some((s) => TECH_CONFIDENT_HINTS.some((h) => s.includes(h)));
}

function scoreGoals(
  goalsA: string[],
  goalsB: string[],
  confidentA: string[],
  confidentB: string[]
): {score: number; reasons: string[]} {
  const hasA = (g: string) => goalsA.includes(g);
  const hasB = (g: string) => goalsB.includes(g);
  let score = 0;
  const reasons: string[] = [];

  if (hasA("Sell skills/services") && hasB("Buy skills/services")) {
    score += 20;
    reasons.push("Sell skills/services ↔ Buy skills/services");
  }
  if (hasA("Buy skills/services") && hasB("Sell skills/services")) {
    score += 20;
    reasons.push("Buy skills/services ↔ Sell skills/services");
  }
  if (hasA("Grow my network") && hasB("Grow my network")) {
    score += 10;
    reasons.push("Grow my network ↔ Grow my network");
  }
  if (hasA("Build partnerships") && hasB("Build partnerships")) {
    score += 10;
    reasons.push("Build partnerships ↔ Build partnerships");
  }
  if (hasA("Grow my network") && hasB("Build partnerships")) {
    score += 6;
    reasons.push("Grow my network ↔ Build partnerships");
  }
  if (hasA("Build partnerships") && hasB("Grow my network")) {
    score += 6;
    reasons.push("Build partnerships ↔ Grow my network");
  }

  const soft = "Learn more soft skills (networking, lead generation)";
  if (hasA(soft) && (hasB("Grow my network") || hasB("Build partnerships"))) {
    score += 6;
    reasons.push("Learn soft skills ↔ network / partnerships");
  }
  if (hasB(soft) && (hasA("Grow my network") || hasA("Build partnerships"))) {
    score += 6;
    reasons.push("Learn soft skills ↔ network / partnerships (reverse)");
  }

  if (hasA(LEARN_TECH_GOAL) && hasTechnicalDepth(confidentB)) {
    score += 8;
    reasons.push("Learn technical skills ↔ strong technical offering (B)");
  }
  if (hasB(LEARN_TECH_GOAL) && hasTechnicalDepth(confidentA)) {
    score += 8;
    reasons.push("Learn technical skills ↔ strong technical offering (A)");
  }

  return {score, reasons};
}

function workStructureBonus(a: DocumentData, b: DocumentData): number {
  const wa = a.work_structure;
  const wb = b.work_structure;
  if (!wa || typeof wa !== "object" || !wb || typeof wb !== "object") return 0;
  const flex = (x: DocumentData) =>
    typeof x.flexibility === "number" ? x.flexibility : null;
  const own = (x: DocumentData) =>
    typeof x.ownership === "number" ? x.ownership : null;
  const hours = (x: DocumentData) =>
    typeof x.weekly_hours === "number" ? x.weekly_hours : null;
  const fa = flex(wa);
  const fb = flex(wb);
  const oa = own(wa);
  const ob = own(wb);
  const ha = hours(wa);
  const hb = hours(wb);
  if (fa == null || fb == null || oa == null || ob == null || ha == null || hb == null) {
    return 0;
  }
  const close =
    Math.abs(fa - fb) <= 2 &&
    Math.abs(oa - ob) <= 2 &&
    Math.abs(ha - hb) <= 10;
  return close ? 2 : 0;
}

function weightedScore(skillRaw: number, goalRaw: number, contextRaw: number): number {
  const sn = Math.min(1, skillRaw / SKILL_CAP);
  const gn = Math.min(1, goalRaw / GOAL_CAP);
  const cn = Math.min(1, contextRaw / CONTEXT_CAP);
  return Math.round(100 * (0.7 * sn + 0.2 * gn + 0.1 * cn));
}

interface EligibleUser {
  uid: string;
  confident: string[];
  desired: string[];
  goals: string[];
  city?: string;
  state?: string;
  industry?: string;
  data: DocumentData;
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

function toEligibleUser(uid: string, d: DocumentData): EligibleUser | null {
  if (!isEligibleUser(d)) return null;
  return {
    uid,
    confident: asStringArray(d.confident_skills),
    desired: asStringArray(d.desired_skills),
    goals: asStringArray(d.business_goals),
    city: typeof d.city === "string" ? d.city.trim() : undefined,
    state: typeof d.state === "string" ? d.state.trim() : undefined,
    industry: typeof d.industry === "string" ? d.industry.trim() : undefined,
    data: d,
  };
}

function scorePair(a: EligibleUser, b: EligibleUser): {
  rawTotal: number;
  skillRaw: number;
  goalRaw: number;
  contextRaw: number;
  weighted: number;
  aNeedsFromB: string[];
  bNeedsFromA: string[];
  goalMatches: string[];
  sameCity: boolean;
  sameIndustry: boolean;
  mutualBonus: number;
} {
  const aNeedsFromB = overlap(a.desired, b.confident);
  const bNeedsFromA = overlap(b.desired, a.confident);

  let skillRaw = aNeedsFromB.length * 10 + bNeedsFromA.length * 10;
  let mutualBonus = 0;
  if (aNeedsFromB.length > 0 && bNeedsFromA.length > 0) {
    skillRaw += 10;
    mutualBonus += 10;
  }
  if (aNeedsFromB.length >= 2 && bNeedsFromA.length >= 2) {
    skillRaw += 15;
    mutualBonus += 15;
  }

  const goalResult = scoreGoals(a.goals, b.goals, a.confident, b.confident);
  const goalRaw = goalResult.score;

  let contextRaw = 0;
  const sameCity =
    !!a.city &&
    !!b.city &&
    a.city.toLowerCase() === b.city.toLowerCase();
  const sameState =
    !!a.state &&
    !!b.state &&
    a.state.toLowerCase() === b.state.toLowerCase();
  if (sameCity) contextRaw += 5;
  else if (sameState) contextRaw += 2;

  if (
    a.industry &&
    b.industry &&
    a.industry.toLowerCase() === b.industry.toLowerCase()
  ) {
    contextRaw += 3;
  }

  contextRaw += workStructureBonus(a.data, b.data);

  const rawTotal = skillRaw + goalRaw + contextRaw;
  const weighted = weightedScore(skillRaw, goalRaw, contextRaw);

  return {
    rawTotal,
    skillRaw,
    goalRaw,
    contextRaw,
    weighted,
    aNeedsFromB,
    bNeedsFromA,
    goalMatches: goalResult.reasons,
    sameCity,
    sameIndustry:
      !!a.industry &&
      !!b.industry &&
      a.industry.toLowerCase() === b.industry.toLowerCase(),
    mutualBonus,
  };
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
  a: EligibleUser,
  all: EligibleUser[],
  dmAdj: Map<string, Set<string>>,
  topN: number
): Promise<number> {
  const connected = dmAdj.get(a.uid) ?? new Set();
  const dismissed = dismissedSet(a.data);

  const scored: Array<{
    b: EligibleUser;
    rawTotal: number;
    weighted: number;
    skillRaw: number;
    goalRaw: number;
    contextRaw: number;
    aNeedsFromB: string[];
    bNeedsFromA: string[];
    goalMatches: string[];
    sameCity: boolean;
    sameIndustry: boolean;
    mutualBonus: number;
  }> = [];

  for (const b of all) {
    if (b.uid === a.uid) continue;
    if (connected.has(b.uid)) continue;
    if (dismissed.has(b.uid)) continue;

    const r = scorePair(a, b);
    if (r.rawTotal < MIN_RAW_SCORE) continue;

    scored.push({
      b,
      rawTotal: r.rawTotal,
      weighted: r.weighted,
      skillRaw: r.skillRaw,
      goalRaw: r.goalRaw,
      contextRaw: r.contextRaw,
      aNeedsFromB: r.aNeedsFromB,
      bNeedsFromA: r.bNeedsFromA,
      goalMatches: r.goalMatches,
      sameCity: r.sameCity,
      sameIndustry: r.sameIndustry,
      mutualBonus: r.mutualBonus,
    });
  }

  scored.sort((x, y) => {
    if (y.weighted !== x.weighted) return y.weighted - x.weighted;
    return y.rawTotal - x.rawTotal;
  });

  const top = scored.slice(0, topN);
  await clearExpansionMatches(a.uid);

  let batch = db.batch();
  let n = 0;
  const baseRef = db.collection("users").doc(a.uid).collection("expansion_matches");

  for (const row of top) {
    const ref = baseRef.doc(row.b.uid);
    batch.set(ref, {
      matchedUserId: row.b.uid,
      score: row.weighted,
      rawTotal: row.rawTotal,
      skillScore: row.skillRaw,
      goalScore: row.goalRaw,
      contextScore: row.contextRaw,
      mutualSkillBonus: row.mutualBonus,
      aNeedsFromB: row.aNeedsFromB,
      bNeedsFromA: row.bNeedsFromA,
      goalMatches: row.goalMatches,
      sameCity: row.sameCity,
      sameIndustry: row.sameIndustry,
      algorithmVersion: ALGORITHM_VERSION,
      updatedAt: FieldValue.serverTimestamp(),
    });
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

  const snap = await db.collection("users").where("networkAccess", "==", true).get();

  const eligible: EligibleUser[] = [];
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
