import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Calendar, MapPin, Users, Clock, CheckCircle2 } from "lucide-react";

export function WebEvents() {
  const mockEvents = [
    {
      id: 1,
      title: "Web Development Workshop",
      type: "webinar",
      date: "February 16, 2026",
      time: "2:00 PM - 4:00 PM EST",
      location: "Online",
      attendees: 45,
      maxAttendees: 100,
      description:
        "Learn modern web development practices and build your first full-stack application.",
      rsvp: true,
    },
    {
      id: 2,
      title: "Career Networking Event",
      type: "in-person",
      date: "February 18, 2026",
      time: "6:00 PM - 9:00 PM EST",
      location: "Tech Hub, San Francisco, CA",
      attendees: 28,
      maxAttendees: 50,
      description:
        "Connect with industry professionals and expand your network in the tech community.",
      rsvp: false,
    },
    {
      id: 3,
      title: "System Design Deep Dive",
      type: "webinar",
      date: "February 20, 2026",
      time: "1:00 PM - 3:00 PM EST",
      location: "Online",
      attendees: 67,
      maxAttendees: 150,
      description:
        "Advanced session on designing scalable systems and architectural patterns.",
      rsvp: true,
    },
    {
      id: 4,
      title: "Alumni Meetup & Q&A",
      type: "in-person",
      date: "February 25, 2026",
      time: "5:00 PM - 8:00 PM EST",
      location: "Innovation Center, New York, NY",
      attendees: 15,
      maxAttendees: 30,
      description:
        "Meet with successful alumni and get insights into their career journeys.",
      rsvp: false,
    },
    {
      id: 5,
      title: "Mock Interview Practice",
      type: "webinar",
      date: "February 28, 2026",
      time: "3:00 PM - 5:00 PM EST",
      location: "Online",
      attendees: 52,
      maxAttendees: 80,
      description:
        "Practice your interview skills with experienced mentors and get personalized feedback.",
      rsvp: false,
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl text-foreground mb-2">Events</h1>
        <p className="text-muted-foreground">
          Join webinars and in-person events to enhance your learning
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
          All Events
        </Button>
        <Button variant="outline" className="border-border">
          Webinars
        </Button>
        <Button variant="outline" className="border-border">
          In-Person
        </Button>
        <Button variant="outline" className="border-border">
          My RSVPs
        </Button>
      </div>

      {/* Events List */}
      <div className="space-y-6">
        {mockEvents.map((event) => (
          <Card key={event.id} className="p-6 bg-card border-border">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <Badge
                    className={
                      event.type === "webinar"
                        ? "bg-accent/20 text-accent border border-accent"
                        : "bg-muted text-muted-foreground"
                    }
                  >
                    {event.type === "webinar" ? "Webinar" : "In-Person"}
                  </Badge>
                  {event.rsvp && (
                    <Badge className="bg-accent text-accent-foreground">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      RSVP'd
                    </Badge>
                  )}
                </div>

                <h2 className="text-xl text-foreground mb-3">{event.title}</h2>
                <p className="text-muted-foreground mb-4">
                  {event.description}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{event.date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{event.time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{event.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>
                      {event.attendees}/{event.maxAttendees} attendees
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 lg:w-48">
                {event.rsvp ? (
                  <>
                    <Button
                      className="bg-accent hover:bg-accent/90 text-accent-foreground"
                    >
                      View Details
                    </Button>
                    <Button
                      variant="outline"
                      className="border-border"
                    >
                      Cancel RSVP
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      className="bg-accent hover:bg-accent/90 text-accent-foreground"
                    >
                      RSVP Now
                    </Button>
                    <Button
                      variant="outline"
                      className="border-border"
                    >
                      Add to Calendar
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Event Info Card */}
      <Card className="mt-8 p-6 bg-accent/10 border-accent">
        <h3 className="text-foreground mb-2">Event Notifications</h3>
        <p className="text-sm text-muted-foreground">
          You'll receive email reminders 24 hours and 1 hour before each event
          you've RSVP'd to. Webinar links will be sent 15 minutes before the
          start time.
        </p>
      </Card>
    </div>
  );
}
