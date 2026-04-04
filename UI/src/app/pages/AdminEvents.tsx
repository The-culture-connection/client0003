import { useState } from 'react';
import { EventCard } from '../components/EventCard';
import { mockEvents } from '../data/mockData';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';

export default function AdminEvents() {
  const navigate = useNavigate();
  const [events, setEvents] = useState(mockEvents);

  const handleApprove = (eventId: string) => {
    setEvents(events.map(e => 
      e.id === eventId ? { ...e, status: 'approved' as const } : e
    ));
  };

  const handleReject = (eventId: string) => {
    setEvents(events.map(e => 
      e.id === eventId ? { ...e, status: 'rejected' as const } : e
    ));
  };

  const pendingEvents = events.filter(e => e.status === 'pending');
  const approvedEvents = events.filter(e => e.status === 'approved');
  const rejectedEvents = events.filter(e => e.status === 'rejected');

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background z-10 border-b border-border px-6 py-4">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl">Event Approvals</h1>
          </div>
          <div className="flex gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Pending: </span>
              <span className="font-medium">{pendingEvents.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Approved: </span>
              <span className="font-medium">{approvedEvents.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Rejected: </span>
              <span className="font-medium">{rejectedEvents.length}</span>
            </div>
          </div>
        </div>

        {/* Pending Events */}
        {pendingEvents.length > 0 && (
          <div className="px-6 py-6">
            <h2 className="font-medium mb-4">Pending Approval</h2>
            <div className="space-y-4">
              {pendingEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  showAdminActions
                  onApprove={() => handleApprove(event.id)}
                  onReject={() => handleReject(event.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Approved Events */}
        {approvedEvents.length > 0 && (
          <div className="px-6 py-6">
            <h2 className="font-medium mb-4">Approved Events</h2>
            <div className="space-y-4">
              {approvedEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        )}

        {/* Rejected Events */}
        {rejectedEvents.length > 0 && (
          <div className="px-6 py-6">
            <h2 className="font-medium mb-4">Rejected Events</h2>
            <div className="space-y-4">
              {rejectedEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
