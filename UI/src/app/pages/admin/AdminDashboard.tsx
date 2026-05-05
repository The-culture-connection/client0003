import { useNavigate } from "react-router";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Users,
  BookOpen,
  Calendar,
  Shield,
  BarChart3,
  FileDown,
  DollarSign,
  UserPlus,
  Award,
  TrendingUp,
  Activity,
  ShoppingCart,
  Database,
  Zap,
  Target,
  Crown,
  Link as LinkIcon,
  Package,
  CreditCard,
} from "lucide-react";

export function AdminDashboard() {
  const navigate = useNavigate();

  const adminTools = [
    {
      icon: Users,
      title: "User Analytics",
      description: "Track engagement, assign badges & points",
      path: "/admin/analytics",
      color: "from-accent/20 to-accent/5",
      iconColor: "text-accent",
      stats: "2,847 users",
    },
    {
      icon: Award,
      title: "Badge Management",
      description: "Create & configure achievement badges",
      path: "/admin/badges",
      color: "from-yellow-500/20 to-yellow-500/5",
      iconColor: "text-yellow-500",
      stats: "12 badges",
    },
    {
      icon: BookOpen,
      title: "Curriculum Manager",
      description: "Upload courses, attach points & badges",
      path: "/admin/curriculum",
      color: "from-blue-500/20 to-blue-500/5",
      iconColor: "text-blue-500",
      stats: "12 courses",
    },
    {
      icon: Calendar,
      title: "Event Moderation",
      description: "Manage events, RSVPs & attendance",
      path: "/admin/events",
      color: "from-purple-500/20 to-purple-500/5",
      iconColor: "text-purple-500",
      stats: "8 upcoming",
    },
    {
      icon: Shield,
      title: "Role Assignment",
      description: "Manage user permissions & cohorts",
      path: "/admin/roles",
      color: "from-yellow-500/20 to-yellow-500/5",
      iconColor: "text-yellow-500",
      stats: "5 roles",
    },
    {
      icon: BarChart3,
      title: "Reports & Analytics",
      description: "Generate engagement & completion reports",
      path: "/admin/reports",
      color: "from-green-500/20 to-green-500/5",
      iconColor: "text-green-500",
      stats: "45 reports",
    },
    {
      icon: DollarSign,
      title: "Payment Manager",
      description: "Configure pricing for courses & events",
      path: "/admin/payments",
      color: "from-accent/20 to-accent/5",
      iconColor: "text-accent",
      stats: "$24,590",
    },
    {
      icon: UserPlus,
      title: "Alumni Upload",
      description: "Bulk import users by email & cohort",
      path: "/admin/alumni",
      color: "from-cyan-500/20 to-cyan-500/5",
      iconColor: "text-cyan-500",
      stats: "Upload CSV",
    },
    {
      icon: LinkIcon,
      title: "Integrations",
      description: "LinkedIn, Shopify, Square connections",
      path: "/admin/integrations",
      color: "from-pink-500/20 to-pink-500/5",
      iconColor: "text-pink-500",
      stats: "3 connected",
    },
  ];

  const quickStats = [
    { label: "Total Users", value: "2,847", icon: Users, trend: "+12%", trendUp: true },
    { label: "Active This Week", value: "1,234", icon: Activity, trend: "+8%", trendUp: true },
    { label: "Total Revenue", value: "$24.5K", icon: DollarSign, trend: "+23%", trendUp: true },
    { label: "Completion Rate", value: "68%", icon: Target, trend: "-3%", trendUp: false },
  ];

  const recentActivity = [
    { user: "Alex Rodriguez", action: "Completed Module 3", time: "2 min ago", type: "completion" },
    { user: "Sarah Chen", action: "Earned 'Financial Strategist' badge", time: "5 min ago", type: "badge" },
    { user: "Marcus Thompson", action: "Purchased 'Pitch & Launch' course", time: "12 min ago", type: "purchase" },
    { user: "Jordan Kim", action: "RSVP'd to Networking Workshop", time: "18 min ago", type: "event" },
    { user: "Grace Williams", action: "Joined Cincinnati Cohort", time: "24 min ago", type: "cohort" },
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Hero Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Crown className="w-8 h-8 text-accent" />
              </div>
              Admin Command Center
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your entire platform from this central hub
            </p>
          </div>
          <Badge className="bg-accent/10 text-accent border-accent/30 text-sm px-3 py-1">
            ADMIN ACCESS
          </Badge>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {quickStats.map((stat, idx) => (
          <Card
            key={idx}
            className="p-5 bg-card border-border hover:border-accent transition-all hover:shadow-lg cursor-pointer"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2.5 rounded-lg bg-accent/10`}>
                <stat.icon className="w-5 h-5 text-accent" />
              </div>
              <Badge
                variant="outline"
                className={`text-xs ${
                  stat.trendUp
                    ? "border-green-500/30 text-green-500"
                    : "border-red-500/30 text-red-500"
                }`}
              >
                {stat.trend}
              </Badge>
            </div>
            <p className="text-2xl font-bold text-foreground mb-1">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Admin Tools */}
        <div className="lg:col-span-2 space-y-4">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-foreground mb-1">Admin Tools</h2>
            <p className="text-sm text-muted-foreground">
              Access all platform management features
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {adminTools.map((tool, idx) => (
              <Card
                key={idx}
                onClick={() => navigate(tool.path)}
                className={`p-5 bg-gradient-to-br ${tool.color} border-border hover:border-accent transition-all hover:shadow-xl cursor-pointer group relative overflow-hidden`}
              >
                {/* Background Accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>

                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-3 rounded-lg bg-card/50 border border-border/50`}>
                      <tool.icon className={`w-6 h-6 ${tool.iconColor}`} />
                    </div>
                    <Badge variant="outline" className="text-xs border-border">
                      {tool.stats}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-1">
                    {tool.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {tool.description}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-border group-hover:border-accent group-hover:bg-accent/10 group-hover:text-accent transition-all"
                  >
                    Open
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Right Column - Recent Activity & Quick Actions */}
        <div className="space-y-6">
          {/* Recent Activity */}
          <Card className="p-5 bg-card border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Live Activity</h2>
              <Zap className="w-5 h-5 text-accent animate-pulse" />
            </div>
            <div className="space-y-3">
              {recentActivity.map((activity, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50 hover:border-accent/30 transition-colors"
                >
                  <div
                    className={`p-1.5 rounded-full mt-0.5 ${
                      activity.type === "completion"
                        ? "bg-green-500/10"
                        : activity.type === "badge"
                        ? "bg-yellow-500/10"
                        : activity.type === "purchase"
                        ? "bg-accent/10"
                        : activity.type === "event"
                        ? "bg-purple-500/10"
                        : "bg-blue-500/10"
                    }`}
                  >
                    {activity.type === "completion" && (
                      <Target className="w-3.5 h-3.5 text-green-500" />
                    )}
                    {activity.type === "badge" && (
                      <Award className="w-3.5 h-3.5 text-yellow-500" />
                    )}
                    {activity.type === "purchase" && (
                      <DollarSign className="w-3.5 h-3.5 text-accent" />
                    )}
                    {activity.type === "event" && (
                      <Calendar className="w-3.5 h-3.5 text-purple-500" />
                    )}
                    {activity.type === "cohort" && (
                      <Users className="w-3.5 h-3.5 text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {activity.user}
                    </p>
                    <p className="text-xs text-muted-foreground">{activity.action}</p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-4 border-accent text-accent hover:bg-accent/10"
            >
              View All Activity
            </Button>
          </Card>

          {/* Quick Actions */}
          <Card className="p-5 bg-gradient-to-br from-accent/20 via-card to-card border-accent/30">
            <h2 className="text-lg font-bold text-foreground mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Button
                size="sm"
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground justify-start"
                onClick={() => navigate("/admin/alumni")}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Upload New Alumni
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full border-border justify-start"
                onClick={() => navigate("/admin/curriculum")}
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Add New Course
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full border-border justify-start"
                onClick={() => navigate("/admin/events")}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Create Event
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full border-border justify-start"
                onClick={() => navigate("/admin/reports")}
              >
                <FileDown className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>
          </Card>

          {/* System Status */}
          <Card className="p-5 bg-card border-border">
            <h2 className="text-lg font-bold text-foreground mb-4">System Status</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-sm text-foreground">Platform</span>
                </div>
                <Badge className="bg-green-500/10 text-green-500 text-xs">Online</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-sm text-foreground">Database</span>
                </div>
                <Badge className="bg-green-500/10 text-green-500 text-xs">Healthy</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
                  <span className="text-sm text-foreground">Payments</span>
                </div>
                <Badge className="bg-yellow-500/10 text-yellow-500 text-xs">Limited</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent animate-pulse"></div>
                  <span className="text-sm text-foreground">API</span>
                </div>
                <Badge className="bg-accent/10 text-accent text-xs">Active</Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
