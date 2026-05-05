import { useState } from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Shield,
  Users,
  Crown,
  Star,
  Search,
  Plus,
  Edit,
  Trash2,
  Check,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

export function RoleAssignment() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const roles = [
    { id: 1, name: "Admin", users: 3, permissions: ["All Access"], color: "text-accent", bgColor: "bg-accent/10" },
    { id: 2, name: "Moderator", users: 8, permissions: ["Manage Events", "Manage Users"], color: "text-purple-500", bgColor: "bg-purple-500/10" },
    { id: 3, name: "Instructor", users: 12, permissions: ["Manage Curriculum", "View Analytics"], color: "text-blue-500", bgColor: "bg-blue-500/10" },
    { id: 4, name: "Alumni", users: 2234, permissions: ["Access Courses", "Join Events"], color: "text-green-500", bgColor: "bg-green-500/10" },
    { id: 5, name: "Guest", users: 45, permissions: ["View Only"], color: "text-muted-foreground", bgColor: "bg-muted" },
  ];

  const users = [
    { id: 1, name: "Alex Rodriguez", email: "alex@example.com", role: "Admin", cohort: "Cincinnati 2024" },
    { id: 2, name: "Sarah Chen", email: "sarah@example.com", role: "Moderator", cohort: "Cincinnati 2024" },
    { id: 3, name: "Marcus Thompson", email: "marcus@example.com", role: "Alumni", cohort: "Atlanta 2024" },
    { id: 4, name: "Jordan Kim", email: "jordan@example.com", role: "Alumni", cohort: "Cincinnati 2024" },
  ];

  const cohorts = [
    { name: "Cincinnati 2024", members: 45, startDate: "Jan 2024", status: "Active" },
    { name: "Atlanta 2024", members: 38, startDate: "Feb 2024", status: "Active" },
    { name: "Chicago 2023", members: 52, startDate: "Oct 2023", status: "Completed" },
  ];

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-yellow-500/10">
            <Shield className="w-8 h-8 text-yellow-500" />
          </div>
          Role Assignment & Permissions
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage user roles, permissions, and cohort assignments
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Roles */}
        <div className="space-y-6">
          <Card className="p-5 bg-card border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Roles</h2>
              <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Plus className="w-3 h-3 mr-1" />
                New Role
              </Button>
            </div>

            <div className="space-y-2">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className={`p-4 rounded-lg border border-border hover:border-accent transition-colors cursor-pointer ${role.bgColor}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Shield className={`w-4 h-4 ${role.color}`} />
                      <h3 className="text-sm font-bold text-foreground">{role.name}</h3>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {role.users}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {role.permissions.map((perm, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-green-500" />
                        <span className="text-xs text-muted-foreground">{perm}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="ghost" className="flex-1 h-7 text-xs">
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Cohorts */}
          <Card className="p-5 bg-card border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Cohorts</h2>
              <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Plus className="w-3 h-3 mr-1" />
                New Cohort
              </Button>
            </div>

            <div className="space-y-2">
              {cohorts.map((cohort, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-muted/30 border border-border hover:border-accent transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{cohort.name}</h3>
                      <p className="text-xs text-muted-foreground">{cohort.startDate}</p>
                    </div>
                    <Badge
                      className={`text-xs ${
                        cohort.status === "Active"
                          ? "bg-green-500/10 text-green-500"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {cohort.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="w-3 h-3" />
                      <span>{cohort.members} members</span>
                    </div>
                    <Button size="sm" variant="ghost" className="h-6 text-xs">
                      Manage
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column - User Management */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-5 bg-card border-border">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border hover:border-accent transition-colors cursor-pointer"
                  onClick={() => setSelectedUser(user)}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-accent/10">
                      <Users className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      {user.cohort}
                    </Badge>
                    <Badge
                      className={`text-xs ${
                        user.role === "Admin"
                          ? "bg-accent/10 text-accent"
                          : user.role === "Moderator"
                          ? "bg-purple-500/10 text-purple-500"
                          : "bg-green-500/10 text-green-500"
                      }`}
                    >
                      {user.role}
                    </Badge>
                    <Button size="sm" variant="outline" className="border-border">
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
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

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-bold text-foreground mb-2 block">
                    Assign Role
                  </Label>
                  <Select defaultValue={selectedUser.role}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Moderator">Moderator</SelectItem>
                      <SelectItem value="Instructor">Instructor</SelectItem>
                      <SelectItem value="Alumni">Alumni</SelectItem>
                      <SelectItem value="Guest">Guest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-bold text-foreground mb-2 block">
                    Assign Cohort
                  </Label>
                  <Select defaultValue={selectedUser.cohort}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select cohort" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cincinnati 2024">Cincinnati 2024</SelectItem>
                      <SelectItem value="Atlanta 2024">Atlanta 2024</SelectItem>
                      <SelectItem value="Chicago 2023">Chicago 2023</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-bold text-foreground mb-2 block">
                    Custom Permissions
                  </Label>
                  <div className="space-y-2 p-4 bg-card rounded-lg border border-border">
                    {[
                      "Manage Curriculum",
                      "View Analytics",
                      "Manage Events",
                      "Manage Users",
                      "Export Reports",
                    ].map((perm, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm text-foreground">{perm}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                  <Check className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
