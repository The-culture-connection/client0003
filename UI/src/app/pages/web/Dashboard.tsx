import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import { useAuth } from "../../lib/auth-context";
import {
  BookOpen,
  Calendar,
  Award,
  CheckCircle2,
  Clock,
  PlayCircle,
  Lock,
  Users,
  FileText,
  Trophy,
  Zap,
  MessageSquare,
  Target,
} from "lucide-react";

export function WebDashboard() {
  const { user } = useAuth();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Welcome Header - Compact */}
      <div className="mb-5">
        <h1 className="text-2xl text-foreground mb-1">
          Welcome back, <span className="text-accent">{user?.name.split(' ')[0] || 'there'}</span>
        </h1>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>Cohort: {user?.cohort}</span>
          <span>•</span>
          <span>City: {user?.city}</span>
          <span>•</span>
          <span className="text-accent">You completed 2 lessons this week 🔥</span>
        </div>
      </div>

      {/* Hero Action Panel - Compact */}
      <Card className="p-5 mb-5 bg-gradient-to-br from-accent/20 via-card to-card border-accent/30 shadow-lg hover:shadow-xl transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Badge className="mb-2 bg-accent text-accent-foreground text-xs">
              NEXT STEP
            </Badge>
            <h2 className="text-xl font-bold text-foreground mb-1">
              Finish Chapter 4 Quiz
            </h2>
            <p className="text-sm text-muted-foreground mb-1">
              Module 3 — Pricing Strategy
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
              <Clock className="w-3 h-3" />
              <span>Estimated time: 12 minutes</span>
            </div>
            <div className="flex items-center gap-3">
              <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <PlayCircle className="w-4 h-4 mr-2" />
                Continue Learning
              </Button>
              <Button variant="outline" size="sm" className="border-border">
                View Module
              </Button>
            </div>
          </div>
          <div className="relative w-20 h-20">
            {/* Progress Ring */}
            <svg className="w-20 h-20 transform -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="34"
                stroke="currentColor"
                strokeWidth="5"
                fill="none"
                className="text-muted"
              />
              <circle
                cx="40"
                cy="40"
                r="34"
                stroke="currentColor"
                strokeWidth="5"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 34}`}
                strokeDashoffset={`${2 * Math.PI * 34 * (1 - 0.75)}`}
                className="text-accent"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-base font-bold text-foreground">75%</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column - Learning Journey & Data Room */}
        <div className="lg:col-span-8 space-y-5">
          {/* Learning Journey - Module Path */}
          <Card className="p-5 bg-card border-border shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">
                Module Journey
              </h2>
              <Badge variant="outline" className="border-accent text-accent text-xs">
                3 of 4 Modules
              </Badge>
            </div>
            <div className="space-y-3">
              {[
                {
                  name: "Idea Validation",
                  status: "Completed",
                  progress: 100,
                  locked: false,
                  icon: CheckCircle2,
                },
                {
                  name: "Customer Discovery",
                  status: "Completed",
                  progress: 100,
                  locked: false,
                  icon: CheckCircle2,
                },
                {
                  name: "Financial Modeling",
                  status: "In Progress",
                  progress: 75,
                  locked: false,
                  icon: PlayCircle,
                },
                {
                  name: "Pitch & Launch",
                  status: "Locked",
                  progress: 0,
                  locked: true,
                  icon: Lock,
                },
              ].map((module, idx) => {
                const Icon = module.icon;
                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border transition-all ${
                      module.locked
                        ? "bg-muted/30 border-border/50"
                        : "bg-card border-border hover:border-accent hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          module.locked
                            ? "bg-muted"
                            : module.progress === 100
                            ? "bg-green-500/10"
                            : "bg-accent/10"
                        }`}
                      >
                        <Icon
                          className={`w-5 h-5 ${
                            module.locked
                              ? "text-muted-foreground"
                              : module.progress === 100
                              ? "text-green-500"
                              : "text-accent"
                          }`}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3
                            className={`text-sm font-medium ${
                              module.locked
                                ? "text-muted-foreground"
                                : "text-foreground"
                            }`}
                          >
                            Module {idx + 1} — {module.name}
                          </h3>
                          <Badge
                            variant={
                              module.progress === 100 ? "default" : "secondary"
                            }
                            className={`text-xs ${
                              module.locked
                                ? "bg-muted text-muted-foreground"
                                : module.progress === 100
                                ? "bg-green-500/10 text-green-500"
                                : "bg-accent/10 text-accent"
                            }`}
                          >
                            {module.status}
                          </Badge>
                        </div>
                        {!module.locked && (
                          <Progress value={module.progress} className="h-1.5" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Data Room Asset Progress */}
          <Card className="p-5 bg-card border-border shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">
                Data Room Progress
              </h2>
              <FileText className="w-5 h-5 text-accent" />
            </div>
            <div className="space-y-2.5 mb-4">
              {[
                { name: "Business Model Canvas", completed: true },
                { name: "Customer Interview Guide", completed: true },
                { name: "Financial Projections", completed: false },
                { name: "Pitch Deck Draft", completed: false },
              ].map((asset, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  {asset.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <div className="w-4 h-4 border-2 border-muted rounded" />
                  )}
                  <span
                    className={`text-sm ${
                      asset.completed
                        ? "text-muted-foreground line-through"
                        : "text-foreground"
                    }`}
                  >
                    {asset.name}
                  </span>
                </div>
              ))}
            </div>
            <Progress value={50} className="h-2 mb-2" />
            <p className="text-xs text-muted-foreground">
              Complete remaining assets to unlock Module Graduation
            </p>
          </Card>

          {/* Community Activity */}
          <Card className="p-5 bg-card border-border shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Community Activity</h2>
              <Users className="w-5 h-5 text-accent" />
            </div>
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-muted/50 border border-border hover:border-accent transition-colors cursor-pointer">
                <div className="flex items-start gap-2 mb-1">
                  <MessageSquare className="w-4 h-4 text-accent mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-foreground font-medium">
                      Funding Strategy Discussion
                    </p>
                    <p className="text-xs text-muted-foreground">3 new replies • Active now</p>
                  </div>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border hover:border-accent transition-colors cursor-pointer">
                <div className="flex items-start gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-accent mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-foreground font-medium">
                      Coffee Chat — Cincinnati Cohort
                    </p>
                    <p className="text-xs text-muted-foreground">Meeting proposal • 8 interested</p>
                  </div>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border hover:border-accent transition-colors cursor-pointer">
                <div className="flex items-start gap-2 mb-1">
                  <Zap className="w-4 h-4 text-accent mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-foreground font-medium">
                      Marketing Workshop Recap
                    </p>
                    <p className="text-xs text-muted-foreground">New post by Alex R • 2h ago</p>
                  </div>
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full mt-4 text-accent border-accent">
              View Community Hub
            </Button>
          </Card>
        </div>

        {/* Right Column - Achievements, Leaderboard, Events */}
        <div className="lg:col-span-4 space-y-5">
          {/* Achievements & Badges */}
          <Card className="p-5 bg-card border-border shadow-md">
            <h2 className="text-lg font-bold text-foreground mb-4">
              Your Achievements
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Award className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Idea Validator
                  </p>
                  <p className="text-xs text-muted-foreground">Earned</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Award className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Customer Explorer
                  </p>
                  <p className="text-xs text-muted-foreground">Earned</p>
                </div>
              </div>
              <div className="border-t border-border pt-3 mt-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  NEXT BADGE UNLOCK
                </p>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <Trophy className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Financial Strategist
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Complete Module 3
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Leaderboard */}
          <Card className="p-5 bg-card border-border shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">
                Cohort Leaderboard
              </h2>
              <Trophy className="w-5 h-5 text-accent" />
            </div>
            <div className="space-y-2">
              {[
                { name: "Alex R", points: 4120, isYou: false, rank: 1 },
                { name: "Grace S", points: 3980, isYou: true, rank: 2 },
                { name: "Marcus L", points: 3750, isYou: false, rank: 3 },
                { name: "Sarah K", points: 3620, isYou: false, rank: 4 },
                { name: "Jordan P", points: 3450, isYou: false, rank: 5 },
              ].map((user, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-2 rounded ${
                    user.isYou ? "bg-accent/10 border border-accent/30" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold w-6 ${
                      user.rank === 1 ? "text-yellow-500" :
                      user.rank === 2 ? "text-gray-400" :
                      user.rank === 3 ? "text-orange-600" :
                      "text-muted-foreground"
                    }`}>
                      #{user.rank}
                    </span>
                    <span
                      className={`text-sm ${
                        user.isYou ? "font-bold text-accent" : "text-foreground"
                      }`}
                    >
                      {user.name}
                      {user.isYou && " (You)"}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-foreground">
                    {user.points.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Points from modules, assets & community
            </p>
          </Card>

          {/* Upcoming Events */}
          <Card className="p-5 bg-card border-border shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">
                Upcoming Events
              </h2>
              <Calendar className="w-5 h-5 text-accent" />
            </div>
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-sm font-medium text-foreground mb-1">
                  Networking Workshop
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <span>Feb 28 — 2PM</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-accent border-accent hover:bg-accent/10"
                >
                  RSVP
                </Button>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-sm font-medium text-foreground mb-1">
                  Guest Speaker Series
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <span>Mar 10 — 6PM</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-accent border-accent hover:bg-accent/10"
                >
                  RSVP
                </Button>
              </div>
            </div>
          </Card>

          {/* Quick Stats */}
          <Card className="p-5 bg-card border-border shadow-md">
            <h2 className="text-lg font-bold text-foreground mb-4">
              Weekly Progress
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-accent" />
                  <span className="text-sm text-foreground">Lessons Completed</span>
                </div>
                <span className="text-sm font-bold text-accent">2</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-accent" />
                  <span className="text-sm text-foreground">Assets Created</span>
                </div>
                <span className="text-sm font-bold text-accent">1</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-accent" />
                  <span className="text-sm text-foreground">Forum Posts</span>
                </div>
                <span className="text-sm font-bold text-accent">5</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}