import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Users, MessageCircle, Calendar, Search } from "lucide-react";

export function MobileGroups() {
  const groups = [
    {
      id: 1,
      name: "Tech Entrepreneurs",
      members: 156,
      messages: 45,
      category: "Industry",
      joined: true,
    },
    {
      id: 2,
      name: "Class of 2024",
      members: 89,
      messages: 23,
      category: "Cohort",
      joined: true,
    },
    {
      id: 3,
      name: "Marketing Professionals",
      members: 134,
      messages: 67,
      category: "Industry",
      joined: false,
    },
    {
      id: 4,
      name: "Bay Area Alumni",
      members: 78,
      messages: 34,
      category: "Location",
      joined: false,
    },
  ];

  return (
    <div className="p-4 pb-24">
      <div className="mb-4">
        <h1 className="text-2xl text-foreground mb-1">Groups</h1>
        <p className="text-sm text-muted-foreground">
          Connect with like-minded members
        </p>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search groups..."
            className="w-full pl-10 pr-4 py-2.5 bg-input-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="space-y-3">
        {groups.map((group) => (
          <Card key={group.id} className="p-4 bg-card border-border">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-foreground font-medium mb-1">
                  {group.name}
                </h3>
                <Badge
                  variant="secondary"
                  className="bg-accent/10 text-accent text-xs"
                >
                  {group.category}
                </Badge>
              </div>
              {group.joined && (
                <Badge className="bg-accent text-accent-foreground text-xs">
                  Joined
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{group.members}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="w-4 h-4" />
                <span>{group.messages} today</span>
              </div>
            </div>

            {group.joined ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full border-border text-foreground"
              >
                View Group
              </Button>
            ) : (
              <Button
                size="sm"
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                Join Group
              </Button>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
