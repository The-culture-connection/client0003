import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import {
  ArrowLeft,
  BookOpen,
  Play,
  CheckCircle2,
  Lock,
  Clock,
  FileText,
  Award,
  Video,
  FileCheck,
  Zap,
  Trophy,
  Target,
  ChevronRight,
  ChevronDown,
  Download,
  Star,
  Users,
  MessageSquare,
  Share2,
} from "lucide-react";

// Mock course data - in a real app, this would come from props or API
const mockCourseData = {
  id: 1,
  title: "Entrepreneurship Foundations",
  description: "Complete curriculum for aspiring entrepreneurs - from idea to launch",
  instructor: "MORTAR Team",
  enrolled: 1247,
  rating: 4.8,
  totalReviews: 342,
  totalDuration: "14.5 hours",
  totalModules: 4,
  completedModules: 2,
  overallProgress: 60,
  modules: [
    {
      id: 1,
      title: "Idea Validation",
      description: "Learn to validate your business idea and identify market opportunities",
      status: "completed",
      duration: "2.5 hours",
      progress: 100,
      locked: false,
      badge: "Idea Validator",
      lessons: [
        { id: 1, title: "Understanding Market Needs", duration: "15 min", completed: true, type: "video" },
        { id: 2, title: "Competitive Analysis", duration: "20 min", completed: true, type: "video" },
        { id: 3, title: "Problem-Solution Fit", duration: "18 min", completed: true, type: "reading" },
        { id: 4, title: "Customer Pain Points", duration: "22 min", completed: true, type: "video" },
        { id: 5, title: "Market Size Analysis", duration: "25 min", completed: true, type: "reading" },
        { id: 6, title: "Validation Strategies", duration: "20 min", completed: true, type: "video" },
        { id: 7, title: "MVP Planning", duration: "18 min", completed: true, type: "reading" },
        { id: 8, title: "Idea Validation Quiz", duration: "12 min", completed: true, type: "survey" },
      ],
      assets: ["Business Model Canvas", "Market Research Template"]
    },
    {
      id: 2,
      title: "Customer Discovery",
      description: "Master customer research and develop deep market insights",
      status: "completed",
      duration: "3 hours",
      progress: 100,
      locked: false,
      badge: "Customer Explorer",
      lessons: [
        { id: 1, title: "Customer Interview Techniques", duration: "22 min", completed: true, type: "video" },
        { id: 2, title: "Building Customer Personas", duration: "18 min", completed: true, type: "video" },
        { id: 3, title: "Analyzing Customer Data", duration: "25 min", completed: true, type: "reading" },
        { id: 4, title: "Journey Mapping", duration: "20 min", completed: true, type: "video" },
        { id: 5, title: "Customer Segmentation", duration: "22 min", completed: true, type: "reading" },
        { id: 6, title: "Empathy Mapping", duration: "18 min", completed: true, type: "video" },
        { id: 7, title: "Value Proposition Design", duration: "25 min", completed: true, type: "reading" },
        { id: 8, title: "Discovery Sprint Exercise", duration: "30 min", completed: true, type: "survey" },
      ],
      assets: ["Customer Interview Guide", "Persona Templates"]
    },
    {
      id: 3,
      title: "Financial Modeling",
      description: "Build financial projections and understand business economics",
      status: "in-progress",
      duration: "4 hours",
      progress: 75,
      locked: false,
      badge: "Financial Strategist",
      lessons: [
        { id: 1, title: "Revenue Models & Pricing", duration: "25 min", completed: true, type: "video" },
        { id: 2, title: "Cost Structure Analysis", duration: "20 min", completed: true, type: "video" },
        { id: 3, title: "Financial Forecasting", duration: "30 min", completed: true, type: "reading" },
        { id: 4, title: "Unit Economics", duration: "22 min", completed: true, type: "video" },
        { id: 5, title: "Cash Flow Management", duration: "25 min", completed: true, type: "reading" },
        { id: 6, title: "Break-even Analysis", duration: "20 min", completed: true, type: "video" },
        { id: 7, title: "Financial Statements", duration: "28 min", completed: false, type: "reading" },
        { id: 8, title: "Investment Scenarios", duration: "22 min", completed: false, type: "video" },
        { id: 9, title: "Pricing Strategy", duration: "18 min", completed: false, type: "reading" },
        { id: 10, title: "Pricing Strategy Quiz", duration: "12 min", completed: false, type: "survey" },
      ],
      assets: ["Financial Projections", "Pricing Calculator"]
    },
    {
      id: 4,
      title: "Pitch & Launch",
      description: "Create compelling pitches and prepare for launch",
      status: "locked",
      duration: "5 hours",
      progress: 0,
      locked: true,
      badge: "Launch Master",
      lessons: [
        { id: 1, title: "Crafting Your Story", duration: "20 min", completed: false, type: "video" },
        { id: 2, title: "Pitch Deck Design", duration: "25 min", completed: false, type: "video" },
        { id: 3, title: "Presenting with Confidence", duration: "22 min", completed: false, type: "reading" },
      ],
      assets: ["Pitch Deck Template", "Launch Checklist"]
    },
  ]
};

export function CourseDetail() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const [expandedModule, setExpandedModule] = useState<number | null>(3); // Default to current module
  
  const course = mockCourseData;
  const currentModule = course.modules.find(m => m.status === "in-progress") || course.modules[0];
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary via-primary to-card border-b border-border">
        <div className="max-w-7xl mx-auto p-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/curriculum")}
            className="mb-4 text-foreground hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Curriculum
          </Button>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Course Info */}
            <div className="lg:col-span-2">
              <Badge className="mb-3 bg-accent text-accent-foreground">
                COURSE
              </Badge>
              <h1 className="text-3xl font-bold text-foreground mb-3">
                {course.title}
              </h1>
              <p className="text-muted-foreground mb-4">
                {course.description}
              </p>
              
              <div className="flex items-center gap-6 mb-4">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <span className="font-medium text-foreground">{course.rating}</span>
                  <span className="text-muted-foreground text-sm">({course.totalReviews} reviews)</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="w-5 h-5" />
                  <span>{course.enrolled.toLocaleString()} enrolled</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-5 h-5" />
                  <span>{course.totalDuration}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  <Play className="w-4 h-4 mr-2" />
                  Continue Learning
                </Button>
                <Button variant="outline" className="border-border">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button variant="outline" className="border-border">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Discuss
                </Button>
              </div>
            </div>

            {/* Progress Card */}
            <Card className="p-6 bg-card border-border h-fit">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-muted-foreground">COURSE PROGRESS</h3>
                <Trophy className="w-5 h-5 text-accent" />
              </div>
              
              <div className="relative w-32 h-32 mx-auto mb-4">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-muted"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 56}`}
                    strokeDashoffset={`${2 * Math.PI * 56 * (1 - course.overallProgress / 100)}`}
                    className="text-accent transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold text-foreground">{course.overallProgress}%</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Modules Complete</span>
                  <span className="font-medium text-foreground">
                    {course.completedModules}/{course.totalModules}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Next Badge</span>
                  <Badge variant="outline" className="text-xs border-accent text-accent">
                    {currentModule.badge}
                  </Badge>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Course Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{course.completedModules}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Zap className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">1</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Target className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">1</p>
                <p className="text-xs text-muted-foreground">Remaining</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Award className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{course.totalModules}</p>
                <p className="text-xs text-muted-foreground">Badges to Earn</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Current Module Spotlight */}
        {currentModule && (
          <Card className="p-6 mb-6 bg-gradient-to-br from-accent/20 via-card to-card border-accent shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-accent" />
              <Badge className="bg-accent text-accent-foreground">CONTINUE HERE</Badge>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {currentModule.title}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {currentModule.description}
            </p>
            
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{currentModule.duration}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Video className="w-4 h-4" />
                <span>{currentModule.lessons.length} lessons</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-accent">
                <Trophy className="w-4 h-4" />
                <span>{currentModule.progress}% Complete</span>
              </div>
            </div>

            <Progress value={currentModule.progress} className="h-3 mb-4" />
            
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Play className="w-4 h-4 mr-2" />
              Resume Module
            </Button>
          </Card>
        )}

        {/* Course Modules */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-4">Course Curriculum</h2>
          
          <div className="space-y-4">
            {course.modules.map((module, idx) => {
              const isExpanded = expandedModule === module.id;
              const completedLessons = module.lessons.filter(l => l.completed).length;
              
              return (
                <Card
                  key={module.id}
                  className={`overflow-hidden transition-all ${
                    module.locked ? "opacity-60" : ""
                  } ${isExpanded ? "border-accent" : "border-border"}`}
                >
                  {/* Module Header */}
                  <div
                    className={`p-5 cursor-pointer hover:bg-muted/30 transition-colors ${
                      module.locked ? "cursor-not-allowed" : ""
                    }`}
                    onClick={() => !module.locked && setExpandedModule(isExpanded ? null : module.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        {/* Module Status Icon */}
                        <div
                          className={`p-3 rounded-lg flex-shrink-0 ${
                            module.locked
                              ? "bg-muted"
                              : module.progress === 100
                              ? "bg-green-500/10"
                              : "bg-accent/10"
                          }`}
                        >
                          {module.locked ? (
                            <Lock className="w-6 h-6 text-muted-foreground" />
                          ) : module.progress === 100 ? (
                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                          ) : (
                            <Zap className="w-6 h-6 text-accent" />
                          )}
                        </div>

                        {/* Module Info */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="text-lg font-bold text-foreground mb-1">
                                Module {idx + 1}: {module.title}
                              </h3>
                              <p className="text-sm text-muted-foreground mb-3">
                                {module.description}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 mb-3">
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Video className="w-4 h-4" />
                              <span>{module.lessons.length} lessons</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Clock className="w-4 h-4" />
                              <span>{module.duration}</span>
                            </div>
                            {!module.locked && (
                              <>
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>{completedLessons}/{module.lessons.length} completed</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-sm text-accent">
                                  <Award className="w-4 h-4" />
                                  <span>{module.badge}</span>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Progress Bar */}
                          {!module.locked && (
                            <div className="mb-3">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs text-muted-foreground">Progress</span>
                                <Badge
                                  className={`text-xs ${
                                    module.progress === 100
                                      ? "bg-green-500/10 text-green-500"
                                      : "bg-accent/10 text-accent"
                                  }`}
                                >
                                  {module.progress}%
                                </Badge>
                              </div>
                              <Progress value={module.progress} className="h-2" />
                            </div>
                          )}

                          {/* Assets Preview */}
                          {!module.locked && module.assets.length > 0 && (
                            <div className="flex items-center gap-2">
                              <FileCheck className="w-4 h-4 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {module.assets.length} assets available
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Expand/Collapse Icon */}
                      <div className="ml-4 flex-shrink-0">
                        {module.locked ? (
                          <Badge variant="outline" className="text-xs">
                            Locked
                          </Badge>
                        ) : isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-accent" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Lessons */}
                  {isExpanded && !module.locked && (
                    <div className="border-t border-border bg-muted/20">
                      <div className="p-5">
                        {/* Assets Section */}
                        {module.assets.length > 0 && (
                          <div className="mb-4 p-4 bg-card rounded-lg border border-border">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                                <FileCheck className="w-4 h-4 text-accent" />
                                Module Assets
                              </h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {module.assets.map((asset, i) => (
                                <div
                                  key={i}
                                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-accent" />
                                    <span className="text-sm font-medium text-foreground">{asset}</span>
                                  </div>
                                  <Button size="sm" variant="ghost">
                                    <Download className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Lessons List */}
                        <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-accent" />
                          Lessons
                        </h4>
                        <div className="space-y-2">
                          {module.lessons.map((lesson, lessonIdx) => (
                            <div
                              key={lesson.id}
                              className={`group flex items-center justify-between p-4 rounded-lg border transition-all ${
                                lesson.completed
                                  ? "bg-muted/30 border-border/50"
                                  : "bg-card border-border hover:border-accent hover:bg-accent/5 cursor-pointer"
                              }`}
                            >
                              <div className="flex items-center gap-4 flex-1">
                                {/* Lesson Number & Status */}
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-medium text-muted-foreground w-6">
                                    {lessonIdx + 1}
                                  </span>
                                  {lesson.completed ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                  ) : (
                                    <div className="w-5 h-5 rounded-full border-2 border-accent flex items-center justify-center">
                                      <Play className="w-3 h-3 text-accent" />
                                    </div>
                                  )}
                                </div>

                                {/* Lesson Info */}
                                <div className="flex-1">
                                  <p
                                    className={`text-sm font-medium mb-1 ${
                                      lesson.completed
                                        ? "text-muted-foreground line-through"
                                        : "text-foreground"
                                    }`}
                                  >
                                    {lesson.title}
                                  </p>
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {lesson.duration}
                                    </span>
                                    <Badge variant="outline" className="text-xs">
                                      {lesson.type === "video" && <Video className="w-3 h-3 mr-1" />}
                                      {lesson.type === "reading" && <BookOpen className="w-3 h-3 mr-1" />}
                                      {lesson.type === "survey" && <FileCheck className="w-3 h-3 mr-1" />}
                                      {lesson.type}
                                    </Badge>
                                  </div>
                                </div>

                                {/* Action Button */}
                                {!lesson.completed && (
                                  <Button
                                    size="sm"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-accent hover:bg-accent/90 text-accent-foreground"
                                  >
                                    <Play className="w-3 h-3 mr-1" />
                                    Start
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Locked Message */}
                  {module.locked && (
                    <div className="border-t border-border p-4 bg-muted/20">
                      <p className="text-sm text-muted-foreground text-center">
                        Complete Module {idx} to unlock this content
                      </p>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
