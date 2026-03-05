"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Link from "next/link";
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
  DollarSign,
  Rocket,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { useDiscussionThreads } from "@/lib/hooks/useDiscussionThreads";
import { useEvents } from "@/lib/hooks/useEvents";

export function CommunityHubPage() {
  const { threads, loading: threadsLoading } = useDiscussionThreads();
  const { events, loading: eventsLoading } = useEvents("upcoming");

  // Featured event (next upcoming)
  const featuredEvent = events?.[0];

  const chatRooms = [
    {
      id: 1,
      name: "Fall 2026 Cohort",
      members: 28,
      lastMessage: "Anyone want to grab lunch tomorrow?",
      lastMessageTime: "5 min ago",
      unread: 3,
      isActive: true,
    },
    {
      id: 2,
      name: "Cincinnati Local",
      members: 15,
      lastMessage: "New coffee shop opened on Main St!",
      lastMessageTime: "1h ago",
      unread: 0,
      isActive: true,
    },
    {
      id: 3,
      name: "SaaS Founders",
      members: 42,
      lastMessage: "Check out this article on pricing...",
      lastMessageTime: "2h ago",
      unread: 1,
      isActive: false,
    },
    {
      id: 4,
      name: "Accountability Partners",
      members: 8,
      lastMessage: "Weekly goals check-in!",
      lastMessageTime: "4h ago",
      unread: 0,
      isActive: false,
    },
  ];

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
      {featuredEvent && (
        <Card className="p-6 mb-6 bg-gradient-to-br from-accent/20 via-card to-card border-accent/30 shadow-lg">
          <div className="flex items-start justify-between mb-3">
            <Badge className="bg-accent text-accent-foreground">
              NEXT EVENT
            </Badge>
            <Badge className="bg-accent/10 text-accent">
              {featuredEvent.event_type}
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {featuredEvent.title}
              </h2>
              {featuredEvent.description && (
                <p className="text-sm text-muted-foreground mb-4">
                  {featuredEvent.description}
                </p>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {featuredEvent.event_date && (
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-accent/10">
                      <Calendar className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="text-sm font-medium text-foreground">
                        {featuredEvent.event_date?.toDate?.()?.toLocaleDateString() || "TBD"}
                      </p>
                    </div>
                  </div>
                )}
                {featuredEvent.event_time && (
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-accent/10">
                      <Clock className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Time</p>
                      <p className="text-sm font-medium text-foreground">{featuredEvent.event_time}</p>
                    </div>
                  </div>
                )}
                {featuredEvent.location && (
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-accent/10">
                      <MapPin className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p className="text-sm font-medium text-foreground">{featuredEvent.location}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Link href={`/events`}>
                  <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                    RSVP Now
                  </Button>
                </Link>
                <Link href="/events">
                  <Button variant="outline" className="border-accent text-accent hover:bg-accent/10">
                    <Calendar className="w-4 h-4 mr-2" />
                    View All Events
                  </Button>
                </Link>
                {featuredEvent.max_attendees && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>0/{featuredEvent.max_attendees} attending</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center">
              <div className="p-8 rounded-full bg-accent/10">
                <Calendar className="w-16 h-16 text-accent" />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Discussions and Forums/Chats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Discussions Widget */}
        <div className="lg:col-span-2">
          <Card className="p-5 bg-card border-border shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Discussions</h2>
              <MessageSquare className="w-5 h-5 text-accent" />
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search discussions..."
                className="pl-10"
              />
            </div>

            {threadsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  {threads.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No discussions yet. Start the conversation!
                    </p>
                  ) : (
                    threads.map((discussion) => (
                      <div
                        key={discussion.id}
                        className="p-3 rounded-lg border border-border hover:border-accent transition-all cursor-pointer bg-card"
                      >
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <Avatar className="w-9 h-9 bg-accent/10 text-accent flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold">
                              {discussion.author_name?.charAt(0) || "U"}
                            </span>
                          </Avatar>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div className="flex-1">
                                <div className="flex items-center gap-1.5 mb-1">
                                  {discussion.is_pinned && (
                                    <Pin className="w-3 h-3 text-accent" />
                                  )}
                                  <h3 className="text-sm font-medium text-foreground line-clamp-1">
                                    {discussion.title}
                                  </h3>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  by {discussion.author_name || "Unknown"} •{" "}
                                  {discussion.created_at?.toDate?.()?.toLocaleDateString() || "Recently"}
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
                                <span>{discussion.reply_count || 0}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                <span>{discussion.view_count || 0}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <ThumbsUp className="w-3 h-3" />
                                <span>{discussion.like_count || 0}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                  <Send className="w-4 h-4 mr-2" />
                  Start New Discussion
                </Button>
              </>
            )}
          </Card>
        </div>

        {/* Right Column - Forums Categories & Group Chats */}
        <div className="space-y-6">
          {/* Forum Categories */}
          <Card className="p-5 bg-card border-border shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Forums</h2>
              <TrendingUp className="w-5 h-5 text-accent" />
            </div>
            <div className="space-y-2">
              {[
                { name: "Idea Validation", count: 12, icon: Lightbulb },
                { name: "Funding", count: 8, icon: DollarSign },
                { name: "Marketing", count: 15, icon: TrendingUp },
                { name: "Product", count: 10, icon: Rocket },
                { name: "General", count: 18, icon: MessageSquare },
              ].map((cat, idx) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={idx}
                    className="w-full flex items-center justify-between p-2.5 rounded hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-accent" />
                      <span className="text-sm text-foreground">{cat.name}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {cat.count}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Group Chats */}
          <Card className="p-5 bg-card border-border shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Group Chats</h2>
              <MessageCircle className="w-5 h-5 text-accent" />
            </div>
            <div className="space-y-2.5 mb-4">
              {chatRooms.map((room) => (
                <div
                  key={room.id}
                  className="p-2.5 rounded-lg bg-muted/50 border border-border hover:border-accent transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <MessageCircle className="w-4 h-4 text-accent" />
                        {room.isActive && (
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                        )}
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {room.name}
                      </span>
                    </div>
                    {room.unread > 0 && (
                      <Badge className="bg-accent text-accent-foreground text-xs h-5">
                        {room.unread}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-1 line-clamp-1 pl-6">
                    {room.lastMessage}
                  </p>
                  <div className="flex items-center justify-between pl-6">
                    <p className="text-xs text-muted-foreground">
                      {room.members} members
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {room.lastMessageTime}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-accent border-accent"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Create Group
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
