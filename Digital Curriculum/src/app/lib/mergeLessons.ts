/**
 * Merge two adjacent lessons: keep first title, append all content from second after first.
 */

import type { DraftLessonSurvey, DraftSlide } from "../pages/admin/courseBuilderTypes";
import type { LessonSurveyCheckpoint, QuizQuestion } from "./curriculum";
import {
  deleteCourseLessonQuiz,
  deleteCourseLessonSurvey,
  getCourseLessonQuiz,
  getCourseLessonSurveyCheckpoints,
  setCourseLessonQuiz,
  setCourseLessonSurveyCheckpoints,
} from "./courses";
import type { LessonContentSlide } from "./curriculum";
import {
  deleteLesson,
  setLessonContentSlides,
  uploadSingleImageForLesson,
  uploadVideoForLesson,
  updateLesson,
} from "./curriculum";

export interface DraftLessonForMerge {
  title: string;
  slides: DraftSlide[];
  lessonId?: string;
  imageUploadStatus?: string;
  quizEnabled?: boolean;
  quizQuestions?: Array<{
    question: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctAnswer: "A" | "B" | "C" | "D";
  }>;
  quizMaxAttempts?: number;
  quizPassPercentage?: number;
  surveys?: DraftLessonSurvey[];
}

/** Merge second lesson into first (in-memory). First lesson's title and lessonId are kept. */
export function mergeDraftLessons(
  first: DraftLessonForMerge,
  second: DraftLessonForMerge
): DraftLessonForMerge {
  const slideCountA = first.slides?.length ?? 0;
  const mergedSlides = [...(first.slides ?? []), ...(second.slides ?? [])];

  const offsetSurvey = (s: DraftLessonSurvey): DraftLessonSurvey => ({
    ...s,
    afterSlideIndex:
      s.afterSlideIndex >= 0 ? s.afterSlideIndex + slideCountA : -1,
  });

  const mergedSurveys = [
    ...(first.surveys ?? []),
    ...(second.surveys ?? []).map(offsetSurvey),
  ];

  let quizEnabled = first.quizEnabled ?? false;
  let quizQuestions = [...(first.quizQuestions ?? [])];
  if (second.quizEnabled && (second.quizQuestions?.length ?? 0) > 0) {
    quizEnabled = true;
    quizQuestions = [...quizQuestions, ...(second.quizQuestions ?? [])];
  }

  const imageUploadStatus =
    first.imageUploadStatus === "success" || second.imageUploadStatus === "success"
      ? "success"
      : first.imageUploadStatus === "uploading" || second.imageUploadStatus === "uploading"
        ? "uploading"
        : first.imageUploadStatus === "error" || second.imageUploadStatus === "error"
          ? "error"
          : mergedSlides.length > 0
            ? "idle"
            : "idle";

  return {
    ...first,
    title: first.title,
    slides: mergedSlides,
    surveys: mergedSurveys,
    quizEnabled,
    quizQuestions,
    quizMaxAttempts: first.quizMaxAttempts ?? second.quizMaxAttempts ?? 3,
    quizPassPercentage: first.quizPassPercentage ?? second.quizPassPercentage ?? 70,
    imageUploadStatus,
  };
}

/** Build Firestore lesson_content payloads from draft slides (uploads new files when needed). */
export async function draftSlidesToContentSlides(
  slides: DraftSlide[],
  curriculumId: string,
  moduleId: string,
  lessonId: string
): Promise<Omit<LessonContentSlide, "id" | "created_at" | "updated_at">[]> {
  const contentSlides: Omit<LessonContentSlide, "id" | "created_at" | "updated_at">[] = [];

  for (let i = 0; i < slides.length; i++) {
    const s = slides[i];
    if (s.type === "image") {
      if (s.file) {
        const { storage_path, image_url } = await uploadSingleImageForLesson(
          s.file,
          curriculumId,
          moduleId,
          lessonId
        );
        contentSlides.push({
          order: i,
          type: "image",
          image_url,
          storage_path,
          alt_text: s.file.name,
          popups: s.popups?.length ? s.popups : undefined,
        });
      } else if (s.existingImageUrl) {
        contentSlides.push({
          order: i,
          type: "image",
          image_url: s.existingImageUrl,
          storage_path: s.existingStoragePath ?? "",
          alt_text: "Slide",
          popups: s.popups?.length ? s.popups : undefined,
        });
      }
    } else if (s.videoFile) {
      const { storage_path, video_url } = await uploadVideoForLesson(
        s.videoFile,
        curriculumId,
        moduleId,
        lessonId
      );
      contentSlides.push({
        order: i,
        type: "video",
        video_provider: "hosted",
        video_url,
        storage_path,
        caption: s.caption,
        background_color: "#000000",
      });
    } else if (s.existingVideoUrl && s.videoProvider === "hosted") {
      contentSlides.push({
        order: i,
        type: "video",
        video_provider: "hosted",
        video_url: s.existingVideoUrl,
        storage_path: s.existingVideoStoragePath ?? "",
        caption: s.caption,
        background_color: "#000000",
      });
    } else {
      const provider = s.videoProvider ?? (s.videoId ? "youtube" : "external");
      contentSlides.push({
        order: i,
        type: "video",
        video_provider: provider,
        video_id: s.videoId,
        video_url: s.videoUrl,
        caption: s.caption,
        background_color: "#000000",
      });
    }
  }

  return contentSlides;
}

export interface PersistMergedLessonParams {
  curriculumId: string;
  moduleId: string;
  chapterId: string;
  courseId: string;
  keepLessonId: string;
  removeLessonId: string;
  merged: DraftLessonForMerge;
  draftSurveysToCheckpoints: (lesson: DraftLessonForMerge) => LessonSurveyCheckpoint[];
}

/** Write merged lesson to Firestore and remove the second lesson document. */
export async function persistMergedMediaLesson(
  params: PersistMergedLessonParams
): Promise<void> {
  const {
    curriculumId,
    moduleId,
    chapterId,
    courseId,
    keepLessonId,
    removeLessonId,
    merged,
    draftSurveysToCheckpoints,
  } = params;

  const slides = merged.slides ?? [];
  if (slides.length > 0) {
    await updateLesson(curriculumId, moduleId, chapterId, keepLessonId, {
      content_type: "media",
    });
    const contentSlides = await draftSlidesToContentSlides(
      slides,
      curriculumId,
      moduleId,
      keepLessonId
    );
    await setLessonContentSlides(
      curriculumId,
      moduleId,
      chapterId,
      keepLessonId,
      contentSlides
    );
  }

  const existingQuiz = await getCourseLessonQuiz(courseId, keepLessonId);

  const draftCheckpoints = draftSurveysToCheckpoints(merged);
  if (draftCheckpoints.length > 0) {
    await setCourseLessonSurveyCheckpoints(courseId, keepLessonId, draftCheckpoints);
  } else {
    await deleteCourseLessonSurvey(courseId, keepLessonId);
  }
  await deleteCourseLessonSurvey(courseId, removeLessonId);

  const validQuestions = (merged.quizEnabled ? merged.quizQuestions ?? [] : [])
    .filter(
      (q) =>
        (q.question?.trim() ?? "") !== "" &&
        [q.optionA, q.optionB, q.optionC, q.optionD].every((o) => (o?.trim() ?? "") !== "")
    )
    .map((q, i) => ({
      order: i,
      question: q.question.trim(),
      optionA: q.optionA.trim(),
      optionB: q.optionB.trim(),
      optionC: q.optionC.trim(),
      optionD: q.optionD.trim(),
      correctAnswer: q.correctAnswer,
    })) as QuizQuestion[];

  if (validQuestions.length > 0) {
    await setCourseLessonQuiz(courseId, keepLessonId, {
      enabled: true,
      questions: validQuestions,
      maxAttempts: merged.quizMaxAttempts ?? existingQuiz?.maxAttempts ?? 3,
      passPercentage: merged.quizPassPercentage ?? existingQuiz?.passPercentage ?? 70,
    });
  } else {
    await deleteCourseLessonQuiz(courseId, keepLessonId);
  }
  await deleteCourseLessonQuiz(courseId, removeLessonId);

  await deleteLesson(curriculumId, moduleId, chapterId, removeLessonId);

  if (merged.title?.trim()) {
    await updateLesson(curriculumId, moduleId, chapterId, keepLessonId, {
      title: merged.title.trim(),
    });
  }
}
