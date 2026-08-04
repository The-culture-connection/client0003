/**
 * Learner-facing Lesson Player
 * Displays published lessons slide by slide
 */

import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { getSlides, getBlocks, getLesson, getLessonImages, getLessonContent, getCourseSlideCounts, type Slide, type Block, type Lesson, type LessonImage, type LessonContentSlide, type LessonQuiz, type LessonSurveyCheckpoint } from "../../lib/curriculum";
import { getPaidModuleIds, userHasModuleAccess } from "../../lib/moduleAccess";
import { getCurrentUserWithRoles } from "../../lib/auth";
import { isStaffAdminRole } from "../../lib/adminHubNavigation";
import {
  getCourse,
  getCourseLessonQuiz,
  getCourseLessonSurveyCheckpoints,
  getLessonsWithQuiz,
  getLessonSurveyCounts,
  isLessonSurveyCheckpointSubmitted,
  lessonSurveyProgressKey,
} from "../../lib/courses";
import {
  getCourseProgress,
  reconcileCourseContentVersion,
  updateLessonSlideProgress,
  setLessonCompleted,
  recordLessonQuizAttempt,
  recordLessonSurveyCheckpointSubmission,
  saveLessonSurveyAnswersDraft,
  markCourseCompleted,
  calculateCourseProgress,
  updateModulesCompletionMap,
} from "../../lib/courseProgress";
import { setAdminReviewSession } from "../../lib/adminReviewMode";
import { getVerseThemeColor, verseThemeStyle } from "../../lib/verseTheme";
import { formatQuizQuestionPrompt } from "../../lib/quizText";
import { AdminReviewNotesPanel } from "../../components/curriculum/AdminReviewNotesPanel";
import { awardSkillAndCertificate, createSkillCertificatesForCompletedCourse, uploadSurveyResponsePdf } from "../../lib/dataroom";
import { DEFAULT_DATAROOM_FOLDER_ID } from "../../lib/dataroomFolders";
import { useAuth } from "../../components/auth/AuthProvider";
import { functions } from "../../lib/firebase";
import { httpsCallable } from "firebase/functions";
import { SlideRenderer } from "../../components/curriculum/SlideRenderer";
import { MediaVideoBlock } from "../../components/curriculum/MediaVideoBlock";
import { LessonScreenRenderer } from "../../components/curriculum/LessonScreenRenderer";
import { LessonSlideScreen } from "../../components/curriculum/LessonSlideScreen";
import { useLessonScreenPreload } from "../../hooks/useLessonScreenPreload";
import { Button } from "../../components/ui/button";
import { ChevronLeft, ChevronRight, LogOut, Loader2 } from "lucide-react";
import { useScreenAnalytics } from "../../analytics/useScreenAnalytics";
import { trackEvent } from "../../analytics/trackEvent";
import { WEB_ANALYTICS_EVENTS } from "@mortar/analytics-contract/mortarAnalyticsContract";
import { useFeedback } from "../../contexts/FeedbackContext";
import {
  canShowFeedback,
  recordFeedbackShown,
  incrementSessionCount,
  getSessionCount,
} from "../../analytics/feedbackTriggerEngine";

export function LessonPlayer() {
  useScreenAnalytics("lesson_player");
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setFeedbackContext, triggerRepulse, openModal } = useFeedback();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [lessonImages, setLessonImages] = useState<LessonImage[]>([]);
  const [lessonContent, setLessonContent] = useState<LessonContentSlide[]>([]);
  const [slideBlocks, setSlideBlocks] = useState<Record<string, Block[]>>({});
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [quiz, setQuiz] = useState<LessonQuiz | null>(null);
  const [progress, setProgress] = useState<Awaited<ReturnType<typeof getCourseProgress>>>(null);
  const [curriculumId, setCurriculumId] = useState<string | null>(null);
  const [moduleId, setModuleId] = useState<string | null>(null);
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [verseIndex, setVerseIndex] = useState<number | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, "A" | "B" | "C" | "D">>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizPassed, setQuizPassed] = useState<boolean | null>(null);
  const [quizScore, setQuizScore] = useState<{ correct: number; total: number } | null>(null);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [showQuizView, setShowQuizView] = useState(false);
  const [surveys, setSurveys] = useState<LessonSurveyCheckpoint[]>([]);
  const [activeSurveyId, setActiveSurveyId] = useState<string | null>(null);
  const [surveyAnswers, setSurveyAnswers] = useState<string[]>([]);
  const [activeSurveySubmitted, setActiveSurveySubmitted] = useState(false);
  /** When AI survey analysis is enabled: answer entry → optional choice → optional feedback edits before finalize */
  type SurveyInteractiveStep = "answer" | "choose" | "feedback";
  const [surveyInteractiveStep, setSurveyInteractiveStep] = useState<SurveyInteractiveStep>("answer");
  const [surveyAiFeedbackText, setSurveyAiFeedbackText] = useState<string | null>(null);
  const [isAnalyzingSurvey, setIsAnalyzingSurvey] = useState(false);
  const [isSubmittingSurvey, setIsSubmittingSurvey] = useState(false);
  const [showSurveyView, setShowSurveyView] = useState(false);
  /** Admin review mode: content is viewable forever; nothing is recorded. */
  const [isAdminReviewer, setIsAdminReviewer] = useState(false);
  /** Review mode only: surveys "submitted" locally this session (no writes). */
  const [reviewedSurveyIds, setReviewedSurveyIds] = useState<Set<string>>(new Set());
  const loggedQuizExhausted = useRef(false);
  const lastSurveyEngagementSig = useRef<string>("");

  useEffect(() => {
    lastSurveyEngagementSig.current = "";
  }, [lessonId, showSurveyView, activeSurveyId]);

  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const courseId = params.get("courseId") || undefined;

  // Set the feedback widget context whenever lessonId/courseId/slideIndex changes
  useEffect(() => {
    setFeedbackContext({
      context_type: "lesson",
      trigger_event: "implicit_feedback_shown",
      metadata: {
        lesson_id: lessonId,
        course_id: courseId,
        slide_index: currentSlideIndex,
      },
    });
  }, [lessonId, courseId, currentSlideIndex, setFeedbackContext]);

  const activeSurvey =
    surveys.find((s) => s.id === activeSurveyId) ?? null;

  const isSurveySubmitted = (surveyId: string) =>
    reviewedSurveyIds.has(surveyId) ||
    (lessonId
      ? isLessonSurveyCheckpointSubmitted(progress, lessonId, surveyId)
      : false);

  const allSurveysSubmitted =
    surveys.length === 0 || surveys.every((s) => isSurveySubmitted(s.id));

  useEffect(() => {
    if (!showSurveyView || activeSurveySubmitted || !activeSurvey?.questions?.length) return;
    const t = window.setTimeout(() => {
      const nonEmpty = surveyAnswers.filter((s) => (s ?? "").trim().length > 0).length;
      if (nonEmpty === 0) return;
      const total = activeSurvey.questions.length;
      const sig = `${nonEmpty}/${total}`;
      if (sig === lastSurveyEngagementSig.current) return;
      lastSurveyEngagementSig.current = sig;
      trackEvent(WEB_ANALYTICS_EVENTS.LESSON_SURVEY_FIELD_CHANGED, {
        lesson_id: lessonId ?? null,
        course_id: courseId ?? null,
        non_empty_field_count: nonEmpty,
        total_fields: total,
        field_type: "open_text",
      });
    }, 750);
    return () => clearTimeout(t);
  }, [surveyAnswers, showSurveyView, activeSurveySubmitted, activeSurvey, lessonId, courseId]);

  const isMediaLesson = lesson?.content_type === "media";
  const isImageLesson = lesson?.content_type === "images";
  const useImmersiveScreens =
    isMediaLesson &&
    (lesson?.screen_mode === "immersive" || lesson?.source_type === "pptx_import");
  const preloadSource = isMediaLesson
    ? { kind: "media" as const, items: lessonContent }
    : isImageLesson
      ? { kind: "images" as const, items: lessonImages }
      : null;
  useLessonScreenPreload(preloadSource, currentSlideIndex);
  const itemCount = isMediaLesson
    ? lessonContent.length
    : isImageLesson
      ? lessonImages.length
      : slides.length;

  // Extract IDs from lesson (assuming lessonId format includes all IDs or we need to pass them)
  // For now, we'll need to modify this to work with the actual route structure
  // This is a simplified version - you may need to adjust based on your routing needs
  
  useEffect(() => {
    if (!lessonId) {
      trackEvent(WEB_ANALYTICS_EVENTS.LESSON_PLAYER_MISSING_QUERY_PARAMS, {
        reason: "no_lesson_id",
      });
      setError("Lesson ID is required");
      setIsLoading(false);
      return;
    }

    const loadLesson = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const curriculumIdParam = params.get("curriculumId");
        const moduleIdParam = params.get("moduleId");
        const chapterIdParam = params.get("chapterId");

        if (!curriculumIdParam || !moduleIdParam || !chapterIdParam) {
          trackEvent(WEB_ANALYTICS_EVENTS.LESSON_PLAYER_MISSING_QUERY_PARAMS, {
            lesson_id: lessonId ?? null,
            has_curriculum_id: Boolean(curriculumIdParam),
            has_module_id: Boolean(moduleIdParam),
            has_chapter_id: Boolean(chapterIdParam),
          });
          setError("Missing required lesson parameters");
          setIsLoading(false);
          return;
        }
        setCurriculumId(curriculumIdParam);
        setModuleId(moduleIdParam);
        setChapterId(chapterIdParam);

        const courseIdParam = params.get("courseId");
        // Admins/superAdmins get every module for free AND review in admin
        // review mode (nothing recorded). Fail open to non-admin (paywalled,
        // tracked) if the roles lookup errors.
        const currentUser = user ? await getCurrentUserWithRoles().catch(() => null) : null;
        const isAdmin = isStaffAdminRole(currentUser?.roles);
        setIsAdminReviewer(isAdmin);
        setAdminReviewSession(isAdmin);
        setReviewedSurveyIds(new Set());
        if (courseIdParam && user?.uid) {
          const [courseData, paidMods] = await Promise.all([
            getCourse(courseIdParam),
            getPaidModuleIds(user.uid),
          ]);
          // Verse/chapter theme color follows the module ("verse") position
          // in the course (new card style spec).
          const verseIdx = courseData?.curriculumMapping?.modules?.findIndex(
            (m) => m.moduleId === moduleIdParam
          );
          if (verseIdx != null && verseIdx >= 0) setVerseIndex(verseIdx);
          if (!isAdmin && courseData) {
            const modIndex = courseData.curriculumMapping?.modules?.findIndex(
              (m) => m.moduleId === moduleIdParam
            );
            const courseModule =
              modIndex != null && modIndex >= 0 ? courseData.modules[modIndex] : undefined;
            if (
              courseModule &&
              Number(courseModule.price) > 0 &&
              !userHasModuleAccess(courseModule, paidMods, moduleIdParam)
            ) {
              navigate(`/courses/${courseIdParam}`, { replace: true });
              return;
            }
          }
        }

        const lessonData = await getLesson(curriculumIdParam, moduleIdParam, chapterIdParam, lessonId!);
        if (!lessonData || !lessonData.is_published) {
          setError("Lesson not found or not published");
          setIsLoading(false);
          return;
        }
        setLesson(lessonData);

        let itemCount = 0;
        if (lessonData.content_type === "media") {
          const content = await getLessonContent(curriculumIdParam, moduleIdParam, chapterIdParam, lessonId!);
          setLessonContent(content);
          itemCount = content.length;
        } else if (lessonData.content_type === "images") {
          const images = await getLessonImages(curriculumIdParam, moduleIdParam, chapterIdParam, lessonId!);
          setLessonImages(images);
          itemCount = images.length;
        } else {
          const slidesData = await getSlides(curriculumIdParam, moduleIdParam, chapterIdParam, lessonId!);
          setSlides(slidesData);
          const blocksMap: Record<string, Block[]> = {};
          for (const slide of slidesData) {
            if (slide.id) {
              const blocks = await getBlocks(curriculumIdParam, moduleIdParam, chapterIdParam, lessonId!, slide.id);
              blocksMap[slide.id] = blocks;
            }
          }
          setSlideBlocks(blocksMap);
          itemCount = slidesData.length;
        }

        const [quizData, surveyCheckpoints, progressData] = await Promise.all([
          courseIdParam ? getCourseLessonQuiz(courseIdParam, lessonId!) : Promise.resolve(null),
          courseIdParam ? getCourseLessonSurveyCheckpoints(courseIdParam, lessonId!) : Promise.resolve([]),
          courseIdParam && user ? getCourseProgress(user.uid, courseIdParam) : Promise.resolve(null),
        ]);
        setQuiz(quizData?.enabled && (quizData.questions?.length ?? 0) > 0 ? quizData : null);
        setSurveys(surveyCheckpoints);
        // Re-open to the latest content if the admin pushed an update since this
        // learner last synced (keeps the deep-link/resume path in sync too).
        let syncedProgress = progressData ?? null;
        if (courseIdParam && user && progressData) {
          const courseForSync = await getCourse(courseIdParam);
          syncedProgress = await reconcileCourseContentVersion(user.uid, courseForSync, progressData);
        }
        setProgress(syncedProgress);
        setActiveSurveyId(null);
        setShowSurveyView(false);
        setSurveyAnswers([]);
        setActiveSurveySubmitted(false);
        setSurveyInteractiveStep("answer");
        setSurveyAiFeedbackText(null);

        let initialIndex = 0;
        const slideIndexParam = params.get("slideIndex");
        if (slideIndexParam !== null && slideIndexParam !== "") {
          initialIndex = Math.max(0, parseInt(slideIndexParam, 10) || 0);
        } else if (user && courseIdParam && syncedProgress?.pagesViewed?.[lessonId!]) {
          initialIndex = Math.max(0, (syncedProgress.pagesViewed[lessonId!] || 1) - 1);
        }
        setCurrentSlideIndex(Math.min(initialIndex, Math.max(0, itemCount - 1)));
        setIsLoading(false);
      } catch (err) {
        console.error("Error loading lesson:", err);
        trackEvent(WEB_ANALYTICS_EVENTS.LESSON_PLAYER_LOAD_FAILED, {
          lesson_id: lessonId ?? null,
        });
        setError("Failed to load lesson");
        setIsLoading(false);
      }
    };

    loadLesson();
  }, [lessonId, user]);

  useEffect(() => {
    if (isLoading || error) return;
    if (lesson && itemCount === 0) {
      trackEvent(WEB_ANALYTICS_EVENTS.LESSON_PLAYER_EMPTY_CONTENT_VIEWED, {
        lesson_id: lessonId ?? null,
        course_id: courseId ?? null,
      });
    }
  }, [isLoading, error, lesson, itemCount, lessonId, courseId]);

  const currentSlide = slides[currentSlideIndex];
  const currentBlocks = currentSlide ? slideBlocks[currentSlide.id || ""] || [] : [];
  const currentImage = isImageLesson ? lessonImages[currentSlideIndex] : null;
  const currentContentSlide = isMediaLesson ? lessonContent[currentSlideIndex] : null;

  const handlePrevious = () => {
    if (currentSlideIndex > 0) {
      trackEvent(WEB_ANALYTICS_EVENTS.LESSON_SLIDE_PREVIOUS_CLICKED, {
        lesson_id: lessonId ?? null,
        course_id: courseId ?? null,
        from_index: currentSlideIndex,
        to_index: currentSlideIndex - 1,
      });
      setCurrentSlideIndex(currentSlideIndex - 1);
      window.scrollTo(0, 0);
    }
  };

  const syncModuleCompletionAndAwardBadges = async (
    progressAfter: NonNullable<Awaited<ReturnType<typeof getCourseProgress>>>,
    course: NonNullable<Awaited<ReturnType<typeof getCourse>>>
  ) => {
    if (!user || !courseId) return;
    const mappingModules = course.curriculumMapping?.modules ?? [];
    if (mappingModules.length === 0) return;

    const currentModulesCompleted = progressAfter.modulesCompleted ?? {};
    const nextModulesCompleted: Record<string, boolean> = {...currentModulesCompleted};
    const newlyCompletedModuleIds: string[] = [];

    for (const mapModule of mappingModules) {
      const mid = mapModule.moduleId;
      if (!mid) continue;
      const lessonIds =
        mapModule.chapters?.flatMap((c) => c.lessons ?? []).map((l) => l.lessonId).filter(Boolean) as string[];
      if (lessonIds.length === 0) continue;
      const completed = lessonIds.every((lid) => progressAfter.lessonsCompleted?.[lid] === true);
      nextModulesCompleted[mid] = completed;
      if (completed && !currentModulesCompleted[mid]) {
        newlyCompletedModuleIds.push(mid);
      }
    }

    await updateModulesCompletionMap(user.uid, courseId, nextModulesCompleted);

    if (newlyCompletedModuleIds.length > 0) {
      try {
        const awardFn = httpsCallable(functions, "awardCourseModuleBadges");
        await awardFn({
          course_id: courseId,
          module_ids: newlyCompletedModuleIds,
        });
      } catch (err) {
        console.error("Failed to award module completion badges:", err);
      }
      // Shareable module completion certificate (template PDF → dataroom).
      if (user && courseId) {
        for (const mid of newlyCompletedModuleIds) {
          const mi = mappingModules.findIndex((m) => m.moduleId === mid);
          const moduleTitle = mi >= 0 ? course.modules?.[mi]?.title : undefined;
          if (!moduleTitle) continue;
          try {
            await awardSkillAndCertificate(user.uid, courseId, course.title ?? "Course", moduleTitle);
          } catch (err) {
            console.error("Failed to create module certificate:", err);
          }
        }
      }
    }
  };

  const saveProgressAndExit = async () => {
    trackEvent(WEB_ANALYTICS_EVENTS.LESSON_CLOSE_CLICKED, {
      lesson_id: lessonId ?? null,
      course_id: courseId ?? null,
    });

    // Admin review mode: exit without recording progress, completion,
    // certificates, or abandonment feedback.
    if (isAdminReviewer) {
      navigate(courseId ? `/courses/${courseId}` : "/curriculum");
      return;
    }

    // Trigger abandonment feedback if user exits before 70% completion
    const completionRatio = itemCount > 0 ? currentSlideIndex / itemCount : 0;
    if (completionRatio < 0.7 && canShowFeedback("lesson_abandonment")) {
      trackEvent(WEB_ANALYTICS_EVENTS.LESSON_ABANDONMENT_FEEDBACK_TRIGGERED, {
        lesson_id: lessonId ?? null,
        course_id: courseId ?? null,
        slide_index: currentSlideIndex,
        completion_ratio: Math.round(completionRatio * 100),
      });
      recordFeedbackShown("lesson_abandonment");
      setFeedbackContext({
        context_type: "lesson",
        trigger_event: "lesson_abandonment_feedback_triggered",
        metadata: {
          lesson_id: lessonId,
          course_id: courseId,
          slide_index: currentSlideIndex,
        },
      });
      triggerRepulse();
    }
    if (!user || !courseId || !lessonId) {
      navigate(courseId ? `/courses/${courseId}` : "/curriculum");
      return;
    }
    setIsSaving(true);
    try {
      // Only save slide progress when we have a valid total (avoids writing 0/0 which breaks progress % on CourseDetail)
      if (itemCount > 0) {
        await updateLessonSlideProgress(user.uid, courseId, lessonId, currentSlideIndex, itemCount);
      }
      const hasQuiz = quiz != null && (quiz.questions?.length ?? 0) > 0;
      const atEnd = itemCount > 0 && currentSlideIndex >= itemCount - 1;
      const quizOk = !hasQuiz || progress?.quizPassed?.[lessonId] === true;
      if (atEnd && allSurveysSubmitted && quizOk) {
        await setLessonCompleted(user.uid, courseId, lessonId);
      }
      const [progressAfter, course] = await Promise.all([
        getCourseProgress(user.uid, courseId),
        getCourse(courseId),
      ]);
      if (progressAfter && course) {
        // Lesson-level skill (e.g. "Personal Finance (Tier I)") — awarded when
        // THIS lesson is fully complete: slides viewed, quiz passed, checkpoints in.
        if (lesson?.skill && lessonId && progressAfter.lessonsCompleted?.[lessonId] === true) {
          try {
            await awardSkillAndCertificate(user.uid, courseId, course.title ?? "Course", lesson.skill, {
              addToProfile: true,
            });
          } catch (err) {
            console.error("Failed to award lesson skill certificate:", err);
          }
        }
        await syncModuleCompletionAndAwardBadges(progressAfter, course);
        const totalSlidesPerLesson = await getCourseSlideCounts(course);
        const lessonIds = Object.keys(totalSlidesPerLesson);
        const [lessonsWithQuiz, lessonSurveyCounts] = await Promise.all([
          lessonIds.length > 0 ? getLessonsWithQuiz(courseId, lessonIds) : {},
          lessonIds.length > 0 ? getLessonSurveyCounts(courseId, lessonIds) : {},
        ]);
        const pct = calculateCourseProgress(
          course,
          progressAfter,
          totalSlidesPerLesson,
          lessonsWithQuiz,
          undefined,
          undefined,
          lessonSurveyCounts
        );
        if (pct >= 100) {
          await markCourseCompleted(user.uid, courseId);
          trackEvent(WEB_ANALYTICS_EVENTS.LESSON_COURSE_COMPLETED, {
            course_id: courseId,
          });
          const { certificatesCreated } = await createSkillCertificatesForCompletedCourse(user.uid, course);
          // Official course completion certificate + graduate honorific.
          try {
            await awardSkillAndCertificate(user.uid, courseId, course.title ?? "MORTAR Masters: Online", "Digital MORTAR MASTER");
          } catch (err) {
            console.error("Failed to create course completion certificate:", err);
          }
          if (certificatesCreated) {
            trackEvent(WEB_ANALYTICS_EVENTS.LESSON_CERTIFICATE_CREATED, {
              course_id: courseId,
            });
            alert("Congratulations! You've earned new certificate(s). View them in your Data Room.");
          }
        }
      }
    } catch (e) {
      console.error("Error saving progress:", e);
    } finally {
      setIsSaving(false);
      navigate(`/courses/${courseId}`);
    }
  };

  const progressPct = itemCount > 0 ? ((currentSlideIndex + 1) / itemCount) * 100 : 0;
  const hasQuiz = quiz != null && (quiz.questions?.length ?? 0) > 0;
  const hasSurveys = surveys.length > 0;

  const openSurveyCheckpoint = (checkpoint: LessonSurveyCheckpoint) => {
    if (!lessonId || !progress) {
      setActiveSurveyId(checkpoint.id);
      setSurveyAnswers(Array(checkpoint.questions.length).fill(""));
      setActiveSurveySubmitted(false);
      setSurveyInteractiveStep("answer");
      setShowSurveyView(true);
      return;
    }
    const progressKey = lessonSurveyProgressKey(lessonId, checkpoint.id);
    const qCount = checkpoint.questions.length;
    const saved = progress.surveyAnswers?.[progressKey] ?? progress.surveyAnswers?.[lessonId];
    setActiveSurveyId(checkpoint.id);
    if (Array.isArray(saved) && saved.length === qCount) {
      setSurveyAnswers(saved.map((s) => (typeof s === "string" ? s : "")));
    } else {
      setSurveyAnswers(Array(qCount).fill(""));
    }
    const submitted = isLessonSurveyCheckpointSubmitted(progress, lessonId, checkpoint.id);
    setActiveSurveySubmitted(submitted);
    const aiEnabled = !!checkpoint.aiAnalysis?.enabled;
    const fb =
      progress.surveyAiFeedback?.[progressKey] ?? progress.surveyAiFeedback?.[lessonId];
    if (submitted) {
      setSurveyInteractiveStep("answer");
      setSurveyAiFeedbackText(typeof fb === "string" ? fb : null);
    } else if (
      aiEnabled &&
      Array.isArray(saved) &&
      saved.length === qCount &&
      saved.some((s) => (typeof s === "string" ? s.trim() : "") !== "")
    ) {
      setSurveyInteractiveStep(typeof fb === "string" && fb.trim() !== "" ? "feedback" : "choose");
      setSurveyAiFeedbackText(typeof fb === "string" ? fb : null);
    } else {
      setSurveyInteractiveStep("answer");
      setSurveyAiFeedbackText(null);
    }
    setShowSurveyView(true);
    window.scrollTo(0, 0);
  };

  const pendingSurveysAfterCurrentSlide = () =>
    surveys.filter(
      (s) =>
        !isSurveySubmitted(s.id) &&
        s.afterSlideIndex === currentSlideIndex
    );

  const pendingEndSurveys = () =>
    surveys.filter((s) => !isSurveySubmitted(s.id) && s.afterSlideIndex === -1);
  const userPassed = progress?.quizPassed?.[lessonId!] === true;
  const attemptsUsed = progress?.quizAttempts?.[lessonId!] ?? 0;
  const atEnd = itemCount > 0 && currentSlideIndex >= itemCount - 1;
  const maxAttempts = quiz?.maxAttempts ?? 3;
  const passPct = quiz?.passPercentage ?? 70;
  const canTryAgain = hasQuiz && quizSubmitted && quizPassed === false && attemptsUsed < maxAttempts;

  useEffect(() => {
    if (showQuizView && hasQuiz) {
      trackEvent(WEB_ANALYTICS_EVENTS.LESSON_QUIZ_VIEW_OPENED, {
        lesson_id: lessonId ?? null,
        course_id: courseId ?? null,
      });
    }
  }, [showQuizView, hasQuiz, lessonId, courseId]);

  useEffect(() => {
    if (!hasQuiz || !quizSubmitted || quizPassed !== false || canTryAgain) {
      loggedQuizExhausted.current = false;
      return;
    }
    if (loggedQuizExhausted.current) return;
    loggedQuizExhausted.current = true;
    trackEvent(WEB_ANALYTICS_EVENTS.LESSON_QUIZ_EXHAUSTED_VIEWED, {
      lesson_id: lessonId ?? null,
      course_id: courseId ?? null,
      attempts_used: attemptsUsed,
    });
  }, [hasQuiz, quizSubmitted, quizPassed, canTryAgain, lessonId, courseId, attemptsUsed]);

  const handleNext = () => {
    const midLessonPending = pendingSurveysAfterCurrentSlide();
    if (midLessonPending.length > 0) {
      openSurveyCheckpoint(midLessonPending[0]);
      return;
    }

    if (currentSlideIndex < itemCount - 1) {
      trackEvent(WEB_ANALYTICS_EVENTS.LESSON_SLIDE_NEXT_CLICKED, {
        lesson_id: lessonId ?? null,
        course_id: courseId ?? null,
        from_index: currentSlideIndex,
        to_index: currentSlideIndex + 1,
      });
      setCurrentSlideIndex(currentSlideIndex + 1);
      window.scrollTo(0, 0);
      return;
    }

    const endPending = pendingEndSurveys();
    if (endPending.length > 0) {
      openSurveyCheckpoint(endPending[0]);
      return;
    }

    if (atEnd && hasQuiz && !userPassed) {
      setShowQuizView(true);
    }
  };

  /** Submit one survey checkpoint; may complete lesson when all surveys + quiz are done. */
  const finalizeSurveyCheckpoint = async (answersTrimmed: string[]) => {
    if (!activeSurvey?.questions?.length || !user || !courseId || !lessonId || !activeSurveyId) {
      return;
    }
    const sorted = [...activeSurvey.questions].sort((a, b) => a.order - b.order);
    const submittedSurveyId = activeSurveyId;
    const afterIdx = activeSurvey.afterSlideIndex;

    // Admin review mode: walk the full student flow locally, but write nothing —
    // no survey submission, PDF, awards, or completion checks.
    if (isAdminReviewer) {
      const nextReviewed = new Set(reviewedSurveyIds).add(submittedSurveyId);
      setReviewedSurveyIds(nextReviewed);
      setActiveSurveySubmitted(true);
      setSurveyInteractiveStep("answer");
      setShowSurveyView(false);
      setActiveSurveyId(null);
      const moreAtSameSlide = surveys.filter(
        (s) =>
          !nextReviewed.has(s.id) &&
          s.afterSlideIndex === afterIdx &&
          (lessonId ? !isLessonSurveyCheckpointSubmitted(progress, lessonId, s.id) : true)
      );
      if (moreAtSameSlide.length > 0) {
        openSurveyCheckpoint(moreAtSameSlide[0]);
      } else if (afterIdx === -1 && hasQuiz && !userPassed) {
        setShowQuizView(true);
      } else if (afterIdx >= 0 && afterIdx < itemCount - 1) {
        setCurrentSlideIndex(afterIdx + 1);
        window.scrollTo(0, 0);
      }
      return;
    }

    setIsSubmittingSurvey(true);
    try {
      await recordLessonSurveyCheckpointSubmission(
        user.uid,
        courseId,
        lessonId,
        submittedSurveyId,
        answersTrimmed,
        {
          allSurveyIds: surveys.map((s) => s.id),
          quizRequired: hasQuiz,
          quizPassed: userPassed,
        }
      );
      trackEvent(WEB_ANALYTICS_EVENTS.LESSON_SURVEY_SUBMIT_CLICKED, {
        lesson_id: lessonId,
        course_id: courseId,
      });
      setActiveSurveySubmitted(true);
      setSurveyInteractiveStep("answer");
      setShowSurveyView(false);
      setActiveSurveyId(null);

      // Navigate immediately — BEFORE the slow progress refresh / PDF upload —
      // otherwise the survey view closes and the previous slide stays on screen
      // until those awaits finish (the "previous slide appears" bug).
      const moreAtSameSlide = surveys.filter(
        (s) =>
          s.id !== submittedSurveyId &&
          !isSurveySubmitted(s.id) &&
          s.afterSlideIndex === afterIdx
      );
      if (moreAtSameSlide.length > 0) {
        openSurveyCheckpoint(moreAtSameSlide[0]);
      } else if (afterIdx === -1 && hasQuiz && !userPassed) {
        setShowQuizView(true);
      } else if (afterIdx >= 0 && afterIdx < itemCount - 1) {
        setCurrentSlideIndex(afterIdx + 1);
        window.scrollTo(0, 0);
      }

      const refreshed = await getCourseProgress(user.uid, courseId);
      setProgress(refreshed ?? null);

      if (activeSurvey.generatePdfOnComplete) {
        const ok = await uploadSurveyResponsePdf(
          user.uid,
          courseId,
          lessonId,
          lesson?.title ?? "Lesson",
          (activeSurvey.title?.trim() || lesson?.title) ?? "Survey",
          sorted.map((q) => ({ question: q.question })),
          answersTrimmed,
          activeSurvey.dataroomFolderId ?? DEFAULT_DATAROOM_FOLDER_ID
        );
        if (ok) {
          alert("Your survey responses have been saved as a PDF in your Data Room.");
        }
      }

      // Already navigated above; if more surveys remained at this slide or the
      // quiz opened, skip the course-completion check.
      if (moreAtSameSlide.length > 0 || (afterIdx === -1 && hasQuiz && !userPassed)) {
        return;
      }

      const progressAfter = refreshed;
      const course = await getCourse(courseId);
      if (progressAfter && course) {
        // Lesson-level skill (e.g. "Personal Finance (Tier I)") — awarded when
        // THIS lesson is fully complete: slides viewed, quiz passed, checkpoints in.
        if (lesson?.skill && lessonId && progressAfter.lessonsCompleted?.[lessonId] === true) {
          try {
            await awardSkillAndCertificate(user.uid, courseId, course.title ?? "Course", lesson.skill, {
              addToProfile: true,
            });
          } catch (err) {
            console.error("Failed to award lesson skill certificate:", err);
          }
        }
        await syncModuleCompletionAndAwardBadges(progressAfter, course);
        const totalSlidesPerLesson = await getCourseSlideCounts(course);
        const lessonIds = Object.keys(totalSlidesPerLesson);
        const [lessonsWithQuizMap, lessonSurveyCounts] = await Promise.all([
          lessonIds.length > 0 ? getLessonsWithQuiz(courseId, lessonIds) : {},
          lessonIds.length > 0 ? getLessonSurveyCounts(courseId, lessonIds) : {},
        ]);
        const pct = calculateCourseProgress(
          course,
          progressAfter,
          totalSlidesPerLesson,
          lessonsWithQuizMap,
          undefined,
          undefined,
          lessonSurveyCounts
        );
        if (pct >= 100) {
          await markCourseCompleted(user.uid, courseId);
          trackEvent(WEB_ANALYTICS_EVENTS.LESSON_COURSE_COMPLETED, {
            course_id: courseId,
          });
          const { certificatesCreated } = await createSkillCertificatesForCompletedCourse(
            user.uid,
            course
          );
          // Official course completion certificate + graduate honorific.
          try {
            await awardSkillAndCertificate(user.uid, courseId, course.title ?? "MORTAR Masters: Online", "Digital MORTAR MASTER");
          } catch (err) {
            console.error("Failed to create course completion certificate:", err);
          }
          if (certificatesCreated) {
            trackEvent(WEB_ANALYTICS_EVENTS.LESSON_CERTIFICATE_CREATED, {
              course_id: courseId,
            });
            alert("Congratulations! You've earned new certificate(s). View them in your Data Room.");
          }
        }
      }
    } finally {
      setIsSubmittingSurvey(false);
    }
  };

  const currentSurveyAnswersTrimmed = () => {
    if (!activeSurvey?.questions?.length) return [];
    const sorted = [...activeSurvey.questions].sort((a, b) => a.order - b.order);
    return sorted.map((_, i) => surveyAnswers[i] ?? "").map((s) => s.trim());
  };

  const handleSurveySubmitFirstStep = async () => {
    if (!activeSurvey?.questions?.length || !user || !courseId || !lessonId || !activeSurveyId) {
      return;
    }
    const answers = currentSurveyAnswersTrimmed();
    if (activeSurvey.aiAnalysis?.enabled) {
      setIsSubmittingSurvey(true);
      try {
        await saveLessonSurveyAnswersDraft(
          user.uid,
          courseId,
          lessonId,
          answers,
          activeSurveyId
        );
        setSurveyInteractiveStep("choose");
        const progressKey = lessonSurveyProgressKey(lessonId, activeSurveyId);
        setProgress((prev) => ({
          ...prev!,
          surveyAnswers: { ...prev?.surveyAnswers, [progressKey]: answers },
        }));
      } finally {
        setIsSubmittingSurvey(false);
      }
      return;
    }
    await finalizeSurveyCheckpoint(answers);
  };

  const runSurveyAiAnalyze = async () => {
    if (!user || !courseId || !lessonId || !activeSurveyId) return;
    const answers = currentSurveyAnswersTrimmed();
    setIsAnalyzingSurvey(true);
    try {
      const analyzeFn = httpsCallable(functions, "analyzeLessonSurvey");
      type AnalyzeResult = { data?: { feedback?: string } };
      const resp = (await analyzeFn({
        course_id: courseId,
        lesson_id: lessonId,
        survey_id: activeSurveyId,
        answers,
      })) as AnalyzeResult;
      const feedback = resp.data?.feedback?.trim();
      if (feedback) setSurveyAiFeedbackText(feedback);
      setSurveyInteractiveStep("feedback");
      const refreshed = await getCourseProgress(user.uid, courseId);
      setProgress(refreshed ?? null);
    } catch (e: unknown) {
      console.error("Survey AI analyze failed:", e);
      alert("AI analysis couldn’t complete. Try again or continue without it.");
    } finally {
      setIsAnalyzingSurvey(false);
    }
  };

  const handleSurveySkipAiFinalize = async () => {
    const answers = currentSurveyAnswersTrimmed();
    await finalizeSurveyCheckpoint(answers);
  };

  const handleSurveyFinalizeAfterAi = async () => {
    const answers = currentSurveyAnswersTrimmed();
    await finalizeSurveyCheckpoint(answers);
  };

  const handleQuizSubmit = async () => {
    if (!quiz?.questions?.length || !user || !courseId || !lessonId || !curriculumId || !moduleId || !chapterId) return;
    const total = quiz.questions.length;
    let correct = 0;
    const sorted = [...quiz.questions].sort((a, b) => a.order - b.order);
    for (let i = 0; i < sorted.length; i++) {
      const q = sorted[i];
      const chosen = quizAnswers[i];
      if (chosen && chosen === q.correctAnswer) correct++;
    }
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const passed = pct >= passPct;
    setIsSubmittingQuiz(true);
    try {
      trackEvent(WEB_ANALYTICS_EVENTS.LESSON_QUIZ_SUBMIT_CLICKED, {
        lesson_id: lessonId,
        course_id: courseId,
        score_percent: pct,
      });
      await recordLessonQuizAttempt(user.uid, courseId, lessonId, passed);
      setQuizSubmitted(true);
      setQuizPassed(passed);
      setQuizScore({ correct, total });
      if (passed) {
        trackEvent(WEB_ANALYTICS_EVENTS.LESSON_QUIZ_PASSED, {
          lesson_id: lessonId,
          course_id: courseId,
          score_percent: pct,
        });
      } else {
        trackEvent(WEB_ANALYTICS_EVENTS.LESSON_QUIZ_FAILED, {
          lesson_id: lessonId,
          course_id: courseId,
          score_percent: pct,
        });
        incrementSessionCount("quiz_failed");
        const quizFailCount = getSessionCount("quiz_failed");
        if (quizFailCount >= 2 && canShowFeedback("quiz_confusion")) {
          trackEvent(WEB_ANALYTICS_EVENTS.QUIZ_CONFUSION_FEEDBACK_TRIGGERED, {
            lesson_id: lessonId,
            course_id: courseId,
            fail_count: quizFailCount,
          });
          recordFeedbackShown("quiz_confusion");
          setFeedbackContext({
            context_type: "quiz",
            trigger_event: "quiz_confusion_feedback_triggered",
            metadata: {
              lesson_id: lessonId,
              course_id: courseId,
              quiz_attempt_count: quizFailCount,
            },
          });
          openModal();
        }
      }
      setProgress((prev) => ({
        ...prev!,
        quizAttempts: { ...prev?.quizAttempts, [lessonId]: (prev?.quizAttempts?.[lessonId] ?? 0) + 1 },
        quizPassed: { ...prev?.quizPassed, [lessonId]: passed },
        lessonsCompleted: passed ? { ...prev?.lessonsCompleted, [lessonId]: true } : prev?.lessonsCompleted ?? {},
      }));
    } finally {
      setIsSubmittingQuiz(false);
    }
  };

  const handleTryAgain = () => {
    trackEvent(WEB_ANALYTICS_EVENTS.LESSON_QUIZ_TRY_AGAIN_CLICKED, {
      lesson_id: lessonId ?? null,
      course_id: courseId ?? null,
    });
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizPassed(null);
    setQuizScore(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={() => navigate(courseId ? `/courses/${courseId}` : "/curriculum")}>
          Go Back
        </Button>
      </div>
    );
  }

  if (!lesson || itemCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <p className="text-muted-foreground">
          {!lesson ? "Lesson not found or not published" : "Lesson has no content"}
        </p>
        <Button variant="outline" onClick={() => navigate(courseId ? `/courses/${courseId}` : "/curriculum")}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen lesson-card-surface text-white relative"
      style={verseThemeStyle(getVerseThemeColor({ verseIndex, chapterId }))}
    >
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-sm border-b border-gray-800">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-semibold">{lesson.title}</h1>
              {lesson.subtitle && (
                <p className="text-xs text-gray-400">{lesson.subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">
              {currentSlideIndex + 1} of {itemCount}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={saveProgressAndExit}
              disabled={isSaving}
              className="text-foreground"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <LogOut className="w-4 h-4 mr-2" />
              )}
              Close
            </Button>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="h-1 bg-gray-800">
          <div
            className="h-full bg-verse transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Admin review mode banner */}
        {isAdminReviewer && (
          <div className="bg-amber-500/15 border-t border-amber-500/30 text-amber-300 text-xs text-center py-1.5 px-4">
            Admin review mode — viewing does not record progress, quiz results, surveys, or certificates.
          </div>
        )}
      </div>

      {/* Lesson screen content */}
      <div className={useImmersiveScreens ? "h-[calc(100vh-80px)]" : "min-h-[calc(100vh-80px)]"}>
        {showSurveyView && activeSurvey ? (
          <div
            className={`container mx-auto px-4 py-8 ${surveyInteractiveStep === "feedback" ? "max-w-4xl" : "max-w-2xl"}`}
          >
            <h2 className="text-xl font-semibold mb-6">{activeSurvey.title?.trim() || "Survey"}</h2>
            {!activeSurveySubmitted && surveyInteractiveStep === "answer" ? (
              <>
                <p className="text-gray-400 text-sm mb-6">
                  Please answer the following questions. Your responses are open-ended.
                </p>
                <div className="space-y-6">
                  {[...activeSurvey.questions]
                    .sort((a, b) => a.order - b.order)
                    .map((q, i) => (
                      <div key={i} className="rounded-lg border border-gray-700 p-4 bg-gray-900/50">
                        <p className="font-medium mb-3">{q.question}</p>
                        <textarea
                          value={surveyAnswers[i] ?? ""}
                          onChange={(e) => {
                            const next = [...surveyAnswers];
                            next[i] = e.target.value;
                            setSurveyAnswers(next);
                          }}
                          placeholder="Your answer..."
                          className="w-full min-h-[80px] rounded-md border border-gray-600 bg-gray-800 text-white px-3 py-2 focus:ring-2 focus:ring-accent"
                          rows={3}
                        />
                      </div>
                    ))}
                </div>
                <Button
                  className="mt-6"
                  onClick={handleSurveySubmitFirstStep}
                  disabled={isSubmittingSurvey}
                >
                  {isSubmittingSurvey ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Submit
                </Button>
              </>
            ) : !activeSurveySubmitted && surveyInteractiveStep === "choose" ? (
              <div className="space-y-4">
                <p className="text-gray-400 text-sm">
                  Optional: get AI feedback on your responses based on this lesson&apos;s facilitator instructions, or continue without analysis.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={runSurveyAiAnalyze} disabled={isAnalyzingSurvey}>
                    {isAnalyzingSurvey ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    Analyze my responses with AI
                  </Button>
                  <Button variant="secondary" onClick={handleSurveySkipAiFinalize} disabled={isSubmittingSurvey}>
                    Continue in course (skip AI)
                  </Button>
                </div>
              </div>
            ) : !activeSurveySubmitted && surveyInteractiveStep === "feedback" ? (
              <div className="grid md:grid-cols-2 gap-6 items-start">
                <div className="rounded-lg border border-gray-700 p-4 bg-gray-950/80 min-h-[200px] max-h-[60vh] overflow-y-auto">
                  <p className="text-xs font-semibold uppercase tracking-wide text-verse mb-2">AI feedback</p>
                  <p className="text-sm whitespace-pre-wrap text-gray-200">
                    {surveyAiFeedbackText?.trim()
                      ? surveyAiFeedbackText
                      : "No feedback loaded yet."}
                  </p>
                </div>
                <div className="space-y-4">
                  <p className="text-gray-400 text-sm">
                    Revise your answers with the feedback in mind; you can re-run analysis before finishing this lesson.
                  </p>
                  <div className="space-y-6">
                    {[...activeSurvey.questions]
                      .sort((a, b) => a.order - b.order)
                      .map((q, i) => (
                        <div key={i} className="rounded-lg border border-gray-700 p-4 bg-gray-900/50">
                          <p className="font-medium mb-3">{q.question}</p>
                          <textarea
                            value={surveyAnswers[i] ?? ""}
                            onChange={(e) => {
                              const next = [...surveyAnswers];
                              next[i] = e.target.value;
                              setSurveyAnswers(next);
                            }}
                            placeholder="Your answer..."
                            className="w-full min-h-[80px] rounded-md border border-gray-600 bg-gray-800 text-white px-3 py-2 focus:ring-2 focus:ring-accent"
                            rows={3}
                          />
                        </div>
                      ))}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="outline" onClick={runSurveyAiAnalyze} disabled={isAnalyzingSurvey}>
                      {isAnalyzingSurvey ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      Re-analyze after edits
                    </Button>
                    <Button onClick={handleSurveyFinalizeAfterAi} disabled={isSubmittingSurvey}>
                      {isSubmittingSurvey ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      Finish & complete lesson
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-verse font-medium">Thank you! Your responses have been saved. You can close the lesson.</p>
            )}
          </div>
        ) : showQuizView && hasQuiz ? (
          <div className="container mx-auto px-4 py-8 max-w-2xl">
            <h2 className="text-xl font-semibold mb-6">Lesson Quiz</h2>
            {!quizSubmitted ? (
              <>
                <p className="text-gray-400 text-sm mb-6">
                  Answer all questions. You need {passPct}% to pass. Attempts: {attemptsUsed} of {maxAttempts}.
                </p>
                <div className="space-y-6">
                  {[...quiz.questions]
                    .sort((a, b) => a.order - b.order)
                    .map((q, i) => (
                      <div key={i} className="rounded-lg border border-gray-700 p-4 bg-gray-900/50">
                        <p className="font-medium mb-1">{formatQuizQuestionPrompt(q.question)}</p>
                        <p className="text-xs text-gray-500 mb-3">Select one answer.</p>
                        <div className="space-y-2">
                          {(["A", "B", "C", "D"] as const).map((opt) => (
                            <label
                              key={opt}
                              className="flex items-center gap-3 cursor-pointer rounded p-2 hover:bg-gray-800"
                            >
                              <input
                                type="radio"
                                name={`q-${i}`}
                                checked={quizAnswers[i] === opt}
                                onChange={() => {
                                  setQuizAnswers((prev) => ({ ...prev, [i]: opt }));
                                  trackEvent(WEB_ANALYTICS_EVENTS.LESSON_QUIZ_ANSWER_SELECTED, {
                                    lesson_id: lessonId ?? null,
                                    course_id: courseId ?? null,
                                    question_index: i,
                                    option_id: opt,
                                  });
                                }}
                                className="rounded-full border-gray-600"
                              />
                              <span>{opt}. {q[`option${opt}` as keyof typeof q] as string}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
                <Button
                  className="mt-6"
                  onClick={handleQuizSubmit}
                  disabled={
                    isSubmittingQuiz ||
                    Object.keys(quizAnswers).length < quiz.questions.length
                  }
                >
                  {isSubmittingQuiz ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Submit Quiz
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                {quizScore && (
                  <p className="text-lg font-bold text-verse">
                    Score: {quizScore.correct} / {quizScore.total} (
                    {quiz.questions.length > 0
                      ? Math.round((quizScore.correct / quizScore.total) * 100)
                      : 0}
                    %)
                  </p>
                )}
                {quizPassed ? (
                  <p className="text-verse font-medium">You passed! You can close the lesson.</p>
                ) : canTryAgain ? (
                  <>
                    <p className="text-amber-400">You need {passPct}% to pass. Try again.</p>
                    <Button variant="outline" onClick={handleTryAgain}>
                      Try Again
                    </Button>
                  </>
                ) : (
                  <p className="text-red-400">
                    No attempts left. You can close and revisit the lesson content, but you must pass the quiz to complete this lesson.
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            {isMediaLesson && currentContentSlide ? (
              currentContentSlide.type === "image" ? (
                <LessonSlideScreen
                  src={currentContentSlide.image_url!}
                  alt={currentContentSlide.alt_text ?? `Slide ${currentSlideIndex + 1}`}
                  popups={currentContentSlide.popups}
                  links={currentContentSlide.links}
                />
              ) : (
                <MediaVideoBlock
                  videoProvider={currentContentSlide.video_provider}
                  videoId={currentContentSlide.video_id}
                  videoUrl={currentContentSlide.video_url}
                  caption={currentContentSlide.caption}
                />
              )
            ) : isImageLesson && currentImage ? (
              useImmersiveScreens ? (
                <LessonScreenRenderer
                  src={currentImage.image_url}
                  alt={currentImage.alt_text || `Screen ${currentSlideIndex + 1}`}
                  className="h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-8">
                  <img
                    src={currentImage.image_url}
                    alt={currentImage.alt_text || `Slide ${currentSlideIndex + 1}`}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )
            ) : currentSlide ? (
              <SlideRenderer slide={currentSlide} blocks={currentBlocks} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-400">No content</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Navigation */}
      {!showQuizView && !showSurveyView && (
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4">
        <Button
          variant="secondary"
          size="lg"
          onClick={handlePrevious}
          disabled={currentSlideIndex === 0}
          className="text-foreground"
        >
          <ChevronLeft className="w-5 h-5 mr-2" />
          Previous
        </Button>
        <Button
          variant="secondary"
          size="lg"
          onClick={handleNext}
          disabled={
            currentSlideIndex === itemCount - 1 &&
            pendingSurveysAfterCurrentSlide().length === 0 &&
            !(atEnd && pendingEndSurveys().length > 0) &&
            !(atEnd && hasQuiz && !userPassed)
          }
          className="text-foreground"
        >
          {atEnd && hasQuiz && !userPassed
            ? "Start Quiz"
            : pendingSurveysAfterCurrentSlide().length > 0 ||
                (atEnd && pendingEndSurveys().length > 0)
              ? pendingSurveysAfterCurrentSlide()[0]?.title?.trim()
                ? `Survey: ${pendingSurveysAfterCurrentSlide()[0].title}`
                : atEnd && pendingEndSurveys()[0]?.title?.trim()
                  ? `Survey: ${pendingEndSurveys()[0].title}`
                  : "Start Survey"
              : "Next"}
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
      )}

      {/* Admin-only: slide-anchored review notes */}
      {isAdminReviewer && courseId && lessonId && (
        <AdminReviewNotesPanel
          courseId={courseId}
          lessonId={lessonId}
          lessonTitle={lesson.title}
          currentSlideIndex={currentSlideIndex}
          onGoToSlide={(idx) => {
            setShowQuizView(false);
            setShowSurveyView(false);
            setCurrentSlideIndex(Math.max(0, Math.min(idx, itemCount - 1)));
            window.scrollTo(0, 0);
          }}
        />
      )}
    </div>
  );
}
