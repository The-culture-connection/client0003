/**
 * Shared user-to-user match scoring (skills + goals + light context).
 *
 * Used by both `runExpansionUserMatching` (Networking Hall) and
 * `runConferenceUserMatching` (conference attendees), so the two produce
 * identical scores for the same pair of profiles. Only the candidate pool and
 * where results are written differ between them.
 */

import {FieldValue, type DocumentData} from "firebase-admin/firestore";

export const ALGORITHM_VERSION = 2;
export const TOP_N = 10;
export const MIN_RAW_SCORE = 15;

/** Normalize components before applying 70% / 20% / 10% weights. */
const SKILL_CAP = 150;
const GOAL_CAP = 70;
const CONTEXT_CAP = 15;

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

export function asStringArray(v: unknown): string[] {
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

export interface MatchCandidate {
  uid: string;
  confident: string[];
  desired: string[];
  goals: string[];
  city?: string;
  state?: string;
  industry?: string;
  data: DocumentData;
}

/** The scoring view of a `users/{uid}` doc. Eligibility is the caller's call. */
export function toMatchCandidate(uid: string, d: DocumentData): MatchCandidate {
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

export interface PairScore {
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
}

export function scorePair(a: MatchCandidate, b: MatchCandidate): PairScore {
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

/**
 * Scores [a] against every allowed candidate in [pool] and returns the best
 * [topN], strongest first. Pairs below [MIN_RAW_SCORE] are dropped.
 */
export function rankMatches(
  a: MatchCandidate,
  pool: MatchCandidate[],
  isExcluded: (b: MatchCandidate) => boolean,
  topN: number = TOP_N
): Array<{b: MatchCandidate; score: PairScore}> {
  const scored: Array<{b: MatchCandidate; score: PairScore}> = [];
  for (const b of pool) {
    if (b.uid === a.uid) continue;
    if (isExcluded(b)) continue;
    const score = scorePair(a, b);
    if (score.rawTotal < MIN_RAW_SCORE) continue;
    scored.push({b, score});
  }
  scored.sort((x, y) => {
    if (y.score.weighted !== x.score.weighted) return y.score.weighted - x.score.weighted;
    return y.score.rawTotal - x.score.rawTotal;
  });
  return scored.slice(0, topN);
}

/** Firestore fields for one match row — same shape in both match collections. */
export function matchDocFields(matchedUserId: string, s: PairScore): Record<string, unknown> {
  return {
    matchedUserId,
    score: s.weighted,
    rawTotal: s.rawTotal,
    skillScore: s.skillRaw,
    goalScore: s.goalRaw,
    contextScore: s.contextRaw,
    mutualSkillBonus: s.mutualBonus,
    aNeedsFromB: s.aNeedsFromB,
    bNeedsFromA: s.bNeedsFromA,
    goalMatches: s.goalMatches,
    sameCity: s.sameCity,
    sameIndustry: s.sameIndustry,
    algorithmVersion: ALGORITHM_VERSION,
    updatedAt: FieldValue.serverTimestamp(),
  };
}
