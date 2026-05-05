import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  FileDown,
  BarChart3,
  TrendingUp,
  Users,
  Target,
  Award,
  DollarSign,
  Calendar,
  Download,
  Eye,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export function Reports() {
  const engagementData = [
    { month: "Jan", users: 234, completions: 45, revenue: 4500 },
    { month: "Feb", users: 289, completions: 67, revenue: 6200 },
    { month: "Mar", users: 412, completions: 89, revenue: 8900 },
    { month: "Apr", users: 487, completions: 112, revenue: 11200 },
  ];

  const completionData = [
    { name: "Completed", value: 68 },
    { name: "In Progress", value: 22 },
    { name: "Not Started", value: 10 },
  ];

  const COLORS = ["#10b981", "#871002", "#6b7280"];

  const reports = [
    { name: "User Engagement Report", type: "Engagement", date: "2026-04-13", size: "2.4 MB" },
    { name: "Course Completion Report", type: "Completion", date: "2026-04-10", size: "1.8 MB" },
    { name: "Revenue Summary", type: "Financial", date: "2026-04-05", size: "892 KB" },
    { name: "Badge Distribution", type: "Achievements", date: "2026-04-01", size: "1.2 MB" },
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/10">
            <BarChart3 className="w-8 h-8 text-green-500" />
          </div>
          Reports & Analytics
        </h1>
        <p className="text-sm text-muted-foreground">
          Generate and export engagement, completion, and revenue reports
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Report Generator */}
        <div className="space-y-6">
          <Card className="p-6 bg-gradient-to-br from-accent/20 via-card to-card border-accent/30">
            <div className="flex items-center gap-2 mb-4">
              <FileDown className="w-5 h-5 text-accent" />
              <h2 className="text-lg font-bold text-foreground">Generate Report</h2>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-bold text-foreground mb-2 block">
                  Report Type
                </Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select report type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="engagement">User Engagement</SelectItem>
                    <SelectItem value="completion">Course Completion</SelectItem>
                    <SelectItem value="revenue">Revenue Summary</SelectItem>
                    <SelectItem value="badges">Badge Distribution</SelectItem>
                    <SelectItem value="events">Event Attendance</SelectItem>
                    <SelectItem value="custom">Custom Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-bold text-foreground mb-2 block">
                  Time Period
                </Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="month">Last 30 Days</SelectItem>
                    <SelectItem value="quarter">Last Quarter</SelectItem>
                    <SelectItem value="year">Last Year</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-bold text-foreground mb-2 block">
                  Format
                </Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-bold text-foreground mb-2 block">
                  Cohort Filter (Optional)
                </Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="All cohorts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cohorts</SelectItem>
                    <SelectItem value="cincinnati-2024">Cincinnati 2024</SelectItem>
                    <SelectItem value="atlanta-2024">Atlanta 2024</SelectItem>
                    <SelectItem value="chicago-2023">Chicago 2023</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                <Download className="w-4 h-4 mr-2" />
                Generate & Download
              </Button>
            </div>
          </Card>

          {/* Quick Stats */}
          <Card className="p-6 bg-card border-border">
            <h3 className="text-sm font-bold text-foreground mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-accent" />
                  <span className="text-sm text-foreground">Total Users</span>
                </div>
                <span className="text-sm font-bold text-foreground">2,847</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-foreground">Avg Completion</span>
                </div>
                <span className="text-sm font-bold text-foreground">68%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm text-foreground">Badges Earned</span>
                </div>
                <span className="text-sm font-bold text-foreground">5,234</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-accent" />
                  <span className="text-sm text-foreground">Total Revenue</span>
                </div>
                <span className="text-sm font-bold text-foreground">$24.5K</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column - Analytics & Previous Reports */}
        <div className="lg:col-span-2 space-y-6">
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 bg-card border-border">
              <h3 className="text-lg font-bold text-foreground mb-4">User Growth</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={engagementData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(250,252,252,0.1)" />
                  <XAxis dataKey="month" stroke="#b8b8b8" />
                  <YAxis stroke="#b8b8b8" />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "#3a3a3a",
                      border: "1px solid rgba(250,252,252,0.15)",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="users" stroke="#871002" strokeWidth={2} name="Users" />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-6 bg-card border-border">
              <h3 className="text-lg font-bold text-foreground mb-4">Completion Rate</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={completionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                  >
                    {completionData.map((entry, index) => (
                      <Cell key={`completion-cell-${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <Card className="p-6 bg-card border-border">
            <h3 className="text-lg font-bold text-foreground mb-4">Revenue Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={engagementData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(250,252,252,0.1)" />
                <XAxis dataKey="month" stroke="#b8b8b8" />
                <YAxis stroke="#b8b8b8" />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "#3a3a3a",
                    border: "1px solid rgba(250,252,252,0.15)",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar dataKey="revenue" fill="#871002" name="Revenue ($)" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Previous Reports */}
          <Card className="p-6 bg-card border-border">
            <h3 className="text-lg font-bold text-foreground mb-4">Recent Reports</h3>
            <div className="space-y-2">
              {reports.map((report, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border hover:border-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent/10">
                      <FileDown className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{report.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {report.type}
                        </Badge>
                        <span>•</span>
                        <span>{report.date}</span>
                        <span>•</span>
                        <span>{report.size}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="border-border">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" className="border-border">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
