"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Play,
  CheckCircle2,
  Lock,
  Clock,
  FileText,
} from "lucide-react";

export function CurriculumPage() {
  const modules = [
    {
      id: 1,
      title: "Module 1: Foundation",
      status: "completed",
      lessons: 8,
      duration: "2 hours",
      progress: 100,
      locked: false,
    },
    {
      id: 2,
      title: "Module 2: Business Planning",
      status: "in-progress",
      lessons: 10,
      duration: "3 hours",
      progress: 60,
      locked: false,
    },
    {
      id: 3,
      title: "Module 3: Marketing",
      status: "not-started",
      lessons: 12,
      duration: "4 hours",
      progress: 0,
      locked: false,
    },
    {
      id: 4,
      title: "Module 4: Finance",
      status: "locked",
      lessons: 15,
      duration: "5 hours",
      progress: 0,
      locked: true,
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl text-foreground mb-2">Curriculum</h1>
        <p className="text-muted-foreground">
          Complete your learning path to unlock certificates
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {modules.map((module) => (
          <Card
            key={module.id}
            className={`p-6 bg-card border-border ${
              module.locked ? "opacity-60" : ""
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl text-foreground">{module.title}</h2>
                  {module.status === "completed" && (
                    <Badge className="bg-accent text-accent-foreground">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Completed
                    </Badge>
                  )}
                  {module.status === "in-progress" && (
                    <Badge
                      variant="secondary"
                      className="bg-accent/10 text-accent"
                    >
                      In Progress
                    </Badge>
                  )}
                  {module.locked && (
                    <Badge variant="secondary" className="bg-muted">
                      <Lock className="w-3 h-3 mr-1" />
                      Locked
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    {module.lessons} lessons
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {module.duration}
                  </span>
                </div>
              </div>
              {!module.locked && (
                <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  {module.status === "completed" ? (
                    <>
                      <BookOpen className="w-4 h-4 mr-2" />
                      Review
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      {module.status === "in-progress" ? "Continue" : "Start"}
                    </>
                  )}
                </Button>
              )}
            </div>

            {!module.locked && module.progress > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    Progress
                  </span>
                  <span className="text-sm text-foreground">
                    {module.progress}%
                  </span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent"
                    style={{ width: `${module.progress}%` }}
                  />
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
