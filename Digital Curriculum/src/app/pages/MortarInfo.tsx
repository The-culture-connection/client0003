import { useNavigate } from "react-router";
import { useScreenAnalytics } from "../analytics/useScreenAnalytics";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";

export function MortarInfoPage() {
  useScreenAnalytics("mortar_info");
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">MORTAR MASTERS Online</h1>
          <p className="text-muted-foreground text-lg max-w-3xl">
            Welcome. Here’s what to expect, how the program is structured, and the fastest path to progress once
            you&apos;ve completed your profile.
          </p>

          <div className="flex flex-wrap gap-3 mt-6">
            <Button
              onClick={() => navigate("/curriculum")}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              Start the Digital Curriculum
            </Button>
            <Button onClick={() => navigate("/dashboard")} variant="outline">
              Go to Dashboard
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                window.open(
                  "https://mortarmastersonline.thinkific.com/courses/mortar-masters-online",
                  "_blank",
                  "noopener,noreferrer"
                )
              }
            >
              View full course page
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <Card className="p-6">
          <h2 className="text-2xl font-semibold text-foreground mb-3">Program overview</h2>
          <div className="space-y-3 text-muted-foreground">
            <p>
              MORTAR MASTERS Online is organized into modules, chapters, and lessons. You can preview free content,
              then unlock paid content based on your access.
            </p>
            <p>
              Your dashboard will always point you to the next best step—continue a lesson, complete a quiz, or
              finish any required items tied to your progress.
            </p>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-xl font-semibold text-foreground mb-3">What you’ll do</h3>
            <ul className="space-y-2 text-muted-foreground list-disc pl-5">
              <li>Work through lessons in each module in order.</li>
              <li>Complete quizzes when required to unlock progress.</li>
              <li>Track what’s done and what’s next from your dashboard.</li>
            </ul>
          </Card>

          <Card className="p-6">
            <h3 className="text-xl font-semibold text-foreground mb-3">How to move fast</h3>
            <ul className="space-y-2 text-muted-foreground list-disc pl-5">
              <li>Start with the first module and finish the free preview chapters.</li>
              <li>Use “Continue” buttons to resume exactly where you left off.</li>
              <li>If you hit a lock, return to the curriculum page to see what’s available.</li>
            </ul>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="text-2xl font-semibold text-foreground mb-3">Ready?</h2>
          <p className="text-muted-foreground mb-5">
            Jump into the curriculum now, or head to your dashboard to see your personalized next step.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => navigate("/curriculum")}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              Go to Curriculum
            </Button>
            <Button onClick={() => navigate("/dashboard")} variant="outline">
              Go to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

