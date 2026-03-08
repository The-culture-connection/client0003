import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import {
  MessageSquare,
  Calendar,
  Users,
  Clock,
  MapPin,
  Send,
  Search,
  Pin,
  Flame,
  MessageCircle,
  Eye,
  ThumbsUp,
  UserPlus,
  Coffee,
  Lightbulb,
  Rocket,
  ArrowRight,
} from "lucide-react";
import { Avatar } from "../../components/ui/avatar";
import { StartDiscussionDialog } from "../../components/discussions/StartDiscussionDialog";
import {
  getDiscussions,
  type Discussion,
  getReplyCount as getReplyCountUtil,
} from "../../lib/discussions";

export function WebCommunityHub() {
  const navigate = useNavigate();
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadDiscussions();
  }, []);

  const loadDiscussions = () => {
    const allDiscussions = getDiscussions();
    // Sort by: pinned first, then by updatedAt (most recent first)
    const sorted = allDiscussions.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
    // Show only first 4 for preview
    setDiscussions(sorted.slice(0, 4));
  };

  const formatTimeAgo = (timestamp: any): string => {
    if (!timestamp) return "No messages";
    const date = timestamp instanceof Date 
      ? timestamp 
      : timestamp?.toDate 
        ? timestamp.toDate() 
        : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "just now";
  };

  const getReplyCount = (discussion: Discussion): number => {
    return getReplyCountUtil(discussion);
  };

  const events = [
    {
      id: 1,
      title: "Networking Workshop",
      type: "Workshop",
      date: "Feb 28, 2026",
      time: "2:00 PM - 4:00 PM",
      location: "Cincinnati Hub",
      attendees: 24,
      capacity: 30,
      host: "Grace Stewart",
      description: "Learn networking strategies for entrepreneurs",
      icon: Users,
      color: "accent",
    },
    {
      id: 2,
      title: "Coffee Chat - Cincinnati Cohort",
      type: "Social",
      date: "Mar 2, 2026",
      time: "10:00 AM - 11:30 AM",
      location: "Iris Cafe Downtown",
      attendees: 8,
      capacity: 12,
      host: "Alex Rivera",
      description: "Casual coffee meetup for Cincinnati entrepreneurs",
      icon: Coffee,
      color: "blue",
    },
    {
      id: 3,
      title: "Guest Speaker Series: Scaling Your Startup",
      type: "Webinar",
      date: "Mar 10, 2026",
      time: "6:00 PM - 7:30 PM",
      location: "Virtual",
      attendees: 45,
      capacity: 100,
      host: "MORTAR Team",
      description: "Industry leader shares scaling strategies",
      icon: Rocket,
      color: "purple",
    },
    {
      id: 4,
      title: "Pitch Practice Session",
      type: "Workshop",
      date: "Mar 15, 2026",
      time: "3:00 PM - 5:00 PM",
      location: "Cincinnati Hub",
      attendees: 12,
      capacity: 15,
      host: "Marcus Lee",
      description: "Practice your pitch and get feedback",
      icon: Lightbulb,
      color: "yellow",
    },
  ];

  const [groups, setGroups] = useState<any[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [realEvents, setRealEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    loadGroups();
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoadingEvents(true);
    try {
      const { getEvents } = await import("../../lib/events");
      const allEvents = await getEvents();
      // Filter for upcoming events (date >= today) and get first 4
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const upcoming = allEvents.filter((event) => {
        const eventDate = event.date.toDate ? event.date.toDate() : new Date(event.date);
        return eventDate >= today;
      });
      // Sort by date (earliest first) and get first 4
      upcoming.sort((a, b) => {
        const dateA = a.date.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date.toDate ? b.date.toDate() : new Date(b.date);
        return dateA.getTime() - dateB.getTime();
      });
      setRealEvents(upcoming.slice(0, 4));
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setLoadingEvents(false);
    }
  };

  const loadGroups = async () => {
    setLoadingGroups(true);
    try {
      const { getGroups, getLastGroupMessage, getMemberCount } = await import("../../lib/groups");
      const allGroups = await getGroups();
      
      // Fetch last message and member count for each group
      const groupsWithDetails = await Promise.all(
        allGroups.map(async (group) => {
          const lastMessage = await getLastGroupMessage(group.id);
          const memberCount = getMemberCount(group);
          return {
            ...group,
            lastMessage: lastMessage?.Content || "No messages yet",
            lastMessageTime: lastMessage?.Sendtime || null,
            members: memberCount,
          };
        })
      );

      // Sort by last message time (most recent first)
      groupsWithDetails.sort((a, b) => {
        if (!a.lastMessageTime && !b.lastMessageTime) return 0;
        if (!a.lastMessageTime) return 1;
        if (!b.lastMessageTime) return -1;
        return b.lastMessageTime.toMillis() - a.lastMessageTime.toMillis();
      });

      setGroups(groupsWithDetails);
    } catch (error) {
      console.error("Error loading groups:", error);
    } finally {
      setLoadingGroups(false);
    }
  };



  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">
          Community Hub
        </h1>
        <p className="text-sm text-muted-foreground">
          Connect, learn, and grow with fellow entrepreneurs
        </p>
      </div>

      {/* Featured Event Hero */}
      {loadingEvents ? (
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
          </div>
        </Card>
      ) : realEvents.length > 0 ? (
        <Card className="p-6 mb-6 bg-gradient-to-br from-accent/20 via-card to-card border-accent/30 shadow-lg">
          <div className="flex items-start justify-between mb-3">
            <Badge className="bg-accent text-accent-foreground">
              NEXT EVENT
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => navigate("/events")}
            >
              View All
            </Button>
          </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {realEvents[0].title}
            </h2>
            {realEvents[0].details && (
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {realEvents[0].details}
              </p>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Calendar className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="text-sm font-medium text-foreground">
                    {realEvents[0].date.toDate
                      ? realEvents[0].date.toDate().toLocaleDateString()
                      : new Date(realEvents[0].date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Clock className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Time</p>
                  <p className="text-sm font-medium text-foreground">{realEvents[0].time}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-accent/10">
                  <MapPin className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="text-sm font-medium text-foreground">{realEvents[0].location}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
                onClick={() => navigate(`/events/${realEvents[0].id}`)}
              >
                RSVP Now
              </Button>
              <Button
                variant="outline"
                className="border-accent text-accent hover:bg-accent/10"
                onClick={() => navigate("/events")}
              >
                <Calendar className="w-4 h-4 mr-2" />
                View All Events
              </Button>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>
                  {realEvents[0].registered_users?.length || 0}/
                  {realEvents[0].total_spots} attending
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div className="p-8 rounded-full bg-accent/10">
              <Calendar className="w-16 h-16 text-accent" />
            </div>
          </div>
        </div>
      </Card>
      ) : null}

      {/* Discussions and Forums/Chats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Discussions Widget */}
        <div className="lg:col-span-2">
          <Card className="p-5 bg-card border-border shadow-md">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => navigate("/discussions")}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <h2 className="text-lg font-bold text-foreground">Discussions</h2>
                <MessageSquare className="w-5 h-5 text-accent" />
              </button>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search discussions..."
                className="pl-10"
              />
            </div>

            <div className="space-y-3 mb-4">
              {discussions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No discussions yet. Start the first one!</p>
                </div>
              ) : (
                discussions.map((discussion) => (
                  <div
                    key={discussion.id}
                    className="p-3 rounded-lg border border-border hover:border-accent transition-all cursor-pointer bg-card"
                    onClick={() => navigate(`/discussions/${discussion.id}`)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <Avatar className="w-9 h-9 bg-accent/10 text-accent flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold">
                          {discussion.author.substring(0, 2).toUpperCase()}
                        </span>
                      </Avatar>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5 mb-1">
                              {discussion.isPinned && (
                                <Pin className="w-3 h-3 text-accent" />
                              )}
                              {discussion.isHot && (
                                <Flame className="w-3 h-3 text-orange-500" />
                              )}
                              <h3 className="text-sm font-medium text-foreground line-clamp-1">
                                {discussion.title}
                              </h3>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Anonymous • {formatTimeAgo(discussion.createdAt)}
                            </p>
                          </div>
                          <Badge className="bg-accent/10 text-accent text-xs shrink-0">
                            {discussion.category}
                          </Badge>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                          <div className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" />
                            <span>{getReplyCount(discussion)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            <span>{discussion.views}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ThumbsUp className="w-3 h-3" />
                            <span>{discussion.likes}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => setDialogOpen(true)}
                className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                <Send className="w-4 h-4 mr-2" />
                Start New Discussion
              </Button>
              {discussions.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => navigate("/discussions")}
                  className="border-accent text-accent hover:bg-accent/10"
                >
                  View All
                </Button>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column - Groups */}
        <div className="lg:col-span-1 space-y-6">
          {/* Groups */}
          <Card className="p-5 bg-card border-border shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Groups</h2>
              <MessageCircle className="w-5 h-5 text-accent" />
            </div>
            <div className="space-y-2.5 mb-4">
              {loadingGroups ? (
                <div className="text-center py-4 text-muted-foreground">
                  <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-xs">Loading groups...</p>
                </div>
              ) : groups.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No groups available</p>
                </div>
              ) : (
                groups.map((group) => (
                  <div
                    key={group.id}
                    className="p-2.5 rounded-lg bg-muted/50 border border-border hover:border-accent transition-all cursor-pointer"
                    onClick={() => navigate(`/groups/${group.id}`)}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-accent" />
                        <span className="text-sm font-medium text-foreground">
                          {group.Name}
                        </span>
                      </div>
                      <Badge
                        variant={group.Status === "Open" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {group.Status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1 line-clamp-1 pl-6">
                      {group.lastMessage}
                    </p>
                    <div className="flex items-center justify-between pl-6">
                      <p className="text-xs text-muted-foreground">
                        {group.members} {group.members === 1 ? "member" : "members"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTimeAgo(group.lastMessageTime)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

        </div>
      </div>

      <StartDiscussionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={loadDiscussions}
      />
    </div>
  );
}
