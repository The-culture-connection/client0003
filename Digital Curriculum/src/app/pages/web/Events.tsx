import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
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
  Loader2,
} from "lucide-react";
import { useAuth } from "../../components/auth/AuthProvider";
import { getEvents, getRegisteredEvents, type Event } from "../../lib/events";

export function WebEvents() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "upcoming" | "registered">("all");
  const [events, setEvents] = useState<Event[]>([]);
  const [registeredEvents, setRegisteredEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, [user]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const [allEvents, userRegistered] = await Promise.all([
        getEvents(),
        user?.uid ? getRegisteredEvents(user.uid) : Promise.resolve([]),
      ]);

      setEvents(allEvents);
      setRegisteredEvents(userRegistered.map((e) => e.id));
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter((event) => {
    if (filter === "registered") {
      return registeredEvents.includes(event.id);
    }
    if (filter === "upcoming") {
      const eventDate = event.date.toDate ? event.date.toDate() : new Date(event.date);
      return eventDate >= new Date();
    }
    return true;
  });

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return "TBD";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isUpcoming = (event: Event): boolean => {
    const eventDate = event.date.toDate ? event.date.toDate() : new Date(event.date);
    return eventDate >= new Date();
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-4" />
            <p className="text-muted-foreground">Loading events...</p>
          </div>
        </div>
      </div>
    );
  }

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
        {filteredEvents.map((event) => {
          const isRegistered = registeredEvents.includes(event.id);
          const registeredCount = event.registered_users?.length || 0;
          const totalSpots = event.total_spots ?? 0;
          const spotsLeft = totalSpots > 0 ? totalSpots - registeredCount : null;
          const eventType = event.event_type || "In-person";

          return (
            <Card
              key={event.id}
              className="p-6 bg-card border-border hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
              onClick={() => navigate(`/events/${event.id}`)}
            >
              {event.image_url && (
                <img
                  src={event.image_url}
                  alt=""
                  className="w-full h-36 object-cover -mx-6 -mt-6 mb-4"
                />
              )}
              <div className="mb-4">
                <div className="flex items-start justify-between mb-3 gap-2">
                  <h3 className="text-xl text-foreground font-medium flex-1">
                    {event.title}
                  </h3>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="text-xs">
                      {eventType}
                    </Badge>
                    {isRegistered && (
                      <Badge className="bg-accent text-accent-foreground">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Registered
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(event.date)}</span>
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
                      {registeredCount}
                      {totalSpots > 0 ? `/${totalSpots} attending` : " attending"}
                      {spotsLeft !== null && spotsLeft > 0 && ` • ${spotsLeft} spots left`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between gap-4">
                  {totalSpots > 0 && (
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-muted-foreground mb-2">
                        Spots Available
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent"
                          style={{
                            width: `${Math.min(100, (registeredCount / totalSpots) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/events/${event.id}`);
                    }}
                    className="bg-accent hover:bg-accent/90 text-accent-foreground shrink-0"
                  >
                    {isRegistered ? "View Details" : "View & Register"}
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredEvents.length === 0 && (
        <Card className="p-12 bg-card border-border text-center">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg text-foreground mb-2">No events found</h3>
          <p className="text-muted-foreground">
            {filter === "registered"
              ? "You haven't registered for any events yet"
              : "Try adjusting your filters to see more events"}
          </p>
        </Card>
      )}
    </div>
  );
}
