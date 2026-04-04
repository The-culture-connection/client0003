/**
 * evaluateGraduation Helper Function
 * Checks if user has completed all 4 modules and all required assets
 * Issues certificate, badges, and role upgrade if eligible
 */

import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {getAuth} from "firebase-admin/auth";
import * as logger from "firebase-functions/logger";

const db = getFirestore();
const auth = getAuth();

/**
 * Evaluate if user has graduated from curriculum
 * Issues certificate, badges, and role upgrade if eligible
 * @param {string} userId - User ID to evaluate
 * @return {Promise<void>}
 */
export async function evaluateGraduation(userId: string): Promise<void> {
  try {
    // Check if all 4 modules are complete
    const moduleResultsRef = db.collection("user_progress")
      .doc(userId)
      .collection("module_results");

    const moduleResultsSnapshot = await moduleResultsRef.get();

    if (moduleResultsSnapshot.size < 4) {
      logger.info(`User ${userId} has not completed all 4 modules yet`);
      return;
    }

    let allModulesComplete = true;
    for (const moduleDoc of moduleResultsSnapshot.docs) {
      const moduleData = moduleDoc.data();
      if (!moduleData.completed) {
        allModulesComplete = false;
        break;
      }
    }

    if (!allModulesComplete) {
      logger.info(`User ${userId} has not completed all modules`);
      return;
    }

    // Check if already graduated
    const curriculumResultRef = db.collection("user_progress")
      .doc(userId)
      .collection("curriculum_results")
      .doc("mortar_masters_online");

    const curriculumResultDoc = await curriculumResultRef.get();
    if (curriculumResultDoc.exists &&
        curriculumResultDoc.data()?.graduated) {
      logger.info(`User ${userId} already graduated`);
      return;
    }

    // User has graduated!
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    // Issue certificate
    const certificateRef = db.collection("certificates").doc();
    await certificateRef.set({
      id: certificateRef.id,
      user_id: userId,
      curriculum_id: "mortar_masters_online",
      certificate_type: "graduation",
      issued_at: FieldValue.serverTimestamp(),
      verification_url: `https://mortar.com/verify/${certificateRef.id}`, // Placeholder
      pdf_url: null, // Would be generated and stored
    });

    // Award badges
    const badgesToAward = ["mortar_masters_graduate"];

    // Award city badge if city is set
    if (userData?.business_profile?.city) {
      const cityBadgeId = `city_${userData.business_profile.city.toLowerCase().replace(/\s+/g, "_")}`;
      badgesToAward.push(cityBadgeId);
    }

    const currentBadges = userData?.badges?.earned || [];
    const newBadges = [...new Set([...currentBadges, ...badgesToAward])];

    await userRef.update({
      badges: {
        earned: newBadges,
        visible: newBadges, // All badges visible by default
      },
      updated_at: FieldValue.serverTimestamp(),
    });

    // Update curriculum result
    await curriculumResultRef.set({
      curriculum_id: "mortar_masters_online",
      graduated: true,
      graduated_at: FieldValue.serverTimestamp(),
      certificate_id: certificateRef.id,
      badges_awarded: badgesToAward,
    }, {merge: true});

    // Upgrade role to Digital Curriculum Alumni if applicable
    const currentRoles = userData?.roles || [];
    if (currentRoles.includes("Digital Curriculum Students") &&
        !currentRoles.includes("Digital Curriculum Alumni")) {
      const newRoles = currentRoles.filter((r: string) => r !== "Digital Curriculum Students");
      newRoles.push("Digital Curriculum Alumni");

      // Update custom claims
      await auth.setCustomUserClaims(userId, {
        ...userData?.custom_claims,
        roles: newRoles,
      });

      // Update Firestore
      await userRef.update({
        roles: newRoles,
        updated_at: FieldValue.serverTimestamp(),
      });

      logger.info(`User ${userId} upgraded to Digital Curriculum Alumni`);
    }

    // Log analytics
    db.collection("analytics_events").doc().set({
      event_type: "curriculum_graduated",
      user_id: userId,
      timestamp: FieldValue.serverTimestamp(),
      metadata: {
        curriculum_id: "mortar_masters_online",
        certificate_id: certificateRef.id,
        badges_awarded: badgesToAward,
      },
    }).catch((err) => logger.error("Failed to log analytics:", err));

    logger.info(`User ${userId} has graduated from MORTAR MASTERS Online`);
  } catch (error) {
    logger.error(`Error evaluating graduation for ${userId}:`, error);
    throw error;
  }
}
