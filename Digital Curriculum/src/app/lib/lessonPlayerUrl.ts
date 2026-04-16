/**
 * Build `/learn/lesson/:lessonId` URLs with curriculum query params (matches routes.tsx).
 */
import type { Course } from "./courses";
import type { CourseProgress } from "./courseProgress";

/**
 * @param resume When true, resumes `progress.lastViewedLessonId` if set; otherwise opens first lesson.
 */
export function getLessonPlayerPath(
  course: Course,
  progress: CourseProgress | null | undefined,
  resume: boolean
): string {
  const mapping = course.curriculumMapping;
  const firstModule = mapping?.modules?.[0];
  const firstChapter = firstModule?.chapters?.[0];
  const firstLesson = firstChapter?.lessons?.[0];
  const courseId = course.id ?? "";

  if (!mapping || !firstModule || !firstChapter) {
    return courseId ? `/courses/${courseId}` : "/curriculum";
  }

  const params = new URLSearchParams({
    curriculumId: mapping.curriculumId,
    moduleId: firstModule.moduleId,
    chapterId: firstChapter.chapterId,
    courseId,
  });

  if (resume && progress?.lastViewedLessonId) {
    const lastLessonId = progress.lastViewedLessonId;
    const lastSlideIndex = progress.lastViewedSlideIndex ?? 0;
    let foundModuleId = firstModule.moduleId;
    let foundChapterId = firstChapter.chapterId;
    mapping.modules?.forEach((mod) => {
      mod.chapters?.forEach((ch) => {
        ch.lessons?.forEach((l) => {
          if (l.lessonId === lastLessonId) {
            foundModuleId = mod.moduleId;
            foundChapterId = ch.chapterId;
          }
        });
      });
    });
    params.set("moduleId", foundModuleId);
    params.set("chapterId", foundChapterId);
    params.set("slideIndex", String(lastSlideIndex));
    return `/learn/lesson/${lastLessonId}?${params.toString()}`;
  }

  if (!firstLesson?.lessonId) {
    return courseId ? `/courses/${courseId}` : "/curriculum";
  }

  return `/learn/lesson/${firstLesson.lessonId}?${params.toString()}`;
}
