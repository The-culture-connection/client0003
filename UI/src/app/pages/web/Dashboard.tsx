import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import { Bell, Award, Clock, TrendingUp } from "lucide-react";
import { Button } from "../../components/ui/button";

export function WebDashboard() {
  const mockStats = {
    progress: 65,
    timeSpent: "24.5 hours",
    completedModules: 8,
    totalModules: 12,
  };

  const mockBadges = [
    { id: 1, name: "Quick Learner", earned: true },
    { id: 2, name: "Quiz Master", earned: true },
    { id: 3, name: "Community Leader", earned: false },
  ];

  const mockEvents = [
    { id: 1, title: "Web Development Workshop", date: "Feb 16, 2026", time: "2:00 PM" },
    { id: 2, title: "Career Networking Event", date: "Feb 18, 2026", time: "6:00 PM" },
  ];

  const mockNotifications = [
    { id: 1, text: "New quiz available in Module 9", time: "2 hours ago" },
    { id: 2, text: "Certificate ready for download", time: "1 day ago" },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl text-foreground mb-2">Welcome back, Alex</h1>
        <p className="text-muted-foreground">Here's your learning progress</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-accent/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-accent" />
            </div>
            <h3 className="text-foreground">Overall Progress</h3>
          </div>
          <p className="text-3xl text-foreground mb-2">{mockStats.progress}%</p>
          <Progress value={mockStats.progress} className="h-2" />
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-accent/10 rounded-lg">
              <Clock className="w-5 h-5 text-accent" />
            </div>
            <h3 className="text-foreground">Time Spent</h3>
          </div>
          <p className="text-3xl text-foreground">{mockStats.timeSpent}</p>
          <p className="text-sm text-muted-foreground mt-2">Last 30 days</p>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-accent/10 rounded-lg">
              <Award className="w-5 h-5 text-accent" />
            </div>
            <h3 className="text-foreground">Badges Earned</h3>
          </div>
          <p className="text-3xl text-foreground">{mockBadges.filter(b => b.earned).length}</p>
          <p className="text-sm text-muted-foreground mt-2">2 more to unlock</p>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-accent/10 rounded-lg">
              <Bell className="w-5 h-5 text-accent" />
            </div>
            <h3 className="text-foreground">Notifications</h3>
          </div>
          <p className="text-3xl text-foreground">{mockNotifications.length}</p>
          <p className="text-sm text-muted-foreground mt-2">Unread messages</p>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Learning Progress */}
        <Card className="lg:col-span-2 p-6 bg-card border-border">
          <h2 className="text-xl text-foreground mb-6">Current Modules</h2>
          <div className="space-y-4">
            <div className="border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-foreground">Advanced Data Structures</h4>
                <Badge className="bg-accent text-accent-foreground">In Progress</Badge>
              </div>
              <Progress value={75} className="h-2 mb-2" />
              <p className="text-sm text-muted-foreground">75% complete • 3 lessons remaining</p>
            </div>
            <div className="border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-foreground">System Design Fundamentals</h4>
                <Badge className="bg-accent text-accent-foreground">In Progress</Badge>
              </div>
              <Progress value={45} className="h-2 mb-2" />
              <p className="text-sm text-muted-foreground">45% complete • 6 lessons remaining</p>
            </div>
            <div className="border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-foreground">API Design Best Practices</h4>
                <Badge variant="outline" className="border-muted-foreground text-muted-foreground">Not Started</Badge>
              </div>
              <Progress value={0} className="h-2 mb-2" />
              <p className="text-sm text-muted-foreground">0% complete • 8 lessons total</p>
            </div>
          </div>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Upcoming Events */}
          <Card className="p-6 bg-card border-border">
            <h3 className="text-foreground mb-4">Upcoming Events</h3>
            <div className="space-y-3">
              {mockEvents.map((event) => (
                <div key={event.id} className="border-l-2 border-accent pl-3 py-1">
                  <p className="text-foreground text-sm">{event.title}</p>
                  <p className="text-xs text-muted-foreground">{event.date} • {event.time}</p>
                </div>
              ))}
            </div>
            <Button className="w-full mt-4 bg-accent hover:bg-accent/90 text-accent-foreground">
              View All Events
            </Button>
          </Card>

          {/* Recent Notifications */}
          <Card className="p-6 bg-card border-border">
            <h3 className="text-foreground mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {mockNotifications.map((notif) => (
                <div key={notif.id} className="border border-border rounded-lg p-3">
                  <p className="text-sm text-foreground mb-1">{notif.text}</p>
                  <p className="text-xs text-muted-foreground">{notif.time}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Achievement Badges */}
          <Card className="p-6 bg-card border-border">
            <h3 className="text-foreground mb-4">Achievement Badges</h3>
            <div className="flex flex-wrap gap-3">
              {mockBadges.map((badge) => (
                <div
                  key={badge.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                    badge.earned ? "bg-accent/20 border border-accent" : "bg-muted/20 border border-muted"
                  }`}
                >
                  <Award className={`w-4 h-4 ${badge.earned ? "text-accent" : "text-muted-foreground"}`} />
                  <span className={`text-xs ${badge.earned ? "text-foreground" : "text-muted-foreground"}`}>
                    {badge.name}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
