"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Users } from "lucide-react";

export function MobileEventsPage() {
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
    <div className="p-4 pb-24">
      <div className="mb-4">
        <h1 className="text-2xl text-foreground mb-1">Events</h1>
        <p className="text-sm text-muted-foreground">
          Discover upcoming opportunities
        </p>
      </div>

      <div className="space-y-3">
        {events.map((event) => (
          <Card key={event.id} className="p-4 bg-card border-border">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-foreground font-medium flex-1">
                {event.title}
              </h3>
              {event.registered && (
                <Badge className="bg-accent text-accent-foreground text-xs">
                  Registered
                </Badge>
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
              <Button
                variant="outline"
                size="sm"
                className="w-full border-border text-foreground"
              >
                View Details
              </Button>
            ) : (
              <Button
                size="sm"
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                Register
              </Button>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
