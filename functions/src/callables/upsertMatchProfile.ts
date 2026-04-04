/**
 * upsertMatchProfile Callable Function
 * Updates or creates match profile for authenticated user
 * Normalizes skills, validates data, computes completeness score
 */

import {onCall, HttpsError} from "firebase-functions/v2/https";
import {initializeApp, getApps} from "firebase-admin/app";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {z} from "zod";
import * as logger from "firebase-functions/logger";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

const matchProfileSchema = z.object({
  location: z.object({
    city: z.string().min(1),
    state: z.string().min(1),
    radius_miles: z.number().optional(),
  }).optional(),
  goals: z.array(z.enum([
    "find_job",
    "hire",
    "sell_skills",
    "buy_skills",
    "mentor",
    "peer",
    "partner",
    "develop_skills",
    "enhance_capabilities",
  ])).optional(),
  industries: z.array(z.string()).optional(),
  role_titles: z.array(z.string()).optional(),
  skills_offer: z.array(z.string()).max(10).optional(),
  skills_want: z.array(z.string()).max(10).optional(),
  availability: z.object({
    start_date: z.string().optional(),
    hours_per_week: z.number().optional(),
  }).optional(),
  work_mode: z.enum(["remote", "hybrid", "on_site"]).optional(),
  compensation: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    currency: z.string().optional(),
  }).optional(),
  links: z.object({
    linkedin_url: z.string().url().optional().or(z.literal("")),
    portfolio_url: z.string().url().optional().or(z.literal("")),
  }).optional(),
  visibility: z.object({
    discovery: z.boolean().optional(),
    jobs: z.boolean().optional(),
    marketplace: z.boolean().optional(),
  }).optional(),
  consent: z.object({
    matching: z.boolean().optional(),
    marketing: z.boolean().optional(),
  }).optional(),
});

/**
 * Normalize skills: match free-text skills to canonical skill_ids using synonyms
 * @param {string[]} skillInputs - Array of skill names or IDs
 * @return {Promise<{normalized: string[], pending: string[]}>} Normalized skill IDs and pending skills
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any, require-jsdoc
async function normalizeSkills(skillInputs: string[]): Promise<{normalized: string[]; pending: string[]}> {
  if (!skillInputs || skillInputs.length === 0) {
    return {normalized: [], pending: []};
  }

  const normalized: string[] = [];
  const pending: string[] = [];

  try {
    // Get all active skills from taxonomies
    const skillsRef = db.collection("taxonomies").doc("skills").collection("items");
    const skillsSnapshot = await skillsRef.where("is_active", "==", true).get();

    // Build a map of skill name/synonym -> skill_id
    const skillMap = new Map<string, string>();
    skillsSnapshot.forEach((doc) => {
      const skillData = doc.data();
      const skillId = doc.id;
      const name = (skillData.name || "").toLowerCase().trim();

      // Map canonical name
      if (name) {
        skillMap.set(name, skillId);
      }

      // Map synonyms
      if (skillData.synonyms && Array.isArray(skillData.synonyms)) {
        skillData.synonyms.forEach((synonym: string) => {
          const synLower = (synonym || "").toLowerCase().trim();
          if (synLower && !skillMap.has(synLower)) {
            skillMap.set(synLower, skillId);
          }
        });
      }
    });

    // Normalize each input skill
    for (const skillInput of skillInputs) {
      const inputLower = skillInput.toLowerCase().trim();

      // Check if it's already a skill_id (exact match)
      if (skillsSnapshot.docs.some((doc) => doc.id === skillInput)) {
        normalized.push(skillInput);
        continue;
      }

      // Try to find match by name or synonym
      const matchedId = skillMap.get(inputLower);
      if (matchedId) {
        if (!normalized.includes(matchedId)) {
          normalized.push(matchedId);
        }
      } else {
        // No match found - add to pending queue
        if (!pending.includes(skillInput)) {
          pending.push(skillInput);
        }
      }
    }
  } catch (error) {
    logger.error("Error normalizing skills:", error);
    // On error, assume all are valid IDs or add to pending
    skillInputs.forEach((skill) => {
      if (!normalized.includes(skill) && !pending.includes(skill)) {
        pending.push(skill);
      }
    });
  }

  return {normalized, pending};
}

/**
 * Compute completeness score (0-100)
 * @param {Record<string, any>} profile - The match profile object
 * @return {number} Completeness score from 0 to 100
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any, require-jsdoc
function computeCompletenessScore(profile: Record<string, any>): number {
  let score = 0;
  const weights = {
    location: 15,
    goals: 15,
    skills_offer: 15,
    skills_want: 15,
    industries: 10,
    role_titles: 5,
    work_mode: 5,
    links: 5,
    consent: 15,
  };

  if (profile.location?.city && profile.location?.state) score += weights.location;
  if (profile.goals && profile.goals.length > 0) score += weights.goals;
  if (profile.skills_offer && profile.skills_offer.length > 0) score += weights.skills_offer;
  if (profile.skills_want && profile.skills_want.length > 0) score += weights.skills_want;
  if (profile.industries && profile.industries.length > 0) score += weights.industries;
  if (profile.role_titles && profile.role_titles.length > 0) score += weights.role_titles;
  if (profile.work_mode) score += weights.work_mode;
  if (profile.links?.linkedin_url || profile.links?.portfolio_url) score += weights.links;
  if (profile.consent?.matching) score += weights.consent;

  return Math.min(100, score);
}

/**
 * upsertMatchProfile Callable Function
 * Updates or creates match profile for authenticated user
 * @param {Object} request - The callable request object
 * @return {Promise<Object>} Success response with completeness score
 */
export const upsertMatchProfile = onCall(async (request) => {
  const callerUid = request.auth?.uid;

  if (!callerUid) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const validationResult = matchProfileSchema.safeParse(request.data);
  if (!validationResult.success) {
    throw new HttpsError(
      "invalid-argument",
      `Invalid input: ${validationResult.error.message}`
    );
  }

  const profile = validationResult.data;

  try {
    // Normalize skills (match to canonical skill_ids)
    if (profile.skills_offer && profile.skills_offer.length > 0) {
      const offerResult = await normalizeSkills(profile.skills_offer);
      profile.skills_offer = offerResult.normalized.slice(0, 10); // Enforce max 10

      // Store pending skills for admin review
      if (offerResult.pending.length > 0) {
        const pendingRef = db.collection("pending_skills").doc();
        await pendingRef.set({
          user_id: callerUid,
          skills: offerResult.pending,
          type: "offer",
          created_at: FieldValue.serverTimestamp(),
        });
        logger.info(`Pending skills (offer) for ${callerUid}:`, offerResult.pending);
      }
    }

    if (profile.skills_want && profile.skills_want.length > 0) {
      const wantResult = await normalizeSkills(profile.skills_want);
      profile.skills_want = wantResult.normalized.slice(0, 10); // Enforce max 10

      // Store pending skills for admin review
      if (wantResult.pending.length > 0) {
        const pendingRef = db.collection("pending_skills").doc();
        await pendingRef.set({
          user_id: callerUid,
          skills: wantResult.pending,
          type: "want",
          created_at: FieldValue.serverTimestamp(),
        });
        logger.info(`Pending skills (want) for ${callerUid}:`, wantResult.pending);
      }
    }

    // Enforce max counts for other arrays
    if (profile.industries && profile.industries.length > 3) {
      profile.industries = profile.industries.slice(0, 3);
    }
    if (profile.role_titles && profile.role_titles.length > 2) {
      profile.role_titles = profile.role_titles.slice(0, 2);
    }

    // Normalize URLs (trim, lowercase, validate)
    if (profile.links) {
      if (profile.links.linkedin_url) {
        let url = profile.links.linkedin_url.trim().toLowerCase();
        // Ensure it's a valid URL
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
          url = `https://${url}`;
        }
        profile.links.linkedin_url = url;
      }
      if (profile.links.portfolio_url) {
        let url = profile.links.portfolio_url.trim().toLowerCase();
        // Ensure it's a valid URL
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
          url = `https://${url}`;
        }
        profile.links.portfolio_url = url;
      }
    }

    // Compute completeness score
    const completenessScore = computeCompletenessScore(profile);

    // Update match profile
    const matchProfileRef = db.collection("match_profiles").doc(callerUid);
    await matchProfileRef.set(
      {
        uid: callerUid,
        ...profile,
        completeness_score: completenessScore,
        skills_offer_count: profile.skills_offer?.length || 0,
        skills_want_count: profile.skills_want?.length || 0,
        primary_industry_id: profile.industries?.[0] || null,
        updated_at: FieldValue.serverTimestamp(),
      },
      {merge: true}
    );

    logger.info(`Match profile updated for ${callerUid}`, {
      completeness_score: completenessScore,
      goals_count: profile.goals?.length || 0,
    });

    return {
      success: true,
      completeness_score: completenessScore,
      message: "Match profile updated successfully",
    };
  } catch (error) {
    logger.error(`Error updating match profile for ${callerUid}:`, error);
    throw new HttpsError(
      "internal",
      `Failed to update match profile: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
});
