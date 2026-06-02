import {getFirestore} from "firebase-admin/firestore";
import {
  DEFAULT_COURSE_BENEFIT,
  DEFAULT_COURSE_DISPLAY_NAME,
  DEFAULT_COURSE_ID,
  DEFAULT_PLATFORM_URL,
  DEFAULT_TIME_TO_NEXT_BADGE,
} from "./emailConfig";

type LessonRef = {lessonId: string; title?: string};
type MappingModule = {
  moduleId?: string;
  chapters?: Array<{lessons?: LessonRef[]}>;
};

type CourseDoc = {
  title?: string;
  description?: string;
  modules?: Array<{title?: string}>;
  curriculumMapping?: {modules?: MappingModule[]};
};

type ProgressDoc = {
  progress?: number;
  lessonsCompleted?: Record<string, boolean>;
  lastViewedLessonId?: string;
};

export type CourseEmailContext = {
  next_lesson_name: string;
  first_lesson_title: string;
  progress_percent: string;
  next_milestone: string;
  time_to_next_badge: string;
  course_benefit: string;
  resume_url: string;
  start_url: string;
};

function orderedLessons(course: CourseDoc): LessonRef[] {
  const out: LessonRef[] = [];
  for (const mod of course.curriculumMapping?.modules ?? []) {
    for (const ch of mod.chapters ?? []) {
      for (const lesson of ch.lessons ?? []) {
        if (lesson.lessonId) out.push(lesson);
      }
    }
  }
  return out;
}

function moduleTitleForLesson(course: CourseDoc, lessonId: string): string | null {
  const mapping = course.curriculumMapping?.modules ?? [];
  const modules = course.modules ?? [];
  for (let i = 0; i < mapping.length; i++) {
    const mod = mapping[i];
    const lessonIds =
      mod.chapters?.flatMap((c) => c.lessons ?? []).map((l) => l.lessonId) ?? [];
    if (lessonIds.includes(lessonId)) {
      return modules[i]?.title?.trim() || null;
    }
  }
  return null;
}

export async function resolveCourseEmailContext(input: {
  courseId: string;
  progress?: ProgressDoc | null;
  platformUrl?: string;
}): Promise<CourseEmailContext> {
  const db = getFirestore();
  const courseId = input.courseId?.trim() || DEFAULT_COURSE_ID;
  const base = (input.platformUrl ?? DEFAULT_PLATFORM_URL).replace(/\/$/, "");
  const progress = input.progress ?? {};
  const lessonsCompleted = progress.lessonsCompleted ?? {};

  const courseSnap = await db.collection("courses").doc(courseId).get();
  const course = (courseSnap.data() ?? {}) as CourseDoc;
  const lessons = orderedLessons(course);

  const firstLesson = lessons[0];
  const firstLessonTitle = firstLesson?.title?.trim() || "your first lesson";

  let nextLesson = lessons.find((l) => !lessonsCompleted[l.lessonId]);
  if (!nextLesson && progress.lastViewedLessonId) {
    const fromResume = lessons.find((l) => l.lessonId === progress.lastViewedLessonId);
    if (fromResume) nextLesson = fromResume;
  }
  if (!nextLesson) nextLesson = firstLesson;

  const nextLessonName = nextLesson?.title?.trim() || "your next lesson";
  const nextLessonId = nextLesson?.lessonId;
  const moduleTitle = nextLessonId ? moduleTitleForLesson(course, nextLessonId) : null;

  const rawProgress = typeof progress.progress === "number" ? progress.progress : 0;
  const progressPercent = `${Math.min(100, Math.max(0, Math.round(rawProgress)))}% Complete`;

  const nextMilestone =
    moduleTitle?.trim() ||
    (nextLessonName !== "your next lesson" ? `Complete ${nextLessonName}` : "Your next lesson");

  const courseBenefit =
    (typeof course.description === "string" && course.description.trim().slice(0, 120)) ||
    DEFAULT_COURSE_BENEFIT;

  const resumePath = nextLessonId
    ? `/courses/${courseId}?lesson=${encodeURIComponent(nextLessonId)}`
    : `/courses/${courseId}`;

  return {
    next_lesson_name: nextLessonName,
    first_lesson_title: firstLessonTitle,
    progress_percent: progressPercent,
    next_milestone: nextMilestone,
    time_to_next_badge: DEFAULT_TIME_TO_NEXT_BADGE,
    course_benefit: courseBenefit,
    resume_url: `${base}${resumePath}`,
    start_url: firstLesson?.lessonId
      ? `${base}/courses/${courseId}?lesson=${encodeURIComponent(firstLesson.lessonId)}`
      : `${base}/courses/${courseId}`,
  };
}

export function defaultCourseEmailContext(platformUrl?: string): CourseEmailContext {
  const base = (platformUrl ?? DEFAULT_PLATFORM_URL).replace(/\/$/, "");
  const courseId = DEFAULT_COURSE_ID;
  return {
    next_lesson_name: "your next lesson",
    first_lesson_title: "Lesson 1",
    progress_percent: "0% Complete",
    next_milestone: "Your first module",
    time_to_next_badge: DEFAULT_TIME_TO_NEXT_BADGE,
    course_benefit: DEFAULT_COURSE_BENEFIT,
    resume_url: `${base}/courses/${courseId}`,
    start_url: `${base}/courses/${courseId}`,
  };
}

export function courseDisplayNameFromDoc(course: CourseDoc | undefined): string {
  return course?.title?.trim() || DEFAULT_COURSE_DISPLAY_NAME;
}
