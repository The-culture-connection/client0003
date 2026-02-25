import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Calendar, MapPin, Users, Clock, Plus } from "lucide-react";

export function MobileEvents() {
  const mockEvents = [
    {
      id: 1,
      title: "Tech Meetup: AI & Machine Learning",
      type: "user-submitted",
      date: "Feb 16",
      year: "2026",
      time: "7:00 PM",
      location: "Innovation Hub, San Francisco",
      attendees: 24,
      hasFlyer: true,
    },
    {
      id: 2,
      title: "Career Fair - Tech Companies",
      type: "admin",
      date: "Feb 18",
      year: "2026",
      time: "2:00 PM - 6:00 PM",
      location: "Downtown Convention Center",
      attendees: 156,
      hasFlyer: true,
    },
    {
      id: 3,
      title: "Alumni Coffee Networking",
      type: "user-submitted",
      date: "Feb 20",
      year: "2026",
      time: "10:00 AM",
      location: "Starbucks, Market Street",
      attendees: 8,
      hasFlyer: false,
    },
    {
      id: 4,
      title: "Workshop: Resume Building",
      type: "admin",
      date: "Feb 22",
      year: "2026",
      time: "6:00 PM",
      location: "Online",
      attendees: 67,
      hasFlyer: true,
    },
  ];

  return (
    <div className="bg-background pb-4">
      {/* Header */}
      <div className="bg-card border-b border-border p-4 sticky top-0 z-10">
        <h1 className="text-xl text-foreground">Events</h1>
        <p className="text-sm text-muted-foreground mt-1">Discover & attend events</p>
      </div>

      {/* Create Event Button */}
      <div className="p-4 border-b border-border">
        <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
          <Plus className="w-4 h-4 mr-2" />
          Submit Event
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="p-4 border-b border-border">
        <div className="flex gap-2 overflow-x-auto">
          <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">
            Upcoming
          </Button>
          <Button size="sm" variant="outline" className="border-border whitespace-nowrap">
            This Week
          </Button>
          <Button size="sm" variant="outline" className="border-border whitespace-nowrap">
            My Events
          </Button>
        </div>
      </div>

      {/* Events List */}
      <div className="p-4 space-y-4">
        {mockEvents.map((event) => (
          <Card key={event.id} className="bg-card border-border overflow-hidden">
            {/* Flyer Preview */}
            {event.hasFlyer && (
              <div className="h-32 bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center border-b border-border">
                <Calendar className="w-12 h-12 text-accent/50" />
              </div>
            )}

            <div className="p-4">
              {/* Event Type Badge */}
              <Badge
                className={
                  event.type === "admin"
                    ? "bg-accent text-accent-foreground mb-3"
                    : "bg-muted text-muted-foreground mb-3"
                }
              >
                {event.type === "admin" ? "Official Event" : "Community Event"}
              </Badge>

              {/* Event Title */}
              <h3 className="text-foreground mb-3">{event.title}</h3>

              {/* Event Details */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {event.date}, {event.year}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{event.time}</span>
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

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  RSVP
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-border"
                >
                  Add to Calendar
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
