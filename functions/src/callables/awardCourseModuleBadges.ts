import {onCall, HttpsError} from "firebase-functions/v2/https";
import {initializeApp, getApps} from "firebase-admin/app";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {z} from "zod";
import {callableCorsAllowlist} from "../callableCorsAllowlist";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

const schema = z.object({
  course_id: z.string().min(1),
  module_ids: z.array(z.string().min(1)).max(50),
});

type CourseDoc = {
  modules?: Array<{completionBadgeIds?: string[]; title?: string}>;
  curriculumMapping?: {
    modules?: Array<{
      moduleId?: string;
      chapters?: Array<{lessons?: Array<{lessonId?: string}>}>;
    }>;
  };
};

type ProgressDoc = {
  lessonsCompleted?: Record<string, boolean>;
};

export const awardCourseModuleBadges = onCall(
  {region: "us-central1", cors: callableCorsAllowlist},
  async (request) => {
    const callerUid = request.auth?.uid;
    if (!callerUid) throw new HttpsError("unauthenticated", "User must be authenticated.");
    const parsed = schema.safeParse(request.data);
    if (!parsed.success) throw new HttpsError("invalid-argument", parsed.error.message);

    const {course_id, module_ids} = parsed.data;
    if (module_ids.length === 0) return {awarded_badge_ids: [] as string[]};

    const [courseSnap, progressSnap] = await Promise.all([
      db.collection("courses").doc(course_id).get(),
      db.collection("courseProgress").doc(`${callerUid}_${course_id}`).get(),
    ]);
    if (!courseSnap.exists) throw new HttpsError("not-found", "Course not found.");
    if (!progressSnap.exists) throw new HttpsError("failed-precondition", "No progress found for user.");

    const course = courseSnap.data() as CourseDoc;
    const progress = progressSnap.data() as ProgressDoc;
    const lessonsCompleted = progress.lessonsCompleted ?? {};

    const mappingModules = course.curriculumMapping?.modules ?? [];
    const courseModules = course.modules ?? [];
    const allowedBadgeIds = new Set<string>();

    for (let i = 0; i < mappingModules.length; i++) {
      const mapMod = mappingModules[i];
      const moduleId = mapMod?.moduleId;
      if (!moduleId || !module_ids.includes(moduleId)) continue;

      const moduleLessonIds =
        mapMod?.chapters?.flatMap((c) => c.lessons ?? []).map((l) => l.lessonId).filter(Boolean) as string[];
      if (moduleLessonIds.length === 0) continue;

      const completed = moduleLessonIds.every((lessonId) => lessonsCompleted[lessonId] === true);
      if (!completed) continue;

      const badgeIds = courseModules[i]?.completionBadgeIds ?? [];
      for (const badgeId of badgeIds) {
        if (badgeId?.trim()) allowedBadgeIds.add(badgeId.trim());
      }
    }

    const awardedBadgeIds = Array.from(allowedBadgeIds);
    if (awardedBadgeIds.length === 0) return {awarded_badge_ids: [] as string[]};

    await db.collection("users").doc(callerUid).set({
      badges: {earned: FieldValue.arrayUnion(...awardedBadgeIds)},
      updatedAt: FieldValue.serverTimestamp(),
    }, {merge: true});

    return {awarded_badge_ids: awardedBadgeIds};
  }
);

