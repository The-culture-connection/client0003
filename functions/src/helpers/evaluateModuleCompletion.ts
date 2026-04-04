/**
 * evaluateModuleCompletion Helper Function
 * Checks if all required assets for a module are finalized
 * Updates module completion status if satisfied
 */

import {getFirestore, FieldValue} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import {evaluateGraduation} from "./evaluateGraduation";

const db = getFirestore();

/**
 * Evaluate if module is complete (all assets finalized + chapters complete)
 * @param {string} userId - User ID
 * @param {string} moduleId - Module ID
 * @return {Promise<void>}
 */
export async function evaluateModuleCompletion(
  userId: string,
  moduleId: string
): Promise<void> {
  try {
    // Get module asset requirements
    const requirementsRef = db.collection("module_asset_requirements")
      .doc(moduleId)
      .collection("requirements");

    const requirementsSnapshot = await requirementsRef.get();
    const requiredTemplateIds = requirementsSnapshot.docs.map((doc) => doc.id);

    if (requiredTemplateIds.length === 0) {
      // No requirements, module is complete if all chapters are complete
      logger.info(`Module ${moduleId} has no asset requirements`);
      return;
    }

    // Check if user has finalized all required assets
    const dataRoomRef = db.collection("data_rooms")
      .doc(userId)
      .collection("documents");

    let allFinalized = true;
    for (const templateId of requiredTemplateIds) {
      const docsQuery = await dataRoomRef
        .where("template_id", "==", templateId)
        .where("is_final", "==", true)
        .limit(1)
        .get();

      if (docsQuery.empty) {
        allFinalized = false;
        break;
      }
    }

    // Get chapter results to check if all chapters are complete
    const chapterResultsRef = db.collection("user_progress")
      .doc(userId)
      .collection("chapter_results");

    const chapterResultsSnapshot = await chapterResultsRef
      .where("module_id", "==", moduleId)
      .get();

    let allChaptersComplete = true;
    for (const chapterDoc of chapterResultsSnapshot.docs) {
      const chapterData = chapterDoc.data();
      // Check if chapter has all lessons complete and quiz passed
      if (!chapterData.lessons_completed ||
          chapterData.lessons_completed < chapterData.total_lessons ||
          !chapterData.quiz_passed) {
        allChaptersComplete = false;
        break;
      }
    }

    // Update module result
    const moduleResultRef = db.collection("user_progress")
      .doc(userId)
      .collection("module_results")
      .doc(moduleId);

    const moduleComplete = allFinalized && allChaptersComplete;

    await moduleResultRef.set({
      module_id: moduleId,
      completed: moduleComplete,
      assets_finalized: allFinalized,
      chapters_completed: allChaptersComplete,
      completed_at: moduleComplete ? FieldValue.serverTimestamp() : null,
      updated_at: FieldValue.serverTimestamp(),
    }, {merge: true});

    if (moduleComplete) {
      // Log analytics
      db.collection("analytics_events").doc().set({
        event_type: "module_completed",
        user_id: userId,
        timestamp: FieldValue.serverTimestamp(),
        metadata: {
          module_id: moduleId,
        },
      }).catch((err) => logger.error("Failed to log analytics:", err));

      // Check for graduation
      await evaluateGraduation(userId);
    }

    logger.info(`Module ${moduleId} evaluation for ${userId}: complete=${moduleComplete}`);
  } catch (error) {
    logger.error(`Error evaluating module completion for ${userId}:`, error);
    throw error;
  }
}
