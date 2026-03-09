/**
 * Curriculum management utilities
 * New slide-based lesson authoring system
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "./firebase";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type LayoutType =
  | "title_only"
  | "text_only"
  | "title_body"
  | "title_left_image_right"
  | "image_left_text_right"
  | "full_image_with_caption"
  | "two_column_text"
  | "bullet_list_with_image"
  | "centered_callout"
  | "quote_slide";

export type FontSize = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
export type ImageSize = "small" | "medium" | "large" | "full";
export type ImagePlacement = "left" | "right" | "center" | "full_width";
export type BlockType = "title" | "text" | "image" | "heading" | "bullet_list" | "quote" | "callout";
export type Theme = "dark_slide";

export interface Block {
  id?: string;
  type: BlockType;
  order: number;
  content?: string; // For text, heading, bullet_list, quote, callout
  font_size?: FontSize;
  font_weight?: "normal" | "bold" | "semibold";
  color?: string;
  storage_path?: string; // For image blocks
  image_url?: string; // Download URL for image blocks
  alt_text?: string; // For image blocks
  placement?: ImagePlacement; // For image blocks
  width?: ImageSize; // For image blocks
  border_radius?: "none" | "sm" | "md" | "lg" | "full";
  created_at?: Timestamp;
  updated_at?: Timestamp;
}

export interface Slide {
  id?: string;
  order: number;
  layout_type?: LayoutType; // Optional, for backward compatibility
  background_color?: string;
  text_align?: "left" | "center" | "right" | "justify";
  theme?: Theme;
  created_at?: Timestamp;
  updated_at?: Timestamp;
}

export interface Lesson {
  id?: string;
  title: string;
  order: number;
  theme?: Theme;
  is_published?: boolean;
  created_at?: Timestamp;
  updated_at?: Timestamp;
  created_by_uid?: string;
  curriculum_id?: string; // Parent reference
  module_id?: string; // Parent reference
  chapter_id?: string; // Parent reference
  /** "slides" = slide/block model; "images" = ordered list of images only; "media" = mixed image + video slides */
  content_type?: "slides" | "images" | "media";
  // Import fields
  source_type?: "pptx_import" | "manual";
  import_status?: "processing" | "ready" | "failed";
  source_file_name?: string;
  source_storage_path?: string;
}

export interface LessonImage {
  id?: string;
  order: number;
  storage_path: string;
  image_url: string;
  alt_text?: string;
  created_at?: Timestamp;
  updated_at?: Timestamp;
}

/** One slide in a media lesson: either an image or a YouTube video */
export interface LessonContentSlide {
  id?: string;
  order: number;
  type: "image" | "video";
  // Image slide
  image_url?: string;
  storage_path?: string;
  alt_text?: string;
  // Video slide
  video_provider?: "youtube";
  video_id?: string;
  video_url?: string;
  caption?: string;
  background_color?: string;
  created_at?: Timestamp;
  updated_at?: Timestamp;
}

/** Multiple choice question (A/B/C/D) for a lesson quiz */
export interface QuizQuestion {
  order: number;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: "A" | "B" | "C" | "D";
}

/** Quiz at the end of a lesson - stored under lesson as single doc */
export interface LessonQuiz {
  enabled: boolean;
  maxAttempts: number;
  passPercentage: number; // 0-100
  questions: QuizQuestion[];
  updated_at?: Timestamp;
}

/** Open-ended question for a lesson survey */
export interface SurveyQuestion {
  order: number;
  question: string;
}

/** Survey at the end of a lesson (like quiz but open-ended). Stored per course/lesson. */
export interface LessonSurvey {
  enabled: boolean;
  /** Display title for the survey (e.g. "Module 1 Reflection"). Optional for backward compatibility. */
  title?: string;
  questions: SurveyQuestion[];
  /** When true, generate PDF of answers on completion and upload to user's Data Room */
  generatePdfOnComplete: boolean;
  updated_at?: Timestamp;
}

export interface Chapter {
  id?: string;
  title: string;
  order: number;
  created_at?: Timestamp;
  updated_at?: Timestamp;
}

export interface Module {
  id?: string;
  title: string;
  order: number;
  created_at?: Timestamp;
  updated_at?: Timestamp;
}

export interface Curriculum {
  id?: string;
  title: string;
  description?: string;
  created_at?: Timestamp;
  updated_at?: Timestamp;
  created_by_uid?: string;
}

// ============================================================================
// FIRESTORE PATHS
// ============================================================================

export function getCurriculumPath(curriculumId: string): string {
  return `curricula/${curriculumId}`;
}

export function getModulePath(curriculumId: string, moduleId: string): string {
  return `curricula/${curriculumId}/modules/${moduleId}`;
}

export function getChapterPath(
  curriculumId: string,
  moduleId: string,
  chapterId: string
): string {
  return `curricula/${curriculumId}/modules/${moduleId}/chapters/${chapterId}`;
}

export function getLessonPath(
  curriculumId: string,
  moduleId: string,
  chapterId: string,
  lessonId: string
): string {
  return `curricula/${curriculumId}/modules/${moduleId}/chapters/${chapterId}/lessons/${lessonId}`;
}

export function getSlidePath(
  curriculumId: string,
  moduleId: string,
  chapterId: string,
  lessonId: string,
  slideId: string
): string {
  return `${getLessonPath(curriculumId, moduleId, chapterId, lessonId)}/slides/${slideId}`;
}

export function getBlockPath(
  curriculumId: string,
  moduleId: string,
  chapterId: string,
  lessonId: string,
  slideId: string,
  blockId: string
): string {
  return `${getSlidePath(curriculumId, moduleId, chapterId, lessonId, slideId)}/blocks/${blockId}`;
}

export function getLessonImagesPath(
  curriculumId: string,
  moduleId: string,
  chapterId: string,
  lessonId: string
): string {
  return `${getLessonPath(curriculumId, moduleId, chapterId, lessonId)}/images`;
}

export function getLessonContentPath(
  curriculumId: string,
  moduleId: string,
  chapterId: string,
  lessonId: string
): string {
  return `${getLessonPath(curriculumId, moduleId, chapterId, lessonId)}/lesson_content`;
}

/** Extract YouTube video ID from watch or youtu.be URL; returns null if invalid */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  const watchMatch = trimmed.match(/(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];
  const shortMatch = trimmed.match(/(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];
  return null;
}

// ============================================================================
// CURRICULUM OPERATIONS
// ============================================================================

export async function createCurriculum(
  title: string,
  description: string,
  createdByUid: string
): Promise<string> {
  const curriculumRef = await addDoc(collection(db, "curricula"), {
    title,
    description,
    created_by_uid: createdByUid,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return curriculumRef.id;
}

export async function getCurriculum(curriculumId: string): Promise<Curriculum | null> {
  const docRef = doc(db, getCurriculumPath(curriculumId));
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Curriculum;
}

// ============================================================================
// MODULE OPERATIONS
// ============================================================================

export async function createModule(
  curriculumId: string,
  title: string,
  order: number
): Promise<string> {
  const modulesRef = collection(db, `curricula/${curriculumId}/modules`);
  const moduleRef = await addDoc(modulesRef, {
    title,
    order,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return moduleRef.id;
}

export async function getModules(curriculumId: string): Promise<Module[]> {
  const modulesRef = collection(db, `curricula/${curriculumId}/modules`);
  const q = query(modulesRef, orderBy("order", "asc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Module[];
}

// ============================================================================
// CHAPTER OPERATIONS
// ============================================================================

export async function createChapter(
  curriculumId: string,
  moduleId: string,
  title: string,
  order: number
): Promise<string> {
  const chaptersRef = collection(db, `curricula/${curriculumId}/modules/${moduleId}/chapters`);
  const chapterRef = await addDoc(chaptersRef, {
    title,
    order,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return chapterRef.id;
}

export async function getChapters(
  curriculumId: string,
  moduleId: string
): Promise<Chapter[]> {
  const chaptersRef = collection(db, `curricula/${curriculumId}/modules/${moduleId}/chapters`);
  const q = query(chaptersRef, orderBy("order", "asc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Chapter[];
}

// ============================================================================
// LESSON OPERATIONS
// ============================================================================

export async function createLesson(
  curriculumId: string,
  moduleId: string,
  chapterId: string,
  title: string,
  order: number,
  createdByUid: string,
  options?: { content_type?: "slides" | "images" | "media" }
): Promise<string> {
  const lessonsRef = collection(
    db,
    `curricula/${curriculumId}/modules/${moduleId}/chapters/${chapterId}/lessons`
  );
  const data: Record<string, unknown> = {
    title,
    order,
    theme: "dark_slide",
    is_published: false,
    created_by_uid: createdByUid,
    curriculum_id: curriculumId,
    module_id: moduleId,
    chapter_id: chapterId,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };
  if (options?.content_type) {
    data.content_type = options.content_type;
  }
  const lessonRef = await addDoc(lessonsRef, data);
  return lessonRef.id;
}

// Get lesson by ID (searches across all curricula)
export async function getLessonById(lessonId: string): Promise<Lesson | null> {
  // This is a simplified search - in production, you might want to index lessons
  // or store lessons in a flat collection with parent references
  // For now, we'll need to search through curricula
  // This is a placeholder - you may need to implement a more efficient search
  
  // Alternative: Store lessons in a flat collection with parent references
  // For now, returning null - implement based on your needs
  return null;
}

export async function getLesson(
  curriculumId: string,
  moduleId: string,
  chapterId: string,
  lessonId: string
): Promise<Lesson | null> {
  const docRef = doc(db, getLessonPath(curriculumId, moduleId, chapterId, lessonId));
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Lesson;
}

export async function updateLesson(
  curriculumId: string,
  moduleId: string,
  chapterId: string,
  lessonId: string,
  updates: Partial<Lesson>
): Promise<void> {
  const lessonRef = doc(db, getLessonPath(curriculumId, moduleId, chapterId, lessonId));
  await updateDoc(lessonRef, {
    ...updates,
    updated_at: serverTimestamp(),
  });
}

export async function publishLesson(
  curriculumId: string,
  moduleId: string,
  chapterId: string,
  lessonId: string
): Promise<void> {
  await updateLesson(curriculumId, moduleId, chapterId, lessonId, {
    is_published: true,
  });
}

// ============================================================================
// LESSON IMAGES (content_type === "images")
// ============================================================================

export async function getLessonImages(
  curriculumId: string,
  moduleId: string,
  chapterId: string,
  lessonId: string
): Promise<LessonImage[]> {
  const imagesRef = collection(
    db,
    getLessonImagesPath(curriculumId, moduleId, chapterId, lessonId)
  );
  const q = query(imagesRef, orderBy("order", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as LessonImage[];
}

export async function uploadLessonImages(
  curriculumId: string,
  moduleId: string,
  chapterId: string,
  lessonId: string,
  files: File[]
): Promise<LessonImage[]> {
  const imagesRef = collection(
    db,
    getLessonImagesPath(curriculumId, moduleId, chapterId, lessonId)
  );
  const results: LessonImage[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = file.name.split(".").pop() || "jpg";
    const storagePath = `curriculum_content/${curriculumId}/${moduleId}/${lessonId}/images/${Date.now()}_${i}.${ext}`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file, {
      contentType: file.type || (ext === "png" ? "image/png" : "image/jpeg"),
    });
    const imageUrl = await getDownloadURL(storageRef);
    const docRef = await addDoc(imagesRef, {
      order: i,
      storage_path: storagePath,
      image_url: imageUrl,
      alt_text: file.name,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    results.push({
      id: docRef.id,
      order: i,
      storage_path: storagePath,
      image_url: imageUrl,
      alt_text: file.name,
    });
  }
  return results;
}

export async function deleteLessonImages(
  curriculumId: string,
  moduleId: string,
  chapterId: string,
  lessonId: string
): Promise<void> {
  const images = await getLessonImages(curriculumId, moduleId, chapterId, lessonId);
  const imagesRef = collection(
    db,
    getLessonImagesPath(curriculumId, moduleId, chapterId, lessonId)
  );
  const batch = writeBatch(db);
  for (const img of images) {
    if (img.id) {
      batch.delete(doc(imagesRef, img.id));
    }
  }
  await batch.commit();
}

// ============================================================================
// LESSON CONTENT (content_type === "media" – mixed image + video slides)
// ============================================================================

export async function getLessonContent(
  curriculumId: string,
  moduleId: string,
  chapterId: string,
  lessonId: string
): Promise<LessonContentSlide[]> {
  const contentRef = collection(
    db,
    getLessonContentPath(curriculumId, moduleId, chapterId, lessonId)
  );
  const q = query(contentRef, orderBy("order", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as LessonContentSlide[];
}

/** Replace all lesson_content slides (used after uploads). Deletes existing then adds new. */
export async function setLessonContentSlides(
  curriculumId: string,
  moduleId: string,
  chapterId: string,
  lessonId: string,
  slides: Omit<LessonContentSlide, "id" | "created_at" | "updated_at">[]
): Promise<void> {
  const contentRef = collection(
    db,
    getLessonContentPath(curriculumId, moduleId, chapterId, lessonId)
  );
  const existing = await getLessonContent(curriculumId, moduleId, chapterId, lessonId);
  const batch = writeBatch(db);
  for (const s of existing) {
    if (s.id) batch.delete(doc(contentRef, s.id));
  }
  await batch.commit();
  for (let i = 0; i < slides.length; i++) {
    const s = slides[i];
    await addDoc(contentRef, {
      order: i,
      type: s.type,
      ...(s.type === "image"
        ? { image_url: s.image_url, storage_path: s.storage_path, alt_text: s.alt_text }
        : {
            video_provider: s.video_provider ?? "youtube",
            video_id: s.video_id,
            video_url: s.video_url,
            caption: s.caption,
            background_color: s.background_color ?? "#000000",
          }),
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
  }
}

export async function deleteLessonContent(
  curriculumId: string,
  moduleId: string,
  chapterId: string,
  lessonId: string
): Promise<void> {
  const content = await getLessonContent(curriculumId, moduleId, chapterId, lessonId);
  const contentRef = collection(
    db,
    getLessonContentPath(curriculumId, moduleId, chapterId, lessonId)
  );
  const batch = writeBatch(db);
  for (const s of content) {
    if (s.id) batch.delete(doc(contentRef, s.id));
  }
  await batch.commit();
}

/**
 * Get the number of slides (or equivalent items) in a lesson for progress calculation.
 */
export async function getLessonSlideCount(
  curriculumId: string,
  moduleId: string,
  chapterId: string,
  lessonId: string
): Promise<number> {
  const lesson = await getLesson(curriculumId, moduleId, chapterId, lessonId);
  if (!lesson) return 0;
  if (lesson.content_type === "media") {
    const content = await getLessonContent(curriculumId, moduleId, chapterId, lessonId);
    return content.length;
  }
  if (lesson.content_type === "images") {
    const images = await getLessonImages(curriculumId, moduleId, chapterId, lessonId);
    return images.length;
  }
  const slides = await getSlides(curriculumId, moduleId, chapterId, lessonId);
  return slides.length;
}

/** Minimal type for course curriculum mapping (avoids importing courses in curriculum). */
export interface CourseCurriculumMapping {
  curriculumId: string;
  modules: Array<{
    moduleId: string;
    chapters: Array<{
      chapterId: string;
      lessons: Array<{ lessonId: string }>;
    }>;
  }>;
}

/**
 * Get total slide count per lesson for a course. Used for accurate overall progress.
 */
export async function getCourseSlideCounts(course: {
  curriculumMapping?: CourseCurriculumMapping | null;
}): Promise<Record<string, number>> {
  const mapping = course.curriculumMapping;
  if (!mapping?.curriculumId) return {};
  const counts: Record<string, number> = {};
  for (const mod of mapping.modules ?? []) {
    for (const ch of mod.chapters ?? []) {
      for (const l of ch.lessons ?? []) {
        if (l.lessonId) {
          try {
            counts[l.lessonId] = await getLessonSlideCount(
              mapping.curriculumId,
              mod.moduleId,
              ch.chapterId,
              l.lessonId
            );
          } catch {
            counts[l.lessonId] = 0;
          }
        }
      }
    }
  }
  return counts;
}

/** Upload a single image for use in a media lesson slide; returns storage path and URL */
export async function uploadSingleImageForLesson(
  file: File,
  curriculumId: string,
  moduleId: string,
  lessonId: string
): Promise<{ storage_path: string; image_url: string }> {
  const ext = file.name.split(".").pop() || "jpg";
  const storagePath = `curriculum_content/${curriculumId}/${moduleId}/${lessonId}/images/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}.${ext}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file, {
    contentType: file.type || (ext === "png" ? "image/png" : "image/jpeg"),
  });
  const imageUrl = await getDownloadURL(storageRef);
  return { storage_path: storagePath, image_url: imageUrl };
}

export async function getPublishedLessons(
  curriculumId: string,
  moduleId: string,
  chapterId: string
): Promise<Lesson[]> {
  const lessonsRef = collection(
    db,
    `curricula/${curriculumId}/modules/${moduleId}/chapters/${chapterId}/lessons`
  );
  const q = query(
    lessonsRef,
    where("is_published", "==", true),
    orderBy("order", "asc")
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Lesson[];
}

// ============================================================================
// SLIDE OPERATIONS
// ============================================================================

export async function createSlide(
  curriculumId: string,
  moduleId: string,
  chapterId: string,
  lessonId: string,
  order: number
): Promise<string> {
  const slidesRef = collection(
    db,
    `curricula/${curriculumId}/modules/${moduleId}/chapters/${chapterId}/lessons/${lessonId}/slides`
  );
  const slideRef = await addDoc(slidesRef, {
    order,
    background_color: "#000000",
    text_align: "left",
    theme: "dark_slide",
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return slideRef.id;
}

export async function getSlides(
  curriculumId: string,
  moduleId: string,
  chapterId: string,
  lessonId: string
): Promise<Slide[]> {
  const slidesRef = collection(
    db,
    `curricula/${curriculumId}/modules/${moduleId}/chapters/${chapterId}/lessons/${lessonId}/slides`
  );
  const q = query(slidesRef, orderBy("order", "asc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Slide[];
}

export async function updateSlide(
  curriculumId: string,
  moduleId: string,
  chapterId: string,
  lessonId: string,
  slideId: string,
  updates: Partial<Slide>
): Promise<void> {
  const slideRef = doc(
    db,
    getSlidePath(curriculumId, moduleId, chapterId, lessonId, slideId)
  );
  await updateDoc(slideRef, {
    ...updates,
    updated_at: serverTimestamp(),
  });
}

export async function deleteSlide(
  curriculumId: string,
  moduleId: string,
  chapterId: string,
  lessonId: string,
  slideId: string
): Promise<void> {
  // Delete all blocks first
  const blocks = await getBlocks(curriculumId, moduleId, chapterId, lessonId, slideId);
  const batch = writeBatch(db);
  
  for (const block of blocks) {
    if (block.id) {
      const blockRef = doc(
        db,
        getBlockPath(curriculumId, moduleId, chapterId, lessonId, slideId, block.id)
      );
      batch.delete(blockRef);
      
      // Delete image from storage if it's an image block
      if (block.type === "image" && block.storage_path) {
        try {
          const imageRef = ref(storage, block.storage_path);
          await deleteObject(imageRef);
        } catch (error) {
          console.error("Error deleting image:", error);
        }
      }
    }
  }
  
  await batch.commit();
  
  // Delete the slide
  const slideRef = doc(
    db,
    getSlidePath(curriculumId, moduleId, chapterId, lessonId, slideId)
  );
  await deleteDoc(slideRef);
}

export async function reorderSlides(
  curriculumId: string,
  moduleId: string,
  chapterId: string,
  lessonId: string,
  slideOrders: { slideId: string; order: number }[]
): Promise<void> {
  const batch = writeBatch(db);
  
  for (const { slideId, order } of slideOrders) {
    const slideRef = doc(
      db,
      getSlidePath(curriculumId, moduleId, chapterId, lessonId, slideId)
    );
    batch.update(slideRef, { order, updated_at: serverTimestamp() });
  }
  
  await batch.commit();
}

// ============================================================================
// BLOCK OPERATIONS
// ============================================================================

export async function createBlock(
  curriculumId: string,
  moduleId: string,
  chapterId: string,
  lessonId: string,
  slideId: string,
  type: BlockType,
  order: number,
  initialData?: Partial<Block>
): Promise<string> {
  const blockData: Partial<Block> = {
    type,
    order,
    font_size: "md",
    font_weight: "normal",
    color: "#fafcfc",
    ...initialData,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };
  
  const blocksRef = collection(
    db,
    `curricula/${curriculumId}/modules/${moduleId}/chapters/${chapterId}/lessons/${lessonId}/slides/${slideId}/blocks`
  );
  const blockRef = await addDoc(blocksRef, blockData);
  return blockRef.id;
}

export async function getBlocks(
  curriculumId: string,
  moduleId: string,
  chapterId: string,
  lessonId: string,
  slideId: string
): Promise<Block[]> {
  const blocksRef = collection(
    db,
    `curricula/${curriculumId}/modules/${moduleId}/chapters/${chapterId}/lessons/${lessonId}/slides/${slideId}/blocks`
  );
  const q = query(blocksRef, orderBy("order", "asc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Block[];
}

export async function updateBlock(
  curriculumId: string,
  moduleId: string,
  chapterId: string,
  lessonId: string,
  slideId: string,
  blockId: string,
  updates: Partial<Block>
): Promise<void> {
  const blockRef = doc(
    db,
    getBlockPath(curriculumId, moduleId, chapterId, lessonId, slideId, blockId)
  );
  await updateDoc(blockRef, {
    ...updates,
    updated_at: serverTimestamp(),
  });
}

export async function deleteBlock(
  curriculumId: string,
  moduleId: string,
  chapterId: string,
  lessonId: string,
  slideId: string,
  blockId: string
): Promise<void> {
  // Get block to check if it has an image
  const block = await getDoc(
    doc(db, getBlockPath(curriculumId, moduleId, chapterId, lessonId, slideId, blockId))
  );
  
  if (block.exists()) {
    const blockData = block.data() as Block;
    
    // Delete image from storage if it's an image block
    if (blockData.type === "image" && blockData.storage_path) {
      try {
        const imageRef = ref(storage, blockData.storage_path);
        await deleteObject(imageRef);
      } catch (error) {
        console.error("Error deleting image:", error);
      }
    }
  }
  
  // Delete the block
  const blockRef = doc(
    db,
    getBlockPath(curriculumId, moduleId, chapterId, lessonId, slideId, blockId)
  );
  await deleteDoc(blockRef);
}

export async function reorderBlocks(
  curriculumId: string,
  moduleId: string,
  chapterId: string,
  lessonId: string,
  slideId: string,
  blockOrders: { blockId: string; order: number }[]
): Promise<void> {
  const batch = writeBatch(db);
  
  for (const { blockId, order } of blockOrders) {
    const blockRef = doc(
      db,
      getBlockPath(curriculumId, moduleId, chapterId, lessonId, slideId, blockId)
    );
    batch.update(blockRef, { order, updated_at: serverTimestamp() });
  }
  
  await batch.commit();
}

// ============================================================================
// IMAGE UPLOAD
// ============================================================================

export async function uploadLessonImage(
  file: File,
  curriculumId: string,
  moduleId: string,
  chapterId: string,
  lessonId: string,
  slideId: string
): Promise<{ storagePath: string; downloadUrl: string }> {
  // Validate file type
  const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Invalid file type. Only PNG, JPG, JPEG, and WEBP are allowed.");
  }
  
  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new Error("File size exceeds 5MB limit.");
  }
  
  // Generate unique filename
  const timestamp = Date.now();
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const fileName = `${timestamp}_${sanitizedFileName}`;
  
  // Construct storage path
  const storagePath = `lesson_assets/${curriculumId}/${moduleId}/${chapterId}/${lessonId}/${slideId}/${fileName}`;
  
  // Upload to Firebase Storage
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file, {
    contentType: file.type,
  });
  
  // Get download URL
  const downloadUrl = await getDownloadURL(storageRef);
  
  return { storagePath, downloadUrl };
}
