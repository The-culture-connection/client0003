import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Users, Lock, MessageSquare, TrendingUp, Plus } from "lucide-react";
import { Avatar } from "../../components/ui/avatar";

export function MobileGroups() {
  const mockGroups = [
    {
      id: 1,
      name: "Career Development",
      type: "mortar",
      members: 245,
      posts: 89,
      unread: 3,
      description: "Share career advice, job opportunities, and professional growth tips",
      joined: true,
    },
    {
      id: 2,
      name: "Tech Interview Prep",
      type: "mortar",
      members: 189,
      posts: 156,
      unread: 7,
      description: "Practice coding problems and discuss interview strategies",
      joined: true,
    },
    {
      id: 3,
      name: "Bay Area Alumni",
      type: "user-created",
      members: 67,
      posts: 42,
      unread: 0,
      description: "Connect with alumni in the San Francisco Bay Area",
      joined: true,
    },
    {
      id: 4,
      name: "Startup Founders",
      type: "user-created",
      members: 34,
      posts: 28,
      unread: 2,
      description: "For alumni building their own companies",
      joined: true,
    },
    {
      id: 5,
      name: "Product Management",
      type: "mortar",
      members: 112,
      posts: 73,
      unread: 0,
      description: "Discuss product strategy, roadmaps, and PM best practices",
      joined: false,
    },
  ];

  const recentActivity = [
    {
      id: 1,
      group: "Tech Interview Prep",
      author: "Alex Kumar",
      message: "Just solved a really tricky dynamic programming problem...",
      time: "15m ago",
    },
    {
      id: 2,
      group: "Career Development",
      author: "Maria Garcia",
      message: "Anyone have experience negotiating remote work?",
      time: "1h ago",
    },
  ];

  return (
    <div className="bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border p-4 sticky top-0 z-10">
        <h1 className="text-xl text-foreground">Groups</h1>
        <p className="text-sm text-muted-foreground mt-1">Connect with communities</p>
      </div>

      {/* Create Group Button */}
      <div className="p-4 border-b border-border">
        <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
          <Plus className="w-4 h-4 mr-2" />
          Create New Group
        </Button>
      </div>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <div className="p-4 border-b border-border">
          <h3 className="text-foreground mb-3">Recent Activity</h3>
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <Card key={activity.id} className="p-3 bg-muted/20 border-border">
                <div className="flex items-start gap-3">
                  <Avatar className="w-8 h-8 bg-accent flex-shrink-0">
                    <span className="text-accent-foreground text-xs">
                      {activity.author.split(" ").map(n => n[0]).join("")}
                    </span>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-accent mb-1">{activity.group}</p>
                    <p className="text-sm text-foreground font-medium mb-1">
                      {activity.author}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {activity.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {activity.time}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Groups List */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-foreground">Your Groups</h3>
          <Button variant="ghost" size="sm" className="text-accent">
            See All
          </Button>
        </div>

        <div className="space-y-3">
          {mockGroups.map((group) => (
            <Card key={group.id} className="p-4 bg-card border-border">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-foreground">{group.name}</h4>
                    {group.unread > 0 && (
                      <Badge className="bg-accent text-accent-foreground text-xs">
                        {group.unread}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {group.description}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{group.members} members</span>
                    <span>•</span>
                    <span>{group.posts} posts</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={
                    group.type === "mortar"
                      ? "border-accent text-accent"
                      : "border-border text-muted-foreground"
                  }
                >
                  {group.type === "mortar" ? "Mortar Group" : "User Created"}
                </Badge>
              </div>

              <div className="mt-3 flex gap-2">
                {group.joined ? (
                  <>
                    <Button
                      size="sm"
                      className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-border"
                    >
                      Leave
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
                  >
                    Join Group
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
