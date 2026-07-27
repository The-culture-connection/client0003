import { MessageCircle, Bookmark, UserPlus } from 'lucide-react';
import { Badge, type BadgeType } from './Badge';
import { SkillChip } from './SkillChip';
import { Button } from './Button';

interface UserCardProps {
  user: {
    name: string;
    avatar: string;
    title: string;
    organization: string;
    badges?: BadgeType[];
    skillsOffered?: string[];
    skillsNeeded?: string[];
  };
  onConnect?: () => void;
  onMessage?: () => void;
  onSave?: () => void;
}

export function UserCard({ user, onConnect, onMessage, onSave }: UserCardProps) {
  return (
    <div className="bg-card rounded-2xl p-5 shadow-md border border-border">
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <img
          src={user.avatar}
          alt={user.name}
          className="w-16 h-16 rounded-full object-cover"
        />
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium">{user.name}</h3>
              <p className="text-sm text-muted-foreground">{user.title}</p>
              <p className="text-sm text-muted-foreground">{user.organization}</p>
            </div>
            {onSave && (
              <button
                onClick={onSave}
                className="text-muted-foreground hover:text-accent transition-colors p-1"
              >
                <Bookmark className="w-5 h-5" />
              </button>
            )}
          </div>
          {user.badges && user.badges.length > 0 && (
            <div className="flex gap-1 mt-2">
              {user.badges.map((badge, i) => (
                <Badge key={i} type={badge} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Skills Offered */}
      {user.skillsOffered && user.skillsOffered.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">Can Offer</p>
          <div className="flex flex-wrap gap-2">
            {user.skillsOffered.map((skill, i) => (
              <SkillChip key={i} label={skill} variant="offer" />
            ))}
          </div>
        </div>
      )}

      {/* Skills Needed */}
      {user.skillsNeeded && user.skillsNeeded.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Looking For</p>
          <div className="flex flex-wrap gap-2">
            {user.skillsNeeded.map((skill, i) => (
              <SkillChip key={i} label={skill} variant="need" />
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {onConnect && (
          <Button onClick={onConnect} variant="primary" className="flex-1">
            <UserPlus className="w-4 h-4" />
            Connect
          </Button>
        )}
        {onMessage && (
          <Button onClick={onMessage} variant="outline" className="flex-1">
            <MessageCircle className="w-4 h-4" />
            Message
          </Button>
        )}
      </div>
    </div>
  );
}
