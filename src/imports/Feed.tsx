import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Heart, MessageCircle, Share2, MoreHorizontal } from "lucide-react";

export function MobileFeed() {
  const posts = [
    {
      id: 1,
      author: "Sarah Johnson",
      role: "Alumni • Class of 2024",
      avatar: "SJ",
      time: "2h ago",
      content:
        "Just landed my dream job at a tech startup! Mortar's program gave me the skills and confidence I needed. Forever grateful! 🚀",
      likes: 24,
      comments: 8,
    },
    {
      id: 2,
      author: "Michael Chen",
      role: "Current Student",
      avatar: "MC",
      time: "5h ago",
      content:
        "Anyone attending the networking workshop tomorrow? Would love to connect!",
      likes: 12,
      comments: 5,
    },
    {
      id: 3,
      author: "Emily Rodriguez",
      role: "Alumni • Class of 2023",
      avatar: "ER",
      time: "1d ago",
      content:
        "Pro tip: Don't skip the financial planning module. It's been invaluable in managing my business finances. Trust the process! 💼",
      likes: 45,
      comments: 15,
    },
  ];

  return (
    <div className="p-4 pb-24">
      <div className="mb-4">
        <h1 className="text-2xl text-foreground mb-1">Feed</h1>
        <p className="text-sm text-muted-foreground">
          Stay connected with the community
        </p>
      </div>

      <div className="space-y-4">
        {posts.map((post) => (
          <Card key={post.id} className="p-4 bg-card border-border">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-medium">
                {post.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-foreground font-medium text-sm">
                  {post.author}
                </h3>
                <p className="text-xs text-muted-foreground">{post.role}</p>
              </div>
              <button className="text-muted-foreground">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>

            <p className="text-foreground text-sm mb-3 leading-relaxed">
              {post.content}
            </p>

            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
              <span>{post.time}</span>
            </div>

            <div className="flex items-center gap-4 pt-3 border-t border-border">
              <button className="flex items-center gap-2 text-muted-foreground hover:text-accent transition-colors">
                <Heart className="w-5 h-5" />
                <span className="text-sm">{post.likes}</span>
              </button>
              <button className="flex items-center gap-2 text-muted-foreground hover:text-accent transition-colors">
                <MessageCircle className="w-5 h-5" />
                <span className="text-sm">{post.comments}</span>
              </button>
              <button className="flex items-center gap-2 text-muted-foreground hover:text-accent transition-colors ml-auto">
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
