"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Award,
  Download,
  Share2,
  CheckCircle2,
  Lock,
  Trophy,
  Target,
  Zap,
  Star,
  Crown,
  Flame,
  TrendingUp,
  Users,
} from "lucide-react";

export function WebCertificates() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">
          Achievements & Recognition
        </h1>
        <p className="text-sm text-muted-foreground">
          Track your progress, earn badges, and compete with your cohort
        </p>
      </div>

      {/* User Achievement Summary */}
      <Card className="p-6 mb-6 bg-gradient-to-br from-accent/20 via-card to-card border-accent/30 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-foreground mb-1">
              Grace Stewart
            </h2>
            <p className="text-sm text-muted-foreground">
              Fall 2026 Cohort • Cincinnati
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-5 h-5 text-accent" />
              <span className="text-2xl font-bold text-foreground">3,980</span>
            </div>
            <p className="text-xs text-muted-foreground">Total Points</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10">
              <Award className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">2/4</p>
              <p className="text-xs text-muted-foreground">Badges Earned</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10">
              <CheckCircle2 className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">2/4</p>
              <p className="text-xs text-muted-foreground">Modules Complete</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10">
              <Target className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">92%</p>
              <p className="text-xs text-muted-foreground">Avg. Score</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10">
              <TrendingUp className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">#2</p>
              <p className="text-xs text-muted-foreground">Cohort Rank</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Badges & Certificates */}
        <div className="lg:col-span-2 space-y-6">
          {/* Achievement Badges */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">
                Achievement Badges
              </h2>
              <Badge variant="outline" className="border-accent text-accent">
                2 of 4 Unlocked
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  name: "Idea Validator",
                  description: "Complete Module 1: Idea Validation",
                  earned: true,
                  icon: Star,
                  color: "yellow",
                  points: 500,
                  earnedDate: "Jan 20, 2026",
                },
                {
                  name: "Customer Explorer",
                  description: "Complete Module 2: Customer Discovery",
                  earned: true,
                  icon: Users,
                  color: "blue",
                  points: 600,
                  earnedDate: "Feb 5, 2026",
                },
                {
                  name: "Financial Strategist",
                  description: "Complete Module 3: Financial Modeling",
                  earned: false,
                  icon: TrendingUp,
                  color: "accent",
                  points: 700,
                  progress: 75,
                },
                {
                  name: "Launch Master",
                  description: "Complete Module 4: Pitch & Launch",
                  earned: false,
                  icon: Flame,
                  color: "muted",
                  points: 800,
                  progress: 0,
                },
              ].map((badge, idx) => {
                const Icon = badge.icon;
                return (
                  <Card
                    key={idx}
                    className={`p-5 bg-card border-border transition-all ${
                      badge.earned
                        ? "shadow-md hover:shadow-lg border-accent/30"
                        : "opacity-60"
                    }`}
                  >
                    <div className="flex items-start gap-4 mb-3">
                      <div
                        className={`p-3 rounded-lg ${
                          badge.earned
                            ? badge.color === "yellow"
                              ? "bg-yellow-500/10"
                              : badge.color === "blue"
                              ? "bg-blue-500/10"
                              : badge.color === "accent"
                              ? "bg-accent/10"
                              : "bg-muted"
                            : "bg-muted"
                        }`}
                      >
                        <Icon
                          className={`w-8 h-8 ${
                            badge.earned
                              ? badge.color === "yellow"
                                ? "text-yellow-500"
                                : badge.color === "blue"
                                ? "text-blue-500"
                                : badge.color === "accent"
                                ? "text-accent"
                                : "text-muted-foreground"
                              : "text-muted-foreground"
                          }`}
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-bold text-foreground mb-1">
                          {badge.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {badge.description}
                        </p>
                        {badge.earned ? (
                          <div className="flex items-center gap-2">
                            <Badge className="bg-green-500/10 text-green-500 text-xs">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Earned
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {badge.earnedDate}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <Badge variant="secondary" className="bg-muted text-xs mb-2">
                              <Lock className="w-3 h-3 mr-1" />
                              Locked
                            </Badge>
                            {badge.progress !== undefined && badge.progress > 0 && (
                              <div>
                                <Progress value={badge.progress} className="h-1.5" />
                                <p className="text-xs text-muted-foreground mt-1">
                                  {badge.progress}% complete
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <span className="text-xs text-muted-foreground">
                        {badge.points} points
                      </span>
                      {badge.earned && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-accent border-accent"
                        >
                          <Share2 className="w-3 h-3 mr-1" />
                          Share
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Certificates */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-4">
              Module Certificates
            </h2>
            <div className="space-y-3">
              {[
                {
                  title: "Idea Validation Certification",
                  module: "Module 1",
                  earned: true,
                  score: 92,
                  earnedDate: "Jan 20, 2026",
                },
                {
                  title: "Customer Discovery Certification",
                  module: "Module 2",
                  earned: true,
                  score: 88,
                  earnedDate: "Feb 5, 2026",
                },
                {
                  title: "Financial Modeling Certification",
                  module: "Module 3",
                  earned: false,
                  score: null,
                  earnedDate: null,
                },
                {
                  title: "Pitch & Launch Certification",
                  module: "Module 4",
                  earned: false,
                  score: null,
                  earnedDate: null,
                },
              ].map((cert, idx) => (
                <Card
                  key={idx}
                  className={`p-4 bg-card border-border ${
                    cert.earned ? "hover:border-accent transition-all" : "opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          cert.earned ? "bg-accent/10" : "bg-muted"
                        }`}
                      >
                        {cert.earned ? (
                          <Award className="w-6 h-6 text-accent" />
                        ) : (
                          <Lock className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground">
                          {cert.title}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {cert.module}
                          {cert.earned && ` • Earned ${cert.earnedDate}`}
                        </p>
                      </div>
                    </div>
                    {cert.earned ? (
                      <div className="flex items-center gap-2">
                        <Badge className="bg-accent/10 text-accent text-xs">
                          Score: {cert.score}%
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-border"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <Badge variant="secondary" className="bg-muted text-xs">
                        Not Earned
                      </Badge>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar - Leaderboard Extension */}
        <div className="space-y-6">
          {/* Cohort Leaderboard */}
          <Card className="p-5 bg-card border-border shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">
                Cohort Rankings
              </h3>
              <Trophy className="w-5 h-5 text-accent" />
            </div>
            <div className="space-y-2 mb-4">
              {[
                { name: "Alex R", points: 4120, badges: 3, rank: 1, isYou: false },
                { name: "Grace S", points: 3980, badges: 2, rank: 2, isYou: true },
                { name: "Marcus L", points: 3750, badges: 2, rank: 3, isYou: false },
                { name: "Sarah K", points: 3620, badges: 2, rank: 4, isYou: false },
                { name: "Jordan P", points: 3450, badges: 1, rank: 5, isYou: false },
                { name: "Taylor M", points: 3280, badges: 1, rank: 6, isYou: false },
                { name: "Casey D", points: 3100, badges: 1, rank: 7, isYou: false },
                { name: "Riley K", points: 2950, badges: 1, rank: 8, isYou: false },
              ].map((user, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-2 rounded transition-colors ${
                    user.isYou ? "bg-accent/10 border border-accent/30" : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold w-6 ${
                        user.rank === 1
                          ? "text-yellow-500"
                          : user.rank === 2
                          ? "text-gray-400"
                          : user.rank === 3
                          ? "text-orange-600"
                          : "text-muted-foreground"
                      }`}
                    >
                      {user.rank === 1 && <Crown className="w-4 h-4" />}
                      {user.rank !== 1 && `#${user.rank}`}
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
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Award className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {user.badges}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-foreground">
                      {user.points.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Points from modules, assets & community activity
            </p>
          </Card>

          {/* Points Breakdown */}
          <Card className="p-5 bg-card border-border shadow-md">
            <h3 className="text-lg font-bold text-foreground mb-4">
              Points Breakdown
            </h3>
            <div className="space-y-3">
              {[
                { source: "Module Completion", points: 1800, icon: CheckCircle2 },
                { source: "Asset Creation", points: 1200, icon: Target },
                { source: "Community Posts", points: 680, icon: Users },
                { source: "Quiz Performance", points: 300, icon: Star },
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded bg-muted/30"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-accent" />
                      <span className="text-sm text-foreground">{item.source}</span>
                    </div>
                    <span className="text-sm font-bold text-accent">
                      +{item.points}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-border mt-4 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">Total</span>
                <span className="text-lg font-bold text-accent">3,980</span>
              </div>
            </div>
          </Card>

          {/* Next Achievements */}
          <Card className="p-5 bg-card border-border shadow-md">
            <h3 className="text-lg font-bold text-foreground mb-4">
              Coming Soon
            </h3>
            <div className="space-y-3">
              {[
                { name: "Perfect Score", requirement: "Score 100% on any quiz", icon: Zap },
                { name: "Community Hero", requirement: "Help 10 cohort members", icon: Users },
                { name: "Speed Runner", requirement: "Complete module in 1 week", icon: Flame },
              ].map((achievement, idx) => {
                const Icon = achievement.icon;
                return (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-2 rounded bg-muted/30"
                  >
                    <Icon className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {achievement.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {achievement.requirement}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
