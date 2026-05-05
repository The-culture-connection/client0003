import { useState } from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Award,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Linkedin,
  Zap,
  Target,
  TrendingUp,
  Users,
  Trophy,
  Crown,
  Star,
  Flame,
  Shield,
  CheckCircle2,
  Upload,
  Eye,
  Settings as SettingsIcon,
} from "lucide-react";

interface BadgeData {
  id: number;
  name: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  criteria: string;
  criteriaType: "manual" | "automatic";
  autoTrigger?: {
    event: string;
    threshold?: number;
  };
  pointsAwarded: number;
  linkedinEnabled: boolean;
  earnedCount: number;
  status: "active" | "draft" | "archived";
}

const iconOptions = [
  { name: "Target", icon: Target },
  { name: "Users", icon: Users },
  { name: "TrendingUp", icon: TrendingUp },
  { name: "Trophy", icon: Trophy },
  { name: "Crown", icon: Crown },
  { name: "Star", icon: Star },
  { name: "Flame", icon: Flame },
  { name: "Shield", icon: Shield },
  { name: "Zap", icon: Zap },
  { name: "Award", icon: Award },
];

const colorOptions = [
  { name: "Red", value: "text-accent", bgValue: "bg-accent/10" },
  { name: "Green", value: "text-green-500", bgValue: "bg-green-500/10" },
  { name: "Blue", value: "text-blue-500", bgValue: "bg-blue-500/10" },
  { name: "Yellow", value: "text-yellow-500", bgValue: "bg-yellow-500/10" },
  { name: "Purple", value: "text-purple-500", bgValue: "bg-purple-500/10" },
  { name: "Cyan", value: "text-cyan-500", bgValue: "bg-cyan-500/10" },
  { name: "Pink", value: "text-pink-500", bgValue: "bg-pink-500/10" },
  { name: "Orange", value: "text-orange-500", bgValue: "bg-orange-500/10" },
];

export function BadgeManagement() {
  const [badges, setBadges] = useState<BadgeData[]>([
    {
      id: 1,
      name: "Idea Validator",
      description: "Complete Module 1: Idea Validation",
      icon: "Target",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      criteria: "Complete all lessons in Module 1",
      criteriaType: "automatic",
      autoTrigger: { event: "module_complete", threshold: 1 },
      pointsAwarded: 500,
      linkedinEnabled: true,
      earnedCount: 234,
      status: "active",
    },
    {
      id: 2,
      name: "Customer Explorer",
      description: "Master customer research techniques",
      icon: "Users",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      criteria: "Complete Module 2: Customer Discovery",
      criteriaType: "automatic",
      autoTrigger: { event: "module_complete", threshold: 2 },
      pointsAwarded: 500,
      linkedinEnabled: true,
      earnedCount: 189,
      status: "active",
    },
    {
      id: 3,
      name: "Financial Strategist",
      description: "Build comprehensive financial models",
      icon: "TrendingUp",
      color: "text-accent",
      bgColor: "bg-accent/10",
      criteria: "Complete Module 3: Financial Modeling",
      criteriaType: "automatic",
      autoTrigger: { event: "module_complete", threshold: 3 },
      pointsAwarded: 500,
      linkedinEnabled: true,
      earnedCount: 145,
      status: "active",
    },
    {
      id: 4,
      name: "Community Leader",
      description: "Active participant in community discussions",
      icon: "Crown",
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      criteria: "Create 50+ forum posts",
      criteriaType: "automatic",
      autoTrigger: { event: "forum_posts", threshold: 50 },
      pointsAwarded: 300,
      linkedinEnabled: false,
      earnedCount: 67,
      status: "active",
    },
    {
      id: 5,
      name: "Top Performer",
      description: "Rank in top 10% of cohort",
      icon: "Trophy",
      color: "text-accent",
      bgColor: "bg-accent/10",
      criteria: "Manually assigned by admins",
      criteriaType: "manual",
      pointsAwarded: 1000,
      linkedinEnabled: false,
      earnedCount: 34,
      status: "active",
    },
  ]);

  const [editingBadge, setEditingBadge] = useState<BadgeData | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<BadgeData | null>(null);

  const handleCreateBadge = () => {
    const newBadge: BadgeData = {
      id: Date.now(),
      name: "New Badge",
      description: "Badge description",
      icon: "Award",
      color: "text-accent",
      bgColor: "bg-accent/10",
      criteria: "Define criteria",
      criteriaType: "manual",
      pointsAwarded: 100,
      linkedinEnabled: false,
      earnedCount: 0,
      status: "draft",
    };
    setEditingBadge(newBadge);
    setIsCreating(true);
  };

  const handleSaveBadge = (badge: BadgeData) => {
    if (isCreating) {
      setBadges([...badges, badge]);
      setIsCreating(false);
    } else {
      setBadges(badges.map((b) => (b.id === badge.id ? badge : b)));
    }
    setEditingBadge(null);
  };

  const handleDeleteBadge = (id: number) => {
    if (confirm("Are you sure you want to delete this badge?")) {
      setBadges(badges.filter((b) => b.id !== id));
    }
  };

  const getIconComponent = (iconName: string) => {
    const found = iconOptions.find((i) => i.name === iconName);
    return found ? found.icon : Award;
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-yellow-500/10">
            <Award className="w-8 h-8 text-yellow-500" />
          </div>
          Badge Management System
        </h1>
        <p className="text-sm text-muted-foreground">
          Create, configure, and manage achievement badges for alumni
        </p>
      </div>

      <Tabs defaultValue="all-badges" className="space-y-6">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="all-badges">All Badges</TabsTrigger>
          <TabsTrigger value="create">Create Badge</TabsTrigger>
          <TabsTrigger value="automation">Automation Rules</TabsTrigger>
          <TabsTrigger value="linkedin">LinkedIn Settings</TabsTrigger>
        </TabsList>

        {/* All Badges Tab */}
        <TabsContent value="all-badges" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
                onClick={handleCreateBadge}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Badge
              </Button>
              <Button variant="outline" className="border-border">
                <Upload className="w-4 h-4 mr-2" />
                Import Badges
              </Button>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Award className="w-4 h-4" />
              <span>{badges.length} total badges</span>
              <span>•</span>
              <span>{badges.filter((b) => b.status === "active").length} active</span>
            </div>
          </div>

          {/* Badge Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {badges.map((badge) => {
              const IconComponent = getIconComponent(badge.icon);
              return (
                <Card
                  key={badge.id}
                  className={`p-5 bg-gradient-to-br from-card to-muted/20 border-border hover:border-accent transition-all cursor-pointer ${
                    selectedBadge?.id === badge.id ? "border-accent shadow-lg" : ""
                  }`}
                  onClick={() => setSelectedBadge(badge)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-lg ${badge.bgColor}`}>
                      <IconComponent className={`w-8 h-8 ${badge.color}`} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={`text-xs ${
                          badge.status === "active"
                            ? "bg-green-500/10 text-green-500"
                            : badge.status === "draft"
                            ? "bg-yellow-500/10 text-yellow-500"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {badge.status}
                      </Badge>
                      {badge.linkedinEnabled && (
                        <Linkedin className="w-4 h-4 text-[#0077B5]" />
                      )}
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-foreground mb-2">{badge.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {badge.description}
                  </p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Earned by</span>
                      <span className="font-bold text-foreground">{badge.earnedCount} users</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Points</span>
                      <div className="flex items-center gap-1">
                        <Zap className="w-3 h-3 text-accent" />
                        <span className="font-bold text-foreground">{badge.pointsAwarded}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Type</span>
                      <Badge variant="outline" className="text-xs">
                        {badge.criteriaType}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-border"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingBadge(badge);
                        setIsCreating(false);
                      }}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-500 text-red-500 hover:bg-red-500/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBadge(badge.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Selected Badge Detail */}
          {selectedBadge && (
            <Card className="p-6 bg-gradient-to-br from-accent/20 via-card to-card border-accent/30">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className={`p-4 rounded-lg ${selectedBadge.bgColor}`}>
                    {(() => {
                      const IconComponent = getIconComponent(selectedBadge.icon);
                      return <IconComponent className={`w-12 h-12 ${selectedBadge.color}`} />;
                    })()}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-1">
                      {selectedBadge.name}
                    </h2>
                    <p className="text-sm text-muted-foreground">{selectedBadge.description}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedBadge(null)}
                  className="border-border"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-card rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Total Earned</p>
                  <p className="text-2xl font-bold text-foreground">{selectedBadge.earnedCount}</p>
                </div>
                <div className="p-4 bg-card rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Points Awarded</p>
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-accent" />
                    <p className="text-2xl font-bold text-foreground">{selectedBadge.pointsAwarded}</p>
                  </div>
                </div>
                <div className="p-4 bg-card rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <Badge
                    className={`text-sm ${
                      selectedBadge.status === "active"
                        ? "bg-green-500/10 text-green-500"
                        : "bg-yellow-500/10 text-yellow-500"
                    }`}
                  >
                    {selectedBadge.status}
                  </Badge>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-bold text-foreground mb-2 block">
                    Criteria
                  </Label>
                  <p className="text-sm text-muted-foreground p-3 bg-card rounded-lg border border-border">
                    {selectedBadge.criteria}
                  </p>
                </div>

                {selectedBadge.autoTrigger && (
                  <div>
                    <Label className="text-sm font-bold text-foreground mb-2 block">
                      Auto-Award Configuration
                    </Label>
                    <div className="p-3 bg-card rounded-lg border border-border">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-foreground">
                          Automatically awarded when:{" "}
                          <span className="font-bold">{selectedBadge.autoTrigger.event}</span>
                          {selectedBadge.autoTrigger.threshold && (
                            <> reaches {selectedBadge.autoTrigger.threshold}</>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
                    onClick={() => {
                      setEditingBadge(selectedBadge);
                      setIsCreating(false);
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Badge
                  </Button>
                  <Button variant="outline" className="border-border">
                    <Eye className="w-4 h-4 mr-2" />
                    View Recipients
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Create/Edit Badge Tab */}
        <TabsContent value="create" className="space-y-6">
          {editingBadge ? (
            <BadgeEditor
              badge={editingBadge}
              onSave={handleSaveBadge}
              onCancel={() => {
                setEditingBadge(null);
                setIsCreating(false);
              }}
              isCreating={isCreating}
            />
          ) : (
            <Card className="p-12 bg-card border-border text-center">
              <Award className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-2">Create a New Badge</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Click the button below to start creating a new achievement badge
              </p>
              <Button
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
                onClick={handleCreateBadge}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Badge
              </Button>
            </Card>
          )}
        </TabsContent>

        {/* Automation Rules Tab */}
        <TabsContent value="automation" className="space-y-6">
          <Card className="p-6 bg-card border-border">
            <h2 className="text-lg font-bold text-foreground mb-4">Automation Rules</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Configure automatic badge awarding based on user actions and achievements
            </p>

            <div className="space-y-4">
              <div className="p-4 bg-muted/30 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-foreground">Module Completion</h3>
                  <Badge className="bg-green-500/10 text-green-500">Active</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Award badges when users complete specific modules
                </p>
                <div className="space-y-2">
                  {badges
                    .filter((b) => b.autoTrigger?.event === "module_complete")
                    .map((badge) => (
                      <div
                        key={badge.id}
                        className="flex items-center justify-between p-2 bg-card rounded border border-border"
                      >
                        <div className="flex items-center gap-2">
                          {(() => {
                            const IconComponent = getIconComponent(badge.icon);
                            return <IconComponent className={`w-4 h-4 ${badge.color}`} />;
                          })()}
                          <span className="text-sm text-foreground">{badge.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Module {badge.autoTrigger?.threshold}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="p-4 bg-muted/30 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-foreground">Community Engagement</h3>
                  <Badge className="bg-green-500/10 text-green-500">Active</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Award badges based on forum posts and community participation
                </p>
                <div className="space-y-2">
                  {badges
                    .filter((b) => b.autoTrigger?.event === "forum_posts")
                    .map((badge) => (
                      <div
                        key={badge.id}
                        className="flex items-center justify-between p-2 bg-card rounded border border-border"
                      >
                        <div className="flex items-center gap-2">
                          {(() => {
                            const IconComponent = getIconComponent(badge.icon);
                            return <IconComponent className={`w-4 h-4 ${badge.color}`} />;
                          })()}
                          <span className="text-sm text-foreground">{badge.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {badge.autoTrigger?.threshold} posts
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Add New Automation Rule
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* LinkedIn Settings Tab */}
        <TabsContent value="linkedin" className="space-y-6">
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-[#0077B5]/10">
                <Linkedin className="w-6 h-6 text-[#0077B5]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">LinkedIn Badge Sharing</h2>
                <p className="text-sm text-muted-foreground">
                  Configure which badges can be shared to LinkedIn profiles
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {badges.map((badge) => {
                const IconComponent = getIconComponent(badge.icon);
                return (
                  <div
                    key={badge.id}
                    className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${badge.bgColor}`}>
                        <IconComponent className={`w-5 h-5 ${badge.color}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{badge.name}</p>
                        <p className="text-xs text-muted-foreground">{badge.earnedCount} earned</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={badge.linkedinEnabled}
                          onChange={() => {
                            setBadges(
                              badges.map((b) =>
                                b.id === badge.id
                                  ? { ...b, linkedinEnabled: !b.linkedinEnabled }
                                  : b
                              )
                            );
                          }}
                          className="rounded"
                        />
                        <span className="text-sm text-foreground">Enable LinkedIn</span>
                      </label>
                      {badge.linkedinEnabled && (
                        <Badge className="bg-[#0077B5]/10 text-[#0077B5] text-xs">
                          <Linkedin className="w-3 h-3 mr-1" />
                          Enabled
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 p-4 bg-accent/10 rounded-lg border border-accent/30">
              <div className="flex items-start gap-3">
                <SettingsIcon className="w-5 h-5 text-accent mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-1">
                    LinkedIn Integration Settings
                  </h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Configure your LinkedIn API credentials in the Integrations section to enable badge sharing
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-accent text-accent hover:bg-accent/10"
                  >
                    Go to Integration Settings
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Badge Editor Modal */}
      {editingBadge && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <BadgeEditor
            badge={editingBadge}
            onSave={handleSaveBadge}
            onCancel={() => {
              setEditingBadge(null);
              setIsCreating(false);
            }}
            isCreating={isCreating}
          />
        </div>
      )}
    </div>
  );
}

// Badge Editor Component
function BadgeEditor({
  badge,
  onSave,
  onCancel,
  isCreating,
}: {
  badge: BadgeData;
  onSave: (badge: BadgeData) => void;
  onCancel: () => void;
  isCreating: boolean;
}) {
  const [editedBadge, setEditedBadge] = useState<BadgeData>(badge);

  const getIconComponent = (iconName: string) => {
    const found = iconOptions.find((i) => i.name === iconName);
    return found ? found.icon : Award;
  };

  const IconComponent = getIconComponent(editedBadge.icon);

  return (
    <Card className="p-6 bg-card border-border max-w-3xl w-full max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-foreground">
          {isCreating ? "Create New Badge" : "Edit Badge"}
        </h2>
        <Button size="sm" variant="outline" onClick={onCancel} className="border-border">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Preview */}
      <div className="mb-6 p-6 bg-gradient-to-br from-accent/20 via-card to-card rounded-lg border border-accent/30">
        <p className="text-xs font-bold text-muted-foreground mb-3">PREVIEW</p>
        <div className="flex items-center gap-4">
          <div className={`p-4 rounded-lg ${editedBadge.bgColor}`}>
            <IconComponent className={`w-12 h-12 ${editedBadge.color}`} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground mb-1">{editedBadge.name}</h3>
            <p className="text-sm text-muted-foreground">{editedBadge.description}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-bold text-foreground mb-2 block">
              Badge Name <span className="text-red-500">*</span>
            </Label>
            <Input
              value={editedBadge.name}
              onChange={(e) => setEditedBadge({ ...editedBadge, name: e.target.value })}
              placeholder="e.g., Idea Validator"
            />
          </div>
          <div>
            <Label className="text-sm font-bold text-foreground mb-2 block">
              Points Awarded
            </Label>
            <Input
              type="number"
              value={editedBadge.pointsAwarded}
              onChange={(e) =>
                setEditedBadge({ ...editedBadge, pointsAwarded: Number(e.target.value) })
              }
            />
          </div>
        </div>

        <div>
          <Label className="text-sm font-bold text-foreground mb-2 block">
            Description <span className="text-red-500">*</span>
          </Label>
          <Textarea
            value={editedBadge.description}
            onChange={(e) => setEditedBadge({ ...editedBadge, description: e.target.value })}
            placeholder="Describe what this badge represents"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-bold text-foreground mb-2 block">Icon</Label>
            <Select
              value={editedBadge.icon}
              onValueChange={(value) => setEditedBadge({ ...editedBadge, icon: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {iconOptions.map((option) => (
                  <SelectItem key={option.name} value={option.name}>
                    <div className="flex items-center gap-2">
                      <option.icon className="w-4 h-4" />
                      <span>{option.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-bold text-foreground mb-2 block">Color</Label>
            <Select
              value={editedBadge.color}
              onValueChange={(value) => {
                const color = colorOptions.find((c) => c.value === value);
                if (color) {
                  setEditedBadge({
                    ...editedBadge,
                    color: color.value,
                    bgColor: color.bgValue,
                  });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {colorOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded ${option.bgValue}`}>
                        <div className={`w-4 h-4 rounded-full ${option.value}`}></div>
                      </div>
                      <span>{option.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-sm font-bold text-foreground mb-2 block">
            Award Type
          </Label>
          <Select
            value={editedBadge.criteriaType}
            onValueChange={(value: "manual" | "automatic") =>
              setEditedBadge({ ...editedBadge, criteriaType: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual (Admin assigns)</SelectItem>
              <SelectItem value="automatic">Automatic (Rule-based)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {editedBadge.criteriaType === "automatic" && (
          <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-3">
            <h3 className="text-sm font-bold text-foreground">Auto-Award Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Trigger Event</Label>
                <Select
                  value={editedBadge.autoTrigger?.event}
                  onValueChange={(value) =>
                    setEditedBadge({
                      ...editedBadge,
                      autoTrigger: { ...editedBadge.autoTrigger!, event: value },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select event" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="module_complete">Module Completion</SelectItem>
                    <SelectItem value="course_complete">Course Completion</SelectItem>
                    <SelectItem value="lesson_complete">Lesson Completion</SelectItem>
                    <SelectItem value="forum_posts">Forum Posts</SelectItem>
                    <SelectItem value="events_attended">Events Attended</SelectItem>
                    <SelectItem value="points_earned">Points Earned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Threshold</Label>
                <Input
                  type="number"
                  value={editedBadge.autoTrigger?.threshold || 0}
                  onChange={(e) =>
                    setEditedBadge({
                      ...editedBadge,
                      autoTrigger: {
                        ...editedBadge.autoTrigger!,
                        threshold: Number(e.target.value),
                      },
                    })
                  }
                  placeholder="e.g., 1"
                />
              </div>
            </div>
          </div>
        )}

        <div>
          <Label className="text-sm font-bold text-foreground mb-2 block">
            Criteria Description
          </Label>
          <Textarea
            value={editedBadge.criteria}
            onChange={(e) => setEditedBadge({ ...editedBadge, criteria: e.target.value })}
            placeholder="Explain how users can earn this badge"
            rows={2}
          />
        </div>

        <div className="flex items-center gap-2 p-4 bg-muted/30 rounded-lg border border-border">
          <input
            type="checkbox"
            checked={editedBadge.linkedinEnabled}
            onChange={(e) =>
              setEditedBadge({ ...editedBadge, linkedinEnabled: e.target.checked })
            }
            className="rounded"
          />
          <div className="flex items-center gap-2">
            <Linkedin className="w-4 h-4 text-[#0077B5]" />
            <Label className="text-sm text-foreground cursor-pointer">
              Enable LinkedIn Sharing
            </Label>
          </div>
        </div>

        <div>
          <Label className="text-sm font-bold text-foreground mb-2 block">Status</Label>
          <Select
            value={editedBadge.status}
            onValueChange={(value: "active" | "draft" | "archived") =>
              setEditedBadge({ ...editedBadge, status: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
            onClick={() => onSave(editedBadge)}
          >
            <Save className="w-4 h-4 mr-2" />
            {isCreating ? "Create Badge" : "Save Changes"}
          </Button>
          <Button variant="outline" onClick={onCancel} className="border-border">
            Cancel
          </Button>
        </div>
      </div>
    </Card>
  );
}
