import { Card } from "../../components/ui/card";
import { TrendingUp, Users, Award, Clock, ArrowUp, ArrowDown } from "lucide-react";
import { useRecordAnalyticsDashboardViewed } from "../../analytics/hooks/useRecordAnalyticsDashboardViewed";

export function WebAnalytics() {
  useRecordAnalyticsDashboardViewed();
  const stats = [
    {
      label: "Completion Rate",
      value: "67%",
      change: "+12%",
      trend: "up",
      icon: TrendingUp,
    },
    {
      label: "Study Time",
      value: "24h",
      change: "+3h",
      trend: "up",
      icon: Clock,
    },
    {
      label: "Avg Quiz Score",
      value: "88%",
      change: "-2%",
      trend: "down",
      icon: Award,
    },
    {
      label: "Peer Rank",
      value: "#23",
      change: "+5",
      trend: "up",
      icon: Users,
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl text-foreground mb-2">Analytics</h1>
        <p className="text-muted-foreground">
          Track your learning progress and performance
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx} className="p-6 bg-card border-border">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-lg bg-accent/10">
                  <Icon className="w-6 h-6 text-accent" />
                </div>
                <div
                  className={`flex items-center gap-1 text-sm ${
                    stat.trend === "up" ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {stat.trend === "up" ? (
                    <ArrowUp className="w-4 h-4" />
                  ) : (
                    <ArrowDown className="w-4 h-4" />
                  )}
                  <span>{stat.change}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  {stat.label}
                </p>
                <p className="text-3xl font-bold text-foreground">
                  {stat.value}
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 bg-card border-border">
          <h2 className="text-xl text-foreground mb-6">Weekly Activity</h2>
          <div className="space-y-4">
            {[
              { day: "Monday", hours: 3.5 },
              { day: "Tuesday", hours: 2.0 },
              { day: "Wednesday", hours: 4.0 },
              { day: "Thursday", hours: 1.5 },
              { day: "Friday", hours: 3.0 },
              { day: "Saturday", hours: 2.5 },
              { day: "Sunday", hours: 1.0 },
            ].map((item) => (
              <div key={item.day}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-foreground">{item.day}</span>
                  <span className="text-sm text-muted-foreground">
                    {item.hours}h
                  </span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent"
                    style={{ width: `${(item.hours / 4) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <h2 className="text-xl text-foreground mb-6">Recent Achievements</h2>
          <div className="space-y-4">
            {[
              {
                title: "Business Fundamentals Certificate",
                date: "Feb 20, 2026",
                type: "certificate",
              },
              {
                title: "Quiz Master Badge",
                date: "Feb 18, 2026",
                type: "badge",
              },
              {
                title: "Completed Marketing Module",
                date: "Feb 15, 2026",
                type: "module",
              },
              {
                title: "Networking Event Attended",
                date: "Feb 12, 2026",
                type: "event",
              },
            ].map((achievement, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 border border-border rounded-lg"
              >
                <div className="p-2 rounded-lg bg-accent/10">
                  <Award className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1">
                  <h4 className="text-foreground text-sm font-medium mb-1">
                    {achievement.title}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {achievement.date}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
