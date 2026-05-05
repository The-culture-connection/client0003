import { useState } from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Users,
  Award,
  TrendingUp,
  Target,
  Activity,
  Zap,
  Trophy,
  Star,
  Crown,
  Shield,
  Flame,
  CheckCircle2,
  Clock,
  BarChart3,
  Share2,
  Linkedin,
  Plus,
  Search,
  Filter,
  Download,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export function UserAnalytics() {
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCohort, setFilterCohort] = useState("all");

  // Mock data for analytics
  const engagementData = [
    { week: "Week 1", logins: 450, completions: 120, points: 15000 },
    { week: "Week 2", logins: 520, completions: 180, points: 22000 },
    { week: "Week 3", logins: 480, completions: 150, points: 18500 },
    { week: "Week 4", logins: 580, completions: 220, points: 28000 },
  ];

  const users = [
    {
      id: 1,
      name: "Alex Rodriguez",
      email: "alex@example.com",
      cohort: "Cincinnati 2024",
      points: 4120,
      badges: ["Idea Validator", "Customer Explorer", "Financial Strategist"],
      completionRate: 85,
      lastActive: "2 hours ago",
      modulesCompleted: 3,
      eventsAttended: 5,
      forumPosts: 12,
      status: "active",
    },
    {
      id: 2,
      name: "Sarah Chen",
      email: "sarah@example.com",
      cohort: "Cincinnati 2024",
      points: 3980,
      badges: ["Idea Validator", "Customer Explorer"],
      completionRate: 75,
      lastActive: "5 hours ago",
      modulesCompleted: 2,
      eventsAttended: 4,
      forumPosts: 8,
      status: "active",
    },
    {
      id: 3,
      name: "Marcus Thompson",
      email: "marcus@example.com",
      cohort: "Atlanta 2024",
      points: 3750,
      badges: ["Idea Validator", "Customer Explorer"],
      completionRate: 70,
      lastActive: "1 day ago",
      modulesCompleted: 2,
      eventsAttended: 3,
      forumPosts: 15,
      status: "active",
    },
    {
      id: 4,
      name: "Jordan Kim",
      email: "jordan@example.com",
      cohort: "Cincinnati 2024",
      points: 2340,
      badges: ["Idea Validator"],
      completionRate: 45,
      lastActive: "3 days ago",
      modulesCompleted: 1,
      eventsAttended: 2,
      forumPosts: 5,
      status: "inactive",
    },
  ];

  const availableBadges = [
    { id: 1, name: "Idea Validator", icon: Target, color: "text-green-500", bgColor: "bg-green-500/10", linkedinEnabled: true },
    { id: 2, name: "Customer Explorer", icon: Users, color: "text-blue-500", bgColor: "bg-blue-500/10", linkedinEnabled: true },
    { id: 3, name: "Financial Strategist", icon: TrendingUp, color: "text-accent", bgColor: "bg-accent/10", linkedinEnabled: true },
    { id: 4, name: "Launch Master", icon: Zap, color: "text-purple-500", bgColor: "bg-purple-500/10", linkedinEnabled: true },
    { id: 5, name: "Community Leader", icon: Crown, color: "text-yellow-500", bgColor: "bg-yellow-500/10", linkedinEnabled: false },
    { id: 6, name: "Top Performer", icon: Trophy, color: "text-accent", bgColor: "bg-accent/10", linkedinEnabled: false },
  ];

  const handleAssignBadge = (userId: number, badgeName: string) => {
    console.log(`Assigning ${badgeName} to user ${userId}`);
    // In real implementation, this would call Supabase
  };

  const handleAwardPoints = (userId: number, points: number) => {
    console.log(`Awarding ${points} points to user ${userId}`);
    // In real implementation, this would call Supabase
  };

  const handleShareToLinkedIn = (badgeName: string) => {
    console.log(`Sharing ${badgeName} to LinkedIn`);
    // In real implementation, this would use LinkedIn API
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCohort = filterCohort === "all" || user.cohort === filterCohort;
    return matchesSearch && matchesCohort;
  });

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent/10">
            <Users className="w-8 h-8 text-accent" />
          </div>
          User Analytics & Management
        </h1>
        <p className="text-sm text-muted-foreground">
          Track engagement, assign badges & points, and manage user achievements
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="badges">Badge System</TabsTrigger>
          <TabsTrigger value="points">Points & Achievements</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5 bg-card border-border">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-lg bg-accent/10">
                  <Users className="w-5 h-5 text-accent" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground mb-1">2,847</p>
              <p className="text-xs text-muted-foreground">Total Users</p>
            </Card>
            <Card className="p-5 bg-card border-border">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-lg bg-green-500/10">
                  <Activity className="w-5 h-5 text-green-500" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground mb-1">1,234</p>
              <p className="text-xs text-muted-foreground">Active This Week</p>
            </Card>
            <Card className="p-5 bg-card border-border">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-lg bg-yellow-500/10">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground mb-1">5,234</p>
              <p className="text-xs text-muted-foreground">Badges Earned</p>
            </Card>
            <Card className="p-5 bg-card border-border">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-lg bg-accent/10">
                  <Target className="w-5 h-5 text-accent" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground mb-1">68%</p>
              <p className="text-xs text-muted-foreground">Avg Completion Rate</p>
            </Card>
          </div>

          {/* Engagement Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 bg-card border-border">
              <h2 className="text-lg font-bold text-foreground mb-4">User Engagement</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={engagementData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(250,252,252,0.1)" />
                  <XAxis dataKey="week" stroke="#b8b8b8" />
                  <YAxis stroke="#b8b8b8" />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "#3a3a3a",
                      border: "1px solid rgba(250,252,252,0.15)",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="logins" stroke="#871002" strokeWidth={2} name="Logins" />
                  <Line type="monotone" dataKey="completions" stroke="#10b981" strokeWidth={2} name="Completions" />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-6 bg-card border-border">
              <h2 className="text-lg font-bold text-foreground mb-4">Points Distribution</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={engagementData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(250,252,252,0.1)" />
                  <XAxis dataKey="week" stroke="#b8b8b8" />
                  <YAxis stroke="#b8b8b8" />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "#3a3a3a",
                      border: "1px solid rgba(250,252,252,0.15)",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="points" fill="#871002" name="Points" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </TabsContent>

        {/* User Management Tab */}
        <TabsContent value="users" className="space-y-6">
          {/* Search and Filters */}
          <Card className="p-5 bg-card border-border">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterCohort} onValueChange={setFilterCohort}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by cohort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cohorts</SelectItem>
                  <SelectItem value="Cincinnati 2024">Cincinnati 2024</SelectItem>
                  <SelectItem value="Atlanta 2024">Atlanta 2024</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="border-border">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </Card>

          {/* Users Table */}
          <Card className="p-0 bg-card border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/30 border-b border-border">
                  <tr>
                    <th className="text-left p-4 text-sm font-bold text-foreground">User</th>
                    <th className="text-left p-4 text-sm font-bold text-foreground">Cohort</th>
                    <th className="text-left p-4 text-sm font-bold text-foreground">Points</th>
                    <th className="text-left p-4 text-sm font-bold text-foreground">Badges</th>
                    <th className="text-left p-4 text-sm font-bold text-foreground">Progress</th>
                    <th className="text-left p-4 text-sm font-bold text-foreground">Status</th>
                    <th className="text-left p-4 text-sm font-bold text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-border hover:bg-muted/20 transition-colors"
                    >
                      <td className="p-4">
                        <div>
                          <p className="text-sm font-medium text-foreground">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="text-xs">
                          {user.cohort}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-accent" />
                          <span className="text-sm font-bold text-foreground">
                            {user.points.toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          {user.badges.slice(0, 3).map((badge, idx) => (
                            <div
                              key={idx}
                              className="p-1 rounded bg-accent/10"
                              title={badge}
                            >
                              <Award className="w-3.5 h-3.5 text-accent" />
                            </div>
                          ))}
                          {user.badges.length > 3 && (
                            <Badge variant="outline" className="text-xs ml-1">
                              +{user.badges.length - 3}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-full h-2 w-20">
                            <div
                              className="bg-accent h-2 rounded-full"
                              style={{ width: `${user.completionRate}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {user.completionRate}%
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge
                          className={`text-xs ${
                            user.status === "active"
                              ? "bg-green-500/10 text-green-500"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {user.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedUser(user)}
                          className="border-border text-xs"
                        >
                          Manage
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Selected User Detail */}
          {selectedUser && (
            <Card className="p-6 bg-gradient-to-br from-accent/20 via-card to-card border-accent/30">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-1">
                    {selectedUser.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedUser(null)}
                  className="border-border"
                >
                  Close
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-card rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Total Points</p>
                  <p className="text-2xl font-bold text-foreground">
                    {selectedUser.points.toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-card rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Modules Completed</p>
                  <p className="text-2xl font-bold text-foreground">
                    {selectedUser.modulesCompleted}
                  </p>
                </div>
                <div className="p-4 bg-card rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Events Attended</p>
                  <p className="text-2xl font-bold text-foreground">
                    {selectedUser.eventsAttended}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-bold text-foreground mb-2 block">
                    Assign Badge
                  </Label>
                  <div className="flex items-center gap-2">
                    <Select onValueChange={(value) => handleAssignBadge(selectedUser.id, value)}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select badge to assign" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableBadges.map((badge) => (
                          <SelectItem key={badge.id} value={badge.name}>
                            {badge.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                      Assign
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-bold text-foreground mb-2 block">
                    Award Points
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input type="number" placeholder="Enter points amount" className="flex-1" />
                    <Button
                      className="bg-accent hover:bg-accent/90 text-accent-foreground"
                      onClick={() => handleAwardPoints(selectedUser.id, 100)}
                    >
                      Award
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-bold text-foreground mb-2 block">
                    Current Badges
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedUser.badges.map((badgeName: string, idx: number) => {
                      const badge = availableBadges.find((b) => b.name === badgeName);
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-2 p-3 rounded-lg bg-card border border-border"
                        >
                          {badge && (
                            <div className={`p-2 rounded ${badge.bgColor}`}>
                              <badge.icon className={`w-4 h-4 ${badge.color}`} />
                            </div>
                          )}
                          <span className="text-sm font-medium text-foreground">{badgeName}</span>
                          {badge?.linkedinEnabled && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleShareToLinkedIn(badgeName)}
                              className="ml-2"
                            >
                              <Linkedin className="w-3.5 h-3.5 text-[#0077B5]" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Badges Tab */}
        <TabsContent value="badges" className="space-y-6">
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">Badge System</h2>
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Create Badge
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableBadges.map((badge) => (
                <Card
                  key={badge.id}
                  className="p-5 bg-gradient-to-br from-card to-muted/20 border-border hover:border-accent transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-lg ${badge.bgColor}`}>
                      <badge.icon className={`w-8 h-8 ${badge.color}`} />
                    </div>
                    {badge.linkedinEnabled && (
                      <Badge className="bg-[#0077B5]/10 text-[#0077B5] text-xs">
                        <Linkedin className="w-3 h-3 mr-1" />
                        LinkedIn
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{badge.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Earned by {Math.floor(Math.random() * 500 + 100)} users
                  </p>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="flex-1 border-border">
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" className="border-border">
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Points Tab */}
        <TabsContent value="points" className="space-y-6">
          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-bold text-foreground mb-6">Point System Configuration</h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-foreground mb-4">Event-Based Points</h3>
                <div className="space-y-3">
                  {[
                    { event: "Complete Lesson", points: 100 },
                    { event: "Complete Module", points: 500 },
                    { event: "Complete Quiz", points: 150 },
                    { event: "Create Asset", points: 200 },
                    { event: "Attend Event", points: 250 },
                    { event: "Forum Post", points: 50 },
                    { event: "Reply to Discussion", points: 25 },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <Zap className="w-5 h-5 text-accent" />
                        <span className="text-sm font-medium text-foreground">{item.event}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          defaultValue={item.points}
                          className="w-24"
                        />
                        <span className="text-sm text-muted-foreground">points</span>
                        <Button size="sm" variant="outline" className="border-border">
                          Save
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-foreground mb-4">Attach Points to Lessons</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Points are automatically awarded when lessons are completed based on the configuration above.
                </p>
                <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  <Settings className="w-4 h-4 mr-2" />
                  Configure Lesson Points
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Settings({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
