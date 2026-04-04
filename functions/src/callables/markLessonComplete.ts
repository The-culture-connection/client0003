/**
 * markLessonComplete Callable Function
 * Server-authoritative lesson completion
 * Updates chapter progress and checks for chapter completion
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

const markLessonCompleteSchema = z.object({
  lesson_id: z.string().min(1),
});

export const markLessonComplete = onCall(async (request) => {
  const callerUid = request.auth?.uid;

  if (!callerUid) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const validationResult = markLessonCompleteSchema.safeParse(request.data);
  if (!validationResult.success) {
    throw new HttpsError(
      "invalid-argument",
      `Invalid input: ${validationResult.error.message}`
    );
  }

  const {lesson_id} = validationResult.data;

  try {
    // Parse lesson_id format: "moduleId_chapterId_lessonId" or use direct path
    // For now, assume lesson_id contains full path info or we need to restructure
    // This is a simplified version - in production, lesson_id should be structured
    // Try to get lesson from a known structure
    // First, try to find lesson by searching (inefficient but works)
    const curriculaRef = db.collection("curricula").doc("mortar_masters_online");
    const modulesSnapshot = await curriculaRef.collection("modules").get();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let lessonData: Record<string, any> | null = null;
    let moduleId = "";
    let chapterId = "";

    for (const moduleDoc of modulesSnapshot.docs) {
      const chaptersSnapshot = await moduleDoc.ref.collection("chapters").get();
      for (const chapterDoc of chaptersSnapshot.docs) {
        const lessonRef = chapterDoc.ref.collection("lessons").doc(lesson_id);
        const lessonDoc = await lessonRef.get();
        if (lessonDoc.exists) {
          const data = lessonDoc.data();
          if (data) {
            lessonData = data;
            chapterId = chapterDoc.id;
            moduleId = moduleDoc.id;
            break;
          }
        }
      }
      if (lessonData) break;
    }

    if (!lessonData) {
      throw new HttpsError("not-found", "Lesson not found");
    }

    // Mark lesson as complete
    const progressRef = db
      .collection("user_progress")
      .doc(callerUid)
      .collection("lesson_progress")
      .doc(lesson_id);

    await progressRef.set(
      {
        lesson_id,
        completed: true,
        completed_at: FieldValue.serverTimestamp(),
        last_accessed_at: FieldValue.serverTimestamp(),
      },
      {merge: true}
    );

    // Update chapter result
    await updateChapterProgress(callerUid, chapterId, moduleId);

    // Log analytics
    db.collection("analytics_events").doc().set({
      event_type: "lesson_completed",
      user_id: callerUid,
      timestamp: FieldValue.serverTimestamp(),
      metadata: {
        lesson_id,
        chapter_id: chapterId,
        module_id: moduleId,
      },
    }).catch((err) => logger.error("Failed to log analytics:", err));

    return {success: true};
  } catch (error) {
    logger.error(`Error marking lesson complete for ${callerUid}:`, error);
    throw new HttpsError(
      "internal",
      `Failed to mark lesson complete: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
});

/**
 * Update chapter progress based on completed lessons
 * @param {string} userId - User ID
 * @param {string} chapterId - Chapter ID
 * @param {string} moduleId - Module ID
 * @return {Promise<void>}
 */
async function updateChapterProgress(
  userId: string,
  chapterId: string,
  moduleId: string
): Promise<void> {
  // Get all lessons for chapter
  const lessonsRef = db.collection("curricula")
    .doc("mortar_masters_online")
    .collection("modules")
    .doc(moduleId)
    .collection("chapters")
    .doc(chapterId)
    .collection("lessons");

  const lessonsSnapshot = await lessonsRef.get();
  const totalLessons = lessonsSnapshot.size;

  // Count completed lessons
  let completedLessons = 0;
  for (const lessonDoc of lessonsSnapshot.docs) {
    const lessonProgressRef = db
      .collection("user_progress")
      .doc(userId)
      .collection("lesson_progress")
      .doc(lessonDoc.id);

    const progressDoc = await lessonProgressRef.get();
    if (progressDoc.exists && progressDoc.data()?.completed) {
      completedLessons++;
    }
  }

  // Update chapter result
  const chapterResultRef = db
    .collection("user_progress")
    .doc(userId)
    .collection("chapter_results")
    .doc(chapterId);

  await chapterResultRef.set(
    {
      chapter_id: chapterId,
      module_id: moduleId,
      lessons_completed: completedLessons,
      total_lessons: totalLessons,
      updated_at: FieldValue.serverTimestamp(),
    },
    {merge: true}
  );
}
