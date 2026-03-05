import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Search, Briefcase, Users, MapPin, TrendingUp } from "lucide-react";

export function MobileExplore() {
  const opportunities = [
    {
      id: 1,
      type: "job",
      title: "Senior Product Manager",
      company: "TechCorp",
      location: "San Francisco, CA",
      posted: "2d ago",
      match: 95,
    },
    {
      id: 2,
      type: "connection",
      title: "Connect with Maria Garcia",
      company: "Marketing Director • Class of 2022",
      location: "New York, NY",
      posted: "1w ago",
      match: 88,
    },
    {
      id: 3,
      type: "job",
      title: "Marketing Specialist",
      company: "StartupXYZ",
      location: "Remote",
      posted: "3d ago",
      match: 82,
    },
    {
      id: 4,
      type: "connection",
      title: "Connect with James Wilson",
      company: "Tech Entrepreneur • Class of 2021",
      location: "Austin, TX",
      posted: "2w ago",
      match: 76,
    },
  ];

  return (
    <div className="p-4 pb-24">
      <div className="mb-4">
        <h1 className="text-2xl text-foreground mb-1">Explore</h1>
        <p className="text-sm text-muted-foreground">
          Discover opportunities matched to you
        </p>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search opportunities..."
            className="w-full pl-10 pr-4 py-2.5 bg-input-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        <Badge className="bg-accent text-accent-foreground whitespace-nowrap">
          All
        </Badge>
        <Badge
          variant="secondary"
          className="bg-muted text-muted-foreground whitespace-nowrap"
        >
          Jobs
        </Badge>
        <Badge
          variant="secondary"
          className="bg-muted text-muted-foreground whitespace-nowrap"
        >
          Connections
        </Badge>
        <Badge
          variant="secondary"
          className="bg-muted text-muted-foreground whitespace-nowrap"
        >
          Events
        </Badge>
      </div>

      <div className="space-y-3">
        {opportunities.map((opp) => (
          <Card key={opp.id} className="p-4 bg-card border-border">
            <div className="flex items-start gap-3 mb-3">
              <div className="p-2 rounded-lg bg-accent/10">
                {opp.type === "job" ? (
                  <Briefcase className="w-5 h-5 text-accent" />
                ) : (
                  <Users className="w-5 h-5 text-accent" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-foreground font-medium mb-1">
                  {opp.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {opp.company}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {opp.location}
                  </span>
                  <span>• {opp.posted}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-accent" />
                <span className="text-sm text-accent font-medium">
                  {opp.match}% match
                </span>
              </div>
              <Button
                size="sm"
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                {opp.type === "job" ? "Apply" : "Connect"}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
