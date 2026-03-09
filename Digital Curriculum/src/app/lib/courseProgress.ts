import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { Timestamp } from "firebase/firestore";
import { invalidateCache } from "./cache";

export interface CourseProgress {
  userId: string;
  courseId: string;
  completed: boolean;
  completedAt?: Timestamp;
  lessonsCompleted: Record<string, boolean>; // lessonId -> completed
  modulesCompleted: Record<string, boolean>; // moduleId -> completed
  pagesViewed: Record<string, number>; // lessonId -> last slide index viewed (1-indexed)
  totalPages: Record<string, number>; // lessonId -> total slides in lesson
  progress: number; // 0-100
  startedAt?: Timestamp;
  updatedAt: Timestamp;
  /** Resume: last lesson and slide when user closed (so Continue can restore) */
  lastViewedLessonId?: string;
  lastViewedSlideIndex?: number; // 0-indexed
  /** Per-lesson quiz: attempt count and whether passed (lesson not complete until passed if quiz exists) */
  quizAttempts?: Record<string, number>;
  quizPassed?: Record<string, boolean>;
  /** Per-lesson survey: submitted = lesson complete. Answers stored for PDF generation. */
  surveySubmitted?: Record<string, boolean>;
  surveyAnswers?: Record<string, string[]>; // lessonId -> array of answers in question order
}

/**
 * Get course progress for a user
 */
export async function getCourseProgress(
  userId: string,
  courseId: string
): Promise<CourseProgress | null> {
  try {
    const progressRef = doc(db, "courseProgress", `${userId}_${courseId}`);
    const progressSnap = await getDoc(progressRef);

    if (!progressSnap.exists()) {
      return null;
    }

    return progressSnap.data() as CourseProgress;
  } catch (error) {
    console.error("Error getting course progress:", error);
    throw error;
  }
}

/**
 * Get all course progress for a user
 */
export async function getAllCourseProgress(userId: string): Promise<Record<string, CourseProgress>> {
  try {
    // We'll need to query all courseProgress documents for this user
    // For now, we'll use a collection group query or store progress differently
    // This is a simplified version - you might want to use a subcollection instead
    const { collection, query, where, getDocs } = await import("firebase/firestore");
    const progressRef = collection(db, "courseProgress");
    const q = query(progressRef, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    const progressMap: Record<string, CourseProgress> = {};
    querySnapshot.docs.forEach((doc) => {
      const data = doc.data() as CourseProgress;
      progressMap[data.courseId] = data;
    });

    return progressMap;
  } catch (error) {
    console.error("Error getting all course progress:", error);
    return {};
  }
}

/**
 * Initialize course progress for a user
 */
export async function initializeCourseProgress(
  userId: string,
  courseId: string
): Promise<CourseProgress> {
  try {
    const progressRef = doc(db, "courseProgress", `${userId}_${courseId}`);
    const progressData: CourseProgress = {
      userId,
      courseId,
      completed: false,
      lessonsCompleted: {},
      modulesCompleted: {},
      pagesViewed: {},
      totalPages: {},
      progress: 0,
      startedAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
    };

    await setDoc(progressRef, progressData);
    invalidateCache(`progress:${userId}`);
    return progressData;
  } catch (error) {
    console.error("Error initializing course progress:", error);
    throw error;
  }
}

/**
 * Update lesson completion status
 */
export async function updateLessonCompletion(
  userId: string,
  courseId: string,
  moduleId: string,
  lessonId: string,
  completed: boolean
): Promise<void> {
  try {
    const progressRef = doc(db, "courseProgress", `${userId}_${courseId}`);
    const progressSnap = await getDoc(progressRef);

    let progressData: CourseProgress;
    if (!progressSnap.exists()) {
      progressData = await initializeCourseProgress(userId, courseId);
    } else {
      progressData = progressSnap.data() as CourseProgress;
    }

    // Update lesson completion
    const updatedLessonsCompleted = {
      ...progressData.lessonsCompleted,
      [lessonId]: completed,
    };

    await updateDoc(progressRef, {
      lessonsCompleted: updatedLessonsCompleted,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating lesson completion:", error);
    throw error;
  }
}

/**
 * Update slide progress for a lesson (and set resume position for Continue)
 */
export async function updateLessonSlideProgress(
  userId: string,
  courseId: string,
  lessonId: string,
  slideIndex: number,
  totalSlides: number
): Promise<void> {
  try {
    const progressRef = doc(db, "courseProgress", `${userId}_${courseId}`);
    const progressSnap = await getDoc(progressRef);

    let progressData: CourseProgress;
    if (!progressSnap.exists()) {
      progressData = await initializeCourseProgress(userId, courseId);
    } else {
      progressData = progressSnap.data() as CourseProgress;
    }

    const pageNumber = Math.min(slideIndex + 1, totalSlides);
    const updatedPagesViewed = {
      ...progressData.pagesViewed,
      [lessonId]: pageNumber,
    };
    const updatedTotalPages = {
      ...progressData.totalPages,
      [lessonId]: totalSlides,
    };
    // Do NOT set lessonsCompleted here when user reaches last slide.
    // Lesson completion is set only by setLessonCompleted (no quiz) or recordLessonQuizAttempt (quiz passed).
    await updateDoc(progressRef, {
      pagesViewed: updatedPagesViewed,
      totalPages: updatedTotalPages,
      lastViewedLessonId: lessonId,
      lastViewedSlideIndex: slideIndex,
      updatedAt: serverTimestamp(),
    });
    invalidateCache(`progress:${userId}`);
  } catch (error) {
    console.error("Error updating lesson slide progress:", error);
    throw error;
  }
}

/**
 * Update page progress for a lesson
 */
export async function updatePageProgress(
  userId: string,
  courseId: string,
  lessonId: string,
  pageNumber: number,
  totalPages: number
): Promise<void> {
  try {
    const progressRef = doc(db, "courseProgress", `${userId}_${courseId}`);
    const progressSnap = await getDoc(progressRef);

    let progressData: CourseProgress;
    if (!progressSnap.exists()) {
      progressData = await initializeCourseProgress(userId, courseId);
    } else {
      progressData = progressSnap.data() as CourseProgress;
    }

    // Update page progress
    const updatedPagesViewed = {
      ...progressData.pagesViewed,
      [lessonId]: pageNumber,
    };
    const updatedTotalPages = {
      ...progressData.totalPages,
      [lessonId]: totalPages,
    };
    // Do NOT set lessonsCompleted here. Lesson completion must account for quizzes:
    // set by setLessonCompleted (no quiz) or recordLessonQuizAttempt (quiz passed).
    await updateDoc(progressRef, {
      pagesViewed: updatedPagesViewed,
      totalPages: updatedTotalPages,
      updatedAt: serverTimestamp(),
    });
    invalidateCache(`progress:${userId}`);
  } catch (error) {
    console.error("Error updating page progress:", error);
    throw error;
  }
}

/**
 * Mark a lesson as completed (e.g. when user has viewed all slides and there is no quiz).
 */
export async function setLessonCompleted(
  userId: string,
  courseId: string,
  lessonId: string
): Promise<void> {
  try {
    const progressRef = doc(db, "courseProgress", `${userId}_${courseId}`);
    const progressSnap = await getDoc(progressRef);

    let progressData: CourseProgress;
    if (!progressSnap.exists()) {
      progressData = await initializeCourseProgress(userId, courseId);
    } else {
      progressData = progressSnap.data() as CourseProgress;
    }

    const updatedLessonsCompleted = {
      ...progressData.lessonsCompleted,
      [lessonId]: true,
    };

    await updateDoc(progressRef, {
      lessonsCompleted: updatedLessonsCompleted,
      updatedAt: serverTimestamp(),
    });
    invalidateCache(`progress:${userId}`);
  } catch (error) {
    console.error("Error setting lesson completed:", error);
    throw error;
  }
}

/**
 * Record a quiz attempt for a lesson. If passed is true, also marks the lesson completed.
 */
export async function recordLessonQuizAttempt(
  userId: string,
  courseId: string,
  lessonId: string,
  passed: boolean
): Promise<void> {
  try {
    const progressRef = doc(db, "courseProgress", `${userId}_${courseId}`);
    const progressSnap = await getDoc(progressRef);

    let progressData: CourseProgress;
    if (!progressSnap.exists()) {
      progressData = await initializeCourseProgress(userId, courseId);
    } else {
      progressData = progressSnap.data() as CourseProgress;
    }

    const currentAttempts = progressData.quizAttempts?.[lessonId] ?? 0;
    const updatedQuizAttempts = {
      ...(progressData.quizAttempts ?? {}),
      [lessonId]: currentAttempts + 1,
    };
    const updatedQuizPassed = {
      ...(progressData.quizPassed ?? {}),
      [lessonId]: passed,
    };
    const updatedLessonsCompleted = {
      ...progressData.lessonsCompleted,
      [lessonId]: passed ? true : progressData.lessonsCompleted?.[lessonId] ?? false,
    };

    await updateDoc(progressRef, {
      quizAttempts: updatedQuizAttempts,
      quizPassed: updatedQuizPassed,
      lessonsCompleted: updatedLessonsCompleted,
      updatedAt: serverTimestamp(),
    });
    invalidateCache(`progress:${userId}`);
  } catch (error) {
    console.error("Error recording lesson quiz attempt:", error);
    throw error;
  }
}

/**
 * Record survey submission for a lesson. Marks the lesson completed and stores answers.
 */
export async function recordLessonSurveySubmission(
  userId: string,
  courseId: string,
  lessonId: string,
  answers: string[]
): Promise<void> {
  try {
    const progressRef = doc(db, "courseProgress", `${userId}_${courseId}`);
    const progressSnap = await getDoc(progressRef);

    let progressData: CourseProgress;
    if (!progressSnap.exists()) {
      progressData = await initializeCourseProgress(userId, courseId);
    } else {
      progressData = progressSnap.data() as CourseProgress;
    }

    const updatedSurveySubmitted = {
      ...(progressData.surveySubmitted ?? {}),
      [lessonId]: true,
    };
    const updatedSurveyAnswers = {
      ...(progressData.surveyAnswers ?? {}),
      [lessonId]: answers,
    };
    const updatedLessonsCompleted = {
      ...progressData.lessonsCompleted,
      [lessonId]: true,
    };

    await updateDoc(progressRef, {
      surveySubmitted: updatedSurveySubmitted,
      surveyAnswers: updatedSurveyAnswers,
      lessonsCompleted: updatedLessonsCompleted,
      updatedAt: serverTimestamp(),
    });
    invalidateCache(`progress:${userId}`);
  } catch (error) {
    console.error("Error recording lesson survey submission:", error);
    throw error;
  }
}

/**
 * Mark course as completed
 */
export async function markCourseCompleted(
  userId: string,
  courseId: string
): Promise<void> {
  try {
    const progressRef = doc(db, "courseProgress", `${userId}_${courseId}`);
    await updateDoc(progressRef, {
      completed: true,
      completedAt: serverTimestamp(),
      progress: 100,
      updatedAt: serverTimestamp(),
    });
    invalidateCache(`progress:${userId}`);
  } catch (error) {
    console.error("Error marking course as completed:", error);
    throw error;
  }
}

/**
 * Calculate course progress percentage based on pages/slides viewed.
 * When totalSlidesPerLesson is provided, uses it as the denominator.
 * When lessonsWithQuiz and/or lessonsWithSurvey are provided, each counts as +1 "slide" for that lesson;
 * lesson is "done" when quiz passed (if has quiz) or survey submitted (if has survey).
 */
export function calculateCourseProgress(
  course: {
    modules: Array<{
      order: number;
      lessons: Array<{ id?: string; order: number }>;
    }>;
    curriculumMapping?: {
      modules: Array<{
        moduleId: string;
        chapters: Array<{
          lessons: Array<{ lessonId: string }>;
        }>;
      }>;
    };
  },
  progress: CourseProgress | null,
  totalSlidesPerLesson?: Record<string, number> | null,
  lessonsWithQuiz?: Record<string, boolean> | null,
  lessonsWithSurvey?: Record<string, boolean> | null
): number {
  if (!progress) return 0;
  if (progress.completed) return 100;

  let totalSlidesInCourse = 0;
  let viewedSlides = 0;

  if (totalSlidesPerLesson && Object.keys(totalSlidesPerLesson).length > 0) {
    for (const [lid, total] of Object.entries(totalSlidesPerLesson)) {
      const hasQuiz = lessonsWithQuiz?.[lid] ?? false;
      const hasSurvey = lessonsWithSurvey?.[lid] ?? false;
      // Count quiz and survey as separate "slides" for progress only (so both must be done when present)
      totalSlidesInCourse += total + (hasQuiz ? 1 : 0) + (hasSurvey ? 1 : 0);
      const viewed = progress.pagesViewed?.[lid] ?? 0;
      const quizDone = hasQuiz && progress.quizPassed?.[lid];
      const surveyDone = hasSurvey && progress.surveySubmitted?.[lid];
      viewedSlides += Math.min(viewed, total) + (quizDone ? 1 : 0) + (surveyDone ? 1 : 0);
    }
    return totalSlidesInCourse > 0
      ? Math.round((viewedSlides / totalSlidesInCourse) * 100)
      : 0;
  }

  // Fallback: only count lessons user has visited (old behavior)
  course.modules.forEach((module, moduleIndex) => {
    const mappingModule = course.curriculumMapping?.modules?.[moduleIndex];
    const mappingLessons = mappingModule?.chapters?.[0]?.lessons ?? [];

    module.lessons.forEach((lesson, lessonIndex) => {
      const lessonId =
        mappingLessons[lessonIndex]?.lessonId ||
        lesson.id ||
        `${module.order}_${lesson.order}`;
      const lessonTotalPages = progress.totalPages?.[lessonId] || 0;
      const lessonViewedPages = progress.pagesViewed?.[lessonId] || 0;

      totalSlidesInCourse += lessonTotalPages;
      viewedSlides += Math.min(lessonViewedPages, lessonTotalPages);
    });
  });

  return totalSlidesInCourse > 0 ? Math.round((viewedSlides / totalSlidesInCourse) * 100) : 0;
}
