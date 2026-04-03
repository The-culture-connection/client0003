import { cn } from '../lib/utils';
import { Award, Sparkles, Star, Trophy, Zap } from 'lucide-react';

const badgeIcons = {
  mentor: Award,
  innovator: Sparkles,
  leader: Star,
  contributor: Trophy,
  expert: Zap,
};

export type BadgeType = keyof typeof badgeIcons;

interface BadgeProps {
  type: BadgeType;
  className?: string;
}

export function Badge({ type, className }: BadgeProps) {
  const Icon = badgeIcons[type];
  
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center w-8 h-8 rounded-full bg-accent/10 text-accent',
        className
      )}
      title={type.charAt(0).toUpperCase() + type.slice(1)}
    >
      <Icon className="w-4 h-4" />
    </div>
  );
}
