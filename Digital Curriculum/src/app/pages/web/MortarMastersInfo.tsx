import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useScreenAnalytics } from "../../analytics/useScreenAnalytics";
import { useNavigate } from "react-router";
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  Users,
  Video,
} from "lucide-react";

const THINKIFIC_COURSE_URL =
  "https://mortarmastersonline.thinkific.com/courses/mortar-masters-online";

export function MortarMastersInfoPage() {
  useScreenAnalytics("mortar_masters_info");
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <Badge className="mb-2 bg-accent text-accent-foreground">MORTAR MASTERS</Badge>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Mortar Masters Online
        </h1>
        <p className="text-muted-foreground max-w-3xl">
          Learn the core playbook for launching and growing a business with a structured,
          guided curriculum. This page is your quick overview—then you can enroll and
          start the course.
        </p>

        <div className="flex flex-wrap gap-3 mt-5">
          <Button
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
            onClick={() => window.open(THINKIFIC_COURSE_URL, "_blank", "noopener,noreferrer")}
          >
            Enroll / View on Thinkific
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button variant="outline" onClick={() => navigate("/curriculum")}>
            Browse Curriculum
          </Button>
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            Go to Dashboard
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 space-y-5">
          <Card className="p-6 bg-gradient-to-br from-accent/15 via-card to-card border-accent/30 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-xl font-bold text-foreground mb-2">What you’ll get</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/40 border border-border">
                    <div className="flex items-center gap-2 mb-1">
                      <Video className="w-4 h-4 text-accent" />
                      <p className="text-sm font-semibold text-foreground">Video lessons</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Clear, step-by-step lessons designed to move you from idea to execution.
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-muted/40 border border-border">
                    <div className="flex items-center gap-2 mb-1">
                      <BookOpen className="w-4 h-4 text-accent" />
                      <p className="text-sm font-semibold text-foreground">Practical frameworks</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Tools you can reuse: positioning, customer discovery, pricing, and go-to-market.
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-muted/40 border border-border">
                    <div className="flex items-center gap-2 mb-1">
                      <Award className="w-4 h-4 text-accent" />
                      <p className="text-sm font-semibold text-foreground">Progress & badges</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Stay motivated as you complete lessons, unlock milestones, and track progress.
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-muted/40 border border-border">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-4 h-4 text-accent" />
                      <p className="text-sm font-semibold text-foreground">Community support</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Join discussions, groups, and events with other builders in the ecosystem.
                    </p>
                  </div>
                </div>
              </div>

              <div className="hidden md:block">
                <div className="p-4 rounded-xl bg-card border border-border shadow-sm">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Clock className="w-4 h-4" />
                    <span>Self-paced</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <GraduationCap className="w-4 h-4" />
                    <span>Built for founders</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-border">
            <h2 className="text-xl font-bold text-foreground mb-2">You’ll learn how to</h2>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {[
                "Clarify your offer and target customer",
                "Validate demand and refine your pricing",
                "Build a simple, repeatable marketing engine",
                "Create a plan you can execute week-by-week",
                "Use the Data Room to organize key business assets",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-accent mt-0.5" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                variant="outline"
                className="border-accent text-accent hover:bg-accent/10"
                onClick={() => window.open(THINKIFIC_COURSE_URL, "_blank", "noopener,noreferrer")}
              >
                See full outline on Thinkific
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="outline" onClick={() => navigate("/community")}>
                Visit Community Hub
              </Button>
            </div>
          </Card>

          <Card className="p-6 border-border">
            <h2 className="text-xl font-bold text-foreground mb-2">Next steps</h2>
            <p className="text-sm text-muted-foreground mb-4">
              If you’re ready, enroll on Thinkific. If you want to explore first, head to Curriculum
              to see what you already have access to inside Mortar.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
                onClick={() => window.open(THINKIFIC_COURSE_URL, "_blank", "noopener,noreferrer")}
              >
                Enroll now
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="outline" onClick={() => navigate("/curriculum")}>
                Go to Curriculum
              </Button>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-5">
          <Card className="p-6 border-border shadow-md">
            <h3 className="text-lg font-bold text-foreground mb-3">Quick links</h3>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={() => window.open(THINKIFIC_COURSE_URL, "_blank", "noopener,noreferrer")}
              >
                Thinkific course page
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate("/curriculum")}>
                Curriculum
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate("/data-room")}>
                Data Room
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate("/shop")}>
                Shop
              </Button>
            </div>
          </Card>

          <Card className="p-6 border-border">
            <h3 className="text-lg font-bold text-foreground mb-2">Note</h3>
            <p className="text-sm text-muted-foreground">
              This page is an overview meant to mirror the structure of the Mortar Masters Online
              landing page. The source of truth for pricing, enrollment, and the full syllabus is
              the Thinkific course page.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

