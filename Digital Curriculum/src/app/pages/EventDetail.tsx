import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Monitor,
  Users,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useAuth } from "../components/auth/AuthProvider";
import {
  getEvent,
  registerForEvent,
  unregisterFromEvent,
  isUserRegistered,
  type Event,
} from "../lib/events";

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    if (id) {
      loadEvent();
    }
  }, [id, user]);

  const loadEvent = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const eventData = await getEvent(id);
      if (!eventData) {
        navigate("/events");
        return;
      }
      setEvent(eventData);
      if (user?.uid) {
        setIsRegistered(isUserRegistered(eventData, user.uid));
      }
    } catch (error) {
      console.error("Error loading event:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!id || !user?.uid) {
      alert("Please sign in to register for events");
      return;
    }

    setRegistering(true);
    try {
      await registerForEvent(id, user.uid);
      setIsRegistered(true);
      await loadEvent(); // Reload to get updated counts
      alert("Successfully registered for this event!");
    } catch (error: any) {
      console.error("Error registering for event:", error);
      alert(error.message || "Failed to register. Please try again.");
    } finally {
      setRegistering(false);
    }
  };

  const handleUnregister = async () => {
    if (!id || !user?.uid) return;

    if (!confirm("Are you sure you want to cancel your registration?")) {
      return;
    }

    setRegistering(true);
    try {
      await unregisterFromEvent(id, user.uid);
      setIsRegistered(false);
      await loadEvent(); // Reload to get updated counts
      alert("Registration cancelled successfully.");
    } catch (error: any) {
      console.error("Error unregistering from event:", error);
      alert(error.message || "Failed to cancel registration. Please try again.");
    } finally {
      setRegistering(false);
    }
  };

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return "TBD";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const isUpcoming = (event: Event): boolean => {
    if (!event.date) return true;
    const eventDate = event.date.toDate ? event.date.toDate() : new Date(event.date as unknown as string);
    return eventDate >= new Date();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-accent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading event...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/events")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Events
        </Button>
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Event not found</p>
        </Card>
      </div>
    );
  }

  const registeredCount = event.registered_users?.length || 0;
  const totalSpots = event.total_spots ?? 0;
  const spotsLeft = totalSpots > 0 ? totalSpots - registeredCount : null;
  const isFull = totalSpots > 0 && spotsLeft !== null && spotsLeft <= 0;
  const upcoming = isUpcoming(event);
  const eventType = event.event_type || "In-person";

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Button variant="ghost" onClick={() => navigate("/events")} className="mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Events
      </Button>

      <Card className="p-8">
        <div className="mb-6">
          {event.image_url && (
            <img
              src={event.image_url}
              alt=""
              className="w-full h-48 object-cover rounded-lg mb-6"
            />
          )}
          <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
            <h1 className="text-3xl font-bold text-foreground">{event.title}</h1>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{eventType}</Badge>
              {isRegistered && (
                <Badge className="bg-accent text-accent-foreground">
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Registered
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-accent" />
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="text-foreground font-medium">{formatDate(event.date)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-accent" />
              <div>
                <p className="text-sm text-muted-foreground">Time</p>
                <p className="text-foreground font-medium">{event.time}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {eventType === "Online" ? (
                <Monitor className="w-5 h-5 text-accent" />
              ) : (
                <MapPin className="w-5 h-5 text-accent" />
              )}
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="text-foreground font-medium">{event.location}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-accent" />
              <div>
                <p className="text-sm text-muted-foreground">Attendance</p>
                <p className="text-foreground font-medium">
                  {registeredCount}
                  {totalSpots > 0 ? `/${totalSpots} registered` : " registered"}
                  {spotsLeft !== null && spotsLeft > 0 && ` • ${spotsLeft} spots left`}
                </p>
              </div>
            </div>
          </div>

          {event.details && (
            <div className="mb-6 p-4 bg-muted/50 rounded-lg">
              <h2 className="text-lg font-semibold text-foreground mb-2">Event Details</h2>
              <p className="text-foreground whitespace-pre-wrap">{event.details}</p>
            </div>
          )}

          <div className="pt-6 border-t border-border">
            <div className="flex items-center justify-between">
              {totalSpots > 0 && (
                <div className="flex-1 mr-4">
                  <div className="text-sm text-muted-foreground mb-2">Registration Progress</div>
                  <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent transition-all"
                      style={{
                        width: `${Math.min(100, (registeredCount / totalSpots) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
              {upcoming && (
                <div className="flex gap-2">
                  {isRegistered ? (
                    <Button
                      variant="outline"
                      onClick={handleUnregister}
                      disabled={registering}
                      className="border-destructive text-destructive hover:bg-destructive/10"
                    >
                      {registering ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      Cancel Registration
                    </Button>
                  ) : (
                    <Button
                      onClick={handleRegister}
                      disabled={registering || isFull || !user}
                      className="bg-accent hover:bg-accent/90 text-accent-foreground"
                    >
                      {registering ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Registering...
                        </>
                      ) : isFull ? (
                        "Event Full"
                      ) : !user ? (
                        "Sign In to Register"
                      ) : (
                        "Register for Event"
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
