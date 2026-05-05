import { useState } from "react";
import { useNavigate } from "react-router";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { useAuth } from "../lib/auth-context";
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
  Zap,
  Target,
  Crown,
  Link as LinkIcon,
  PlayCircle,
  Lock,
  CheckCircle2,
  Clock,
  FileText,
  Trophy,
  MessageSquare,
  AlertCircle,
  ArrowRight,
  Eye,
  Settings,
  RefreshCw,
  Bell,
  GraduationCap,
  Megaphone,
  ShoppingBag,
  Key,
  Smartphone,
} from "lucide-react";

export function UnifiedDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";
  const [viewMode, setViewMode] = useState<"student" | "admin">(isAdmin ? "admin" : "student");

  // Action items that need attention
  const actionItems = [
    {
      id: 1,
      title: "Events Need Approval",
      description: "Member-submitted events awaiting review",
      type: "urgent",
      path: "/admin/events",
      icon: Calendar,
      count: 3,
    },
    {
      id: 2,
      title: "Alumni Applications",
      description: "Graduation applications pending review",
      type: "urgent",
      path: "/admin/alumni",
      icon: Award,
      count: 5,
    },
    {
      id: 3,
      title: "Mobile Expansion Reports",
      description: "User reports requiring moderation",
      type: "warning",
      path: "/admin/analytics",
      icon: Shield,
      count: 2,
    },
    {
      id: 4,
      title: "DM Messages",
      description: "Unread direct messages from students",
      type: "info",
      path: "/admin/analytics",
      icon: MessageSquare,
      count: 8,
    },
  ];

  const adminTools = [
    {
      icon: Users,
      title: "Groups",
      description: "Manage groups and member approvals",
      path: "/admin/groups",
      color: "from-blue-500/20 to-blue-500/5",
      iconColor: "text-blue-500",
      stats: "24 groups",
    },
    {
      icon: Calendar,
      title: "Events",
      description: "Create events, manage RSVPs & attendance",
      path: "/admin/events",
      color: "from-purple-500/20 to-purple-500/5",
      iconColor: "text-purple-500",
      stats: "8 upcoming",
      needsAttention: true,
      attentionCount: 3,
    },
    {
      icon: GraduationCap,
      title: "Alumni Applications",
      description: "Review graduation applications",
      path: "/admin/alumni",
      color: "from-green-500/20 to-green-500/5",
      iconColor: "text-green-500",
      stats: "Pending",
      needsAttention: true,
      attentionCount: 5,
    },
    {
      icon: Shield,
      title: "Admins",
      description: "Manage admin roles and permissions",
      path: "/admin/roles",
      color: "from-red-500/20 to-red-500/5",
      iconColor: "text-red-500",
      stats: "12 admins",
    },
    {
      icon: BarChart3,
      title: "Analytics",
      description: "User engagement and platform metrics",
      path: "/admin/analytics",
      color: "from-accent/20 to-accent/5",
      iconColor: "text-accent",
      stats: "2,847 users",
      needsAttention: true,
      attentionCount: 10,
    },
    {
      icon: Award,
      title: "Badges",
      description: "Create and manage achievement badges",
      path: "/admin/badges",
      color: "from-yellow-500/20 to-yellow-500/5",
      iconColor: "text-yellow-500",
      stats: "18 badges",
    },
    {
      icon: Key,
      title: "App Access Hub",
      description: "Manage app access and invite codes",
      path: "/admin/app-access",
      color: "from-cyan-500/20 to-cyan-500/5",
      iconColor: "text-cyan-500",
      stats: "Active",
    },
    {
      icon: Smartphone,
      title: "Expansion mobile",
      description: "Mobile app groups and moderation",
      path: "/admin/expansion-mobile",
      color: "from-orange-500/20 to-orange-500/5",
      iconColor: "text-orange-500",
      stats: "Live",
    },
    {
      icon: Megaphone,
      title: "Mortar Info",
      description: "Platform announcements and updates",
      path: "/admin/mortar-info",
      color: "from-pink-500/20 to-pink-500/5",
      iconColor: "text-pink-500",
      stats: "Manage",
    },
    {
      icon: MessageSquare,
      title: "Direct Messages",
      description: "Student DMs and support messages",
      path: "/admin/messages",
      color: "from-indigo-500/20 to-indigo-500/5",
      iconColor: "text-indigo-500",
      stats: "8 unread",
      needsAttention: true,
      attentionCount: 8,
    },
    {
      icon: BookOpen,
      title: "Courses",
      description: "Upload and manage course content",
      path: "/admin/curriculum",
      color: "from-teal-500/20 to-teal-500/5",
      iconColor: "text-teal-500",
      stats: "12 courses",
    },
    {
      icon: ShoppingBag,
      title: "Shop",
      description: "Manage shop items and inventory",
      path: "/admin/shop",
      color: "from-emerald-500/20 to-emerald-500/5",
      iconColor: "text-emerald-500",
      stats: "45 items",
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

  if (viewMode === "admin") {
    return (
      <div className="p-6 max-w-[1800px] mx-auto">
        {/* Header with View Toggle */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
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
            <div className="flex items-center gap-3">
              {isAdmin && (
                <div className="flex items-center gap-2 p-1 bg-card border border-border rounded-lg">
                  <Button
                    size="sm"
                    variant={viewMode === "admin" ? "default" : "ghost"}
                    className={viewMode === "admin" ? "bg-accent text-accent-foreground" : ""}
                    onClick={() => setViewMode("admin")}
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Admin View
                  </Button>
                  <Button
                    size="sm"
                    variant={viewMode === "student" ? "default" : "ghost"}
                    className={viewMode === "student" ? "bg-accent text-accent-foreground" : ""}
                    onClick={() => setViewMode("student")}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Student View
                  </Button>
                </div>
              )}
              <Badge className="bg-accent/10 text-accent border-accent/30 px-3 py-1">
                ADMIN ACCESS
              </Badge>
            </div>
          </div>
        </div>

        {/* Action Items - Things that need attention */}
        {actionItems.length > 0 && (
          <Card className="p-5 mb-6 bg-gradient-to-br from-accent/20 via-card to-card border-accent/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-accent" />
                <h2 className="text-lg font-bold text-foreground">Action Items</h2>
                <Badge className="bg-accent text-accent-foreground text-xs">
                  {actionItems.length}
                </Badge>
              </div>
              <Button size="sm" variant="ghost" className="text-xs">
                <RefreshCw className="w-3 h-3 mr-2" />
                Refresh
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {actionItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                    item.type === "urgent"
                      ? "bg-red-500/10 border-red-500/30 hover:border-red-500"
                      : item.type === "warning"
                      ? "bg-yellow-500/10 border-yellow-500/30 hover:border-yellow-500"
                      : "bg-blue-500/10 border-blue-500/30 hover:border-blue-500"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        item.type === "urgent"
                          ? "bg-red-500/20"
                          : item.type === "warning"
                          ? "bg-yellow-500/20"
                          : "bg-blue-500/20"
                      }`}
                    >
                      <item.icon
                        className={`w-5 h-5 ${
                          item.type === "urgent"
                            ? "text-red-500"
                            : item.type === "warning"
                            ? "text-yellow-500"
                            : "text-blue-500"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-bold text-foreground">{item.title}</h3>
                        {item.type === "urgent" && (
                          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{item.description}</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs px-2 hover:bg-accent/10"
                      >
                        Review
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {quickStats.map((stat, idx) => (
            <Card
              key={idx}
              className="p-5 bg-card border-border hover:border-accent transition-all hover:shadow-lg cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-lg bg-accent/10">
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
          {/* Admin Tools Grid */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-xl font-bold text-foreground">Admin Tools</h2>
                <p className="text-xs text-muted-foreground">
                  Access all platform management features
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {adminTools.map((tool, idx) => (
                <Card
                  key={idx}
                  onClick={() => navigate(tool.path)}
                  className={`p-5 bg-gradient-to-br ${tool.color} border-border hover:border-accent transition-all hover:shadow-xl cursor-pointer group relative overflow-hidden`}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>

                  {tool.needsAttention && (
                    <div className="absolute top-2 right-2 z-20">
                      <div className="relative">
                        <Bell className="w-4 h-4 text-red-500" />
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-[8px] text-white font-bold">
                            {tool.attentionCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-3 rounded-lg bg-card/50 border border-border/50">
                        <tool.icon className={`w-6 h-6 ${tool.iconColor}`} />
                      </div>
                      <Badge variant="outline" className="text-xs border-border">
                        {tool.stats}
                      </Badge>
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-1">{tool.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{tool.description}</p>
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

          {/* Right Sidebar - Activity & Quick Actions */}
          <div className="space-y-6">
            {/* Live Activity */}
            <Card className="p-5 bg-card border-border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-foreground">Live Activity</h2>
                <Zap className="w-5 h-5 text-accent animate-pulse" />
              </div>
              <div className="space-y-3">
                {recentActivity.slice(0, 5).map((activity, idx) => (
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
                      <p className="text-xs text-muted-foreground/70 mt-0.5">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
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
                  onClick={() => navigate("/admin/badges")}
                >
                  <Award className="w-4 h-4 mr-2" />
                  Create Badge
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

  // Student View (similar to existing WebDashboard)
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* View Toggle for Admins */}
      {isAdmin && (
        <div className="flex justify-end mb-4">
          <div className="flex items-center gap-2 p-1 bg-card border border-border rounded-lg">
            <Button
              size="sm"
              variant={viewMode === "admin" ? "default" : "ghost"}
              className={viewMode === "admin" ? "bg-accent text-accent-foreground" : ""}
              onClick={() => setViewMode("admin")}
            >
              <Crown className="w-4 h-4 mr-2" />
              Admin View
            </Button>
            <Button
              size="sm"
              variant={viewMode === "student" ? "default" : "ghost"}
              className={viewMode === "student" ? "bg-accent text-accent-foreground" : ""}
              onClick={() => setViewMode("student")}
            >
              <Users className="w-4 h-4 mr-2" />
              Student View
            </Button>
          </div>
        </div>
      )}

      {/* Student Dashboard Content */}
      <div className="mb-5">
        <h1 className="text-2xl text-foreground mb-1">
          Welcome back, <span className="text-accent">{user?.name.split(" ")[0] || "there"}</span>
        </h1>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>Cohort: {user?.cohort}</span>
          <span>•</span>
          <span>City: {user?.city}</span>
          <span>•</span>
          <span className="text-accent">You completed 2 lessons this week 🔥</span>
        </div>
      </div>

      {/* Rest of student dashboard (abbreviated for brevity - would include all student content) */}
      <Card className="p-5 mb-5 bg-gradient-to-br from-accent/20 via-card to-card border-accent/30">
        <div className="text-center py-12">
          <Eye className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Student View</h2>
          <p className="text-sm text-muted-foreground mb-4">
            This is what your students see when they log in
          </p>
          <Button
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
            onClick={() => navigate("/dashboard")}
          >
            View Full Student Dashboard
          </Button>
        </div>
      </Card>
    </div>
  );
}
