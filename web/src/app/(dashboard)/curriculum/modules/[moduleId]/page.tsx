"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  BookOpen,
  Lock,
  CheckCircle2,
  FileText,
  Clock,
  Play,
  ArrowRight,
} from "lucide-react";
import { getChapters } from "@/lib/curriculum";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { useAuth } from "@/components/auth/AuthProvider";

export default function ModuleDetailPage() {
  const params = useParams();
  const moduleId = params.moduleId as string;
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [module, setModule] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [userProgress, setUserProgress] = useState<any>({});
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (moduleId && user?.uid) {
      loadModuleData();
    }
  }, [moduleId, user]);

  const loadModuleData = async () => {
    if (!user?.uid || !moduleId) return;

    try {
      // Get module
      const moduleRef = doc(
        db,
        "curricula",
        "mortar_masters_online",
        "modules",
        moduleId
      );
      const moduleDoc = await getDoc(moduleRef);
      if (moduleDoc.exists()) {
        setModule({ id: moduleDoc.id, ...moduleDoc.data() });
      }

      // Get chapters
      const chaptersData = await getChapters(moduleId);
      setChapters(chaptersData);

      // Check user access
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();
      const paidModules = userData?.membership?.paid_modules || [];
      
      // First 5 chapters are free
      const freeChapters = chaptersData.filter((ch, idx) => idx < 5);
      const hasPaidAccess = paidModules.includes(moduleId);
      setHasAccess(hasPaidAccess || freeChapters.length > 0);

      // Load chapter progress
      const chapterResultsRef = collection(
        db,
        "user_progress",
        user.uid,
        "chapter_results"
      );
      const chapterResultsSnapshot = await getDocs(chapterResultsRef);
      const progress: any = {};
      
      chapterResultsSnapshot.forEach((doc) => {
        progress[doc.id] = doc.data();
      });

      setUserProgress(progress);
    } catch (error) {
      console.error("Error loading module:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading module...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Module not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link
          href="/curriculum"
          className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block"
        >
          ← Back to Curriculum
        </Link>
        <h1 className="text-3xl text-foreground mb-2">{module.title}</h1>
        {module.description && (
          <p className="text-muted-foreground">{module.description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {chapters.map((chapter, idx) => {
          const isFree = idx < 5;
          const isLocked = !isFree && !hasAccess;
          const chapterProgress = userProgress[chapter.id];
          const isComplete =
            chapterProgress?.lessons_completed >= chapterProgress?.total_lessons &&
            chapterProgress?.quiz_passed;

          return (
            <Card
              key={chapter.id}
              className={`p-6 bg-card border-border ${
                isLocked ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl text-foreground">
                      Chapter {idx + 1}: {chapter.title}
                    </h2>
                    {isFree && (
                      <Badge variant="secondary" className="bg-accent/10 text-accent">
                        Free
                      </Badge>
                    )}
                    {isLocked && (
                      <Badge variant="secondary" className="bg-muted">
                        <Lock className="w-3 h-3 mr-1" />
                        Locked
                      </Badge>
                    )}
                    {isComplete && (
                      <Badge className="bg-accent text-accent-foreground">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Completed
                      </Badge>
                    )}
                  </div>
                  {chapter.description && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {chapter.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      {chapterProgress?.total_lessons || 0} lessons
                    </span>
                    {chapter.quiz_id && (
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        Quiz required
                      </span>
                    )}
                  </div>
                </div>
                {!isLocked && (
                  <Link
                    href={`/curriculum/modules/${moduleId}/chapters/${chapter.id}`}
                  >
                    <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                      {isComplete ? (
                        <>
                          <BookOpen className="w-4 h-4 mr-2" />
                          Review
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          {chapterProgress ? "Continue" : "Start"}
                        </>
                      )}
                    </Button>
                  </Link>
                )}
              </div>

              {!isLocked && chapterProgress && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">
                      Progress
                    </span>
                    <span className="text-sm text-foreground">
                      {chapterProgress.lessons_completed || 0}/
                      {chapterProgress.total_lessons || 0} lessons
                    </span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent"
                      style={{
                        width: `${
                          chapterProgress.total_lessons > 0
                            ? (chapterProgress.lessons_completed /
                                chapterProgress.total_lessons) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  {chapter.quiz_id && (
                    <div className="mt-2 text-sm">
                      {chapterProgress.quiz_passed ? (
                        <span className="text-accent flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          Quiz passed
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          Quiz: {chapterProgress.quiz_attempts || 0} attempts
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {isLocked && (
                <div className="mt-4 p-4 bg-muted/20 border border-border rounded-lg">
                  <p className="text-sm text-foreground mb-2">
                    This chapter requires module purchase.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-accent text-accent"
                  >
                    Purchase Module
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
