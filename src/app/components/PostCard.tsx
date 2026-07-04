import { Heart, MessageSquare, Share2, MoreVertical } from 'lucide-react';
import { Badge, type BadgeType } from './Badge';
import { useState } from 'react';
import { cn } from '../lib/utils';

interface PostCardProps {
  author: {
    name: string;
    avatar: string;
    title: string;
    badge?: BadgeType;
  };
  content: string;
  image?: string;
  timestamp: string;
  likes: number;
  comments: number;
}

export function PostCard({ author, content, image, timestamp, likes, comments }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(likes);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
  };

  return (
    <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          <img
            src={author.avatar}
            alt={author.name}
            className="w-12 h-12 rounded-full object-cover"
          />
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-medium">{author.name}</h4>
              {author.badge && <Badge type={author.badge} className="w-5 h-5" />}
            </div>
            <p className="text-sm text-muted-foreground">{author.title}</p>
            <p className="text-xs text-muted-foreground">{timestamp}</p>
          </div>
        </div>
        <button className="text-muted-foreground hover:text-foreground p-1">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <p className="mb-3 text-foreground">{content}</p>

      {/* Image */}
      {image && (
        <img
          src={image}
          alt="Post content"
          className="w-full rounded-xl mb-3 object-cover max-h-80"
        />
      )}

      {/* Actions */}
      <div className="flex items-center gap-6 pt-3 border-t border-border">
        <button
          onClick={handleLike}
          className={cn(
            'flex items-center gap-2 transition-colors',
            isLiked ? 'text-accent' : 'text-muted-foreground hover:text-accent'
          )}
        >
          <Heart className={cn('w-5 h-5', isLiked && 'fill-current')} />
          <span className="text-sm">{likeCount}</span>
        </button>
        <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <MessageSquare className="w-5 h-5" />
          <span className="text-sm">{comments}</span>
        </button>
        <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors ml-auto">
          <Share2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
