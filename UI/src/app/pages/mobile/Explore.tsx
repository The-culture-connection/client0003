import { useState } from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Search, MapPin, Briefcase, GraduationCap, MessageSquare } from "lucide-react";
import { Avatar } from "../../components/ui/avatar";
import { Link } from "react-router";

export function MobileExplore() {
  const [searchQuery, setSearchQuery] = useState("");

  const mockAlumni = [
    {
      id: 1,
      name: "Sarah Johnson",
      role: "Senior Software Engineer",
      company: "Google",
      location: "San Francisco, CA",
      badge: "Alumni",
      matchReason: "Same cohort • Similar career path",
      matchScore: 95,
    },
    {
      id: 2,
      name: "Michael Chen",
      role: "Product Manager",
      company: "Meta",
      location: "Seattle, WA",
      badge: "Founding Member",
      matchReason: "Tech PM • Bay Area",
      matchScore: 88,
    },
    {
      id: 3,
      name: "Jessica Williams",
      role: "UX Design Lead",
      company: "Apple",
      location: "Cupertino, CA",
      badge: "Alumni",
      matchReason: "Design background • Bay Area",
      matchScore: 82,
    },
    {
      id: 4,
      name: "David Martinez",
      role: "Engineering Manager",
      company: "Amazon",
      location: "Austin, TX",
      badge: "Alumni",
      matchReason: "Leadership role • Similar interests",
      matchScore: 78,
    },
  ];

  return (
    <div className="bg-background pb-4">
      {/* Header */}
      <div className="bg-card border-b border-border p-4 sticky top-0 z-10">
        <h1 className="text-xl text-foreground">Explore</h1>
        <p className="text-sm text-muted-foreground mt-1">Discover alumni network</p>
      </div>

      {/* Search Bar */}
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name, company, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Matching Section */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-foreground">Suggested Matches</h3>
          <Link to="/mobile/matching">
            <Button variant="ghost" size="sm" className="text-accent">
              See All
            </Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Alumni we think you should connect with
        </p>
      </div>

      {/* Alumni List */}
      <div className="p-4 space-y-4">
        {mockAlumni.map((alumni) => (
          <Card key={alumni.id} className="p-4 bg-card border-border">
            <div className="flex items-start gap-3 mb-3">
              <Avatar className="w-12 h-12 bg-accent flex-shrink-0">
                <span className="text-accent-foreground">
                  {alumni.name.split(" ").map(n => n[0]).join("")}
                </span>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-foreground">{alumni.name}</h4>
                  <Badge className="bg-accent text-accent-foreground text-xs">
                    {alumni.badge}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Briefcase className="w-3 h-3" />
                  <span>{alumni.role}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <GraduationCap className="w-3 h-3" />
                  <span>{alumni.company}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span>{alumni.location}</span>
                </div>
              </div>
            </div>

            {/* Match Reason */}
            <div className="bg-accent/10 border border-accent rounded-lg p-3 mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-accent">Match Score</span>
                <span className="text-sm text-accent">{alumni.matchScore}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5">
                <div
                  className="bg-accent h-1.5 rounded-full transition-all"
                  style={{ width: `${alumni.matchScore}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {alumni.matchReason}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Send Intro
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-border"
              >
                View Profile
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Info Card */}
      <Card className="mx-4 p-4 bg-accent/10 border-accent">
        <h4 className="text-foreground mb-2 text-sm">About Intro Messages</h4>
        <p className="text-xs text-muted-foreground">
          You can send one intro message to alumni you haven't connected with yet.
          Make it count! Be specific about why you'd like to connect.
        </p>
      </Card>
    </div>
  );
}
