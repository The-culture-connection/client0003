"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  BookOpen,
  Lock,
  CheckCircle2,
  Play,
  ArrowRight,
} from "lucide-react";
import { getModules } from "@/lib/curriculum";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useAuth } from "@/components/auth/AuthProvider";

export default function CurriculumPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<any[]>([]);
  const [moduleProgress, setModuleProgress] = useState<Record<string, any>>({});

  useEffect(() => {
    if (user?.uid) {
      loadCurriculum();
    }
  }, [user]);

  const loadCurriculum = async () => {
    if (!user?.uid) return;

    try {
      const modulesData = await getModules();
      setModules(modulesData);

      // Load module progress
      const moduleResultsRef = collection(
        db,
        "user_progress",
        user.uid,
        "module_results"
      );
      const moduleResultsSnapshot = await getDocs(moduleResultsRef);
      const progress: Record<string, any> = {};

      moduleResultsSnapshot.forEach((doc) => {
        progress[doc.id] = doc.data();
      });

      setModuleProgress(progress);
    } catch (error) {
      console.error("Error loading curriculum:", error);
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
            <p className="text-muted-foreground">Loading curriculum...</p>
          </div>
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
        {modules.map((module) => {
          const progress = moduleProgress[module.id];
          const isComplete = progress?.completed === true;
          const assetsComplete = progress?.assets_finalized === true;

          return (
            <Card
              key={module.id}
              className={`p-6 bg-card border-border ${
                isComplete ? "border-accent" : ""
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl text-foreground">
                      Module {module.order_index}: {module.title}
                    </h2>
                    {isComplete && (
                      <Badge className="bg-accent text-accent-foreground">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Completed
                      </Badge>
                    )}
                  </div>
                  {module.description && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {module.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>First 5 chapters free</span>
                    {!assetsComplete && progress && (
                      <span className="text-accent">Assets required</span>
                    )}
                  </div>
                </div>
                <Link href={`/curriculum/modules/${module.id}`}>
                  <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                    {isComplete ? (
                      <>
                        <BookOpen className="w-4 h-4 mr-2" />
                        Review
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        {progress ? "Continue" : "Start"}
                      </>
                    )}
                  </Button>
                </Link>
              </div>

              {progress && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">
                      Module Progress
                    </span>
                    <span className="text-sm text-foreground">
                      {progress.chapters_completed ? "Chapters complete" : "In progress"}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent"
                      style={{
                        width: isComplete ? "100%" : "50%",
                      }}
                    />
                  </div>
                  {!assetsComplete && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      ⚠️ Required assets must be finalized to complete this module
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
