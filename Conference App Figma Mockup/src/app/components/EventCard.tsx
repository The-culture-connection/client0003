import { Calendar, MapPin, Users } from 'lucide-react';
import { Button } from './Button';
import { useState } from 'react';
import { cn } from '../lib/utils';

interface EventCardProps {
  event: {
    id: string;
    title: string;
    date: string;
    time: string;
    location: string;
    image: string;
    attendees: number;
    status?: 'pending' | 'approved' | 'rejected';
  };
  onRSVP?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  showAdminActions?: boolean;
}

export function EventCard({ event, onRSVP, onApprove, onReject, showAdminActions }: EventCardProps) {
  const [isRSVPd, setIsRSVPd] = useState(false);

  const handleRSVP = () => {
    setIsRSVPd(!isRSVPd);
    onRSVP?.();
  };

  return (
    <div className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border">
      {/* Image */}
      <div className="relative">
        <img
          src={event.image}
          alt={event.title}
          className="w-full h-48 object-cover"
        />
        {event.status && (
          <div
            className={cn(
              'absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-medium',
              {
                'bg-amber-100 text-amber-700': event.status === 'pending',
                'bg-green-100 text-green-700': event.status === 'approved',
                'bg-red-100 text-red-700': event.status === 'rejected',
              }
            )}
          >
            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-medium mb-3">{event.title}</h3>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{event.date} at {event.time}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{event.location}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{event.attendees} attending</span>
          </div>
        </div>

        {/* Admin Actions */}
        {showAdminActions && event.status === 'pending' && (
          <div className="flex gap-2">
            <Button onClick={onApprove} variant="primary" className="flex-1" size="sm">
              Approve
            </Button>
            <Button onClick={onReject} variant="outline" className="flex-1" size="sm">
              Reject
            </Button>
          </div>
        )}

        {/* RSVP Action */}
        {!showAdminActions && onRSVP && (
          <Button
            onClick={handleRSVP}
            variant={isRSVPd ? 'secondary' : 'primary'}
            className="w-full"
          >
            {isRSVPd ? 'Going ✓' : 'RSVP'}
          </Button>
        )}
      </div>
    </div>
  );
}
