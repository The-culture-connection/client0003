"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Award, Download, Share2, CheckCircle2, Lock } from "lucide-react";

export function CertificatesPage() {
  const certificates = [
    {
      id: 1,
      title: "Business Fundamentals",
      earnedDate: "Jan 20, 2026",
      status: "earned",
      score: 92,
    },
    {
      id: 2,
      title: "Marketing Strategy",
      earnedDate: "Feb 5, 2026",
      status: "earned",
      score: 88,
    },
    {
      id: 3,
      title: "Financial Planning",
      earnedDate: null,
      status: "in-progress",
      score: null,
    },
  ];

  const badges = [
    {
      id: 1,
      name: "Early Adopter",
      description: "Joined in the first month",
      earned: true,
      icon: "🏆",
    },
    {
      id: 2,
      name: "Quiz Master",
      description: "Scored 90% or higher on 5 quizzes",
      earned: true,
      icon: "🎯",
    },
    {
      id: 3,
      name: "Community Leader",
      description: "Helped 10 fellow students",
      earned: false,
      icon: "👥",
    },
    {
      id: 4,
      name: "Perfect Score",
      description: "Achieved 100% on any quiz",
      earned: false,
      icon: "⭐",
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl text-foreground mb-2">
          Certificates & Badges
        </h1>
        <p className="text-muted-foreground">
          Track your achievements and share your success
        </p>
      </div>

      <div className="mb-8">
        <h2 className="text-xl text-foreground mb-4">Your Certificates</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {certificates.map((cert) => (
            <Card
              key={cert.id}
              className={`p-6 bg-card border-border ${
                cert.status !== "earned" ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-start gap-4 mb-4">
                <div
                  className={`p-3 rounded-lg ${
                    cert.status === "earned"
                      ? "bg-accent/10"
                      : "bg-muted"
                  }`}
                >
                  {cert.status === "earned" ? (
                    <Award className="w-8 h-8 text-accent" />
                  ) : (
                    <Lock className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg text-foreground font-medium mb-1">
                    {cert.title}
                  </h3>
                  {cert.status === "earned" ? (
                    <>
                      <p className="text-sm text-muted-foreground mb-2">
                        Earned on {cert.earnedDate}
                      </p>
                      <Badge className="bg-accent text-accent-foreground">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Certified - Score: {cert.score}%
                      </Badge>
                    </>
                  ) : (
                    <Badge variant="secondary" className="bg-muted">
                      {cert.status === "in-progress"
                        ? "In Progress"
                        : "Not Started"}
                    </Badge>
                  )}
                </div>
              </div>

              {cert.status === "earned" && (
                <div className="flex gap-3 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-border text-foreground"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-border text-foreground"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xl text-foreground mb-4">Achievement Badges</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {badges.map((badge) => (
            <Card
              key={badge.id}
              className={`p-6 bg-card border-border text-center ${
                !badge.earned ? "opacity-60" : ""
              }`}
            >
              <div className="text-5xl mb-3">{badge.icon}</div>
              <h3 className="text-lg text-foreground font-medium mb-2">
                {badge.name}
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                {badge.description}
              </p>
              {badge.earned ? (
                <Badge className="bg-accent text-accent-foreground">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Earned
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-muted">
                  <Lock className="w-3 h-3 mr-1" />
                  Locked
                </Badge>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
