import { useState } from "react";
import { useNavigate } from "react-router";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { useAuth } from "../../lib/auth-context";
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
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  DollarSign,
  List,
  ChevronDown,
  ChevronUp,
  Settings,
  BarChart,
  Eye,
} from "lucide-react";

export function WebCurriculum() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";
  const [adminMode, setAdminMode] = useState(false);
  
  // Course Management State
  const [courses, setCourses] = useState([
    {
      id: 1,
      title: "Entrepreneurship Foundations",
      description: "Complete curriculum for aspiring entrepreneurs",
      modules: [
        {
          id: 1,
          title: "Idea Validation",
          description: "Learn to validate your business idea and identify market opportunities",
          status: "completed",
          chapters: 8,
          duration: "2.5 hours",
          progress: 100,
          locked: false,
          badge: "Idea Validator",
          color: "green",
          price: 0,
          assets: ["Business Model Canvas", "Market Research Template"],
          lessons: [
            { id: 1, title: "Understanding Market Needs", duration: "15 min", completed: true, content: "", type: "video" as const },
            { id: 2, title: "Competitive Analysis", duration: "20 min", completed: true, content: "", type: "video" as const },
            { id: 3, title: "Problem-Solution Fit", duration: "18 min", completed: true, content: "", type: "reading" as const },
            { id: 4, title: "Idea Validation Quiz", duration: "12 min", completed: true, content: "", type: "survey" as const },
          ]
        },
        {
          id: 2,
          title: "Customer Discovery",
          description: "Master customer research and develop deep market insights",
          status: "completed",
          chapters: 10,
          duration: "3 hours",
          progress: 100,
          locked: false,
          badge: "Customer Explorer",
          color: "blue",
          price: 99,
          assets: ["Customer Interview Guide", "Persona Templates"],
          lessons: [
            { id: 1, title: "Customer Interview Techniques", duration: "22 min", completed: true, content: "", type: "video" as const },
            { id: 2, title: "Building Customer Personas", duration: "18 min", completed: true, content: "", type: "video" as const },
            { id: 3, title: "Analyzing Customer Data", duration: "25 min", completed: true, content: "", type: "reading" as const },
            { id: 4, title: "Customer Discovery Quiz", duration: "15 min", completed: true, content: "", type: "survey" as const },
          ]
        },
        {
          id: 3,
          title: "Financial Modeling",
          description: "Build financial projections and understand business economics",
          status: "in-progress",
          chapters: 12,
          duration: "4 hours",
          progress: 75,
          locked: false,
          badge: "Financial Strategist",
          color: "accent",
          price: 149,
          assets: ["Financial Projections", "Pricing Calculator"],
          lessons: [
            { id: 1, title: "Revenue Models & Pricing", duration: "25 min", completed: true, content: "", type: "video" as const },
            { id: 2, title: "Cost Structure Analysis", duration: "20 min", completed: true, content: "", type: "video" as const },
            { id: 3, title: "Financial Forecasting", duration: "30 min", completed: true, content: "", type: "reading" as const },
            { id: 4, title: "Pricing Strategy Quiz", duration: "12 min", completed: false, content: "", type: "survey" as const },
          ]
        },
        {
          id: 4,
          title: "Pitch & Launch",
          description: "Create compelling pitches and prepare for launch",
          status: "locked",
          chapters: 15,
          duration: "5 hours",
          progress: 0,
          locked: true,
          badge: "Launch Master",
          color: "muted",
          price: 199,
          assets: ["Pitch Deck Template", "Launch Checklist"],
          lessons: []
        },
      ]
    }
  ]);

  // Admin Edit State
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [editingModule, setEditingModule] = useState<any>(null);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [expandedModule, setExpandedModule] = useState<number | null>(null);

  // Get active course
  const activeCourse = courses[0];
  const modules = activeCourse.modules;
  const currentModule = modules.find(m => m.status === "in-progress") || modules[0];

  // Admin Functions
  const handleAddModule = () => {
    const newModule = {
      id: Date.now(),
      title: "New Module",
      description: "Module description",
      status: "locked",
      chapters: 0,
      duration: "0 hours",
      progress: 0,
      locked: true,
      badge: "New Badge",
      color: "accent",
      price: 0,
      assets: [],
      lessons: []
    };
    
    const updatedCourses = [...courses];
    updatedCourses[0].modules.push(newModule);
    setCourses(updatedCourses);
    setEditingModule(newModule);
  };

  const handleAddLesson = (moduleId: number) => {
    const newLesson = {
      id: Date.now(),
      title: "New Lesson",
      duration: "10 min",
      completed: false,
      content: "",
      type: "video" as const
    };
    
    const updatedCourses = [...courses];
    const module = updatedCourses[0].modules.find(m => m.id === moduleId);
    if (module) {
      module.lessons.push(newLesson);
      setCourses(updatedCourses);
      setEditingLesson({ ...newLesson, moduleId });
    }
  };

  const handleSaveModule = (updatedModule: any) => {
    const updatedCourses = [...courses];
    const moduleIndex = updatedCourses[0].modules.findIndex(m => m.id === updatedModule.id);
    if (moduleIndex !== -1) {
      updatedCourses[0].modules[moduleIndex] = updatedModule;
      setCourses(updatedCourses);
    }
    setEditingModule(null);
  };

  const handleDeleteModule = (moduleId: number) => {
    if (confirm("Are you sure you want to delete this module?")) {
      const updatedCourses = [...courses];
      updatedCourses[0].modules = updatedCourses[0].modules.filter(m => m.id !== moduleId);
      setCourses(updatedCourses);
    }
  };

  const handleSaveLesson = (moduleId: number, updatedLesson: any) => {
    const updatedCourses = [...courses];
    const module = updatedCourses[0].modules.find(m => m.id === moduleId);
    if (module) {
      const lessonIndex = module.lessons.findIndex(l => l.id === updatedLesson.id);
      if (lessonIndex !== -1) {
        module.lessons[lessonIndex] = updatedLesson;
        setCourses(updatedCourses);
      }
    }
    setEditingLesson(null);
  };

  const handleDeleteLesson = (moduleId: number, lessonId: number) => {
    if (confirm("Are you sure you want to delete this lesson?")) {
      const updatedCourses = [...courses];
      const module = updatedCourses[0].modules.find(m => m.id === moduleId);
      if (module) {
        module.lessons = module.lessons.filter(l => l.id !== lessonId);
        setCourses(updatedCourses);
      }
    }
  };

  // Admin View
  if (isAdmin && adminMode) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        {/* Admin Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Settings className="w-6 h-6 text-accent" />
              Admin: Curriculum Management
            </h1>
            <p className="text-sm text-muted-foreground">Create and manage courses, modules, and lessons</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setAdminMode(false)}
            className="border-border"
          >
            <Eye className="w-4 h-4 mr-2" />
            Student View
          </Button>
        </div>

        {/* Course Editor */}
        <Card className="p-6 mb-6 bg-card border-accent/30">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">{activeCourse.title}</h2>
              <p className="text-sm text-muted-foreground">{activeCourse.description}</p>
            </div>
            <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Edit className="w-4 h-4 mr-2" />
              Edit Course
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <List className="w-4 h-4 text-accent" />
                <span className="text-sm text-muted-foreground">Total Modules</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{modules.length}</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Video className="w-4 h-4 text-accent" />
                <span className="text-sm text-muted-foreground">Total Lessons</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {modules.reduce((sum, m) => sum + m.lessons.length, 0)}
              </p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <BarChart className="w-4 h-4 text-accent" />
                <span className="text-sm text-muted-foreground">Total Revenue</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                ${modules.reduce((sum, m) => sum + m.price, 0)}
              </p>
            </div>
          </div>
        </Card>

        {/* Add Module Button */}
        <div className="mb-4">
          <Button 
            onClick={handleAddModule}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Module
          </Button>
        </div>

        {/* Modules List */}
        <div className="space-y-4">
          {modules.map((module, idx) => (
            <Card key={module.id} className="p-5 bg-card border-border">
              {editingModule?.id === module.id ? (
                // Edit Mode
                <ModuleEditor
                  module={editingModule}
                  onSave={handleSaveModule}
                  onCancel={() => setEditingModule(null)}
                />
              ) : (
                // View Mode
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-bold text-foreground">
                          Module {idx + 1}: {module.title}
                        </h3>
                        <Badge className={`text-xs ${
                          module.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                          module.status === 'in-progress' ? 'bg-accent/10 text-accent' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {module.status}
                        </Badge>
                        {module.price > 0 && (
                          <Badge variant="outline" className="text-xs border-accent text-accent">
                            ${module.price}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{module.description}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{module.lessons.length} lessons</span>
                        <span>•</span>
                        <span>{module.duration}</span>
                        <span>•</span>
                        <span>Badge: {module.badge}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingModule(module)}
                        className="border-border"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteModule(module.id)}
                        className="border-red-500 text-red-500 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setExpandedModule(expandedModule === module.id ? null : module.id)}
                        className="border-border"
                      >
                        {expandedModule === module.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Lessons Section */}
                  {expandedModule === module.id && (
                    <div className="border-t border-border pt-4 mt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-bold text-foreground">Lessons</h4>
                        <Button
                          size="sm"
                          onClick={() => handleAddLesson(module.id)}
                          className="bg-accent hover:bg-accent/90 text-accent-foreground"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Lesson
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        {module.lessons.map((lesson, lessonIdx) => (
                          <div key={lesson.id}>
                            {editingLesson?.id === lesson.id && editingLesson?.moduleId === module.id ? (
                              <LessonEditor
                                lesson={editingLesson}
                                onSave={(updated) => handleSaveLesson(module.id, updated)}
                                onCancel={() => setEditingLesson(null)}
                              />
                            ) : (
                              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-medium text-muted-foreground">
                                    {lessonIdx + 1}.
                                  </span>
                                  <div>
                                    <p className="text-sm font-medium text-foreground">{lesson.title}</p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <span>{lesson.duration}</span>
                                      <span>•</span>
                                      <Badge variant="outline" className="text-xs">
                                        {lesson.type}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditingLesson({ ...lesson, moduleId: module.id })}
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteLesson(module.id, lesson.id)}
                                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        
                        {module.lessons.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No lessons yet. Click "Add Lesson" to get started.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Student View
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Admin Toggle Button */}
      {isAdmin && (
        <div className="mb-4 flex justify-end">
          <Button
            onClick={() => setAdminMode(true)}
            variant="outline"
            size="sm"
            className="border-accent text-accent hover:bg-accent/10"
          >
            <Settings className="w-4 h-4 mr-2" />
            Admin Mode
          </Button>
        </div>
      )}
      
      {/* Hero Section */}
      <div className="mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Current Progress Card */}
          <Card className="lg:col-span-2 p-6 bg-gradient-to-br from-accent/20 via-card to-card border-accent/30 shadow-lg">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <Badge className="mb-2 bg-accent text-accent-foreground">
                  ACTIVE MODULE
                </Badge>
                <h1 className="text-2xl font-bold text-foreground mb-2 hover:text-accent transition-colors cursor-pointer" onClick={() => navigate(`/course/${activeCourse.id}`)}>
                  {currentModule.title}
                </h1>
                <p className="text-sm text-muted-foreground mb-4">
                  {currentModule.description}
                </p>
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="w-4 h-4" />
                    <span>{currentModule.chapters} chapters</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{currentModule.duration}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-accent">
                    <Flame className="w-4 h-4" />
                    <span className="font-medium">{currentModule.progress}% Complete</span>
                  </div>
                </div>
                <Progress value={currentModule.progress} className="h-3 mb-4" />
                <div className="flex items-center gap-3">
                  <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                    <Play className="w-4 h-4 mr-2" />
                    Continue Learning
                  </Button>
                  <Button variant="outline" className="border-border">
                    <BookOpen className="w-4 h-4 mr-2" />
                    View Assets
                  </Button>
                </div>
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
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - currentModule.progress / 100)}`}
                    className="text-accent"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-foreground">{currentModule.progress}%</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Current Badge Card */}
          <Card className="p-6 bg-card border-border shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent/5 rounded-full -ml-12 -mb-12"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-muted-foreground">NEXT BADGE</h3>
                <Trophy className="w-4 h-4 text-accent" />
              </div>
              <div className="flex flex-col items-center text-center mb-4">
                <div className="p-4 rounded-full bg-accent/10 mb-3">
                  <TrendingUp className="w-12 h-12 text-accent" />
                </div>
                <h2 className="text-lg font-bold text-foreground mb-1">
                  {currentModule.badge}
                </h2>
                <p className="text-xs text-muted-foreground mb-3">
                  Complete Module {currentModule.id}
                </p>
                <div className="w-full">
                  <Progress value={currentModule.progress} className="h-2 mb-2" />
                  <p className="text-xs text-muted-foreground">
                    {100 - currentModule.progress}% to unlock
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
          <Card className="p-4 bg-card border-border hover:border-accent transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">2</p>
                <p className="text-xs text-muted-foreground">Modules Complete</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-card border-border hover:border-accent transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Zap className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">1</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-card border-border hover:border-accent transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <FileCheck className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">6/8</p>
                <p className="text-xs text-muted-foreground">Assets Created</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-card border-border hover:border-accent transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Award className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">2/4</p>
                <p className="text-xs text-muted-foreground">Badges Earned</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Module Journey Header */}
      <div className="mb-4">
        <h2 className="text-xl font-bold text-foreground">Module Journey</h2>
        <p className="text-sm text-muted-foreground">Complete all modules to earn your entrepreneur certification</p>
      </div>

      {/* Module Cards */}
      <div className="space-y-5">
        {modules.map((module, idx) => {
          const isExpanded = module.id === expandedModule?.id;
          return (
            <Card
              key={module.id}
              className={`p-5 bg-card border-border shadow-md transition-all ${
                module.locked ? "opacity-60" : "hover:shadow-lg"
              } ${isExpanded ? "border-accent" : ""}`}
            >
              {/* Module Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4 flex-1">
                  {/* Module Icon/Number */}
                  <div
                    className={`p-3 rounded-lg ${
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
                        <h2 className="text-xl font-bold text-foreground mb-1">
                          Module {idx + 1} — {module.title}
                        </h2>
                        <p className="text-sm text-muted-foreground mb-3">
                          {module.description}
                        </p>
                      </div>
                    </div>

                    {/* Module Meta */}
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <FileText className="w-4 h-4" />
                        <span>{module.chapters} chapters</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>{module.duration}</span>
                      </div>
                      {!module.locked && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Award className="w-4 h-4" />
                          <span>{module.badge}</span>
                        </div>
                      )}
                    </div>

                    {/* Progress Bar */}
                    {!module.locked && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-muted-foreground">
                            Progress
                          </span>
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

                    {/* Assets */}
                    {!module.locked && module.assets.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-muted-foreground mb-2">Assets to create:</p>
                        <div className="flex flex-wrap gap-2">
                          {module.assets.map((asset, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="text-xs border-border"
                            >
                              <FileCheck className="w-3 h-3 mr-1" />
                              {asset}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Button */}
                <div className="ml-4">
                  {module.locked ? (
                    <Button disabled size="sm" variant="outline">
                      <Lock className="w-4 h-4 mr-2" />
                      Locked
                    </Button>
                  ) : module.progress === 100 ? (
                    <Button size="sm" variant="outline" className="border-green-500 text-green-500 hover:bg-green-500/10">
                      <BookOpen className="w-4 h-4 mr-2" />
                      Review
                    </Button>
                  ) : (
                    <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                      <Play className="w-4 h-4 mr-2" />
                      {module.progress > 0 ? "Continue" : "Start"}
                    </Button>
                  )}
                </div>
              </div>

              {/* Expanded Lessons View */}
              {isExpanded && module.lessons.length > 0 && (
                <div className="border-t border-border pt-4 mt-2">
                  <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                    <Video className="w-4 h-4 text-accent" />
                    Chapter Overview
                  </h3>
                  <div className="space-y-2">
                    {module.lessons.map((lesson, lessonIdx) => (
                      <div
                        key={lessonIdx}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          lesson.completed
                            ? "bg-muted/30 border-border/50"
                            : "bg-card border-accent hover:bg-accent/5 cursor-pointer"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {lesson.completed ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-accent flex items-center justify-center">
                              <Play className="w-3 h-3 text-accent" />
                            </div>
                          )}
                          <div>
                            <p className={`text-sm font-medium ${
                              lesson.completed ? "text-muted-foreground line-through" : "text-foreground"
                            }`}>
                              {lesson.title}
                            </p>
                            <p className="text-xs text-muted-foreground">{lesson.duration}</p>
                          </div>
                        </div>
                        {!lesson.completed && (
                          <ArrowRight className="w-4 h-4 text-accent" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Locked Message */}
              {module.locked && (
                <div className="border-t border-border pt-4 mt-2">
                  <p className="text-sm text-muted-foreground text-center">
                    Complete Module {idx} to unlock this module
                  </p>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// Module Editor Component
function ModuleEditor({ module, onSave, onCancel }: { module: any, onSave: (updated: any) => void, onCancel: () => void }) {
  const [title, setTitle] = useState(module.title);
  const [description, setDescription] = useState(module.description);
  const [status, setStatus] = useState(module.status);
  const [chapters, setChapters] = useState(module.chapters);
  const [duration, setDuration] = useState(module.duration);
  const [progress, setProgress] = useState(module.progress);
  const [locked, setLocked] = useState(module.locked);
  const [badge, setBadge] = useState(module.badge);
  const [color, setColor] = useState(module.color);
  const [price, setPrice] = useState(module.price);
  const [assets, setAssets] = useState(module.assets);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-foreground">Edit Module</h3>
        <Button size="sm" variant="outline" onClick={onCancel} className="border-border">
          <X className="w-4 h-4" />
        </Button>
      </div>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Label className="text-sm text-muted-foreground">Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex items-center gap-4">
          <Label className="text-sm text-muted-foreground">Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex items-center gap-4">
          <Label className="text-sm text-muted-foreground">Status</Label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full bg-card border-border p-2 rounded-lg"
          >
            <option value="completed">Completed</option>
            <option value="in-progress">In Progress</option>
            <option value="locked">Locked</option>
          </select>
        </div>
        <div className="flex items-center gap-4">
          <Label className="text-sm text-muted-foreground">Chapters</Label>
          <Input
            type="number"
            value={chapters}
            onChange={(e) => setChapters(Number(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="flex items-center gap-4">
          <Label className="text-sm text-muted-foreground">Duration</Label>
          <Input
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex items-center gap-4">
          <Label className="text-sm text-muted-foreground">Progress</Label>
          <Input
            type="number"
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="flex items-center gap-4">
          <Label className="text-sm text-muted-foreground">Locked</Label>
          <select
            value={locked ? "true" : "false"}
            onChange={(e) => setLocked(e.target.value === "true")}
            className="w-full bg-card border-border p-2 rounded-lg"
          >
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
        <div className="flex items-center gap-4">
          <Label className="text-sm text-muted-foreground">Badge</Label>
          <Input
            value={badge}
            onChange={(e) => setBadge(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex items-center gap-4">
          <Label className="text-sm text-muted-foreground">Color</Label>
          <Input
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex items-center gap-4">
          <Label className="text-sm text-muted-foreground">Price</Label>
          <Input
            type="number"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="flex items-center gap-4">
          <Label className="text-sm text-muted-foreground">Assets</Label>
          <Input
            value={assets.join(", ")}
            onChange={(e) => setAssets(e.target.value.split(", ").map(a => a.trim()))}
            className="w-full"
          />
        </div>
      </div>
      <div className="mt-4">
        <Button
          size="sm"
          className="bg-accent hover:bg-accent/90 text-accent-foreground"
          onClick={() => onSave({
            ...module,
            title,
            description,
            status,
            chapters,
            duration,
            progress,
            locked,
            badge,
            color,
            price,
            assets
          })}
        >
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}

// Lesson Editor Component
function LessonEditor({ lesson, onSave, onCancel }: { lesson: any, onSave: (updated: any) => void, onCancel: () => void }) {
  const [title, setTitle] = useState(lesson.title);
  const [duration, setDuration] = useState(lesson.duration);
  const [completed, setCompleted] = useState(lesson.completed);
  const [content, setContent] = useState(lesson.content);
  const [type, setType] = useState(lesson.type);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-foreground">Edit Lesson</h3>
        <Button size="sm" variant="outline" onClick={onCancel} className="border-border">
          <X className="w-4 h-4" />
        </Button>
      </div>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Label className="text-sm text-muted-foreground">Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex items-center gap-4">
          <Label className="text-sm text-muted-foreground">Duration</Label>
          <Input
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex items-center gap-4">
          <Label className="text-sm text-muted-foreground">Completed</Label>
          <select
            value={completed ? "true" : "false"}
            onChange={(e) => setCompleted(e.target.value === "true")}
            className="w-full bg-card border-border p-2 rounded-lg"
          >
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
        <div className="flex items-center gap-4">
          <Label className="text-sm text-muted-foreground">Content</Label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex items-center gap-4">
          <Label className="text-sm text-muted-foreground">Type</Label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "video" | "reading" | "survey")}
            className="w-full bg-card border-border p-2 rounded-lg"
          >
            <option value="video">Video</option>
            <option value="reading">Reading</option>
            <option value="survey">Survey</option>
          </select>
        </div>
      </div>
      <div className="mt-4">
        <Button
          size="sm"
          className="bg-accent hover:bg-accent/90 text-accent-foreground"
          onClick={() => onSave({
            ...lesson,
            title,
            duration,
            completed,
            content,
            type
          })}
        >
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}