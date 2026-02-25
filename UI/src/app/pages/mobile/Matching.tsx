import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Avatar } from "../../components/ui/avatar";
import { MapPin, Briefcase, GraduationCap, Heart, X, MessageSquare, Sparkles } from "lucide-react";

export function MobileMatching() {
  const mockMatches = [
    {
      id: 1,
      name: "Emily Rodriguez",
      role: "Tech Lead",
      company: "Stripe",
      location: "San Francisco, CA",
      badge: "Alumni",
      matchScore: 94,
      matchReasons: [
        "Same cohort (2024)",
        "Similar career trajectory",
        "Both interested in fintech",
        "Located in Bay Area",
      ],
      sharedInterests: ["System Design", "Leadership", "Mentorship"],
    },
  ];

  const currentMatch = mockMatches[0];

  return (
    <div className="bg-background min-h-screen flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl text-foreground">Suggested Matches</h1>
          <Badge className="bg-accent text-accent-foreground">
            <Sparkles className="w-3 h-3 mr-1" />
            AI Powered
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Alumni we think you should connect with
        </p>
      </div>

      {/* Match Counter */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-center gap-2">
          <div className="h-2 w-2 rounded-full bg-accent" />
          <span className="text-sm text-muted-foreground">1 of 12 matches</span>
          <div className="h-2 w-2 rounded-full bg-muted" />
        </div>
      </div>

      {/* Match Card */}
      <div className="flex-1 p-4 flex flex-col">
        <Card className="flex-1 bg-card border-border overflow-hidden flex flex-col">
          {/* Profile Section */}
          <div className="p-6 flex-1 overflow-y-auto">
            <div className="text-center mb-6">
              <Avatar className="w-24 h-24 bg-accent mx-auto mb-4">
                <span className="text-accent-foreground text-2xl">
                  {currentMatch.name.split(" ").map(n => n[0]).join("")}
                </span>
              </Avatar>
              <Badge className="bg-accent text-accent-foreground mb-3">
                {currentMatch.badge}
              </Badge>
              <h2 className="text-xl text-foreground mb-1">{currentMatch.name}</h2>
            </div>

            {/* Basic Info */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-foreground">{currentMatch.role}</p>
                  <p className="text-sm text-muted-foreground">{currentMatch.company}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-foreground">{currentMatch.location}</p>
                </div>
              </div>
            </div>

            {/* Match Score */}
            <Card className="p-4 bg-accent/10 border-accent mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-foreground">Match Score</h3>
                <span className="text-2xl text-accent">{currentMatch.matchScore}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-accent h-2 rounded-full transition-all"
                  style={{ width: `${currentMatch.matchScore}%` }}
                />
              </div>
            </Card>

            {/* Why This Match */}
            <div className="mb-6">
              <h3 className="text-foreground mb-3">Why This Match?</h3>
              <div className="space-y-2">
                {currentMatch.matchReasons.map((reason, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-accent" />
                    </div>
                    <p className="text-sm text-muted-foreground">{reason}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Shared Interests */}
            <div>
              <h3 className="text-foreground mb-3">Shared Interests</h3>
              <div className="flex flex-wrap gap-2">
                {currentMatch.sharedInterests.map((interest, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="border-accent text-accent"
                  >
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-6 border-t border-border">
            <div className="flex gap-3 mb-4">
              <Button
                size="lg"
                variant="outline"
                className="flex-1 border-border"
              >
                <X className="w-5 h-5 mr-2" />
                Pass
              </Button>
              <Button
                size="lg"
                className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                <MessageSquare className="w-5 h-5 mr-2" />
                Connect
              </Button>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Send an intro message to start the conversation
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
