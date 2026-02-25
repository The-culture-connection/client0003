import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Award, Download, Share2, Linkedin } from "lucide-react";

export function WebCertificates() {
  const mockCertificates = [
    {
      id: 1,
      title: "Foundations Completion",
      description: "Successfully completed all Foundation modules",
      date: "January 28, 2026",
      issued: true,
    },
    {
      id: 2,
      title: "Advanced Concepts Mastery",
      description: "Demonstrated mastery in advanced programming concepts",
      date: "In Progress",
      issued: false,
    },
    {
      id: 3,
      title: "System Design Expert",
      description: "Complete system design curriculum",
      date: "Not Started",
      issued: false,
    },
  ];

  const mockBadges = [
    {
      id: 1,
      name: "Quick Learner",
      description: "Complete 5 modules in 30 days",
      earned: true,
      earnedDate: "Jan 20, 2026",
    },
    {
      id: 2,
      name: "Quiz Master",
      description: "Score 90% or higher on 10 quizzes",
      earned: true,
      earnedDate: "Feb 5, 2026",
    },
    {
      id: 3,
      name: "Consistent Student",
      description: "Study for 30 consecutive days",
      earned: true,
      earnedDate: "Feb 10, 2026",
    },
    {
      id: 4,
      name: "Community Leader",
      description: "Help 50 fellow students",
      earned: false,
      progress: 32,
    },
    {
      id: 5,
      name: "Event Participant",
      description: "Attend 10 live events",
      earned: false,
      progress: 6,
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl text-foreground mb-2">Certificates & Badges</h1>
        <p className="text-muted-foreground">
          Track your achievements and share your credentials
        </p>
      </div>

      {/* Certificates Section */}
      <div className="mb-12">
        <h2 className="text-2xl text-foreground mb-6">Certificates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockCertificates.map((cert) => (
            <Card
              key={cert.id}
              className={`p-6 border-2 ${
                cert.issued
                  ? "bg-card border-accent"
                  : "bg-muted/20 border-border"
              }`}
            >
              <div className="mb-4">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                    cert.issued ? "bg-accent/20" : "bg-muted"
                  }`}
                >
                  <Award
                    className={`w-8 h-8 ${
                      cert.issued ? "text-accent" : "text-muted-foreground"
                    }`}
                  />
                </div>
                <Badge
                  className={
                    cert.issued
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted text-muted-foreground"
                  }
                >
                  {cert.issued ? "Earned" : "Locked"}
                </Badge>
              </div>

              <h3 className="text-foreground mb-2">{cert.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {cert.description}
              </p>
              <p className="text-xs text-muted-foreground mb-4">{cert.date}</p>

              {cert.issued && (
                <div className="space-y-2">
                  <Button
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                    size="sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-border"
                    size="sm"
                  >
                    <Linkedin className="w-4 h-4 mr-2" />
                    Add to LinkedIn
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Badges Section */}
      <div>
        <h2 className="text-2xl text-foreground mb-6">Achievement Badges</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockBadges.map((badge) => (
            <Card
              key={badge.id}
              className={`p-6 ${
                badge.earned
                  ? "bg-card border-accent border-2"
                  : "bg-muted/20 border-border"
              }`}
            >
              <div className="flex items-start gap-4 mb-4">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                    badge.earned ? "bg-accent/20" : "bg-muted"
                  }`}
                >
                  <Award
                    className={`w-6 h-6 ${
                      badge.earned ? "text-accent" : "text-muted-foreground"
                    }`}
                  />
                </div>
                <div className="flex-1">
                  <h4 className="text-foreground mb-1">{badge.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {badge.description}
                  </p>
                </div>
              </div>

              {badge.earned ? (
                <div className="bg-accent/10 p-3 rounded-lg border border-accent">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-accent text-accent-foreground">
                      Earned
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {badge.earnedDate}
                  </p>
                </div>
              ) : (
                <div className="bg-muted/20 p-3 rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">
                      Progress
                    </span>
                    <span className="text-sm text-foreground">
                      {badge.progress}/
                      {badge.id === 4 ? "50" : badge.id === 5 ? "10" : "0"}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-accent h-2 rounded-full transition-all"
                      style={{
                        width: `${
                          badge.id === 4
                            ? (badge.progress! / 50) * 100
                            : badge.id === 5
                            ? (badge.progress! / 10) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* LinkedIn Export Info */}
      <Card className="mt-8 p-6 bg-accent/10 border-accent">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-accent rounded-lg">
            <Share2 className="w-6 h-6 text-accent-foreground" />
          </div>
          <div>
            <h3 className="text-foreground mb-2">
              Share Your Achievements
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              All certificates and badges can be exported to LinkedIn to
              showcase your professional development. Click the LinkedIn button
              on any earned credential to automatically add it to your profile.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
