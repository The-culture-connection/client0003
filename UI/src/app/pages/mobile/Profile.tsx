import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Award, MapPin, Briefcase, Mail, Edit, Share2, Settings } from "lucide-react";
import { Avatar } from "../../components/ui/avatar";

export function MobileProfile() {
  const mockProfile = {
    name: "Alex Thompson",
    role: "Software Engineer",
    company: "Tech Startup",
    location: "San Francisco, CA",
    email: "alex.thompson@example.com",
    badge: "Alumni",
    referralBadge: "Founding Member",
    joinDate: "January 2025",
    completedCourses: 3,
    badgesEarned: 5,
    eventsAttended: 12,
  };

  const earnedBadges = [
    { id: 1, name: "Quick Learner", icon: "🚀" },
    { id: 2, name: "Quiz Master", icon: "🎯" },
    { id: 3, name: "Consistent Student", icon: "📚" },
    { id: 4, name: "Event Participant", icon: "🎉" },
    { id: 5, name: "Community Helper", icon: "🤝" },
  ];

  return (
    <div className="bg-background pb-4">
      {/* Header */}
      <div className="bg-card border-b border-border p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-xl text-foreground">Profile</h1>
          <Button variant="ghost" size="sm">
            <Settings className="w-5 h-5 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Profile Header */}
      <div className="p-6 border-b border-border">
        <div className="flex flex-col items-center text-center">
          <Avatar className="w-24 h-24 bg-accent mb-4">
            <span className="text-accent-foreground text-2xl">
              {mockProfile.name.split(" ").map(n => n[0]).join("")}
            </span>
          </Avatar>
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-accent text-accent-foreground">
              {mockProfile.badge}
            </Badge>
            <Badge
              variant="outline"
              className="border-accent text-accent"
            >
              {mockProfile.referralBadge}
            </Badge>
          </div>
          <h2 className="text-xl text-foreground mb-1">{mockProfile.name}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Member since {mockProfile.joinDate}
          </p>

          <div className="flex gap-2 w-full">
            <Button
              size="sm"
              className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-border"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="p-4 border-b border-border">
        <h3 className="text-foreground mb-3">About</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-accent" />
            </div>
            <div>
              <p className="text-sm text-foreground">{mockProfile.role}</p>
              <p className="text-xs text-muted-foreground">{mockProfile.company}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-accent" />
            </div>
            <div>
              <p className="text-sm text-foreground">{mockProfile.location}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
              <Mail className="w-4 h-4 text-accent" />
            </div>
            <div>
              <p className="text-sm text-foreground">{mockProfile.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 border-b border-border">
        <h3 className="text-foreground mb-3">Activity</h3>
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 bg-muted/20 border-border text-center">
            <p className="text-2xl text-accent mb-1">{mockProfile.completedCourses}</p>
            <p className="text-xs text-muted-foreground">Courses</p>
          </Card>
          <Card className="p-4 bg-muted/20 border-border text-center">
            <p className="text-2xl text-accent mb-1">{mockProfile.badgesEarned}</p>
            <p className="text-xs text-muted-foreground">Badges</p>
          </Card>
          <Card className="p-4 bg-muted/20 border-border text-center">
            <p className="text-2xl text-accent mb-1">{mockProfile.eventsAttended}</p>
            <p className="text-xs text-muted-foreground">Events</p>
          </Card>
        </div>
      </div>

      {/* Badges */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-foreground">Earned Badges</h3>
          <Button variant="ghost" size="sm" className="text-accent">
            View All
          </Button>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {earnedBadges.map((badge) => (
            <div
              key={badge.id}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-12 h-12 rounded-full bg-accent/20 border-2 border-accent flex items-center justify-center text-xl">
                {badge.icon}
              </div>
              <span className="text-xs text-muted-foreground text-center leading-tight">
                {badge.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Referral Badge Info */}
      <Card className="mx-4 p-4 bg-accent/10 border-accent">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
            <Award className="w-5 h-5 text-accent-foreground" />
          </div>
          <div>
            <h4 className="text-foreground mb-1 text-sm">Referral Badge</h4>
            <p className="text-xs text-muted-foreground">
              Your <strong className="text-accent">{mockProfile.referralBadge}</strong> badge shows
              you were referred by a trusted member. This gives you special recognition in the
              community.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
