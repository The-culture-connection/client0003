import { useState } from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Check,
  X,
  Plus,
  Edit,
  Trash2,
  Download,
  Search,
  Filter,
  Send,
  CheckCircle2,
  XCircle,
  UserCheck,
} from "lucide-react";

export function EventModeration() {
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const events = [
    {
      id: 1,
      title: "Networking Workshop",
      date: "2026-04-28",
      time: "2:00 PM",
      location: "Cincinnati, OH",
      type: "Workshop",
      capacity: 50,
      rsvps: 42,
      attended: 38,
      status: "upcoming",
      price: 25,
    },
    {
      id: 2,
      title: "Guest Speaker Series",
      date: "2026-05-10",
      time: "6:00 PM",
      location: "Virtual",
      type: "Speaker",
      capacity: 100,
      rsvps: 87,
      attended: 0,
      status: "upcoming",
      price: 0,
    },
    {
      id: 3,
      title: "Pitch Competition Finals",
      date: "2026-04-05",
      time: "5:00 PM",
      location: "Atlanta, GA",
      type: "Competition",
      capacity: 200,
      rsvps: 156,
      attended: 142,
      status: "completed",
      price: 50,
    },
  ];

  const attendees = [
    { id: 1, name: "Alex Rodriguez", email: "alex@example.com", status: "confirmed", checkedIn: true },
    { id: 2, name: "Sarah Chen", email: "sarah@example.com", status: "confirmed", checkedIn: true },
    { id: 3, name: "Marcus Thompson", email: "marcus@example.com", status: "confirmed", checkedIn: false },
    { id: 4, name: "Jordan Kim", email: "jordan@example.com", status: "waitlist", checkedIn: false },
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10">
            <Calendar className="w-8 h-8 text-purple-500" />
          </div>
          Event Moderation
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage events, track RSVPs, and monitor attendance
        </p>
      </div>

      <Tabs defaultValue="events" className="space-y-6">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="events">All Events</TabsTrigger>
          <TabsTrigger value="create">Create Event</TabsTrigger>
          <TabsTrigger value="attendance">Attendance Tracking</TabsTrigger>
        </TabsList>

        {/* Events List Tab */}
        <TabsContent value="events" className="space-y-6">
          {/* Search & Filter */}
          <Card className="p-5 bg-card border-border">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" size="sm" className="border-border">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="sm" className="border-border">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </Card>

          {/* Events Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event) => (
              <Card
                key={event.id}
                className="p-5 bg-card border-border hover:border-accent transition-all cursor-pointer"
                onClick={() => setSelectedEvent(event)}
              >
                <div className="flex items-start justify-between mb-4">
                  <Badge
                    className={`text-xs ${
                      event.status === "upcoming"
                        ? "bg-blue-500/10 text-blue-500"
                        : event.status === "completed"
                        ? "bg-green-500/10 text-green-500"
                        : "bg-yellow-500/10 text-yellow-500"
                    }`}
                  >
                    {event.status}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {event.type}
                  </Badge>
                </div>

                <h3 className="text-lg font-bold text-foreground mb-3">{event.title}</h3>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{event.date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{event.time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{event.location}</span>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">RSVPs</span>
                    <span className="text-sm font-bold text-foreground">
                      {event.rsvps} / {event.capacity}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-accent h-2 rounded-full"
                      style={{ width: `${(event.rsvps / event.capacity) * 100}%` }}
                    ></div>
                  </div>
                  {event.status === "completed" && (
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Attended</span>
                      <span className="text-sm font-bold text-green-500">{event.attended}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline" className="flex-1 border-border">
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-500 text-red-500 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Selected Event Detail */}
          {selectedEvent && (
            <Card className="p-6 bg-gradient-to-br from-accent/20 via-card to-card border-accent/30">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    {selectedEvent.title}
                  </h2>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {selectedEvent.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {selectedEvent.time}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {selectedEvent.location}
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedEvent(null)}
                  className="border-border"
                >
                  Close
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-card rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Total RSVPs</p>
                  <p className="text-2xl font-bold text-foreground">{selectedEvent.rsvps}</p>
                </div>
                <div className="p-4 bg-card rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Capacity</p>
                  <p className="text-2xl font-bold text-foreground">{selectedEvent.capacity}</p>
                </div>
                <div className="p-4 bg-card rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Attended</p>
                  <p className="text-2xl font-bold text-foreground">{selectedEvent.attended}</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-foreground mb-4">Attendee List</h3>
                <div className="space-y-2">
                  {attendees.map((attendee) => (
                    <div
                      key={attendee.id}
                      className="flex items-center justify-between p-3 bg-card rounded-lg border border-border"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{attendee.name}</p>
                        <p className="text-xs text-muted-foreground">{attendee.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={`text-xs ${
                            attendee.status === "confirmed"
                              ? "bg-green-500/10 text-green-500"
                              : "bg-yellow-500/10 text-yellow-500"
                          }`}
                        >
                          {attendee.status}
                        </Badge>
                        {attendee.checkedIn ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  <Send className="w-4 h-4 mr-2" />
                  Email Attendees
                </Button>
                <Button variant="outline" className="border-border">
                  <Download className="w-4 h-4 mr-2" />
                  Export List
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Create Event Tab */}
        <TabsContent value="create" className="space-y-6">
          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-bold text-foreground mb-6">Create New Event</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-bold text-foreground mb-2 block">
                    Event Title
                  </Label>
                  <Input placeholder="e.g., Marketing Workshop" />
                </div>
                <div>
                  <Label className="text-sm font-bold text-foreground mb-2 block">
                    Event Type
                  </Label>
                  <Input placeholder="e.g., Workshop, Speaker, Competition" />
                </div>
              </div>

              <div>
                <Label className="text-sm font-bold text-foreground mb-2 block">
                  Description
                </Label>
                <Textarea
                  placeholder="Describe the event..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-bold text-foreground mb-2 block">
                    Date
                  </Label>
                  <Input type="date" />
                </div>
                <div>
                  <Label className="text-sm font-bold text-foreground mb-2 block">
                    Time
                  </Label>
                  <Input type="time" />
                </div>
                <div>
                  <Label className="text-sm font-bold text-foreground mb-2 block">
                    Duration
                  </Label>
                  <Input placeholder="e.g., 2 hours" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-bold text-foreground mb-2 block">
                    Location
                  </Label>
                  <Input placeholder="e.g., Cincinnati, OH or Virtual" />
                </div>
                <div>
                  <Label className="text-sm font-bold text-foreground mb-2 block">
                    Capacity
                  </Label>
                  <Input type="number" placeholder="e.g., 50" />
                </div>
              </div>

              <div>
                <Label className="text-sm font-bold text-foreground mb-2 block">
                  Price (optional)
                </Label>
                <Input type="number" placeholder="Leave blank for free events" />
              </div>

              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Create Event
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-6">
          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-bold text-foreground mb-6">Attendance Tracking</h2>

            <div className="space-y-4">
              {attendees.map((attendee) => (
                <div
                  key={attendee.id}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      attendee.checkedIn ? "bg-green-500/10" : "bg-muted"
                    }`}>
                      <UserCheck className={`w-5 h-5 ${
                        attendee.checkedIn ? "text-green-500" : "text-muted-foreground"
                      }`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{attendee.name}</p>
                      <p className="text-xs text-muted-foreground">{attendee.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {attendee.checkedIn ? (
                      <Badge className="bg-green-500/10 text-green-500">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Checked In
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        className="bg-accent hover:bg-accent/90 text-accent-foreground"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Check In
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
