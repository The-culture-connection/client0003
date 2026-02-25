import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Heart, MessageCircle, Share2, MoreHorizontal, ImageIcon } from "lucide-react";
import { Avatar } from "../../components/ui/avatar";

export function MobileFeed() {
  const mockPosts = [
    {
      id: 1,
      author: "Sarah Johnson",
      role: "Software Engineer",
      badge: "Alumni",
      time: "2h ago",
      content: "Just landed my dream job at a FAANG company! The journey wasn't easy, but the skills I learned here made all the difference. Happy to mentor anyone who's preparing for interviews.",
      likes: 24,
      comments: 8,
      channel: "Career",
    },
    {
      id: 2,
      author: "Michael Chen",
      role: "Product Manager",
      badge: "Founding Member",
      time: "5h ago",
      content: "Looking for recommendations on system design resources. Currently preparing for senior-level interviews. What helped you the most?",
      likes: 15,
      comments: 12,
      channel: "Learning",
    },
    {
      id: 3,
      author: "Jessica Williams",
      role: "UX Designer",
      badge: "Alumni",
      time: "1d ago",
      content: "Excited to share that I'll be speaking at the upcoming design conference! Big thanks to this community for the support and encouragement. 🎉",
      likes: 42,
      comments: 18,
      channel: "Announcements",
    },
  ];

  return (
    <div className="bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border p-4 sticky top-0 z-10">
        <h1 className="text-xl text-foreground">Feed</h1>
        <p className="text-sm text-muted-foreground mt-1">Alumni Network</p>
      </div>

      {/* Channel Filters */}
      <div className="p-4 border-b border-border overflow-x-auto">
        <div className="flex gap-2">
          <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">
            All
          </Button>
          <Button size="sm" variant="outline" className="border-border whitespace-nowrap">
            Career
          </Button>
          <Button size="sm" variant="outline" className="border-border whitespace-nowrap">
            Learning
          </Button>
          <Button size="sm" variant="outline" className="border-border whitespace-nowrap">
            Announcements
          </Button>
        </div>
      </div>

      {/* Create Post */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 bg-accent">
            <span className="text-accent-foreground text-sm">You</span>
          </Avatar>
          <Button
            variant="outline"
            className="flex-1 justify-start text-muted-foreground border-border"
          >
            What's on your mind?
          </Button>
        </div>
      </div>

      {/* Posts Feed */}
      <div className="pb-4">
        {mockPosts.map((post) => (
          <Card key={post.id} className="border-x-0 border-t-0 rounded-none bg-card">
            <div className="p-4">
              {/* Post Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10 bg-accent">
                    <span className="text-accent-foreground text-xs">
                      {post.author.split(" ").map(n => n[0]).join("")}
                    </span>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-foreground text-sm">{post.author}</h4>
                      <Badge className="bg-accent text-accent-foreground text-xs">
                        {post.badge}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{post.role}</p>
                    <p className="text-xs text-muted-foreground">{post.time}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>

              {/* Channel Badge */}
              <Badge variant="outline" className="border-accent text-accent mb-3 text-xs">
                {post.channel}
              </Badge>

              {/* Post Content */}
              <p className="text-foreground mb-4 leading-relaxed">
                {post.content}
              </p>

              {/* Actions */}
              <div className="flex items-center gap-6 pt-3 border-t border-border">
                <button className="flex items-center gap-2 text-muted-foreground hover:text-accent transition-colors">
                  <Heart className="w-5 h-5" />
                  <span className="text-sm">{post.likes}</span>
                </button>
                <button className="flex items-center gap-2 text-muted-foreground hover:text-accent transition-colors">
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-sm">{post.comments}</span>
                </button>
                <button className="flex items-center gap-2 text-muted-foreground hover:text-accent transition-colors">
                  <Share2 className="w-5 h-5" />
                  <span className="text-sm">Share</span>
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
