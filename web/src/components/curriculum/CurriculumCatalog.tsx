"use client";

import {useState, useEffect} from "react";
import {Card} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {Lock, CheckCircle2, Play, BookOpen} from "lucide-react";
import {getModules, getChapters, hasModuleAccess, type Module, type Chapter} from "@/lib/curriculum";
import {getModuleResult, getChapterResult} from "@/lib/progress";
import {useAuth} from "@/components/auth/AuthProvider";
import Link from "next/link";

export function CurriculumCatalog() {
  const {user} = useAuth();
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadModules() {
      try {
        const modulesData = await getModules();
        setModules(modulesData);
      } catch (error) {
        console.error("Error loading modules:", error);
      } finally {
        setLoading(false);
      }
    }
    loadModules();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading curriculum...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl text-foreground mb-2">MORTAR MASTERS Online</h1>
        <p className="text-muted-foreground">
          Complete all 4 modules and required assets to graduate
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {modules.map((module) => (
          <ModuleCard key={module.id} module={module} userId={user?.uid || ""} />
        ))}
      </div>
    </div>
  );
}

function ModuleCard({module, userId}: {module: Module; userId: string}) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [moduleResult, setModuleResult] = useState<any>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [chaptersData, moduleResultData, access] = await Promise.all([
          getChapters(module.id),
          getModuleResult(userId, module.id),
          hasModuleAccess(userId, module.id),
        ]);
        setChapters(chaptersData);
        setModuleResult(moduleResultData);
        setHasAccess(access);
      } catch (error) {
        console.error("Error loading module data:", error);
      } finally {
        setLoading(false);
      }
    }
    if (userId) {
      loadData();
    }
  }, [module.id, userId]);

  const freeChapterCount = 5; // First 5 chapters per module are free
  const freeChapters = chapters.filter((ch) => ch.is_free).slice(0, freeChapterCount);
  const paidChapters = chapters.filter((ch) => !ch.is_free || chapters.indexOf(ch) >= freeChapterCount);

  return (
    <Card className="p-6 bg-card border-border">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl text-foreground">{module.title}</h2>
            {moduleResult?.completed && (
              <Badge className="bg-accent text-accent-foreground">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Completed
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mb-4">{module.description}</p>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
            <span>{chapters.length} chapters</span>
            <span>{freeChapters.length} free preview</span>
            {moduleResult && (
              <span>
                {moduleResult.chapters_completed}/{moduleResult.total_chapters} completed
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {freeChapters.map((chapter) => (
          <ChapterItem
            key={chapter.id}
            chapter={chapter}
            moduleId={module.id}
            userId={userId}
            isFree={true}
          />
        ))}
        
        {paidChapters.length > 0 && (
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg text-foreground">Paid Content</h3>
              {!hasAccess && (
                <Badge variant="secondary" className="bg-muted">
                  <Lock className="w-3 h-3 mr-1" />
                  Module Purchase Required
                </Badge>
              )}
            </div>
            {paidChapters.map((chapter) => (
              <ChapterItem
                key={chapter.id}
                chapter={chapter}
                moduleId={module.id}
                userId={userId}
                isFree={false}
                hasAccess={hasAccess}
              />
            ))}
            {!hasAccess && (
              <Button className="mt-4 bg-accent hover:bg-accent/90 text-accent-foreground">
                Purchase Module
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function ChapterItem({
  chapter,
  moduleId,
  userId,
  isFree,
  hasAccess = true,
}: {
  chapter: Chapter;
  moduleId: string;
  userId: string;
  isFree: boolean;
  hasAccess?: boolean;
}) {
  const [chapterResult, setChapterResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadResult() {
      try {
        const result = await getChapterResult(userId, chapter.id);
        setChapterResult(result);
      } catch (error) {
        console.error("Error loading chapter result:", error);
      } finally {
        setLoading(false);
      }
    }
    if (userId) {
      loadResult();
    }
  }, [chapter.id, userId]);

  const canAccess = isFree || hasAccess;
  const isCompleted = chapterResult?.completed;
  const quizPassed = chapterResult?.quiz_passed;
  // Assets tracking removed - not in curriculum Chapter type
  const assetsComplete = false;

  return (
    <div
      className={`p-4 border rounded-lg ${
        !canAccess ? "opacity-60" : ""
      } ${isCompleted ? "border-accent bg-accent/5" : "border-border"}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-foreground font-medium">{chapter.title}</h3>
            {isFree && (
              <Badge variant="secondary" className="bg-accent/10 text-accent text-xs">
                Free
              </Badge>
            )}
            {isCompleted && (
              <Badge className="bg-accent text-accent-foreground text-xs">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Complete
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-2">{chapter.description}</p>
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {chapter.quiz_id && (
              <span className={quizPassed ? "text-accent" : ""}>
                {quizPassed ? "✓ Quiz Passed" : "Quiz Required"}
              </span>
            )}
            {/* Assets tracking removed - not in curriculum Chapter type */}
          </div>
        </div>
        
        <div className="ml-4">
          {!canAccess ? (
            <Button disabled variant="outline" size="sm">
              <Lock className="w-4 h-4 mr-2" />
              Locked
            </Button>
          ) : (
            <Link href={`/curriculum/${moduleId}/${chapter.id}`}>
              <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                {isCompleted ? (
                  <>
                    <BookOpen className="w-4 h-4 mr-2" />
                    Review
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start
                  </>
                )}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
