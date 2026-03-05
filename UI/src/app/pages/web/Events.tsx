import { useState } from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  Filter,
} from "lucide-react";

export function WebEvents() {
  const [filter, setFilter] = useState<"all" | "upcoming" | "registered">(
    "all"
  );

  const events = [
    {
      id: 1,
      title: "Networking Workshop",
      date: "Feb 28, 2026",
      time: "2:00 PM - 4:00 PM",
      location: "Main Hall",
      attendees: 45,
      maxAttendees: 50,
      registered: true,
      type: "workshop",
    },
    {
      id: 2,
      title: "Guest Speaker: Tech Entrepreneurship",
      date: "Mar 2, 2026",
      time: "6:00 PM - 7:30 PM",
      location: "Auditorium",
      attendees: 120,
      maxAttendees: 150,
      registered: false,
      type: "speaker",
    },
    {
      id: 3,
      title: "Career Fair 2026",
      date: "Mar 5, 2026",
      time: "10:00 AM - 4:00 PM",
      location: "Exhibition Center",
      attendees: 200,
      maxAttendees: 300,
      registered: true,
      type: "fair",
    },
    {
      id: 4,
      title: "Alumni Mixer",
      date: "Mar 8, 2026",
      time: "7:00 PM - 9:00 PM",
      location: "Rooftop Lounge",
      attendees: 30,
      maxAttendees: 40,
      registered: false,
      type: "social",
    },
  ];

  const filteredEvents = events.filter((event) => {
    if (filter === "registered") return event.registered;
    if (filter === "upcoming") return !event.registered;
    return true;
  });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl text-foreground mb-2">Events Hub</h1>
        <p className="text-muted-foreground">
          Discover and register for upcoming events
        </p>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <Filter className="w-5 h-5 text-muted-foreground" />
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
            className={
              filter === "all"
                ? "bg-accent text-accent-foreground"
                : "border-border text-foreground"
            }
          >
            All Events
          </Button>
          <Button
            variant={filter === "upcoming" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("upcoming")}
            className={
              filter === "upcoming"
                ? "bg-accent text-accent-foreground"
                : "border-border text-foreground"
            }
          >
            Upcoming
          </Button>
          <Button
            variant={filter === "registered" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("registered")}
            className={
              filter === "registered"
                ? "bg-accent text-accent-foreground"
                : "border-border text-foreground"
            }
          >
            Registered
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredEvents.map((event) => (
          <Card key={event.id} className="p-6 bg-card border-border">
            <div className="mb-4">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-xl text-foreground font-medium">
                  {event.title}
                </h3>
                {event.registered && (
                  <Badge className="bg-accent text-accent-foreground">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Registered
                  </Badge>
                )}
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
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
            </div>

            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm text-muted-foreground mb-2">
                    Spots Available
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent"
                      style={{
                        width: `${
                          (event.attendees / event.maxAttendees) * 100
                        }%`,
                      }}
                    />
                  </div>
                </div>
                <div className="ml-4">
                  {event.registered ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-border text-foreground"
                    >
                      View Details
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="bg-accent hover:bg-accent/90 text-accent-foreground"
                    >
                      Register
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredEvents.length === 0 && (
        <Card className="p-12 bg-card border-border text-center">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg text-foreground mb-2">No events found</h3>
          <p className="text-muted-foreground">
            Try adjusting your filters to see more events
          </p>
        </Card>
      )}
    </div>
  );
}
