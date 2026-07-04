import { Users } from 'lucide-react';
import { Button } from './Button';
import { useState } from 'react';

interface GroupCardProps {
  group: {
    id: string;
    name: string;
    description: string;
    members: number;
    image: string;
  };
  onJoin?: () => void;
  onClick?: () => void;
}

export function GroupCard({ group, onJoin, onClick }: GroupCardProps) {
  const [isJoined, setIsJoined] = useState(false);

  const handleJoin = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsJoined(!isJoined);
    onJoin?.();
  };

  return (
    <div
      onClick={onClick}
      className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border cursor-pointer hover:shadow-md transition-shadow"
    >
      <img
        src={group.image}
        alt={group.name}
        className="w-full h-32 object-cover"
      />
      <div className="p-4">
        <h3 className="font-medium mb-2">{group.name}</h3>
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{group.description}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{group.members} members</span>
          </div>
          <Button
            onClick={handleJoin}
            variant={isJoined ? 'secondary' : 'primary'}
            size="sm"
          >
            {isJoined ? 'Joined' : 'Join'}
          </Button>
        </div>
      </div>
    </div>
  );
}
