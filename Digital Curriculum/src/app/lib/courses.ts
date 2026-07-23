/**
 * Course management utilities
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  deleteDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "./firebase";
import type { LessonQuiz, LessonSurvey, LessonSurveyCheckpoint } from "./curriculum";

/** Legacy single end-of-lesson survey id (migrated docs). */
export const LEGACY_LESSON_SURVEY_ID = "default";

/** Progress / answers key for a specific survey checkpoint. */
export function lessonSurveyProgressKey(lessonId: string, surveyId: string): string {
  return `${lessonId}::${surveyId}`;
}

export interface Lesson {
  id?: string;
  title: string;
  /** Short descriptor shown under the title in course lists. */
  subtitle?: string;
  /** Skill awarded on completing this lesson (display only here). */
  skill?: string;
  order: number;
  slideUrl?: string; // URL to uploaded PowerPoint file
  slideFileName?: string;
  completed?: boolean; // for user progress tracking
}

export interface Module {
  id?: string;
  title: string;
  description?: string;
  order: number;
  price: number; // Price for this module
  durationMonths?: number; // Duration in months to complete this module
  skills?: string[]; // Optional skill labels (e.g. from onboarding taxonomy)
  completionBadgeIds?: string[]; // Optional badge ids to award on module completion
  skillCertificates?: Array<{
    skill: string;
    pdfUrl: string;
    storagePath?: string;
  }>;
  lessons: Lesson[];
}

export interface Course {
  id?: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  currency?: string;
  modules: Module[];
  assignedRoles?: string[]; // Array of role names
  assignedUserIds?: string[]; // Array of specific user IDs
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  status?: "draft" | "published" | "archived";
  /**
   * Bumped (to Date.now()) by the admin "Publish update to assignees" action.
   * When a learner's `syncedContentVersion` is behind this, their completion is
   * re-opened so they get the latest course content. See reconcileCourseContentVersion.
   */
  contentVersion?: number;
  totalDuration?: number; // Total course duration in minutes
  totalPrice?: number; // Total price of all modules (calculated)
  curriculumMapping?: {
    curriculumId: string;
    modules: Array<{
      moduleId: string;
      chapters: Array<{
        chapterId: string;
        lessons: Array<{ lessonId: string; title: string }>;
      }>;
    }>;
  };
}

/**
 * Upload a file (PowerPoint) to Firebase Storage
 */
export async function uploadCourseFile(
  file: File,
  courseId: string,
  moduleId: string,
  lessonId: string
): Promise<string> {
  try {
    // Create a unique file path
    const fileExtension = file.name.split(".").pop();
    const fileName = `courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/slides.${fileExtension}`;
    const storageRef = ref(storage, fileName);

    // Upload file with metadata to prevent automatic downloads
    const metadata = {
      contentType: file.type,
      contentDisposition: `inline; filename="${file.name}"`, // Use 'inline' instead of 'attachment' to display in browser
    };

    await uploadBytes(storageRef, file, metadata);

    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading course file:", error);
    throw error;
  }
}

/**
 * Upload a skill certificate PDF template for a module skill.
 */
export async function uploadSkillCertificatePdf(
  file: File,
  opts: {
    courseTitle: string;
    moduleTitle: string;
    skill: string;
    uploadedByUid: string;
  }
): Promise<{ pdfUrl: string; storagePath: string }> {
  if (!file.type.includes("pdf")) {
    throw new Error("Certificate file must be a PDF.");
  }
  const safe = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80) || "untitled";
  const ext = file.name.toLowerCase().endsWith(".pdf") ? "pdf" : "pdf";
  const storagePath = [
    "course_skill_certificates",
    safe(opts.uploadedByUid),
    safe(opts.courseTitle),
    safe(opts.moduleTitle),
    `${safe(opts.skill)}_${Date.now()}.${ext}`,
  ].join("/");
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file, {
    contentType: "application/pdf",
    contentDisposition: `inline; filename="${file.name}"`,
  });
  const pdfUrl = await getDownloadURL(storageRef);
  return { pdfUrl, storagePath };
}

/**
 * Create a new course
 */
export async function createCourse(courseData: Omit<Course, "id" | "createdAt" | "updatedAt">): Promise<string> {
  try {
    // Calculate total duration if lessons have duration
    const totalDuration = courseData.modules.reduce((total, module) => {
      return (
        total +
        module.lessons.reduce((moduleTotal, lesson) => {
          return moduleTotal + (lesson.duration || 0);
        }, 0)
      );
    }, 0);

    // Calculate total price from all modules
    const totalPrice = courseData.modules.reduce((total, module) => {
      return total + (module.price || 0);
    }, 0);

    const courseRef = await addDoc(collection(db, "courses"), {
      ...courseData,
      totalDuration,
      totalPrice,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return courseRef.id;
  } catch (error) {
    console.error("Error creating course:", error);
    throw error;
  }
}

/**
 * Update an existing course
 */
export async function updateCourse(
  courseId: string,
  updates: Partial<Omit<Course, "id" | "createdAt">>
): Promise<void> {
  try {
    const courseRef = doc(db, "courses", courseId);

    // Recalculate total duration and total price if modules are updated
    if (updates.modules) {
      const totalDuration = updates.modules.reduce((total, module) => {
        return total + (module.durationMonths || 0);
      }, 0);
      const totalPrice = updates.modules.reduce((total, module) => {
        return total + (module.price || 0);
      }, 0);
      updates.totalDuration = totalDuration;
      updates.totalPrice = totalPrice;
    }

    await updateDoc(courseRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating course:", error);
    throw error;
  }
}

/**
 * Stamp the course with a new content version ("Publish update to assignees").
 * Every assigned learner whose progress is synced to an older version will be
 * re-opened to the latest content on their next visit (see
 * reconcileCourseContentVersion). Returns the new version.
 */
export async function bumpCourseContentVersion(courseId: string): Promise<number> {
  const version = Date.now();
  await updateDoc(doc(db, "courses", courseId), {
    contentVersion: version,
    updatedAt: serverTimestamp(),
  });
  return version;
}

/**
 * Get a course by ID
 */
export async function getCourse(courseId: string): Promise<Course | null> {
  try {
    const courseRef = doc(db, "courses", courseId);
    const courseSnap = await getDoc(courseRef);

    if (!courseSnap.exists()) {
      return null;
    }

    return {
      id: courseSnap.id,
      ...courseSnap.data(),
      createdAt: courseSnap.data().createdAt || Timestamp.now(),
      updatedAt: courseSnap.data().updatedAt || Timestamp.now(),
    } as Course;
  } catch (error) {
    console.error("Error getting course:", error);
    throw error;
  }
}

/**
 * Get all courses
 */
export async function getAllCourses(): Promise<Course[]> {
  try {
    const coursesRef = collection(db, "courses");
    const q = query(coursesRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt || Timestamp.now(),
      updatedAt: doc.data().updatedAt || Timestamp.now(),
    })) as Course[];
  } catch (error) {
    console.error("Error getting courses:", error);
    throw error;
  }
}

/**
 * Get courses assigned to a specific role
 */
export async function getCoursesByRole(role: string): Promise<Course[]> {
  try {
    const coursesRef = collection(db, "courses");
    const q = query(
      coursesRef,
      where("assignedRoles", "array-contains", role),
      where("status", "==", "published"),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt || Timestamp.now(),
      updatedAt: doc.data().updatedAt || Timestamp.now(),
    })) as Course[];
  } catch (error) {
    console.error("Error getting courses by role:", error);
    throw error;
  }
}

/**
 * Get courses assigned to a specific user
 */
export async function getCoursesByUserId(userId: string): Promise<Course[]> {
  try {
    const coursesRef = collection(db, "courses");
    const q = query(
      coursesRef,
      where("assignedUserIds", "array-contains", userId),
      where("status", "==", "published"),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt || Timestamp.now(),
      updatedAt: doc.data().updatedAt || Timestamp.now(),
    })) as Course[];
  } catch (error) {
    console.error("Error getting courses by user ID:", error);
    throw error;
  }
}

/**
 * Course IDs the learner has started or completed (from courseProgress).
 * Used so Digital Curriculum Alumni retain access after role change from Student.
 */
export async function getCourseIdsFromUserProgress(userId: string): Promise<string[]> {
  try {
    const progressRef = collection(db, "courseProgress");
    const q = query(progressRef, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    const ids = new Set<string>();
    querySnapshot.docs.forEach((docSnap) => {
      const courseId = docSnap.data().courseId;
      if (typeof courseId === "string" && courseId.trim()) {
        ids.add(courseId);
      }
    });
    return [...ids];
  } catch (error) {
    console.error("Error getting course IDs from progress:", error);
    return [];
  }
}

function mergeCoursesUnique(courses: Course[]): Course[] {
  const seen = new Set<string>();
  const merged: Course[] = [];
  for (const course of courses) {
    if (!course.id || seen.has(course.id)) continue;
    seen.add(course.id);
    merged.push(course);
  }
  return merged;
}

/**
 * Courses visible to a learner: role/user assignments plus any course with saved progress.
 * Alumni who lose the Digital Curriculum Students role still see courses they completed as students.
 */
export async function getCoursesForLearner(userId: string, roles: string[]): Promise<Course[]> {
  try {
    const [byUserId, byRoleArrays, progressCourseIds] = await Promise.all([
      getCoursesByUserId(userId),
      Promise.all(roles.map((role) => getCoursesByRole(role))),
      getCourseIdsFromUserProgress(userId),
    ]);

    const assigned = mergeCoursesUnique([...byUserId, ...byRoleArrays.flat()]);
    const assignedIds = new Set(assigned.map((c) => c.id).filter(Boolean) as string[]);
    const missingProgressIds = progressCourseIds.filter((id) => !assignedIds.has(id));

    if (missingProgressIds.length === 0) {
      return assigned;
    }

    const progressCourses = (
      await Promise.all(missingProgressIds.map((courseId) => getCourse(courseId)))
    ).filter((c): c is Course => Boolean(c?.id));

    return mergeCoursesUnique([...assigned, ...progressCourses]);
  } catch (error) {
    console.error("Error getting courses for learner:", error);
    throw error;
  }
}

/**
 * Delete a course
 */
export async function deleteCourse(courseId: string): Promise<void> {
  try {
    // Optionally delete associated files from storage
    // This would require listing all files in the course folder
    
    const courseRef = doc(db, "courses", courseId);
    await deleteDoc(courseRef);
  } catch (error) {
    console.error("Error deleting course:", error);
    throw error;
  }
}

/**
 * Delete a lesson file from storage
 */
export async function deleteLessonFile(
  courseId: string,
  moduleId: string,
  lessonId: string,
  fileName: string
): Promise<void> {
  try {
    const fileExtension = fileName.split(".").pop();
    const filePath = `courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/slides.${fileExtension}`;
    const storageRef = ref(storage, filePath);
    await deleteObject(storageRef);
  } catch (error) {
    console.error("Error deleting lesson file:", error);
    throw error;
  }
}

/** Path: courses/{courseId}/lessonQuizzes/{lessonId} (4 segments = valid document) */
export function getCourseLessonQuizPath(courseId: string, lessonId: string): string {
  return `courses/${courseId}/lessonQuizzes/${lessonId}`;
}

/**
 * Get lesson quiz config for a course lesson. Returns null if none.
 */
export async function getCourseLessonQuiz(
  courseId: string,
  lessonId: string
): Promise<LessonQuiz | null> {
  const quizRef = doc(db, getCourseLessonQuizPath(courseId, lessonId));
  const snap = await getDoc(quizRef);
  if (!snap.exists()) return null;
  return snap.data() as LessonQuiz;
}

/**
 * Set (create or overwrite) lesson quiz for a course. Pass enabled:false and empty questions to disable.
 */
export async function setCourseLessonQuiz(
  courseId: string,
  lessonId: string,
  quiz: Omit<LessonQuiz, "updated_at">
): Promise<void> {
  const quizRef = doc(db, getCourseLessonQuizPath(courseId, lessonId));
  await setDoc(quizRef, {
    ...quiz,
    updated_at: serverTimestamp(),
  });
}

export async function deleteCourseLessonQuiz(
  courseId: string,
  lessonId: string
): Promise<void> {
  const quizRef = doc(db, getCourseLessonQuizPath(courseId, lessonId));
  await deleteDoc(quizRef);
}

/**
 * For progress evaluation only: which lessons have an enabled quiz (counted as +1 "slide").
 */
export async function getLessonsWithQuiz(
  courseId: string,
  lessonIds: string[]
): Promise<Record<string, boolean>> {
  const out: Record<string, boolean> = {};
  await Promise.all(
    lessonIds.map(async (lid) => {
      const quiz = await getCourseLessonQuiz(courseId, lid);
      out[lid] = !!(quiz?.enabled && (quiz.questions?.length ?? 0) > 0);
    })
  );
  return out;
}

/** Path: courses/{courseId}/lessonSurveys/{lessonId} */
export function getCourseLessonSurveyPath(courseId: string, lessonId: string): string {
  return `courses/${courseId}/lessonSurveys/${lessonId}`;
}

function cleanFirestoreData<T extends Record<string, unknown>>(data: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
}

/** Normalize Firestore lesson survey doc → enabled checkpoints (legacy single-survey supported). */
export function normalizeLessonSurveyCheckpoints(
  data: Record<string, unknown> | null | undefined
): LessonSurveyCheckpoint[] {
  if (!data) return [];

  if (Array.isArray(data.checkpoints)) {
    return (data.checkpoints as LessonSurveyCheckpoint[])
      .filter((c) => c?.enabled && (c.questions?.length ?? 0) > 0)
      .sort(
        (a, b) =>
          (a.order ?? 0) - (b.order ?? 0) ||
          (a.afterSlideIndex ?? -1) - (b.afterSlideIndex ?? -1)
      );
  }

  if (data.enabled && Array.isArray(data.questions) && (data.questions as unknown[]).length > 0) {
    return [
      {
        id: LEGACY_LESSON_SURVEY_ID,
        enabled: true,
        title: typeof data.title === "string" ? data.title : undefined,
        afterSlideIndex: -1,
        order: 0,
        questions: data.questions as LessonSurveyCheckpoint["questions"],
        generatePdfOnComplete: !!data.generatePdfOnComplete,
        dataroomFolderId:
          typeof data.dataroomFolderId === "string" ? data.dataroomFolderId : undefined,
        aiAnalysis: data.aiAnalysis as LessonSurveyCheckpoint["aiAnalysis"],
      },
    ];
  }

  return [];
}

export async function getCourseLessonSurveyCheckpoints(
  courseId: string,
  lessonId: string
): Promise<LessonSurveyCheckpoint[]> {
  const ref = doc(db, getCourseLessonSurveyPath(courseId, lessonId));
  const snap = await getDoc(ref);
  if (!snap.exists()) return [];
  return normalizeLessonSurveyCheckpoints(snap.data() as Record<string, unknown>);
}

export async function setCourseLessonSurveyCheckpoints(
  courseId: string,
  lessonId: string,
  checkpoints: LessonSurveyCheckpoint[]
): Promise<void> {
  const ref = doc(db, getCourseLessonSurveyPath(courseId, lessonId));
  const cleaned = checkpoints.map((c, i) =>
    cleanFirestoreData({
      id: c.id,
      enabled: c.enabled,
      title: c.title,
      afterSlideIndex: c.afterSlideIndex,
      order: c.order ?? i,
      questions: c.questions,
      generatePdfOnComplete: c.generatePdfOnComplete,
      dataroomFolderId: c.dataroomFolderId,
      aiAnalysis: c.aiAnalysis,
    })
  );
  await setDoc(ref, {
    checkpoints: cleaned,
    updated_at: serverTimestamp(),
  });
}

export async function deleteCourseLessonSurvey(
  courseId: string,
  lessonId: string
): Promise<void> {
  const ref = doc(db, getCourseLessonSurveyPath(courseId, lessonId));
  await deleteDoc(ref);
}

/** @deprecated Prefer getCourseLessonSurveyCheckpoints. Returns legacy doc or synthetic checkpoint. */
export async function getCourseLessonSurvey(
  courseId: string,
  lessonId: string
): Promise<LessonSurvey | null> {
  const ref = doc(db, getCourseLessonSurveyPath(courseId, lessonId));
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as LessonSurvey;
  const checkpoints = normalizeLessonSurveyCheckpoints(data as Record<string, unknown>);
  if (checkpoints.length === 0) return null;
  const first = checkpoints[0];
  return {
    enabled: true,
    title: first.title,
    questions: first.questions,
    generatePdfOnComplete: first.generatePdfOnComplete,
    dataroomFolderId: first.dataroomFolderId,
    aiAnalysis: first.aiAnalysis,
    checkpoints,
  };
}

/** @deprecated Prefer setCourseLessonSurveyCheckpoints. Writes a single end-of-lesson checkpoint. */
export async function setCourseLessonSurvey(
  courseId: string,
  lessonId: string,
  survey: Omit<LessonSurvey, "updated_at" | "checkpoints">
): Promise<void> {
  await setCourseLessonSurveyCheckpoints(courseId, lessonId, [
    {
      id: LEGACY_LESSON_SURVEY_ID,
      enabled: survey.enabled,
      title: survey.title,
      afterSlideIndex: -1,
      order: 0,
      questions: survey.questions,
      generatePdfOnComplete: survey.generatePdfOnComplete,
      dataroomFolderId: survey.dataroomFolderId,
      aiAnalysis: survey.aiAnalysis,
    },
  ]);
}

export function isLessonSurveyCheckpointSubmitted(
  progress: { surveySubmitted?: Record<string, boolean> } | null | undefined,
  lessonId: string,
  surveyId: string
): boolean {
  if (!progress?.surveySubmitted) return false;
  const key = lessonSurveyProgressKey(lessonId, surveyId);
  if (progress.surveySubmitted[key] === true) return true;
  if (surveyId === LEGACY_LESSON_SURVEY_ID && progress.surveySubmitted[lessonId] === true) {
    return true;
  }
  return false;
}

/**
 * For progress evaluation: how many enabled surveys each lesson has (each counts as +1 slide).
 */
export async function getLessonSurveyCounts(
  courseId: string,
  lessonIds: string[]
): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  await Promise.all(
    lessonIds.map(async (lid) => {
      const checkpoints = await getCourseLessonSurveyCheckpoints(courseId, lid);
      out[lid] = checkpoints.length;
    })
  );
  return out;
}

/**
 * @deprecated Use getLessonSurveyCounts. True when lesson has at least one survey.
 */
export async function getLessonsWithSurvey(
  courseId: string,
  lessonIds: string[]
): Promise<Record<string, boolean>> {
  const counts = await getLessonSurveyCounts(courseId, lessonIds);
  const out: Record<string, boolean> = {};
  for (const lid of lessonIds) {
    out[lid] = (counts[lid] ?? 0) > 0;
  }
  return out;
}
