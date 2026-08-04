import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import {
  BookOpen,
  Clock,
  DollarSign,
  ArrowLeft,
  Play,
  CheckCircle2,
  FileText,
  Calendar,
  User,
} from "lucide-react";
import { getCourse, getLessonsWithQuiz, getLessonSurveyCounts, type Course, type Module } from "../../lib/courses";
import { format } from "date-fns";
import { useAuth } from "../../components/auth/AuthProvider";
import {
  getCourseProgress,
  calculateCourseProgress,
  isLessonSurveysCompleteByCount,
  reconcileCourseContentVersion,
  type CourseProgress,
} from "../../lib/courseProgress";
import { getCourseSlideCounts } from "../../lib/curriculum";
import { getCurrentUserWithRoles } from "../../lib/auth";
import { Edit } from "lucide-react";
import { useScreenAnalytics } from "../../analytics/useScreenAnalytics";
import { trackEvent } from "../../analytics/trackEvent";
import { WEB_ANALYTICS_EVENTS } from "@mortar/analytics-contract/mortarAnalyticsContract";
import {
  getPaidModuleIds,
  userHasModuleAccess,
  userOwnsAllPaidModules,
  unpaidPaidModuleTotalCents,
} from "../../lib/moduleAccess";
import { checkoutModule } from "../../lib/stripeCheckout";
import { setAdminReviewSession } from "../../lib/adminReviewMode";
import { Lock } from "lucide-react";

export function CourseDetail() {
  useScreenAnalytics("course_detail");
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [courseProgress, setCourseProgress] = useState<CourseProgress | null>(null);
  const [courseSlideCounts, setCourseSlideCounts] = useState<Record<string, number> | null>(null);
  const [lessonsWithQuiz, setLessonsWithQuiz] = useState<Record<string, boolean> | null>(null);
  const [lessonSurveyCounts, setLessonSurveyCounts] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [paidModuleIds, setPaidModuleIds] = useState<string[]>([]);
  const [purchasingModuleId, setPurchasingModuleId] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId || !user) {
      setLoading(false);
      return;
    }
    // Clear slide counts immediately so we never render with stale data from another course (prevents complete flash)
    setCourseSlideCounts(null);
    setLessonsWithQuiz(null);
    setLessonSurveyCounts(null);
    setLoading(true);

    const loadCourse = async () => {
      try {
        const [courseData, progressData, userWithRoles, paidMods] = await Promise.all([
          getCourse(courseId),
          getCourseProgress(user.uid, courseId),
          getCurrentUserWithRoles(),
          getPaidModuleIds(user.uid),
        ]);
        // Re-open the course to the latest content if the admin pushed an update
        // after this learner last synced (resets a completed learner to re-finish).
        const reconciledProgress = await reconcileCourseContentVersion(
          user.uid,
          courseData,
          progressData
        );
        setCourse(courseData);
        setCourseProgress(reconciledProgress);
        setPaidModuleIds(paidMods);
        const roles = userWithRoles?.roles ?? [];
        const admin = roles.includes("Admin") || roles.includes("superAdmin");
        setIsAdmin(admin);
        // Admin review mode: admins browse course content without recording
        // progress/completion anywhere (see lib/adminReviewMode.ts).
        setAdminReviewSession(admin);
        if (courseData?.curriculumMapping) {
          const counts = await getCourseSlideCounts(courseData);
          setCourseSlideCounts(counts);
          if (courseId && Object.keys(counts).length > 0) {
            try {
              const [q, s] = await Promise.all([
                getLessonsWithQuiz(courseId, Object.keys(counts)),
                getLessonSurveyCounts(courseId, Object.keys(counts)),
              ]);
              setLessonsWithQuiz(q);
              setLessonSurveyCounts(s);
            } catch {
              setLessonsWithQuiz({});
              setLessonSurveyCounts({});
            }
          } else {
            setLessonsWithQuiz(null);
            setLessonSurveyCounts(null);
          }
        } else {
          setCourseSlideCounts(null);
          setLessonsWithQuiz(null);
        }
        if (courseData && courseData.modules.length > 0) {
          setExpandedModule(courseData.modules[0].id || courseData.modules[0].title);
        }
      } catch (error) {
        console.error("Error loading course:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCourse();
  }, [courseId, user]);

  useEffect(() => {
    if (!courseId || !user?.uid || searchParams.get("purchase") !== "success") return;
    let cancelled = false;
    (async () => {
      try {
        const paidMods = await getPaidModuleIds(user.uid);
        if (!cancelled) setPaidModuleIds(paidMods);
      } catch (e) {
        console.error("Refresh paid modules after purchase:", e);
      } finally {
        if (!cancelled) {
          navigate(`/courses/${courseId}`, { replace: true });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId, user?.uid, searchParams, navigate]);

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading course...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Course not found</p>
          <Button onClick={() => navigate("/curriculum")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Curriculum
          </Button>
        </div>
      </div>
    );
  }

  const totalDurationMonths = course.totalDuration || course.modules.reduce((sum, m) => sum + (m.durationMonths || 0), 0);
  const ownsAllPaidModules = isAdmin || userOwnsAllPaidModules(course, paidModuleIds);
  const unpaidTotalDollars = unpaidPaidModuleTotalCents(course, paidModuleIds) / 100;
  const showCoursePriceBadge = !ownsAllPaidModules && unpaidTotalDollars > 0 && course.currency;
  const courseProgressValue = courseProgress
    ? calculateCourseProgress(
        course,
        courseProgress,
        courseSlideCounts ?? undefined,
        lessonsWithQuiz ?? undefined,
        undefined,
        undefined,
        lessonSurveyCounts ?? undefined
      )
    : 0;
  // Admin review mode: admins never see done/completed states on course content.
  const reviewMode = isAdmin;
  // Don't show "Completed" or 100% until we have slide counts (avoids flash from fallback or stale progress.completed)
  const hasProgressData = courseSlideCounts != null;
  const isCourseCompleted = hasProgressData && !reviewMode && (courseProgress?.completed || courseProgressValue === 100);
  const displayProgressValue = hasProgressData ? courseProgressValue : Math.min(courseProgressValue, 99);

  // Countdown in days: only when user has started the course (startedAt set)
  const startedAt = courseProgress?.startedAt;
  const startedAtDate = startedAt && typeof (startedAt as { toDate?: () => Date }).toDate === "function"
    ? (startedAt as { toDate: () => Date }).toDate()
    : startedAt && typeof (startedAt as { seconds?: number }).seconds === "number"
      ? new Date((startedAt as { seconds: number }).seconds * 1000)
      : null;
  const totalDurationDays = totalDurationMonths * 30;
  const endDate = startedAtDate ? new Date(startedAtDate.getTime() + totalDurationDays * 24 * 60 * 60 * 1000) : null;
  const daysLeft = endDate ? Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000))) : null;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button
          onClick={() => navigate("/curriculum")}
          variant="ghost"
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Curriculum
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Badge variant="outline" className="border-accent text-accent">
                {course.status || "published"}
              </Badge>
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/admin/courses/${course.id}`)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit course
                </Button>
              )}
              {reviewMode && (
                <Badge variant="outline" className="border-amber-500 text-amber-500">
                  Review mode
                </Badge>
              )}
              {isCourseCompleted && (
                <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Completed
                </Badge>
              )}
              {showCoursePriceBadge && (
                <Badge variant="secondary">
                  <DollarSign className="w-3 h-3 mr-1" />
                  {unpaidTotalDollars.toFixed(2)}
                </Badge>
              )}
            </div>
            <h1 className="font-headline font-black uppercase tracking-tight text-3xl text-foreground mb-2">
              {course.title}
            </h1>
            {course.description && (
              <p className="text-muted-foreground text-lg mb-4">
                {course.description}
              </p>
            )}
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <span>{course.modules.length} Module{course.modules.length !== 1 ? "s" : ""}</span>
              </div>
              {totalDurationMonths > 0 && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {startedAtDate ? (
                    <span>{totalDurationDays} days{daysLeft != null && <span className="text-foreground font-medium"> · {daysLeft} days left</span>}</span>
                  ) : (
                    <span>{totalDurationMonths} Month{totalDurationMonths !== 1 ? "s" : ""}</span>
                  )}
                </div>
              )}
              {course.createdAt && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>
                    Created {format(course.createdAt.toDate(), "MMM d, yyyy")}
                  </span>
                </div>
              )}
            </div>
            {courseProgress && !reviewMode && (
              <div className="mt-4">
                <span className="text-sm text-muted-foreground">Your Progress</span>
                <div className="mt-2 space-y-1">
                  <Progress value={displayProgressValue} className="h-2 w-full" />
                  <p className="text-sm font-medium text-foreground">
                    {Math.round(displayProgressValue)}%
                  </p>
                </div>
              </div>
            )}
            {reviewMode && (
              <p className="mt-4 text-xs text-muted-foreground">
                Admin review mode — viewing course content doesn&apos;t record progress or completion.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Modules */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Course content</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Expand a module and click Start Lesson to view the lesson (images or slides) in order with Previous/Next.
          </p>
        </div>
        {course.modules.length === 0 ? (
          <Card className="p-6">
            <p className="text-muted-foreground text-center">
              No modules available yet.
            </p>
          </Card>
        ) : (
          course.modules
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map((module, moduleIndex) => {
              const curriculumModuleId =
                course.curriculumMapping?.modules?.[moduleIndex]?.moduleId;
              const moduleCheckoutId = module.id ?? curriculumModuleId;
              const hasModulePaidAccess =
                isAdmin ||
                userHasModuleAccess(module, paidModuleIds, curriculumModuleId);
              const moduleDurationMonths = module.durationMonths || 0;
              const moduleDurationDays = moduleDurationMonths * 30;
              let moduleEndDate: Date | null = null;
              let moduleDaysLeft: number | null = null;
              if (startedAtDate && moduleDurationDays > 0) {
                const cumulativeMonths = course.modules
                  .sort((a, b) => (a.order || 0) - (b.order || 0))
                  .slice(0, moduleIndex + 1)
                  .reduce((sum, m) => sum + (m.durationMonths || 0), 0);
                moduleEndDate = new Date(startedAtDate.getTime() + cumulativeMonths * 30 * 24 * 60 * 60 * 1000);
                moduleDaysLeft = Math.max(0, Math.ceil((moduleEndDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
              }
              return (
              <Card key={module.id || moduleIndex} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="outline" className="text-xs">
                        Module {module.order || moduleIndex + 1}
                      </Badge>
                      {!hasModulePaidAccess && Number(module.price) > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          <DollarSign className="w-3 h-3 mr-1" />
                          {module.price.toFixed(2)}
                        </Badge>
                      )}
                      {module.durationMonths && module.durationMonths > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          {startedAtDate
                            ? `${moduleDurationDays} days${moduleDaysLeft != null ? ` · ${moduleDaysLeft} days left` : ""}`
                            : `${module.durationMonths} Month${module.durationMonths !== 1 ? "s" : ""}`}
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      {module.title}
                    </h3>
                    {module.description && (
                      <p className="text-muted-foreground mb-4">
                        {module.description}
                      </p>
                    )}
                    {module.skills && module.skills.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="text-sm text-muted-foreground mr-1">Skills:</span>
                        {module.skills.map((skill) => (
                          <Badge key={skill} variant="secondary" className="text-xs font-normal">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  {!hasModulePaidAccess && Number(module.price) > 0 && course.id && (
                    <Button
                      size="sm"
                      className="bg-accent hover:bg-accent/90 text-accent-foreground mr-2"
                      disabled={purchasingModuleId === (moduleCheckoutId ?? module.title)}
                      onClick={async () => {
                        if (!course.id) return;
                        if (!moduleCheckoutId) {
                          alert(
                            "This module cannot be purchased yet. Please contact support or ask an admin to re-save the course."
                          );
                          return;
                        }
                        setPurchasingModuleId(moduleCheckoutId);
                        try {
                          await checkoutModule({
                            courseId: course.id,
                            moduleId: moduleCheckoutId,
                            curriculumModuleId,
                          });
                        } catch (e) {
                          console.error(e);
                          alert(e instanceof Error ? e.message : "Checkout failed");
                        } finally {
                          setPurchasingModuleId(null);
                        }
                      }}
                    >
                      {purchasingModuleId === moduleCheckoutId
                        ? "Redirecting…"
                        : `Buy module · $${Number(module.price).toFixed(2)}`}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const moduleKey = module.id || module.title;
                      const wasExpanded = expandedModule === moduleKey;
                      trackEvent(WEB_ANALYTICS_EVENTS.COURSE_DETAIL_MODULE_EXPAND_TOGGLED, {
                        course_id: course.id ?? null,
                        module_id: module.id ?? String(moduleKey),
                        expanded: !wasExpanded,
                      });
                      setExpandedModule(wasExpanded ? null : moduleKey);
                    }}
                  >
                    {expandedModule === (module.id || module.title) ? "Hide" : "Show"} Lessons
                  </Button>
                </div>

                {expandedModule === (module.id || module.title) && (
                  <div className="mt-4 pt-4 border-t border-border">
                    {(() => {
                      const mappingModule = course.curriculumMapping?.modules?.[moduleIndex];
                      const mappingLessons = mappingModule?.chapters?.[0]?.lessons ?? [];
                      let completedInModule = 0;
                      if (hasProgressData) {
                        mappingLessons.forEach((l, idx) => {
                          const lid = l.lessonId;
                          const hasQuiz = lessonsWithQuiz?.[lid];
                          const surveyCount = lessonSurveyCounts?.[lid] ?? 0;
                          const hasSurvey = surveyCount > 0;
                          const surveyOk = isLessonSurveysCompleteByCount(
                            courseProgress,
                            lid,
                            surveyCount
                          );
                          const done =
                            (courseProgress?.lessonsCompleted?.[lid] &&
                              (!hasQuiz || courseProgress?.quizPassed?.[lid]) &&
                              surveyOk) ||
                            false;
                          if (done) completedInModule++;
                        });
                      }
                      return (
                        <>
                          <h4 className="text-sm font-semibold text-foreground mb-3">
                            Lessons ({module.lessons.length})
                            {courseProgress && completedInModule > 0 && !reviewMode && (
                              <span className="text-muted-foreground font-normal ml-2">
                                — {completedInModule} of {module.lessons.length} completed
                              </span>
                            )}
                          </h4>
                    {module.lessons.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No lessons available yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {module.lessons
                          .sort((a, b) => (a.order || 0) - (b.order || 0))
                          .map((lesson, lessonIndex) => {
                            const curriculumModule = course.curriculumMapping?.modules[moduleIndex];
                            const curriculumLesson = curriculumModule?.chapters[0]?.lessons[lessonIndex];
                            const curriculumLessonId = curriculumLesson?.lessonId;
                            const lessonIdForProgress = curriculumLessonId || lesson.id || `module_${moduleIndex}_lesson_${lessonIndex}`;
                            const hasQuizForLesson = lessonsWithQuiz?.[lessonIdForProgress];
                            const surveyCountForLesson =
                              lessonSurveyCounts?.[lessonIdForProgress] ?? 0;
                            const hasSurveyForLesson = surveyCountForLesson > 0;
                            const surveyOkForLesson = isLessonSurveysCompleteByCount(
                              courseProgress,
                              lessonIdForProgress,
                              surveyCountForLesson
                            );
                            const isCompleted =
                              (courseProgress?.lessonsCompleted?.[lessonIdForProgress] &&
                                (!hasQuizForLesson ||
                                  courseProgress?.quizPassed?.[lessonIdForProgress]) &&
                                surveyOkForLesson) ||
                              false;
                            const hasCurriculumContent = Boolean(course.curriculumMapping && curriculumLessonId);
                            const showAsCompleted = hasProgressData && isCompleted && !reviewMode;
                            const totalSlidesForLesson = hasProgressData ? (courseSlideCounts?.[lessonIdForProgress] ?? courseProgress?.totalPages?.[lessonIdForProgress] ?? 0) : 0;
                            const viewedSlides = courseProgress?.pagesViewed?.[lessonIdForProgress] ?? 0;
                            const contentComplete = hasProgressData && totalSlidesForLesson > 0 && viewedSlides >= totalSlidesForLesson;

                            return (
                            <div
                              key={lesson.id || lessonIndex}
                              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <div className="p-2 bg-background rounded">
                                  <FileText className="w-4 h-4 text-muted-foreground" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-foreground">
                                    {lesson.title}
                                  </p>
                                  {lesson.subtitle && (
                                    <p className="text-xs text-muted-foreground">{lesson.subtitle}</p>
                                  )}
                                  {!reviewMode &&
                                    courseProgress?.pagesViewed?.[lessonIdForProgress] != null &&
                                    (courseProgress?.totalPages?.[lessonIdForProgress] ?? 0) > 0 && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Progress: {courseProgress.pagesViewed[lessonIdForProgress]} of{" "}
                                        {courseProgress.totalPages?.[lessonIdForProgress]} slides
                                      </p>
                                    )}
                                  {/* Per-lesson completion: Content, Quiz, Document generation (hidden in admin review mode) */}
                                  {!reviewMode && (
                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1.5">
                                      {contentComplete ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                                      ) : (
                                        <span className="w-3.5 h-3.5 rounded-full border border-muted-foreground/50 shrink-0" />
                                      )}
                                      Content
                                    </span>
                                    {hasQuizForLesson && (
                                      <span className="flex items-center gap-1.5">
                                        {courseProgress?.quizPassed?.[lessonIdForProgress] ? (
                                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                                        ) : (
                                          <span className="w-3.5 h-3.5 rounded-full border border-muted-foreground/50 shrink-0" />
                                        )}
                                        Quiz
                                      </span>
                                    )}
                                    {hasSurveyForLesson && (
                                      <span className="flex items-center gap-1.5">
                                        {courseProgress?.surveySubmitted?.[lessonIdForProgress] ? (
                                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                                        ) : (
                                          <span className="w-3.5 h-3.5 rounded-full border border-muted-foreground/50 shrink-0" />
                                        )}
                                        Document generation
                                      </span>
                                    )}
                                  </div>
                                  )}
                                  {lesson.slideFileName && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {lesson.slideFileName}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {isAdmin && course.curriculumMapping && curriculumLesson && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const curriculumId = course.curriculumMapping!.curriculumId;
                                      const moduleId = course.curriculumMapping!.modules[moduleIndex].moduleId;
                                      const chapterId = course.curriculumMapping!.modules[moduleIndex].chapters[0].chapterId;
                                      const lid = curriculumLesson.lessonId;
                                      navigate(
                                        `/admin/curriculum/${curriculumId}/module/${moduleId}/chapter/${chapterId}/lesson/${lid}/builder`
                                      );
                                    }}
                                  >
                                    <Edit className="w-4 h-4 mr-2" />
                                    Build Content
                                  </Button>
                                )}
                                {showAsCompleted ? (
                                  <Badge variant="outline" className="text-green-600 border-green-600">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Completed
                                  </Badge>
                                ) : !hasModulePaidAccess && Number(module.price) > 0 ? (
                                  <Badge variant="secondary" className="text-xs gap-1">
                                    <Lock className="w-3 h-3" />
                                    Purchase module to unlock
                                  </Badge>
                                ) : hasCurriculumContent ? (
                                  <Button
                                    size="sm"
                                    className="bg-accent hover:bg-accent/90 text-accent-foreground"
                                    onClick={() => {
                                      const curriculumId = course.curriculumMapping!.curriculumId;
                                      const moduleId = course.curriculumMapping!.modules[moduleIndex].moduleId;
                                      const chapterId = course.curriculumMapping!.modules[moduleIndex].chapters[0].chapterId;
                                      const params = new URLSearchParams({
                                        curriculumId,
                                        moduleId,
                                        chapterId,
                                        courseId: course.id || "",
                                      });
                                      const progress = courseProgress;
                                      const lastLessonId = progress?.lastViewedLessonId;
                                      const lastSlideIndex = progress?.lastViewedSlideIndex ?? 0;
                                      const isResume =
                                        lastLessonId === curriculumLessonId &&
                                        ((progress?.pagesViewed?.[curriculumLessonId] ?? 0) > 0 || lastSlideIndex > 0);
                                      if (isResume && lastSlideIndex >= 0) {
                                        params.set("slideIndex", String(lastSlideIndex));
                                      }
                                      trackEvent(WEB_ANALYTICS_EVENTS.COURSE_DETAIL_START_LESSON_CLICKED, {
                                        course_id: course.id ?? null,
                                        lesson_id: curriculumLessonId ?? null,
                                        resume: isResume,
                                      });
                                      navigate(
                                        `/learn/lesson/${curriculumLessonId}?${params.toString()}`
                                      );
                                    }}
                                  >
                                    <Play className="w-3 h-3 mr-1" />
                                    {reviewMode
                                      ? "View Lesson"
                                      : courseProgress?.pagesViewed?.[curriculumLessonId!]
                                        ? `Continue (${courseProgress.pagesViewed[curriculumLessonId!]}/${courseProgress.totalPages?.[curriculumLessonId!] ?? "?"} slides)`
                                        : "Start Lesson"}
                                  </Button>
                                ) : (
                                  <Badge variant="secondary" className="text-xs">
                                    {isAdmin ? "No content yet" : "Not Available"}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                          })}
                      </div>
                    )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
