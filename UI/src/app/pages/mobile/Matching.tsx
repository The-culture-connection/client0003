import { useState } from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { X, Heart, MapPin, Briefcase, GraduationCap } from "lucide-react";

export function MobileMatching() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const profiles = [
    {
      id: 1,
      name: "Sarah Johnson",
      role: "Product Manager",
      company: "TechCorp",
      cohort: "Class of 2023",
      location: "San Francisco, CA",
      interests: ["Product Design", "SaaS", "Leadership"],
      bio: "Passionate about building products that make a difference. Always happy to mentor fellow Mortar alumni!",
      matchScore: 95,
    },
    {
      id: 2,
      name: "Michael Chen",
      role: "Marketing Director",
      company: "GrowthLabs",
      cohort: "Class of 2022",
      location: "New York, NY",
      interests: ["Growth Marketing", "Analytics", "Branding"],
      bio: "Growth hacker turned marketing leader. Love connecting with entrepreneurs and sharing what I've learned.",
      matchScore: 88,
    },
    {
      id: 3,
      name: "Emily Rodriguez",
      role: "Tech Entrepreneur",
      company: "Founder at StartupXYZ",
      cohort: "Class of 2024",
      location: "Austin, TX",
      interests: ["EdTech", "Fundraising", "Community"],
      bio: "Building the future of education. Always looking to collaborate with fellow founders and innovators.",
      matchScore: 92,
    },
  ];

  const currentProfile = profiles[currentIndex];

  const handlePass = () => {
    if (currentIndex < profiles.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const handleConnect = () => {
    if (currentIndex < profiles.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  if (!currentProfile) {
    return (
      <div className="p-4 pb-24">
        <div className="text-center py-12">
          <p className="text-muted-foreground">No more profiles to show</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24">
      <div className="mb-4">
        <h1 className="text-2xl text-foreground mb-1">Matching</h1>
        <p className="text-sm text-muted-foreground">
          Connect with alumni who share your interests
        </p>
      </div>

      <Card className="p-6 bg-card border-border mb-4">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl text-foreground font-medium">
              {currentProfile.name}
            </h2>
            <Badge className="bg-accent text-accent-foreground">
              {currentProfile.matchScore}% match
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-1">
            {currentProfile.role}
          </p>
          <p className="text-sm text-accent">{currentProfile.company}</p>
        </div>

        <div className="space-y-2 text-sm mb-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <GraduationCap className="w-4 h-4" />
            <span>{currentProfile.cohort}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{currentProfile.location}</span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          {currentProfile.bio}
        </p>

        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-2">Interests</p>
          <div className="flex flex-wrap gap-2">
            {currentProfile.interests.map((interest, idx) => (
              <Badge
                key={idx}
                variant="secondary"
                className="bg-accent/10 text-accent"
              >
                {interest}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            size="lg"
            onClick={handlePass}
            className="flex-1 border-border text-foreground"
          >
            <X className="w-5 h-5 mr-2" />
            Pass
          </Button>
          <Button
            size="lg"
            onClick={handleConnect}
            className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            <Heart className="w-5 h-5 mr-2" />
            Connect
          </Button>
        </div>
      </Card>

      <div className="flex justify-center gap-2">
        {profiles.map((_, idx) => (
          <div
            key={idx}
            className={`w-2 h-2 rounded-full ${
              idx === currentIndex ? "bg-accent" : "bg-muted"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
