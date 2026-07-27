import { Calendar, Clock, MapPin, Users, Plus } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { useNavigate } from 'react-router';

export default function Events() {
  const navigate = useNavigate();
  
  const events = [
    {
      id: 1,
      title: "Networking Workshop",
      date: "Feb 28",
      time: "2:00 PM",
      location: "Main Hall",
      attendees: 45,
      maxAttendees: 50,
      registered: true,
    },
    {
      id: 2,
      title: "Guest Speaker Series",
      date: "Mar 2",
      time: "6:00 PM",
      location: "Auditorium",
      attendees: 120,
      maxAttendees: 150,
      registered: false,
    },
    {
      id: 3,
      title: "Career Fair 2026",
      date: "Mar 5",
      time: "10:00 AM",
      location: "Exhibition Center",
      attendees: 200,
      maxAttendees: 300,
      registered: true,
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background z-10 border-b border-border px-4 py-4">
          <h1 className="text-2xl text-foreground mb-1">Events</h1>
          <p className="text-sm text-muted-foreground">
            Discover upcoming opportunities
          </p>
        </div>

        {/* Events List */}
        <div className="p-4 space-y-3">
          {events.map((event) => (
            <div key={event.id} className="p-4 bg-card border border-border rounded-xl">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-foreground font-medium flex-1">
                  {event.title}
                </h3>
                {event.registered && (
                  <span className="bg-accent text-accent-foreground text-xs px-2 py-1 rounded">
                    Registered
                  </span>
                )}
              </div>

              <div className="space-y-2 text-sm text-muted-foreground mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{event.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{event.time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{event.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>
                    {event.attendees}/{event.maxAttendees} attending
                  </span>
                </div>
              </div>

              {event.registered ? (
                <button className="w-full py-2 border border-border text-foreground rounded-lg hover:bg-secondary transition-colors">
                  View Details
                </button>
              ) : (
                <button className="w-full py-2 bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg transition-colors">
                  Register
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Floating Action Button */}
        <button 
          onClick={() => navigate('/events/create')}
          className="fixed bottom-24 right-6 w-14 h-14 bg-accent text-accent-foreground rounded-full shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center z-40"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      <BottomNav />
    </div>
  );
}