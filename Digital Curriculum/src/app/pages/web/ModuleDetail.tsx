import { useParams, useNavigate } from "react-router";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import {
  BookOpen,
  Play,
  CheckCircle2,
  Clock,
  FileText,
  ArrowLeft,
  Video,
} from "lucide-react";
import { useState, useEffect } from "react";

interface Course {
  id: string;
  title: string;
  description: string;
  duration: string;
  completed: boolean;
}

export function ModuleDetail() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([
    {
      id: "1",
      title: "Introduction to Entrepreneurship",
      description: "Learn the fundamentals of starting a business",
      duration: "30 min",
      completed: false,
    },
    {
      id: "2",
      title: "Business Model Development",
      description: "Create and refine your business model",
      duration: "45 min",
      completed: false,
    },
    {
      id: "3",
      title: "Market Research Fundamentals",
      description: "Understand your target market and competition",
      duration: "40 min",
      completed: false,
    },
    {
      id: "4",
      title: "Financial Planning Basics",
      description: "Learn to create financial projections",
      duration: "35 min",
      completed: false,
    },
  ]);

  // Load completion status from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`module-${moduleId}-courses`);
    if (saved) {
      try {
        const savedCourses = JSON.parse(saved);
        setCourses(savedCourses);
      } catch (e) {
        console.error("Error loading saved courses:", e);
      }
    }
  }, [moduleId]);

  // Save completion status to localStorage
  const saveCourses = (updatedCourses: Course[]) => {
    setCourses(updatedCourses);
    localStorage.setItem(`module-${moduleId}-courses`, JSON.stringify(updatedCourses));
  };

  const handleCompleteCourse = (courseId: string) => {
    const updatedCourses = courses.map((course) =>
      course.id === courseId ? { ...course, completed: true } : course
    );
    saveCourses(updatedCourses);
  };

  const handleCompleteAll = () => {
    const updatedCourses = courses.map((course) => ({ ...course, completed: true }));
    saveCourses(updatedCourses);
  };

  const completedCount = courses.filter((c) => c.completed).length;
  const totalCourses = courses.length;
  const allCompleted = completedCount === totalCourses;
  const progress = (completedCount / totalCourses) * 100;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/curriculum")}
          className="mb-4 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Curriculum
        </Button>
        <h1 className="text-3xl font-bold text-foreground mb-2">Test Curriculum</h1>
        <p className="text-muted-foreground">
          Complete all courses to unlock the Alumni Application
        </p>
      </div>

      {/* Progress Card */}
      <Card className="p-6 mb-6 bg-gradient-to-br from-accent/20 via-card to-card border-accent/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-accent" />
              <h2 className="text-xl font-bold text-foreground">Module Progress</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {completedCount} of {totalCourses} courses completed
            </p>
            <Progress value={progress} className="h-3 mb-4" />
            <div className="flex items-center gap-3">
              <Button
                onClick={handleCompleteAll}
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                Complete all the courses
              </Button>
              {allCompleted && (
                <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  All Courses Completed!
                </Badge>
              )}
            </div>
          </div>
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
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - progress / 100)}`}
                className="text-accent"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold text-foreground">{Math.round(progress)}%</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Courses List */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground mb-4">Courses</h2>
        <div className="space-y-4">
          {courses.map((course) => (
            <Card
              key={course.id}
              className={`p-5 border transition-all ${
                course.completed
                  ? "bg-muted/30 border-border/50"
                  : "bg-card border-border hover:border-accent hover:shadow-md"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div
                    className={`p-3 rounded-lg ${
                      course.completed ? "bg-green-500/10" : "bg-accent/10"
                    }`}
                  >
                    {course.completed ? (
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    ) : (
                      <Video className="w-6 h-6 text-accent" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3
                          className={`text-lg font-semibold mb-1 ${
                            course.completed
                              ? "text-muted-foreground line-through"
                              : "text-foreground"
                          }`}
                        >
                          {course.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          {course.description}
                        </p>
                      </div>
                      {course.completed && (
                        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                          Completed
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        <span>{course.duration}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="ml-4">
                  {course.completed ? (
                    <Button variant="outline" disabled size="sm">
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Completed
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleCompleteCourse(course.id)}
                      className="bg-accent hover:bg-accent/90 text-accent-foreground"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Mark Complete
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

    </div>
  );
}
