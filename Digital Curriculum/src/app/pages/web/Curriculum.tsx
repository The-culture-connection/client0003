import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import {
  BookOpen,
  Play,
  CheckCircle2,
  Lock,
  Clock,
  FileText,
  Award,
  Target,
  Video,
  FileCheck,
  ArrowRight,
  Zap,
  Trophy,
  TrendingUp,
  Flame,
  Star,
  GraduationCap,
  Users,
  X,
} from "lucide-react";
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { GraduationApplicationDialog } from "../../components/graduation/GraduationApplicationDialog";
import { getUserGraduationApplication, type GraduationApplication } from "../../lib/graduation";
import { useAuth } from "../../components/auth/AuthProvider";
import { getCoursesByUserId, getCoursesByRole, getLessonsWithQuiz, getLessonsWithSurvey, type Course } from "../../lib/courses";
import { getAllCourseProgress, calculateCourseProgress, type CourseProgress } from "../../lib/courseProgress";
import { getCourseSlideCounts } from "../../lib/curriculum";
import { getCurrentUserWithRoles } from "../../lib/auth";
import { cached, TTL_SHORT, TTL_MEDIUM } from "../../lib/cache";

export function WebCurriculum() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseProgress, setCourseProgress] = useState<Record<string, CourseProgress>>({});
  const [courseSlideCounts, setCourseSlideCounts] = useState<Record<string, Record<string, number>>>({});
  const [lessonsWithQuizMap, setLessonsWithQuizMap] = useState<Record<string, Record<string, boolean>>>({});
  const [lessonsWithSurveyMap, setLessonsWithSurveyMap] = useState<Record<string, Record<string, boolean>>>({});
  const [loading, setLoading] = useState(true);
  const [progressDataReady, setProgressDataReady] = useState(false);
  const [allCompleted, setAllCompleted] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalCourses, setTotalCourses] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  const [applicationDialogOpen, setApplicationDialogOpen] = useState(false);
  const [userApplication, setUserApplication] = useState<GraduationApplication | null>(null);
  const [loadingApplication, setLoadingApplication] = useState(false);
  const [isAlumni, setIsAlumni] = useState(false);

  // Load assigned courses and progress
  const loadCourses = useCallback(async () => {
    if (!user) return;
    const uid = user.uid;

    setLoading(true);
    try {
      setProgressDataReady(false);
      // Get user roles
      const currentUser = await cached(`roles:${uid}`, () => getCurrentUserWithRoles(), TTL_SHORT);
      const userRoles = currentUser?.roles || [];

      // Fetch courses assigned to user by ID
      const coursesByUserId = await cached(`coursesByUser:${uid}`, () => getCoursesByUserId(uid), TTL_SHORT);

      // Fetch courses assigned to user by role
      const coursesByRolePromises = userRoles.map((role) => cached(`coursesByRole:${role}`, () => getCoursesByRole(role), TTL_SHORT));
      const coursesByRoleArrays = await Promise.all(coursesByRolePromises);
      const coursesByRole = coursesByRoleArrays.flat();

      // Combine and deduplicate courses
      const allCourses = [...coursesByUserId, ...coursesByRole];
      const uniqueCourses = allCourses.filter(
        (course, index, self) => index === self.findIndex((c) => c.id === course.id)
      );

      setCourses(uniqueCourses);
      setTotalCourses(uniqueCourses.length);

      // Load progress for all courses
      const progress = await cached(`progress:${uid}`, () => getAllCourseProgress(uid), TTL_SHORT);
      setCourseProgress(progress);

      // Load slide counts per course for accurate progress (all slides in course)
      const countsMap: Record<string, Record<string, number>> = {};
      const quizMap: Record<string, Record<string, boolean>> = {};
      const surveyMap: Record<string, Record<string, boolean>> = {};
      await Promise.all(
        uniqueCourses.map(async (c) => {
          if (c.id && c.curriculumMapping) {
            const courseId = c.id;
            try {
              countsMap[courseId] = await cached(`slideCounts:${courseId}`, () => getCourseSlideCounts(c), TTL_MEDIUM);
              const lessonIds = Object.keys(countsMap[courseId]);
              if (lessonIds.length > 0) {
                quizMap[courseId] = await cached(`quiz:${courseId}`, () => getLessonsWithQuiz(courseId, lessonIds), TTL_MEDIUM);
                surveyMap[courseId] = await cached(`survey:${courseId}`, () => getLessonsWithSurvey(courseId, lessonIds), TTL_MEDIUM);
              } else {
                quizMap[courseId] = {};
                surveyMap[courseId] = {};
              }
            } catch {
              countsMap[courseId] = {};
              quizMap[courseId] = {};
              surveyMap[courseId] = {};
            }
          }
        })
      );
      setCourseSlideCounts(countsMap);
      setLessonsWithQuizMap(quizMap);
      setLessonsWithSurveyMap(surveyMap);

      // Calculate overall progress using full course slide counts
      let totalProgress = 0;
      let completedCourses = 0;

      uniqueCourses.forEach((course) => {
        const progressData = progress[course.id || ""];
        const slideCounts = countsMap[course.id ?? ""];
        const lessonsWithQuiz = quizMap[course.id ?? ""];
        const lessonsWithSurvey = surveyMap[course.id ?? ""];
        if (progressData) {
          const courseProgressValue = calculateCourseProgress(
            course,
            progressData,
            slideCounts && Object.keys(slideCounts).length > 0 ? slideCounts : undefined,
            lessonsWithQuiz && Object.keys(lessonsWithQuiz).length > 0 ? lessonsWithQuiz : undefined,
            lessonsWithSurvey && Object.keys(lessonsWithSurvey).length > 0 ? lessonsWithSurvey : undefined
          );
          totalProgress += courseProgressValue;
          if (progressData.completed || courseProgressValue === 100) {
            completedCourses++;
          }
        }
      });

      const avgProgress = uniqueCourses.length > 0 ? totalProgress / uniqueCourses.length : 0;
      setOverallProgress(avgProgress);
      setCompletedCount(completedCourses);
      setAllCompleted(completedCourses === uniqueCourses.length && uniqueCourses.length > 0);
      setProgressDataReady(true);
    } catch (error) {
      console.error("Error loading courses:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load user application status
  const loadUserApplication = useCallback(async () => {
    if (!user) return;
    
    setLoadingApplication(true);
    try {
      // Check if user is already an alumni FIRST by fetching fresh user data
      const { getCurrentUserWithRoles } = await import("../../lib/auth");
      const currentUser = await getCurrentUserWithRoles();
      if (currentUser) {
        const userRoles = currentUser.roles || [];
        const userIsAlumni = userRoles.includes("Digital Curriculum Alumni");
        setIsAlumni(userIsAlumni);
        
        // Only load application if user is not an alumni
        // (once graduated, we don't need to show application status)
        if (!userIsAlumni) {
          const application = await cached(`graduation:${user.uid}`, () => getUserGraduationApplication(user.uid), TTL_MEDIUM);
          setUserApplication(application);
        } else {
          setUserApplication(null);
        }
      } else {
        setIsAlumni(false);
        const application = await cached(`graduation:${user.uid}`, () => getUserGraduationApplication(user.uid), TTL_MEDIUM);
        setUserApplication(application);
      }
    } catch (error) {
      console.error("Error loading user application:", error);
      setIsAlumni(false);
    } finally {
      setLoadingApplication(false);
    }
  }, [user]);

  useEffect(() => {
    // Load courses and progress
    loadCourses();
    
    // Load user application status
    loadUserApplication();
  }, [loadCourses, loadUserApplication]);

  const getCourseProgressValue = (course: Course): number => {
    const progressData = courseProgress[course.id || ""];
    const slideCounts = courseSlideCounts[course.id || ""];
    const lessonsWithQuiz = lessonsWithQuizMap[course.id || ""];
    const lessonsWithSurvey = lessonsWithSurveyMap[course.id || ""];
    if (!progressData) return 0;
    return calculateCourseProgress(
      course,
      progressData,
      slideCounts && Object.keys(slideCounts).length > 0 ? slideCounts : undefined,
      lessonsWithQuiz && Object.keys(lessonsWithQuiz).length > 0 ? lessonsWithQuiz : undefined,
      lessonsWithSurvey && Object.keys(lessonsWithSurvey).length > 0 ? lessonsWithSurvey : undefined
    );
  };

  const isCourseCompleted = (course: Course): boolean => {
    if (!progressDataReady) return false;
    const progressData = courseProgress[course.id || ""];
    return Boolean(progressData?.completed || getCourseProgressValue(course) === 100);
  };

  /** Course the user last progressed in (by updatedAt), for header Continue */
  const mostRecentCourse = ((): { course: Course; progress: CourseProgress } | null => {
    let best: { course: Course; progress: CourseProgress } | null = null;
    const toMs = (t: CourseProgress["updatedAt"]) => {
      if (!t) return 0;
      const ts = t as { toMillis?: () => number; seconds?: number };
      return ts.toMillis ? ts.toMillis() : (ts.seconds ?? 0) * 1000;
    };
    courses.forEach((course) => {
      const p = courseProgress[course.id || ""];
      if (!p?.updatedAt) return;
      if (!best || toMs(p.updatedAt) > toMs(best.progress.updatedAt)) {
        best = { course, progress: p };
      }
    });
    return best;
  })();

  /** Build lesson player URL for a course (start = first lesson, or resume from progress) */
  const getLessonUrl = (course: Course, resume?: boolean): string => {
    const mapping = course.curriculumMapping;
    const firstModule = mapping?.modules?.[0];
    const firstChapter = firstModule?.chapters?.[0];
    const firstLesson = firstChapter?.lessons?.[0];
    if (!mapping || !firstModule || !firstChapter) return `/courses/${course.id}`;
    const params = new URLSearchParams({
      curriculumId: mapping.curriculumId,
      moduleId: firstModule.moduleId,
      chapterId: firstChapter.chapterId,
      courseId: course.id || "",
    });
    if (resume && course.id) {
      const p = courseProgress[course.id];
      const lastLessonId = p?.lastViewedLessonId;
      const lastSlideIndex = p?.lastViewedSlideIndex ?? 0;
      if (lastLessonId) {
        let foundModuleId = firstModule.moduleId;
        let foundChapterId = firstChapter.chapterId;
        mapping.modules.forEach((mod) => {
          mod.chapters?.forEach((ch) => {
            ch.lessons?.forEach((l) => {
              if (l.lessonId === lastLessonId) {
                foundModuleId = mod.moduleId;
                foundChapterId = ch.chapterId;
              }
            });
          });
        });
        params.set("curriculumId", mapping.curriculumId);
        params.set("moduleId", foundModuleId);
        params.set("chapterId", foundChapterId);
        params.set("slideIndex", String(lastSlideIndex));
        return `/learn/lesson/${lastLessonId}?${params.toString()}`;
      }
    }
    if (!firstLesson?.lessonId) return `/courses/${course.id}`;
    return `/learn/lesson/${firstLesson.lessonId}?${params.toString()}`;
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Hero Section */}
      <div className="mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Overall Progress Card */}
          <Card className="lg:col-span-2 p-6 bg-gradient-to-br from-accent/20 via-card to-card border-accent/30 shadow-lg">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <Badge className="mb-2 bg-accent text-accent-foreground">
                  MY CURRICULUM
                </Badge>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Assigned Courses
                </h1>
                <p className="text-sm text-muted-foreground mb-4">
                  Complete all assigned courses to unlock the Alumni Network application
                </p>
                {mostRecentCourse ? (
                  <div className="mb-4 p-3 rounded-lg bg-muted/50 border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Most recent progress</p>
                    <p className="font-medium text-foreground">{mostRecentCourse.course.title}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Progress
                        value={calculateCourseProgress(
                          mostRecentCourse.course,
                          mostRecentCourse.progress,
                          courseSlideCounts[mostRecentCourse.course.id || ""],
                          lessonsWithQuizMap[mostRecentCourse.course.id || ""],
                          lessonsWithSurveyMap[mostRecentCourse.course.id || ""]
                        )}
                        className="h-2 flex-1"
                      />
                      <span className="text-sm text-muted-foreground">
                        {Math.round(
                          calculateCourseProgress(
                            mostRecentCourse.course,
                            mostRecentCourse.progress,
                            courseSlideCounts[mostRecentCourse.course.id || ""],
                            lessonsWithQuizMap[mostRecentCourse.course.id || ""],
                            lessonsWithSurveyMap[mostRecentCourse.course.id || ""]
                          )
                        )}%
                      </span>
                      <Button
                        size="sm"
                        className="bg-accent hover:bg-accent/90 text-accent-foreground"
                        onClick={() => navigate(getLessonUrl(mostRecentCourse.course, true))}
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Continue
                      </Button>
                    </div>
                  </div>
                ) : null}
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="w-4 h-4" />
                    <span>{totalCourses} course{totalCourses !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{completedCount} completed</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-accent">
                    <Flame className="w-4 h-4" />
                    <span className="font-medium">{Math.round(overallProgress)}% Complete</span>
                  </div>
                </div>
                <Progress value={overallProgress} className="h-3 mb-4" />
              </div>
              {/* Progress Ring */}
              <div className="relative w-24 h-24 ml-4">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="none"
                    className="text-muted"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - overallProgress / 100)}`}
                    className="text-accent"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-foreground">{Math.round(overallProgress)}%</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Courses List */}
      {courses.length === 0 ? (
        <Card className="p-6 mb-5">
          <div className="text-center py-8">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No courses assigned yet.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4 mb-5">
          {courses.map((course) => {
            const progressValue = getCourseProgressValue(course);
            const completed = isCourseCompleted(course);
            const displayProgressValue = progressDataReady ? progressValue : Math.min(progressValue, 99);
            
            return (
              <Card
                key={course.id}
                className="p-5 bg-card border-border shadow-md hover:shadow-lg transition-all cursor-pointer"
                onClick={() => navigate(`/courses/${course.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-3 rounded-lg ${completed ? "bg-green-500/10" : "bg-accent/10"}`}>
                      {completed ? (
                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                      ) : (
                        <BookOpen className="w-6 h-6 text-accent" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-xl font-bold text-foreground">
                          {course.title}
                        </h2>
                        {completed && (
                          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Completed
                          </Badge>
                        )}
                      </div>
                      {course.description && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {course.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mb-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-4 h-4" />
                          <span>{course.modules.length} module{course.modules.length !== 1 ? "s" : ""}</span>
                        </div>
                        {((course.totalDuration ?? 0) > 0) && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            <span>{course.totalDuration} month{course.totalDuration !== 1 ? "s" : ""}</span>
                          </div>
                        )}
                      </div>
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-muted-foreground">Progress</span>
                          <Badge className={`text-xs ${completed ? "bg-green-500/10 text-green-500" : "bg-accent/10 text-accent"}`}>
                            {Math.round(displayProgressValue)}%
                          </Badge>
                        </div>
                        <Progress value={displayProgressValue} className="h-2" />
                      </div>
                    </div>
                  </div>
                  <div className="ml-4 flex gap-2">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(getLessonUrl(course, displayProgressValue > 0 && !completed));
                      }}
                      size="sm"
                      className={completed ? "bg-green-500 hover:bg-green-600" : "bg-accent hover:bg-accent/90 text-accent-foreground"}
                    >
                      {completed ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Review
                        </>
                      ) : progressValue > 0 ? (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Continue ({Math.round(displayProgressValue)}%)
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Start
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/courses/${course.id}`);
                      }}
                      size="sm"
                      variant="outline"
                    >
                      Details
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Alumni Network Widget */}
      <Card
        className={`p-6 border transition-all ${
          allCompleted
            ? "bg-gradient-to-br from-accent/10 via-card to-card border-accent/30 shadow-lg"
            : "bg-muted/50 border-border"
        }`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`p-4 rounded-lg ${
              allCompleted ? "bg-accent/10" : "bg-muted"
            }`}
          >
            <GraduationCap
              className={`w-8 h-8 ${
                allCompleted ? "text-accent" : "text-muted-foreground"
              }`}
            />
          </div>
          <div className="flex-1">
            <h3
              className={`text-xl font-bold mb-1 ${
                allCompleted ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              Apply to Join Alumni Network
            </h3>
            <p
              className={`text-sm mb-4 ${
                allCompleted ? "text-muted-foreground" : "text-muted-foreground/70"
              }`}
            >
              {allCompleted
                ? "Congratulations! You've completed all courses. Apply now to join our exclusive alumni network."
                : `Complete all ${totalCourses} courses to unlock this feature.`}
            </p>
            {isAlumni ? (
              <div className="flex items-center gap-3">
                <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                  <GraduationCap className="w-3 h-3 mr-1" />
                  Graduated
                </Badge>
                <p className="text-sm text-muted-foreground">
                  You are a Digital Curriculum Alumni!
                </p>
              </div>
            ) : userApplication && userApplication.status === "accepted" ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Accepted
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p className="mb-2">See you for your pitch!</p>
                  {userApplication.selectedTime ? (
                    <div className="mt-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <p className="font-semibold text-foreground mb-1">Scheduled Time:</p>
                      <p className="text-green-600 font-medium">{userApplication.selectedTime}</p>
                    </div>
                  ) : (
                    <p className="text-xs mt-1 italic">Time selection pending...</p>
                  )}
                </div>
              </div>
            ) : userApplication ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Badge
                    variant={
                      userApplication.status === "rejected"
                        ? "destructive"
                        : "secondary"
                    }
                    className={
                      userApplication.status === "pending"
                        ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                        : ""
                    }
                  >
                    {userApplication.status === "pending" ? (
                      <>
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                      </>
                    ) : (
                      <>
                        <X className="w-3 h-3 mr-1" />
                        Rejected
                      </>
                    )}
                  </Badge>
                </div>
                {userApplication.status === "pending" && (
                  <div className="text-sm text-muted-foreground">
                    <p className="mb-2">
                      <strong className="text-foreground">Your Availability Windows:</strong>
                    </p>
                    <div className="space-y-1 pl-4">
                      {userApplication.availabilitySlots && userApplication.availabilitySlots.length > 0 ? (
                        userApplication.availabilitySlots.map((slot, index) => (
                          <p key={index} className="text-xs">
                            {slot.date.toLocaleDateString()} from {slot.startTime} to {slot.endTime}
                          </p>
                        ))
                      ) : (
                        <p className="text-xs italic">No availability provided</p>
                      )}
                    </div>
                    {userApplication.selectedTime && (
                      <p className="mt-2 text-xs">
                        <strong className="text-foreground">Selected Time:</strong> {userApplication.selectedTime}
                      </p>
                    )}
                    <p className="mt-2 text-xs">
                      Your application is under review. We&apos;ll get back to you soon!
                    </p>
                  </div>
                )}
                {userApplication.status === "rejected" && (
                  <div className="text-sm text-muted-foreground">
                    <p>Your application was not accepted at this time.</p>
                    {userApplication.notes && (
                      <p className="text-xs mt-1">
                        <strong>Note:</strong> {userApplication.notes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : allCompleted ? (
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setApplicationDialogOpen(true)}
                  className="bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Apply Now
                </Button>
                <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Eligible
                </Badge>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>
                  {totalCourses - completedCount} course{totalCourses - completedCount !== 1 ? "s" : ""} remaining
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>

      <GraduationApplicationDialog
        open={applicationDialogOpen}
        onOpenChange={setApplicationDialogOpen}
        onSuccess={() => {
          alert("Application submitted successfully! We'll review your application and get back to you.");
          loadUserApplication(); // Reload application status
        }}
      />
    </div>
  );
}
