import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
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
import { getCourse, type Course, type Module } from "../../lib/courses";
import { format } from "date-fns";
import { useAuth } from "../../components/auth/AuthProvider";
import { getCourseProgress, updateLessonCompletion, markCourseCompleted, calculateCourseProgress, type CourseProgress } from "../../lib/courseProgress";
import { SlideViewer } from "../../components/courses/SlideViewer";
import { getCurrentUserWithRoles } from "../../lib/auth";
import { Edit, Eye } from "lucide-react";

export function CourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [courseProgress, setCourseProgress] = useState<CourseProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [showSlideViewer, setShowSlideViewer] = useState(false);
  const [startModuleIndex, setStartModuleIndex] = useState<number | null>(null);
  const [startLessonIndex, setStartLessonIndex] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const loadCourse = async () => {
      if (!courseId || !user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [courseData, progressData, userWithRoles] = await Promise.all([
          getCourse(courseId),
          getCourseProgress(user.uid, courseId),
          getCurrentUserWithRoles(),
        ]);
        setCourse(courseData);
        setCourseProgress(progressData);
        
        // Check if user is admin
        if (userWithRoles?.roles) {
          const hasAdminRole = userWithRoles.roles.includes("superAdmin") || userWithRoles.roles.includes("Admin");
          setIsAdmin(hasAdminRole);
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

  const totalPrice = course.totalPrice || course.modules.reduce((sum, m) => sum + (m.price || 0), 0);
  const totalDuration = course.totalDuration || course.modules.reduce((sum, m) => sum + (m.durationMonths || 0), 0);
  const courseProgressValue = courseProgress ? calculateCourseProgress(course, courseProgress) : 0;
  const isCourseCompleted = courseProgress?.completed || courseProgressValue === 100;

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
              {isCourseCompleted && (
                <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Completed
                </Badge>
              )}
              {course.currency && totalPrice > 0 && (
                <Badge variant="secondary">
                  <DollarSign className="w-3 h-3 mr-1" />
                  ${totalPrice.toFixed(2)}
                </Badge>
              )}
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
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
              {totalDuration > 0 && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{totalDuration} Month{totalDuration !== 1 ? "s" : ""}</span>
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
            {courseProgressValue > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Your Progress</span>
                  <Badge className={isCourseCompleted ? "bg-green-500/10 text-green-500" : "bg-accent/10 text-accent"}>
                    {Math.round(courseProgressValue)}%
                  </Badge>
                </div>
                <Progress value={courseProgressValue} className="h-2" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modules */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Course Modules</h2>
        {course.modules.length === 0 ? (
          <Card className="p-6">
            <p className="text-muted-foreground text-center">
              No modules available yet.
            </p>
          </Card>
        ) : (
          course.modules
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map((module, moduleIndex) => (
              <Card key={module.id || moduleIndex} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="outline" className="text-xs">
                        Module {module.order || moduleIndex + 1}
                      </Badge>
                      {module.price > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          <DollarSign className="w-3 h-3 mr-1" />
                          ${module.price.toFixed(2)}
                        </Badge>
                      )}
                      {module.durationMonths && module.durationMonths > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          {module.durationMonths} Month{module.durationMonths !== 1 ? "s" : ""}
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
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setExpandedModule(
                        expandedModule === (module.id || module.title)
                          ? null
                          : module.id || module.title
                      )
                    }
                  >
                    {expandedModule === (module.id || module.title) ? "Hide" : "Show"} Lessons
                  </Button>
                </div>

                {expandedModule === (module.id || module.title) && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <h4 className="text-sm font-semibold text-foreground mb-3">
                      Lessons ({module.lessons.length})
                    </h4>
                    {module.lessons.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No lessons available yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {module.lessons
                          .sort((a, b) => (a.order || 0) - (b.order || 0))
                          .map((lesson, lessonIndex) => (
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
                                  {lesson.slideFileName && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {lesson.slideFileName}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {(() => {
                                  // Find the corresponding lesson in curriculum mapping by matching title or order
                                  const curriculumModule = course.curriculumMapping?.modules[moduleIndex];
                                  const curriculumLesson = curriculumModule?.chapters[0]?.lessons.find(
                                    (l) => l.title === lesson.title || 
                                    (curriculumModule.chapters[0].lessons.length > lessonIndex && 
                                     curriculumModule.chapters[0].lessons[lessonIndex])
                                  ) || curriculumModule?.chapters[0]?.lessons[lessonIndex];
                                  
                                  const lessonId = lesson.id || `${module.order}_${lesson.order}`;
                                  const isCompleted = courseProgress?.lessonsCompleted[lessonId] || false;
                                  
                                  return (
                                    <>
                                      {isAdmin && course.curriculumMapping && curriculumLesson && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            const curriculumId = course.curriculumMapping!.curriculumId;
                                            const moduleId = course.curriculumMapping!.modules[moduleIndex].moduleId;
                                            const chapterId = course.curriculumMapping!.modules[moduleIndex].chapters[0].chapterId;
                                            const lessonId = curriculumLesson.lessonId;
                                            navigate(
                                              `/admin/curriculum/${curriculumId}/module/${moduleId}/chapter/${chapterId}/lesson/${lessonId}/builder`
                                            );
                                          }}
                                        >
                                          <Edit className="w-4 h-4 mr-2" />
                                          Build Content
                                        </Button>
                                      )}
                                      {isCompleted ? (
                                        <Badge variant="outline" className="text-green-600 border-green-600">
                                          <CheckCircle2 className="w-3 h-3 mr-1" />
                                          Completed
                                        </Badge>
                                      ) : lesson.slideUrl ? (
                                        <Button
                                          size="sm"
                                          className="bg-accent hover:bg-accent/90 text-accent-foreground"
                                          onClick={() => {
                                            // Find the global index of this lesson
                                            let globalIndex = 0;
                                            course.modules
                                              .sort((a, b) => (a.order || 0) - (b.order || 0))
                                              .forEach((m, mIdx) => {
                                                if (mIdx < moduleIndex) {
                                                  globalIndex += m.lessons.length;
                                                } else if (mIdx === moduleIndex) {
                                                  m.lessons
                                                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                                                    .forEach((l, lIdx) => {
                                                      if (lIdx < lessonIndex) {
                                                        globalIndex++;
                                                      }
                                                    });
                                                }
                                              });
                                            setStartModuleIndex(moduleIndex);
                                            setStartLessonIndex(lessonIndex);
                                            setShowSlideViewer(true);
                                          }}
                                        >
                                          <Play className="w-3 h-3 mr-1" />
                                          Start Lesson
                                        </Button>
                                      ) : (
                                        <Badge variant="secondary" className="text-xs">
                                          {isAdmin ? "No content yet" : "Not Available"}
                                        </Badge>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))
        )}
      </div>

      {/* Slide Viewer Modal */}
      {showSlideViewer && course && user && (
        <SlideViewer
          course={course}
          courseProgress={courseProgress}
          userId={user.uid}
          onProgressUpdate={(updatedProgress) => {
            setCourseProgress(updatedProgress);
            // Reload courses list if we're coming from Curriculum page
            if (window.location.pathname.includes("/curriculum")) {
              window.location.reload();
            }
          }}
          onClose={() => {
            setShowSlideViewer(false);
            setStartModuleIndex(null);
            setStartLessonIndex(null);
            // Reload progress when viewer closes
            if (user && courseId) {
              getCourseProgress(user.uid, courseId).then(setCourseProgress);
            }
          }}
        />
      )}
    </div>
  );
}
