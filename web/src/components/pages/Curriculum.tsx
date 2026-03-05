"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
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
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { getModules } from "@/lib/curriculum";

export function CurriculumPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<any[]>([]);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  useEffect(() => {
    if (user?.uid) {
      loadCurriculumData();
    }
  }, [user]);

  const loadCurriculumData = async () => {
    if (!user?.uid) return;

    try {
      const firestoreModules = await getModules();
      
      // Load module progress
      const moduleResultsRef = collection(
        db,
        "user_progress",
        user.uid,
        "module_results"
      );
      const moduleResultsSnapshot = await getDocs(moduleResultsRef);
      const moduleResultsMap = new Map();
      moduleResultsSnapshot.forEach((doc) => {
        moduleResultsMap.set(doc.id, doc.data());
      });

      const modulesData = await Promise.all(
        firestoreModules.map(async (module, idx) => {
          const result = moduleResultsMap.get(module.id);
          const completed = result?.completed || false;
          const progress = result?.progress_percent || 0;
          
          // Check if previous module is completed (for locking)
          const prevModule = idx > 0 ? firestoreModules[idx - 1] : null;
          const prevResult = prevModule ? moduleResultsMap.get(prevModule.id) : null;
          const prevCompleted = prevResult?.completed || false;
          const locked = idx > 0 && !prevCompleted;

          // Get chapters count
          const chaptersRef = collection(
            db,
            "curricula",
            "mortar_masters_online",
            "modules",
            module.id,
            "chapters"
          );
          const chaptersSnapshot = await getDocs(chaptersRef);

          return {
            id: module.id,
            title: module.title,
            description: module.description || `Learn ${module.title.toLowerCase()} skills`,
            status: locked ? "locked" : completed ? "completed" : progress > 0 ? "in-progress" : "available",
            chapters: chaptersSnapshot.size,
            duration: `${Math.ceil(chaptersSnapshot.size * 0.5)} hours`,
            progress: completed ? 100 : progress,
            locked,
            badge: `${module.title} Master`, // badge property not in curriculum Module type
            color: completed ? "green" : progress > 0 ? "accent" : "muted",
          };
        })
      );

      setModules(modulesData);
      
      // Set first in-progress module as expanded
      const inProgress = modulesData.find((m) => m.status === "in-progress");
      if (inProgress) {
        setExpandedModule(inProgress.id);
      }
    } catch (error) {
      console.error("Error loading curriculum:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading curriculum...</p>
          </div>
        </div>
      </div>
    );
  }

  const currentModule = modules.find((m) => m.status === "in-progress") || modules[0] || null;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Hero Section */}
      <div className="mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Current Progress Card */}
          {currentModule && (
            <Card className="lg:col-span-2 p-6 bg-gradient-to-br from-accent/20 via-card to-card border-accent/30 shadow-lg">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <Badge className="mb-2 bg-accent text-accent-foreground">
                    ACTIVE MODULE
                  </Badge>
                  <h1 className="text-2xl font-bold text-foreground mb-2">
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
                    <Link href={`/curriculum/modules/${currentModule.id}`}>
                      <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                        <Play className="w-4 h-4 mr-2" />
                        Continue Learning
                      </Button>
                    </Link>
                    <Link href="/data-room">
                      <Button variant="outline" className="border-border">
                        <BookOpen className="w-4 h-4 mr-2" />
                        View Assets
                      </Button>
                    </Link>
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
          )}

          {/* Current Badge Card */}
          {currentModule && (
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
                    Complete Module {modules.findIndex((m) => m.id === currentModule.id) + 1}
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
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
          <Card className="p-4 bg-card border-border hover:border-accent transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">
                  {modules.filter((m) => m.status === "completed").length}
                </p>
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
                <p className="text-xl font-bold text-foreground">
                  {modules.filter((m) => m.status === "in-progress").length}
                </p>
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
        <p className="text-sm text-muted-foreground">
          Complete all modules to earn your entrepreneur certification
        </p>
      </div>

      {/* Module Cards */}
      <div className="space-y-5">
        {modules.map((module, idx) => {
          const isExpanded = module.id === expandedModule;
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
                    <Link href={`/curriculum/modules/${module.id}`}>
                      <Button size="sm" variant="outline" className="border-green-500 text-green-500 hover:bg-green-500/10">
                        <BookOpen className="w-4 h-4 mr-2" />
                        Review
                      </Button>
                    </Link>
                  ) : (
                    <Link href={`/curriculum/modules/${module.id}`}>
                      <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                        <Play className="w-4 h-4 mr-2" />
                        {module.progress > 0 ? "Continue" : "Start"}
                      </Button>
                    </Link>
                  )}
                </div>
              </div>

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
