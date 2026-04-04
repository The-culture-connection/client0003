/**
 * buildInitialMatches Callable Function
 * Generate initial match suggestions after onboarding completion
 * Stub scoring algorithm (simple overlap-based for v1)
 */

import {onCall, HttpsError} from "firebase-functions/v2/https";
import {initializeApp, getApps} from "firebase-admin/app";
import {getFirestore, FieldValue, Timestamp} from "firebase-admin/firestore";
import {z} from "zod";
import * as logger from "firebase-functions/logger";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

const buildInitialMatchesSchema = z.object({
  uid: z.string().min(1).optional(), // Optional, defaults to caller UID
});

/**
 * Simple overlap-based scoring algorithm
 * @param {any} userProfile - The user's match profile
 * @param {any} candidateProfile - The candidate's match profile
 * @return {number} Score from 0 to 100
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any, require-jsdoc
function calculateMatchScore(userProfile: any, candidateProfile: any): {score: number; reasons: string[]} {
  let score = 0;
  const reasons: string[] = [];

  // Goal overlap (30 points max)
  if (userProfile.goals && candidateProfile.goals) {
    const goalOverlap = userProfile.goals.filter((g: string) =>
      candidateProfile.goals.includes(g)
    ).length;
    const goalScore = Math.min(30, (goalOverlap / Math.max(userProfile.goals.length, 1)) * 30);
    score += goalScore;
    if (goalOverlap > 0) {
      reasons.push(`Shared ${goalOverlap} goal(s)`);
    }
  }

  // Skills overlap (40 points max)
  if (userProfile.skills_want && candidateProfile.skills_offer) {
    const skillOverlap = userProfile.skills_want.filter((s: string) =>
      candidateProfile.skills_offer.includes(s)
    ).length;
    const skillScore = Math.min(40, (skillOverlap / Math.max(userProfile.skills_want.length, 1)) * 40);
    score += skillScore;
    if (skillOverlap > 0) {
      reasons.push(`Matches ${skillOverlap} skill(s) you want`);
    }
  }

  // Industry match (15 points max)
  if (userProfile.industries && candidateProfile.industries) {
    const industryOverlap = userProfile.industries.filter((i: string) =>
      candidateProfile.industries.includes(i)
    ).length;
    if (industryOverlap > 0) {
      score += 15;
      reasons.push("Same industry");
    }
  }

  // Location proximity (15 points max) - stub for now
  if (userProfile.location?.city === candidateProfile.location?.city) {
    score += 15;
    reasons.push("Same city");
  }

  return {score: Math.min(100, score), reasons};
}

export const buildInitialMatches = onCall(async (request) => {
  const callerUid = request.auth?.uid;

  if (!callerUid) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const validationResult = buildInitialMatchesSchema.safeParse(request.data || {});
  if (!validationResult.success) {
    throw new HttpsError(
      "invalid-argument",
      `Invalid input: ${validationResult.error.message}`
    );
  }

  const targetUid = validationResult.data.uid || callerUid;

  // Only allow users to build matches for themselves (unless admin in future)
  if (targetUid !== callerUid) {
    throw new HttpsError(
      "permission-denied",
      "Cannot build matches for other users"
    );
  }

  try {
    // Get user's match profile
    const userProfileRef = db.collection("match_profiles").doc(targetUid);
    const userProfileDoc = await userProfileRef.get();

    if (!userProfileDoc.exists) {
      throw new HttpsError(
        "not-found",
        "Match profile not found. Complete onboarding first."
      );
    }

    const userProfile = userProfileDoc.data();
    if (!userProfile) {
      throw new HttpsError("internal", "Failed to load user profile");
    }

    // Clear existing suggestions
    const suggestionsRef = db.collection("matches").doc(targetUid).collection("suggestions");
    const existingSuggestions = await suggestionsRef.get();
    const batch = db.batch();
    existingSuggestions.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    interface MatchSuggestion {
      type: string;
      target_id: string;
      score: number;
      reasons: string[];
      created_at: ReturnType<typeof FieldValue.serverTimestamp> | Timestamp;
    }

    const newSuggestions: MatchSuggestion[] = [];

    // Generate user-to-user matches (if visibility.discovery is true)
    if (userProfile.visibility?.discovery !== false) {
      const allProfilesSnapshot = await db
        .collection("match_profiles")
        .where("visibility.discovery", "==", true)
        .limit(50)
        .get();

      for (const candidateDoc of allProfilesSnapshot.docs) {
        if (candidateDoc.id === targetUid) continue; // Skip self

        const candidateProfile = candidateDoc.data();
        const matchResult = calculateMatchScore(userProfile, candidateProfile);

        if (matchResult.score > 20) { // Only suggest matches with score > 20
          newSuggestions.push({
            type: "user",
            target_id: candidateDoc.id,
            score: matchResult.score,
            reasons: matchResult.reasons,
            created_at: FieldValue.serverTimestamp(),
          });
        }
      }
    }

    // Generate job matches (if goals include "find_job")
    if (userProfile.goals?.includes("find_job")) {
      const jobsSnapshot = await db
        .collection("jobs")
        .where("status", "==", "active")
        .limit(20)
        .get();

      for (const jobDoc of jobsSnapshot.docs) {
        const job = jobDoc.data();
        let score = 0;
        const reasons: string[] = [];

        // Industry match
        if (userProfile.industries && job.industry_id) {
          if (userProfile.industries.includes(job.industry_id)) {
            score += 30;
            reasons.push("Industry match");
          }
        }

        // Skills match
        if (userProfile.skills_offer && job.required_skills) {
          const skillOverlap = userProfile.skills_offer.filter((s: string) =>
            job.required_skills.includes(s)
          ).length;
          if (skillOverlap > 0) {
            score += Math.min(50, (skillOverlap / job.required_skills.length) * 50);
            reasons.push(`Matches ${skillOverlap} required skill(s)`);
          }
        }

        // Location match
        if (userProfile.location?.city === job.location?.city) {
          score += 20;
          reasons.push("Same city");
        }

        if (score > 20) {
          newSuggestions.push({
            type: "job",
            target_id: jobDoc.id,
            score,
            reasons,
            created_at: FieldValue.serverTimestamp(),
          });
        }
      }
    }

    // Generate skill ad matches (if goals include "buy_skills" or "sell_skills")
    if (userProfile.goals?.some((g: string) => g === "buy_skills" || g === "sell_skills")) {
      const skillAdsSnapshot = await db
        .collection("skill_ads")
        .where("status", "==", "active")
        .limit(20)
        .get();

      for (const adDoc of skillAdsSnapshot.docs) {
        const ad = adDoc.data();

        // Only match if user wants skills that ad offers
        if (userProfile.goals?.includes("buy_skills") && userProfile.skills_want && ad.offered_skills) {
          const skillOverlap = userProfile.skills_want.filter((s: string) =>
            ad.offered_skills.includes(s)
          ).length;

          if (skillOverlap > 0) {
            const score = Math.min(100, (skillOverlap / userProfile.skills_want.length) * 100);
            newSuggestions.push({
              type: "skill_ad",
              target_id: adDoc.id,
              score,
              reasons: [`Matches ${skillOverlap} skill(s) you want`],
              created_at: FieldValue.serverTimestamp(),
            });
          }
        }
      }
    }

    // Sort by score (descending) and limit to top 20
    newSuggestions.sort((a, b) => b.score - a.score);
    const topSuggestions = newSuggestions.slice(0, 20);

    // Write suggestions to Firestore
    const suggestionsBatch = db.batch();
    const suggestionsCollectionRef = db.collection("matches").doc(targetUid).collection("suggestions");
    topSuggestions.forEach((suggestion) => {
      const suggestionRef = suggestionsCollectionRef.doc();
      suggestionsBatch.set(suggestionRef, suggestion);
    });
    await suggestionsBatch.commit();

    logger.info(`Built ${topSuggestions.length} match suggestions for ${targetUid}`);

    return {
      success: true,
      suggestions_count: topSuggestions.length,
      message: "Match suggestions generated successfully",
    };
  } catch (error) {
    logger.error(`Error building matches for ${targetUid}:`, error);
    throw new HttpsError(
      "internal",
      `Failed to build matches: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
});
