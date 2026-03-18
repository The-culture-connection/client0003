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
import type { LessonQuiz, LessonSurvey } from "./curriculum";

export interface Lesson {
  id?: string;
  title: string;
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

export async function getCourseLessonSurvey(
  courseId: string,
  lessonId: string
): Promise<LessonSurvey | null> {
  const ref = doc(db, getCourseLessonSurveyPath(courseId, lessonId));
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as LessonSurvey;
}

export async function setCourseLessonSurvey(
  courseId: string,
  lessonId: string,
  survey: Omit<LessonSurvey, "updated_at">
): Promise<void> {
  const ref = doc(db, getCourseLessonSurveyPath(courseId, lessonId));
  const data = { ...survey, updated_at: serverTimestamp() };
  // Firestore does not allow undefined; omit any undefined fields
  const clean = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined)
  ) as Record<string, unknown>;
  await setDoc(ref, clean);
}

/**
 * For progress evaluation: which lessons have an enabled survey (counted like quiz).
 */
export async function getLessonsWithSurvey(
  courseId: string,
  lessonIds: string[]
): Promise<Record<string, boolean>> {
  const out: Record<string, boolean> = {};
  await Promise.all(
    lessonIds.map(async (lid) => {
      const survey = await getCourseLessonSurvey(courseId, lid);
      out[lid] = !!(survey?.enabled && (survey.questions?.length ?? 0) > 0);
    })
  );
  return out;
}
