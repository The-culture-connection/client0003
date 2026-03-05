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

export function WebCommunityHub() {
  const discussions = [
    {
      id: 1,
      title: "Best strategies for validating a SaaS idea?",
      author: "Alex Rivera",
      avatar: "AR",
      category: "Idea Validation",
      replies: 24,
      views: 342,
      likes: 18,
      isPinned: true,
      isHot: true,
      lastActivity: "2h ago",
      tags: ["SaaS", "Validation", "Research"],
    },
    {
      id: 2,
      title: "Funding Strategy Discussion - Pre-seed round insights",
      author: "Marcus Lee",
      avatar: "ML",
      category: "Funding",
      replies: 31,
      views: 521,
      likes: 29,
      isPinned: false,
      isHot: true,
      lastActivity: "3h ago",
      tags: ["Funding", "Pre-seed", "Investors"],
    },
    {
      id: 3,
      title: "How to price your first product?",
      author: "Sarah Kim",
      avatar: "SK",
      category: "Pricing",
      replies: 15,
      views: 198,
      likes: 12,
      isPinned: false,
      isHot: false,
      lastActivity: "5h ago",
      tags: ["Pricing", "Strategy"],
    },
    {
      id: 4,
      title: "Marketing workshop recap - Key takeaways",
      author: "Jordan Park",
      avatar: "JP",
      category: "Marketing",
      replies: 8,
      views: 156,
      likes: 22,
      isPinned: false,
      isHot: false,
      lastActivity: "1d ago",
      tags: ["Marketing", "Workshop"],
    },
  ];

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

  // Featured event (next upcoming)
  const featuredEvent = events[0];

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
      <Card className="p-6 mb-6 bg-gradient-to-br from-accent/20 via-card to-card border-accent/30 shadow-lg">
        <div className="flex items-start justify-between mb-3">
          <Badge className="bg-accent text-accent-foreground">
            NEXT EVENT
          </Badge>
          <Badge className="bg-accent/10 text-accent">
            {featuredEvent.type}
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {featuredEvent.title}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {featuredEvent.description}
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Calendar className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="text-sm font-medium text-foreground">{featuredEvent.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Clock className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Time</p>
                  <p className="text-sm font-medium text-foreground">{featuredEvent.time}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-accent/10">
                  <MapPin className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="text-sm font-medium text-foreground">{featuredEvent.location}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                RSVP Now
              </Button>
              <Link href="/events">
                <Button variant="outline" className="border-accent text-accent hover:bg-accent/10">
                  <Calendar className="w-4 h-4 mr-2" />
                  View All Events
                </Button>
              </Link>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>{featuredEvent.attendees}/{featuredEvent.capacity} attending</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div className="p-8 rounded-full bg-accent/10">
              {(() => {
                const Icon = featuredEvent.icon;
                return <Icon className="w-16 h-16 text-accent" />;
              })()}
            </div>
          </div>
        </div>
      </Card>

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

            <div className="space-y-3 mb-4">
              {discussions.map((discussion) => (
                <div
                  key={discussion.id}
                  className="p-3 rounded-lg border border-border hover:border-accent transition-all cursor-pointer bg-card"
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <Avatar className="w-9 h-9 bg-accent/10 text-accent flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold">{discussion.avatar}</span>
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
                            by {discussion.author} • {discussion.lastActivity}
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
                          <span>{discussion.replies}</span>
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
              ))}
            </div>

            <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
              <Send className="w-4 h-4 mr-2" />
              Start New Discussion
            </Button>
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
