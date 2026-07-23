/**
 * Admin review notes for the course player.
 *
 * Notes are attached to a specific slide of a specific lesson so admins can
 * flag exactly what they want changed while reviewing a course. Stored in the
 * `course_review_notes` collection; read/written by admins only (the panel is
 * rendered only for Admin/superAdmin users).
 *
 * Query shape: a single equality filter on the combined `courseLessonKey`
 * field with client-side sorting — no composite Firestore index needed.
 */

import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

export interface CourseReviewNote {
  id: string;
  courseId: string;
  lessonId: string;
  /** 0-indexed slide the note is attached to. */
  slideIndex: number;
  note: string;
  authorUid: string;
  authorName: string;
  resolved: boolean;
  resolvedBy?: string | null;
  createdAt?: Timestamp;
  resolvedAt?: Timestamp | null;
}

const NOTES_COLLECTION = "course_review_notes";

function courseLessonKey(courseId: string, lessonId: string): string {
  return `${courseId}__${lessonId}`;
}

export async function listCourseReviewNotes(
  courseId: string,
  lessonId: string
): Promise<CourseReviewNote[]> {
  const snap = await getDocs(
    query(
      collection(db, NOTES_COLLECTION),
      where("courseLessonKey", "==", courseLessonKey(courseId, lessonId))
    )
  );
  const notes = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<CourseReviewNote, "id">),
  }));
  // Newest first; client-side sort avoids needing a composite index.
  return notes.sort(
    (a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)
  );
}

export async function addCourseReviewNote(input: {
  courseId: string;
  lessonId: string;
  slideIndex: number;
  note: string;
  authorUid: string;
  authorName: string;
}): Promise<void> {
  await addDoc(collection(db, NOTES_COLLECTION), {
    courseLessonKey: courseLessonKey(input.courseId, input.lessonId),
    courseId: input.courseId,
    lessonId: input.lessonId,
    slideIndex: input.slideIndex,
    note: input.note,
    authorUid: input.authorUid,
    authorName: input.authorName,
    resolved: false,
    resolvedBy: null,
    resolvedAt: null,
    createdAt: serverTimestamp(),
  });
}

export async function setCourseReviewNoteResolved(
  noteId: string,
  resolved: boolean,
  resolvedBy: string
): Promise<void> {
  await updateDoc(doc(db, NOTES_COLLECTION, noteId), {
    resolved,
    resolvedBy: resolved ? resolvedBy : null,
    resolvedAt: resolved ? serverTimestamp() : null,
  });
}
