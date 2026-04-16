import { useState } from "react";
import { Card } from "../../components/ui/card";
import { Heart, MessageCircle, Share2, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

type FeedPost = {
  id: number;
  author: string;
  role: string;
  avatar: string;
  time: string;
  content: string;
  likes: number;
  comments: number;
};

const INITIAL_POSTS: FeedPost[] = [
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
    content: "Anyone attending the networking workshop tomorrow? Would love to connect!",
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

export function MobileFeed() {
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [likedByMe, setLikedByMe] = useState<Record<number, boolean>>({});

  const toggleLike = (post: FeedPost) => {
    const liked = Boolean(likedByMe[post.id]);
    setLikedByMe((prev) => ({ ...prev, [post.id]: !liked }));
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id ? { ...p, likes: p.likes + (liked ? -1 : 1) } : p
      )
    );
  };

  const openComments = (post: FeedPost) => {
    toast.message("Comments", {
      description: `This preview thread has ${post.comments} comments. Open Discussions on web for the full forum.`,
    });
  };

  const sharePost = async (post: FeedPost) => {
    const text = `${post.author}: ${post.content.slice(0, 120)}${post.content.length > 120 ? "…" : ""}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Mortar feed", text });
        toast.success("Shared");
        return;
      }
    } catch {
      /* user cancelled share sheet */
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not share or copy this post.");
    }
  };

  return (
    <div className="p-4 pb-24">
      <div className="mb-4">
        <h1 className="text-2xl text-foreground mb-1">Feed</h1>
        <p className="text-sm text-muted-foreground">Stay connected with the community</p>
      </div>

      <div className="space-y-4">
        {posts.map((post) => (
          <Card key={post.id} className="p-4 bg-card border-border">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-medium">
                {post.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-foreground font-medium text-sm">{post.author}</h3>
                <p className="text-xs text-muted-foreground">{post.role}</p>
              </div>
              <button
                type="button"
                className="text-muted-foreground"
                aria-label="More"
                onClick={() =>
                  toast.message("More options", { description: "Reporting and saving posts will live here." })
                }
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>

            <p className="text-foreground text-sm mb-3 leading-relaxed">{post.content}</p>

            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
              <span>{post.time}</span>
            </div>

            <div className="flex items-center gap-4 pt-3 border-t border-border">
              <button
                type="button"
                className={`flex items-center gap-2 transition-colors ${
                  likedByMe[post.id] ? "text-accent" : "text-muted-foreground hover:text-accent"
                }`}
                onClick={() => toggleLike(post)}
              >
                <Heart className={`w-5 h-5 ${likedByMe[post.id] ? "fill-current" : ""}`} />
                <span className="text-sm">{post.likes}</span>
              </button>
              <button
                type="button"
                className="flex items-center gap-2 text-muted-foreground hover:text-accent transition-colors"
                onClick={() => openComments(post)}
              >
                <MessageCircle className="w-5 h-5" />
                <span className="text-sm">{post.comments}</span>
              </button>
              <button
                type="button"
                className="flex items-center gap-2 text-muted-foreground hover:text-accent transition-colors ml-auto"
                onClick={() => void sharePost(post)}
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
