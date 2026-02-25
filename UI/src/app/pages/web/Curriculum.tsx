import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import { ChevronRight, CheckCircle2, Circle, Lock } from "lucide-react";
import { Button } from "../../components/ui/button";

export function WebCurriculum() {
  const mockModules = [
    {
      id: 1,
      title: "Foundations",
      progress: 100,
      status: "completed",
      chapters: [
        {
          id: 1,
          title: "Introduction to Programming",
          lessons: 5,
          completed: 5,
          status: "completed",
        },
        {
          id: 2,
          title: "Data Types and Variables",
          lessons: 4,
          completed: 4,
          status: "completed",
        },
      ],
    },
    {
      id: 2,
      title: "Advanced Concepts",
      progress: 60,
      status: "in-progress",
      chapters: [
        {
          id: 3,
          title: "Object-Oriented Programming",
          lessons: 6,
          completed: 6,
          status: "completed",
        },
        {
          id: 4,
          title: "Functional Programming",
          lessons: 5,
          completed: 3,
          status: "in-progress",
        },
        {
          id: 5,
          title: "Design Patterns",
          lessons: 7,
          completed: 0,
          status: "locked",
        },
      ],
    },
    {
      id: 3,
      title: "System Design",
      progress: 0,
      status: "locked",
      chapters: [
        {
          id: 6,
          title: "Scalability Principles",
          lessons: 6,
          completed: 0,
          status: "locked",
        },
        {
          id: 7,
          title: "Database Design",
          lessons: 8,
          completed: 0,
          status: "locked",
        },
      ],
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-accent" />;
      case "in-progress":
        return <Circle className="w-5 h-5 text-accent" />;
      case "locked":
        return <Lock className="w-5 h-5 text-muted-foreground" />;
      default:
        return <Circle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl text-foreground mb-2">Curriculum</h1>
        <p className="text-muted-foreground">Structured learning path for professional development</p>
      </div>

      <div className="space-y-6">
        {mockModules.map((module) => (
          <Card key={module.id} className="p-6 bg-card border-border">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {getStatusIcon(module.status)}
                <div>
                  <h2 className="text-xl text-foreground">{module.title}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {module.chapters.length} chapters • {module.progress}% complete
                  </p>
                </div>
              </div>
              <Badge
                className={
                  module.status === "completed"
                    ? "bg-accent text-accent-foreground"
                    : module.status === "in-progress"
                    ? "bg-accent/20 text-accent border border-accent"
                    : "bg-muted text-muted-foreground"
                }
              >
                {module.status === "completed"
                  ? "Completed"
                  : module.status === "in-progress"
                  ? "In Progress"
                  : "Locked"}
              </Badge>
            </div>

            <Progress value={module.progress} className="h-2 mb-6" />

            <div className="space-y-3">
              {module.chapters.map((chapter) => (
                <div
                  key={chapter.id}
                  className={`border border-border rounded-lg p-4 transition-all ${
                    chapter.status === "locked"
                      ? "opacity-50"
                      : "hover:border-accent cursor-pointer"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      {getStatusIcon(chapter.status)}
                      <div>
                        <h4 className="text-foreground">{chapter.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {chapter.completed}/{chapter.lessons} lessons completed
                        </p>
                      </div>
                    </div>
                    {chapter.status !== "locked" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-accent hover:bg-accent/10"
                      >
                        {chapter.status === "completed" ? "Review" : "Continue"}
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    )}
                  </div>
                  <Progress
                    value={(chapter.completed / chapter.lessons) * 100}
                    className="h-1 mt-3"
                  />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-8 p-6 bg-accent/10 border-accent">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-foreground mb-1">Complete all modules to unlock the mobile app</h3>
            <p className="text-sm text-muted-foreground">
              Get access to our alumni networking platform and exclusive opportunities
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl text-accent mb-1">67%</p>
            <p className="text-sm text-muted-foreground">Overall Progress</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
