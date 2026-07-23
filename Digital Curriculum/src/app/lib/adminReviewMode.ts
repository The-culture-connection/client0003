/**
 * Admin review mode (course player).
 *
 * When an Admin/superAdmin views course content, nothing is recorded: no
 * slide progress, lesson/module/course completion, quiz attempts, survey
 * submissions, or certificates. Admins can therefore review courses forever
 * without accumulating "done" state.
 *
 * The flag is a module-level session value set by LessonPlayer/CourseDetail
 * as soon as roles resolve; `courseProgress.ts` writers consult it and no-op
 * while it is active. It is re-evaluated (and cleared for non-admins) on
 * every course/lesson load, so a student signing in after an admin on the
 * same tab gets normal tracking.
 */

let adminReviewActive = false;

export function setAdminReviewSession(active: boolean): void {
  adminReviewActive = active;
}

export function isAdminReviewSession(): boolean {
  return adminReviewActive;
}
