import { Card } from "../../components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { TrendingUp, Clock, Target, Award } from "lucide-react";

export function WebAnalytics() {
  const weeklyData = [
    { day: "Mon", hours: 2.5 },
    { day: "Tue", hours: 3.2 },
    { day: "Wed", hours: 1.8 },
    { day: "Thu", hours: 4.1 },
    { day: "Fri", hours: 2.9 },
    { day: "Sat", hours: 3.5 },
    { day: "Sun", hours: 2.2 },
  ];

  const progressData = [
    { month: "Oct", progress: 15 },
    { month: "Nov", progress: 28 },
    { month: "Dec", progress: 42 },
    { month: "Jan", progress: 55 },
    { month: "Feb", progress: 67 },
  ];

  const engagementStats = [
    { category: "Lessons Completed", value: 34, total: 50 },
    { category: "Quizzes Passed", value: 12, total: 15 },
    { category: "Events Attended", value: 6, total: 10 },
    { category: "Badges Earned", value: 3, total: 8 },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl text-foreground mb-2">Analytics</h1>
        <p className="text-muted-foreground">
          Track your learning progress and engagement
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-accent/10 rounded-lg">
              <Clock className="w-5 h-5 text-accent" />
            </div>
            <h3 className="text-muted-foreground text-sm">Total Time</h3>
          </div>
          <p className="text-3xl text-foreground mb-1">24.5h</p>
          <p className="text-xs text-muted-foreground">+3.2h this week</p>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-accent/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-accent" />
            </div>
            <h3 className="text-muted-foreground text-sm">Progress Rate</h3>
          </div>
          <p className="text-3xl text-foreground mb-1">67%</p>
          <p className="text-xs text-muted-foreground">+12% this month</p>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-accent/10 rounded-lg">
              <Target className="w-5 h-5 text-accent" />
            </div>
            <h3 className="text-muted-foreground text-sm">Weekly Goal</h3>
          </div>
          <p className="text-3xl text-foreground mb-1">85%</p>
          <p className="text-xs text-muted-foreground">17/20 hours</p>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-accent/10 rounded-lg">
              <Award className="w-5 h-5 text-accent" />
            </div>
            <h3 className="text-muted-foreground text-sm">Avg Quiz Score</h3>
          </div>
          <p className="text-3xl text-foreground mb-1">87%</p>
          <p className="text-xs text-muted-foreground">Above average</p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="p-6 bg-card border-border">
          <h2 className="text-xl text-foreground mb-6">Weekly Study Time</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(250, 252, 252, 0.1)" />
              <XAxis dataKey="day" stroke="#a8a8a8" />
              <YAxis stroke="#a8a8a8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#252525",
                  border: "1px solid rgba(250, 252, 252, 0.1)",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#fafcfc" }}
              />
              <Bar dataKey="hours" fill="#871002" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 bg-card border-border">
          <h2 className="text-xl text-foreground mb-6">Progress Over Time</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(250, 252, 252, 0.1)" />
              <XAxis dataKey="month" stroke="#a8a8a8" />
              <YAxis stroke="#a8a8a8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#252525",
                  border: "1px solid rgba(250, 252, 252, 0.1)",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#fafcfc" }}
              />
              <Line
                type="monotone"
                dataKey="progress"
                stroke="#871002"
                strokeWidth={3}
                dot={{ fill: "#871002", r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Engagement Stats */}
      <Card className="p-6 bg-card border-border">
        <h2 className="text-xl text-foreground mb-6">Feature Engagement</h2>
        <div className="space-y-6">
          {engagementStats.map((stat) => (
            <div key={stat.category}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-foreground">{stat.category}</h4>
                <span className="text-muted-foreground">
                  {stat.value}/{stat.total}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className="bg-accent h-3 rounded-full transition-all"
                  style={{
                    width: `${(stat.value / stat.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Insights Card */}
      <Card className="mt-8 p-6 bg-accent/10 border-accent">
        <h3 className="text-foreground mb-2">Performance Insights</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• You're studying 15% more than the average learner</li>
          <li>• Your quiz performance is consistently above 85%</li>
          <li>• You've attended 60% of available events</li>
          <li>• Keep up the great work to unlock mobile app access!</li>
        </ul>
      </Card>
    </div>
  );
}
