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
  const courseId = course.id ?? "";

  // Find the first lesson that actually exists *anywhere* in the mapping. The first
  // module/chapter can be empty while later ones have lessons, so we must not assume
  // modules[0].chapters[0].lessons[0] — doing so dropped users to the course-detail page.
  let firstModuleId = "";
  let firstChapterId = "";
  let firstLessonId = "";
  mapping?.modules?.forEach((mod) => {
    mod.chapters?.forEach((ch) => {
      ch.lessons?.forEach((l) => {
        if (!firstLessonId && l.lessonId) {
          firstModuleId = mod.moduleId;
          firstChapterId = ch.chapterId;
          firstLessonId = l.lessonId;
        }
      });
    });
  });

  // No curriculum mapping, or a mapping with zero lessons → land on the curriculum index
  // (a coherent entry point), never the course-detail page for a "continue learning" action.
  if (!mapping || !firstLessonId) {
    return "/curriculum";
  }

  const params = new URLSearchParams({
    curriculumId: mapping.curriculumId,
    moduleId: firstModuleId,
    chapterId: firstChapterId,
    courseId,
  });

  if (resume && progress?.lastViewedLessonId) {
    const lastLessonId = progress.lastViewedLessonId;
    const lastSlideIndex = progress.lastViewedSlideIndex ?? 0;
    let foundModuleId = "";
    let foundChapterId = "";
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
    // Only resume if the last-viewed lesson still exists in the mapping; otherwise its
    // module/chapter params would be wrong, so fall through to the first lesson.
    if (foundModuleId && foundChapterId) {
      params.set("moduleId", foundModuleId);
      params.set("chapterId", foundChapterId);
      params.set("slideIndex", String(lastSlideIndex));
      return `/learn/lesson/${lastLessonId}?${params.toString()}`;
    }
  }

  return `/learn/lesson/${firstLessonId}?${params.toString()}`;
}
