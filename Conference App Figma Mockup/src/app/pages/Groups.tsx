import { Search, Users, MessageCircle, Plus, X, TrendingUp, Star, ChevronRight, Clock, Activity } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { useState } from 'react';
import { useNavigate } from 'react-router';

export default function Groups() {
  const navigate = useNavigate();
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupCategory, setNewGroupCategory] = useState('Industry');
  const [groupRules, setGroupRules] = useState<string[]>([]);
  const [currentRule, setCurrentRule] = useState('');

  const groups = [
    {
      id: 1,
      name: "Tech Entrepreneurs",
      members: 156,
      messages: 45,
      category: "Industry",
      joined: true,
      trending: true,
      activeNow: 12,
      recentActivity: "Sarah posted about Series A funding",
      color: "from-accent/20 to-accent/5",
      memberAvatars: ["SJ", "MC", "ER", "AT"],
    },
    {
      id: 2,
      name: "Class of 2024",
      members: 89,
      messages: 23,
      category: "Cohort",
      joined: true,
      trending: false,
      activeNow: 5,
      recentActivity: "Michael asked about networking",
      color: "from-purple-500/20 to-purple-500/5",
      memberAvatars: ["MC", "JL", "DP"],
    },
    {
      id: 3,
      name: "Marketing Professionals",
      members: 134,
      messages: 67,
      category: "Industry",
      joined: false,
      trending: true,
      activeNow: 18,
      recentActivity: "New discussion on social media trends",
      color: "from-blue-500/20 to-blue-500/5",
      memberAvatars: ["ER", "JL", "DP", "MC", "SJ"],
    },
    {
      id: 4,
      name: "Bay Area Alumni",
      members: 78,
      messages: 34,
      category: "Location",
      joined: false,
      trending: false,
      activeNow: 3,
      recentActivity: "Planning meetup for next month",
      color: "from-green-500/20 to-green-500/5",
      memberAvatars: ["AT", "ER"],
    },
    {
      id: 5,
      name: "Product Management",
      members: 92,
      messages: 51,
      category: "Industry",
      joined: true,
      trending: false,
      activeNow: 7,
      recentActivity: "Jessica shared PM resources",
      color: "from-orange-500/20 to-orange-500/5",
      memberAvatars: ["JL", "MC", "DP"],
    },
    {
      id: 6,
      name: "Startup Founders",
      members: 203,
      messages: 89,
      category: "Industry",
      joined: false,
      trending: true,
      activeNow: 24,
      recentActivity: "Hot debate on equity distribution",
      color: "from-accent/20 to-accent/5",
      memberAvatars: ["SJ", "AT", "ER", "MC", "JL", "DP"],
    },
  ];

  const handleCreateGroup = () => {
    if (newGroupName.trim() && newGroupDescription.trim()) {
      // In a real app, this would send to backend
      setShowCreateGroup(false);
      setNewGroupName('');
      setNewGroupDescription('');
      setNewGroupCategory('Industry');
      setGroupRules([]);
      setCurrentRule('');
    }
  };

  const handleAddRule = () => {
    if (currentRule.trim()) {
      setGroupRules([...groupRules, currentRule.trim()]);
      setCurrentRule('');
    }
  };

  const handleRemoveRule = (index: number) => {
    setGroupRules(groupRules.filter((_, i) => i !== index));
  };

  const myGroups = groups.filter(g => g.joined);
  const discoverGroups = groups.filter(g => !g.joined);
  const trendingGroups = groups.filter(g => g.trending);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background z-10 border-b border-border px-4 py-4">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-2xl text-foreground">Groups</h1>
            <button
              onClick={() => setShowCreateGroup(true)}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5 text-accent" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            Connect with like-minded members
          </p>
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search groups..."
              className="w-full pl-10 pr-4 py-2.5 bg-input-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Featured Groups - Horizontal Scroll */}
        {trendingGroups.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 px-4 mb-3">
              <Star className="w-5 h-5 text-accent" />
              <h2 className="text-foreground font-medium">Featured Communities</h2>
            </div>
            <div className="flex gap-3 px-4 overflow-x-auto no-scrollbar">
              {trendingGroups.map((group) => (
                <div
                  key={`trending-${group.id}`}
                  onClick={() => navigate(`/groups/${group.id}`)}
                  className="flex-shrink-0 w-64 p-4 bg-gradient-to-br from-card to-background border border-border rounded-xl cursor-pointer hover:border-accent/50 transition-all hover:shadow-lg"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${group.color} flex items-center justify-center`}>
                      <Users className="w-6 h-6 text-accent" />
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-accent/10 rounded">
                      <Activity className="w-3 h-3 text-accent" />
                      <span className="text-xs text-accent font-medium">Active</span>
                    </div>
                  </div>
                  <h3 className="text-foreground font-medium mb-1">{group.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>{group.members} members</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      <span>{group.messages}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-muted-foreground">{group.activeNow} online</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Groups */}
        {myGroups.length > 0 && (
          <div className="mb-6">
            <h2 className="text-foreground font-medium px-4 mb-3">Your Groups</h2>
            <div className="space-y-2">
              {myGroups.map((group) => (
                <div
                  key={`my-${group.id}`}
                  onClick={() => navigate(`/groups/${group.id}`)}
                  className="mx-4 p-4 bg-card border border-border rounded-xl cursor-pointer hover:border-accent/50 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-14 h-14 rounded-lg bg-gradient-to-br ${group.color} flex items-center justify-center flex-shrink-0`}>
                      <Users className="w-6 h-6 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="text-foreground font-medium group-hover:text-accent transition-colors">
                          {group.name}
                        </h3>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-accent transition-colors" />
                      </div>
                      <span className="inline-block bg-accent/10 text-accent text-xs px-2 py-0.5 rounded mb-2">
                        {group.category}
                      </span>
                      <div className="flex items-center gap-1 mb-2">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground truncate">{group.recentActivity}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            <span>{group.members} members</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" />
                            <span>{group.messages}</span>
                          </div>
                        </div>
                        <div className="flex -space-x-2">
                          {group.memberAvatars.slice(0, 3).map((avatar, i) => (
                            <div
                              key={i}
                              className="w-6 h-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-medium border-2 border-card"
                            >
                              {avatar}
                            </div>
                          ))}
                          {group.memberAvatars.length > 3 && (
                            <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-medium border-2 border-card">
                              +{group.memberAvatars.length - 3}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Discover Groups */}
        {discoverGroups.length > 0 && (
          <div className="mb-6">
            <h2 className="text-foreground font-medium px-4 mb-3">Recommended Groups</h2>
            <div className="px-4 space-y-3">
              {discoverGroups.map((group, index) => {
                // Alternate between different card styles
                const isLarge = index % 3 === 0;

                if (isLarge) {
                  return (
                    <div
                      key={`discover-${group.id}`}
                      onClick={() => navigate(`/groups/${group.id}`)}
                      className={`p-5 bg-gradient-to-br ${group.color} border border-border rounded-xl cursor-pointer hover:border-accent/50 transition-all`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-foreground font-medium text-lg mb-1">{group.name}</h3>
                          <span className="inline-block bg-accent/10 text-accent text-xs px-2 py-1 rounded">
                            {group.category}
                          </span>
                        </div>
                        {group.trending && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-accent/10 rounded">
                            <Activity className="w-3 h-3 text-accent" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">{group.recentActivity}</p>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{group.members}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageCircle className="w-4 h-4" />
                            <span>{group.messages}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-muted-foreground">{group.activeNow} online</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex -space-x-2">
                          {group.memberAvatars.slice(0, 4).map((avatar, i) => (
                            <div
                              key={i}
                              className="w-7 h-7 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-medium border-2 border-card"
                            >
                              {avatar}
                            </div>
                          ))}
                          {group.memberAvatars.length > 4 && (
                            <div className="w-7 h-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-medium border-2 border-card">
                              +{group.memberAvatars.length - 4}
                            </div>
                          )}
                        </div>
                        <button className="px-4 py-2 bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg transition-colors text-sm">
                          Join
                        </button>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div
                      key={`discover-${group.id}`}
                      onClick={() => navigate(`/groups/${group.id}`)}
                      className="p-4 bg-card border border-border rounded-xl cursor-pointer hover:border-accent/50 transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${group.color} flex items-center justify-center flex-shrink-0`}>
                          <Users className="w-5 h-5 text-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1">
                            <h3 className="text-foreground font-medium group-hover:text-accent transition-colors">
                              {group.name}
                            </h3>
                            {group.trending && (
                              <Activity className="w-4 h-4 text-accent" />
                            )}
                          </div>
                          <span className="inline-block bg-accent/10 text-accent text-xs px-2 py-0.5 rounded mb-2">
                            {group.category}
                          </span>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              <span>{group.members}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageCircle className="w-3 h-3" />
                              <span>{group.messages}</span>
                            </div>
                            <div className="flex items-center gap-1 ml-auto">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span>{group.activeNow}</span>
                            </div>
                          </div>
                          <button className="w-full py-1.5 bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg transition-colors text-xs">
                            Join Group
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="w-full max-w-md mx-auto bg-background rounded-t-3xl p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl text-foreground">Create Group</h2>
              <button
                onClick={() => setShowCreateGroup(false)}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-foreground mb-2">Group Name</label>
                <input
                  type="text"
                  placeholder="e.g., Tech Entrepreneurs"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div>
                <label className="block text-sm text-foreground mb-2">Description</label>
                <textarea
                  placeholder="What's this group about?"
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground resize-none"
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-sm text-foreground mb-2">Category</label>
                <select
                  value={newGroupCategory}
                  onChange={(e) => setNewGroupCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground"
                >
                  <option value="Industry">Industry</option>
                  <option value="Cohort">Cohort</option>
                  <option value="Location">Location</option>
                  <option value="Interest">Interest</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-foreground mb-2">Privacy</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 bg-muted border border-border rounded-xl cursor-pointer hover:bg-secondary transition-colors">
                    <input
                      type="radio"
                      name="privacy"
                      defaultChecked
                      className="w-4 h-4 text-accent"
                    />
                    <div>
                      <p className="text-sm text-foreground font-medium">Public</p>
                      <p className="text-xs text-muted-foreground">Anyone can see and join</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-muted border border-border rounded-xl cursor-pointer hover:bg-secondary transition-colors">
                    <input
                      type="radio"
                      name="privacy"
                      className="w-4 h-4 text-accent"
                    />
                    <div>
                      <p className="text-sm text-foreground font-medium">Private</p>
                      <p className="text-xs text-muted-foreground">Invite only</p>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm text-foreground mb-2">Group Rules</label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add a rule for this group"
                      value={currentRule}
                      onChange={(e) => setCurrentRule(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddRule()}
                      className="flex-1 px-4 py-2.5 bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground"
                    />
                    <button
                      onClick={handleAddRule}
                      disabled={!currentRule.trim()}
                      className="px-4 py-2.5 bg-accent text-accent-foreground rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add
                    </button>
                  </div>

                  {groupRules.length > 0 && (
                    <div className="space-y-2 mt-3">
                      {groupRules.map((rule, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 p-3 bg-muted border border-border rounded-xl"
                        >
                          <span className="text-sm text-accent font-medium flex-shrink-0 mt-0.5">
                            {index + 1}.
                          </span>
                          <p className="flex-1 text-sm text-foreground">{rule}</p>
                          <button
                            onClick={() => handleRemoveRule(index)}
                            className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {groupRules.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Add rules to help set expectations for group members
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateGroup(false)}
                className="flex-1 px-4 py-3 border border-border text-foreground rounded-xl hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim() || !newGroupDescription.trim()}
                className="flex-1 px-4 py-3 bg-accent text-accent-foreground rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}