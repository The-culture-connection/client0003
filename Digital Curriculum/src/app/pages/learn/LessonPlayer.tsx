/**
 * Learner-facing Lesson Player
 * Displays published lessons slide by slide
 */

import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { getSlides, getBlocks, getLesson, getLessonImages, getLessonContent, getCourseSlideCounts, type Slide, type Block, type Lesson, type LessonImage, type LessonContentSlide, type LessonQuiz, type LessonSurvey } from "../../lib/curriculum";
import { getCourse, getCourseLessonQuiz, getCourseLessonSurvey, getLessonsWithQuiz, getLessonsWithSurvey } from "../../lib/courses";
import { getCourseProgress, updateLessonSlideProgress, setLessonCompleted, recordLessonQuizAttempt, recordLessonSurveySubmission, markCourseCompleted, calculateCourseProgress } from "../../lib/courseProgress";
import { createSkillCertificatesForCompletedCourse, uploadSurveyResponsePdf } from "../../lib/dataroom";
import { DEFAULT_DATAROOM_FOLDER_ID } from "../../lib/dataroomFolders";
import { useAuth } from "../../components/auth/AuthProvider";
import { SlideRenderer } from "../../components/curriculum/SlideRenderer";
import { YouTubeBlock } from "../../components/curriculum/YouTubeBlock";
import { Button } from "../../components/ui/button";
import { ChevronLeft, ChevronRight, LogOut, Loader2, X } from "lucide-react";
import { useScreenAnalytics } from "../../analytics/useScreenAnalytics";
import { trackEvent } from "../../analytics/trackEvent";
import { WEB_ANALYTICS_EVENTS } from "@mortar/analytics-contract/mortarAnalyticsContract";

export function LessonPlayer() {
  useScreenAnalytics("lesson_player");
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

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
  const [quizAnswers, setQuizAnswers] = useState<Record<number, "A" | "B" | "C" | "D">>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizPassed, setQuizPassed] = useState<boolean | null>(null);
  const [quizScore, setQuizScore] = useState<{ correct: number; total: number } | null>(null);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [showQuizView, setShowQuizView] = useState(false);
  const [survey, setSurvey] = useState<LessonSurvey | null>(null);
  const [surveyAnswers, setSurveyAnswers] = useState<string[]>([]);
  const [surveySubmitted, setSurveySubmitted] = useState(false);
  const [isSubmittingSurvey, setIsSubmittingSurvey] = useState(false);
  const [showSurveyView, setShowSurveyView] = useState(false);
  const loggedQuizExhausted = useRef(false);

  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const courseId = params.get("courseId") || undefined;

  const isMediaLesson = lesson?.content_type === "media";
  const isImageLesson = lesson?.content_type === "images";
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

        const courseIdParam = params.get("courseId");
        const [quizData, surveyData, progressData] = await Promise.all([
          courseIdParam ? getCourseLessonQuiz(courseIdParam, lessonId!) : Promise.resolve(null),
          courseIdParam ? getCourseLessonSurvey(courseIdParam, lessonId!) : Promise.resolve(null),
          courseIdParam && user ? getCourseProgress(user.uid, courseIdParam) : Promise.resolve(null),
        ]);
        setQuiz(quizData?.enabled && (quizData.questions?.length ?? 0) > 0 ? quizData : null);
        setSurvey(surveyData?.enabled && (surveyData.questions?.length ?? 0) > 0 ? surveyData : null);
        setProgress(progressData ?? null);
        if (progressData?.surveySubmitted?.[lessonId!]) setSurveySubmitted(true);
        if (surveyData?.enabled && (surveyData.questions?.length ?? 0) > 0) {
          setSurveyAnswers(Array(surveyData.questions!.length).fill(""));
        }

        let initialIndex = 0;
        const slideIndexParam = params.get("slideIndex");
        if (slideIndexParam !== null && slideIndexParam !== "") {
          initialIndex = Math.max(0, parseInt(slideIndexParam, 10) || 0);
        } else if (user && courseIdParam && progressData?.pagesViewed?.[lessonId!]) {
          initialIndex = Math.max(0, (progressData.pagesViewed[lessonId!] || 1) - 1);
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

  const saveProgressAndExit = async () => {
    trackEvent(WEB_ANALYTICS_EVENTS.LESSON_CLOSE_CLICKED, {
      lesson_id: lessonId ?? null,
      course_id: courseId ?? null,
    });
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
      const hasSurvey = survey != null && (survey.questions?.length ?? 0) > 0;
      const atEnd = itemCount > 0 && currentSlideIndex >= itemCount - 1;
      if (!hasQuiz && !hasSurvey && atEnd) {
        await setLessonCompleted(user.uid, courseId, lessonId);
      }
      const [progressAfter, course] = await Promise.all([
        getCourseProgress(user.uid, courseId),
        getCourse(courseId),
      ]);
      if (progressAfter && course) {
        const totalSlidesPerLesson = await getCourseSlideCounts(course);
        const lessonIds = Object.keys(totalSlidesPerLesson);
        const [lessonsWithQuiz, lessonsWithSurvey] = await Promise.all([
          lessonIds.length > 0 ? getLessonsWithQuiz(courseId, lessonIds) : {},
          lessonIds.length > 0 ? getLessonsWithSurvey(courseId, lessonIds) : {},
        ]);
        const pct = calculateCourseProgress(course, progressAfter, totalSlidesPerLesson, lessonsWithQuiz, lessonsWithSurvey);
        if (pct >= 100) {
          await markCourseCompleted(user.uid, courseId);
          trackEvent(WEB_ANALYTICS_EVENTS.LESSON_COURSE_COMPLETED, {
            course_id: courseId,
          });
          const { certificatesCreated } = await createSkillCertificatesForCompletedCourse(user.uid, course);
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
  const hasSurvey = survey != null && (survey.questions?.length ?? 0) > 0;
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
    if (currentSlideIndex < itemCount - 1) {
      trackEvent(WEB_ANALYTICS_EVENTS.LESSON_SLIDE_NEXT_CLICKED, {
        lesson_id: lessonId ?? null,
        course_id: courseId ?? null,
        from_index: currentSlideIndex,
        to_index: currentSlideIndex + 1,
      });
      setCurrentSlideIndex(currentSlideIndex + 1);
      window.scrollTo(0, 0);
    } else if (atEnd && hasQuiz && !userPassed) {
      setShowQuizView(true);
    } else if (atEnd && hasSurvey && !surveySubmitted) {
      setShowSurveyView(true);
    }
  };

  const handleSurveySubmit = async () => {
    if (!survey?.questions?.length || !user || !courseId || !lessonId) return;
    const sorted = [...survey.questions].sort((a, b) => a.order - b.order);
    const answers = sorted.map((_, i) => surveyAnswers[i] ?? "").map((s) => s.trim());
    setIsSubmittingSurvey(true);
    try {
      await recordLessonSurveySubmission(user.uid, courseId, lessonId, answers);
      trackEvent(WEB_ANALYTICS_EVENTS.LESSON_SURVEY_SUBMIT_CLICKED, {
        lesson_id: lessonId,
        course_id: courseId,
      });
      setSurveySubmitted(true);
      setProgress((prev) => ({
        ...prev!,
        surveySubmitted: { ...prev?.surveySubmitted, [lessonId]: true },
        surveyAnswers: { ...prev?.surveyAnswers, [lessonId]: answers },
        lessonsCompleted: { ...prev?.lessonsCompleted, [lessonId]: true },
      }));
      if (survey.generatePdfOnComplete) {
        const ok = await uploadSurveyResponsePdf(
          user.uid,
          courseId,
          lessonId,
          lesson?.title ?? "Lesson",
          (survey.title?.trim() || lesson?.title) ?? "Survey",
          sorted.map((q) => ({ question: q.question })),
          answers,
          survey.dataroomFolderId ?? DEFAULT_DATAROOM_FOLDER_ID
        );
        if (ok) {
          alert("Your survey responses have been saved as a PDF in your Data Room.");
        }
      }
      const [progressAfter, course] = await Promise.all([
        getCourseProgress(user.uid, courseId),
        getCourse(courseId),
      ]);
      if (progressAfter && course) {
        const totalSlidesPerLesson = await getCourseSlideCounts(course);
        const lessonIds = Object.keys(totalSlidesPerLesson);
        const [lessonsWithQuizMap, lessonsWithSurveyMap] = await Promise.all([
          lessonIds.length > 0 ? getLessonsWithQuiz(courseId, lessonIds) : {},
          lessonIds.length > 0 ? getLessonsWithSurvey(courseId, lessonIds) : {},
        ]);
        const pct = calculateCourseProgress(course, progressAfter, totalSlidesPerLesson, lessonsWithQuizMap, lessonsWithSurveyMap);
        if (pct >= 100) {
          await markCourseCompleted(user.uid, courseId);
          trackEvent(WEB_ANALYTICS_EVENTS.LESSON_COURSE_COMPLETED, {
            course_id: courseId,
          });
          const { certificatesCreated } = await createSkillCertificatesForCompletedCourse(user.uid, course);
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
    <div className="min-h-screen bg-black text-white relative">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-sm border-b border-gray-800">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold">{lesson.title}</h1>
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
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Slide Content */}
      <div className="min-h-[calc(100vh-80px)]">
        {showSurveyView && hasSurvey ? (
          <div className="container mx-auto px-4 py-8 max-w-2xl">
            <h2 className="text-xl font-semibold mb-6">{survey.title?.trim() || "Survey"}</h2>
            {!surveySubmitted ? (
              <>
                <p className="text-gray-400 text-sm mb-6">
                  Please answer the following questions. Your responses are open-ended.
                </p>
                <div className="space-y-6">
                  {[...survey.questions]
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
                  onClick={handleSurveySubmit}
                  disabled={isSubmittingSurvey}
                >
                  {isSubmittingSurvey ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Submit
                </Button>
              </>
            ) : (
              <p className="text-green-400 font-medium">Thank you! Your responses have been saved. You can close the lesson.</p>
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
                        <p className="font-medium mb-3">{q.question}</p>
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
                                onChange={() =>
                                  setQuizAnswers((prev) => ({ ...prev, [i]: opt }))
                                }
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
                  <p className="text-lg">
                    Score: {quizScore.correct} / {quizScore.total} (
                    {quiz.questions.length > 0
                      ? Math.round((quizScore.correct / quizScore.total) * 100)
                      : 0}
                    %)
                  </p>
                )}
                {quizPassed ? (
                  <p className="text-green-400 font-medium">You passed! You can close the lesson.</p>
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
                <div className="w-full min-h-[calc(100vh-80px)] bg-black flex items-center justify-center p-8">
                  <img
                    src={currentContentSlide.image_url}
                    alt={currentContentSlide.alt_text ?? `Slide ${currentSlideIndex + 1}`}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : (
                <YouTubeBlock
                  videoId={currentContentSlide.video_id!}
                  caption={currentContentSlide.caption}
                />
              )
            ) : isImageLesson && currentImage ? (
              <div className="w-full h-full flex items-center justify-center p-8">
                <img
                  src={currentImage.image_url}
                  alt={currentImage.alt_text || `Slide ${currentSlideIndex + 1}`}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
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
          disabled={currentSlideIndex === itemCount - 1 && !(atEnd && hasSurvey && !surveySubmitted) && !(atEnd && hasQuiz && !userPassed)}
          className="text-foreground"
        >
          {atEnd && hasQuiz && !userPassed ? "Start Quiz" : atEnd && hasSurvey && !surveySubmitted ? (survey?.title?.trim() ? `Start: ${survey.title}` : "Start Survey") : "Next"}
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
      )}
    </div>
  );
}
