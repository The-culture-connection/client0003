import { Heart, MessageCircle, Share2, MoreHorizontal, Calendar, Clock, MapPin, Users, Plus, ArrowRight } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { useState } from 'react';
import { useNavigate } from 'react-router';

export default function Feed() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all' | 'events' | 'feed'>('all');

  const posts = [
    {
      id: 1,
      type: 'post',
      author: "Sarah Johnson",
      role: "Alumni • Class of 2024",
      avatar: "SJ",
      time: "2h ago",
      content: "Just landed my dream job at a tech startup! Mortar's program gave me the skills and confidence I needed. Forever grateful! 🚀",
      likes: 24,
      comments: 8,
    },
    {
      id: 2,
      type: 'post',
      author: "Michael Chen",
      role: "Current Student",
      avatar: "MC",
      time: "5h ago",
      content: "Anyone attending the networking workshop tomorrow? Would love to connect!",
      likes: 12,
      comments: 5,
    },
    {
      id: 3,
      type: 'post',
      author: "Emily Rodriguez",
      role: "Alumni • Class of 2023",
      avatar: "ER",
      time: "1d ago",
      content: "Pro tip: Don't skip the financial planning module. It's been invaluable in managing my business finances. Trust the process! 💼",
      likes: 45,
      comments: 15,
    },
  ];

  const events = [
    {
      id: 1,
      type: 'event',
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
      type: 'event',
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
      type: 'event',
      title: "Career Fair 2026",
      date: "Mar 5",
      time: "10:00 AM",
      location: "Exhibition Center",
      attendees: 200,
      maxAttendees: 300,
      registered: true,
    },
  ];

  // Combine and sort by time for "All" tab
  const allItems = [...posts, ...events].sort((a, b) => {
    // Simple sort - in real app would use actual timestamps
    return 0;
  });

  const getFilteredItems = () => {
    if (activeTab === 'all') return allItems;
    if (activeTab === 'events') return events;
    if (activeTab === 'feed') return posts;
    return [];
  };

  const filteredItems = getFilteredItems();

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background z-10 border-b border-border px-4 py-4">
          <h1 className="text-2xl text-foreground mb-1">Feed</h1>
          <p className="text-sm text-muted-foreground">
            Stay connected with the community
          </p>

          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                activeTab === 'all'
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-secondary'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                activeTab === 'events'
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-secondary'
              }`}
            >
              Events
            </button>
            <button
              onClick={() => setActiveTab('feed')}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                activeTab === 'feed'
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-secondary'
              }`}
            >
              Posts
            </button>
          </div>
        </div>

        {/* All Tab - Grid Layout */}
        {activeTab === 'all' && (
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3">
              {/* Events Widget - Left Column, Taller */}
              <div className="col-span-1 row-span-2 p-3 bg-card border border-border rounded-xl flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm text-foreground font-medium">Upcoming Events</h2>
                  <button
                    onClick={() => setActiveTab('events')}
                    className="text-accent"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2 flex-1">
                  {events.map((event) => (
                    <div key={event.id} className="p-2 bg-background rounded-lg">
                      <div className="flex items-center gap-1 mb-1">
                        <Calendar className="w-3 h-3 text-accent" />
                        <h3 className="text-xs text-foreground font-medium truncate">
                          {event.title}
                        </h3>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {event.date} • {event.time}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{event.location}</span>
                      </div>
                      {event.registered && (
                        <span className="inline-block bg-accent text-accent-foreground text-xs px-2 py-0.5 rounded">
                          Registered
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Posts Widget - Right Column, Takes up 2 rows */}
              <div className="col-span-1 row-span-2 p-3 bg-card border border-border rounded-xl flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm text-foreground font-medium">Recent Posts</h2>
                  <button
                    onClick={() => setActiveTab('feed')}
                    className="text-accent"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {posts.map((post) => (
                    <div key={post.id} className="pb-3 border-b border-border last:border-0 last:pb-0">
                      <div className="flex items-start gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-medium flex-shrink-0">
                          {post.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-foreground text-xs font-medium">
                            {post.author}
                          </h3>
                          <p className="text-xs text-muted-foreground">{post.time}</p>
                        </div>
                      </div>
                      <p className="text-xs text-foreground mb-2 line-clamp-3">{post.content}</p>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          <span className="text-xs">{post.likes}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          <span className="text-xs">{post.comments}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats Widget - Full Width */}
              <div className="col-span-2 p-3 bg-gradient-to-br from-accent to-accent/80 rounded-xl text-accent-foreground">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-2xl font-bold mb-1">{events.length}</p>
                    <p className="text-xs text-accent-foreground/90">Events</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold mb-1">{posts.length}</p>
                    <p className="text-xs text-accent-foreground/90">Posts</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold mb-1">{events.filter(e => e.registered).length}</p>
                    <p className="text-xs text-accent-foreground/90">Registered</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Events and Posts Tabs - List Layout */}
        {activeTab !== 'all' && (
          <div className="p-4 space-y-4">
            {filteredItems.map((item: any) => {
              if (item.type === 'post') {
                return (
                  <div key={`post-${item.id}`} className="p-4 bg-card border border-border rounded-xl">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-medium">
                        {item.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-foreground font-medium text-sm">
                          {item.author}
                        </h3>
                        <p className="text-xs text-muted-foreground">{item.role}</p>
                      </div>
                      <button className="text-muted-foreground">
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </div>

                    <p className="text-foreground text-sm mb-3 leading-relaxed">
                      {item.content}
                    </p>

                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                      <span>{item.time}</span>
                    </div>

                    <div className="flex items-center gap-4 pt-3 border-t border-border">
                      <button className="flex items-center gap-2 text-muted-foreground hover:text-accent transition-colors">
                        <Heart className="w-5 h-5" />
                        <span className="text-sm">{item.likes}</span>
                      </button>
                      <button className="flex items-center gap-2 text-muted-foreground hover:text-accent transition-colors">
                        <MessageCircle className="w-5 h-5" />
                        <span className="text-sm">{item.comments}</span>
                      </button>
                      <button className="flex items-center gap-2 text-muted-foreground hover:text-accent transition-colors ml-auto">
                        <Share2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              } else {
                return (
                  <div key={`event-${item.id}`} className="p-4 bg-card border border-border rounded-xl">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-foreground font-medium flex-1">
                        {item.title}
                      </h3>
                      {item.registered && (
                        <span className="bg-accent text-accent-foreground text-xs px-2 py-1 rounded">
                          Registered
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{item.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{item.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{item.location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>
                          {item.attendees}/{item.maxAttendees} attending
                        </span>
                      </div>
                    </div>

                    {item.registered ? (
                      <button className="w-full py-2 border border-border text-foreground rounded-lg hover:bg-secondary transition-colors">
                        View Details
                      </button>
                    ) : (
                      <button className="w-full py-2 bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg transition-colors">
                        Register
                      </button>
                    )}
                  </div>
                );
              }
            })}
          </div>
        )}

        {/* Floating Action Button - Only show on Events or All tab */}
        {(activeTab === 'events' || activeTab === 'all') && (
          <button 
            onClick={() => navigate('/events/create')}
            className="fixed bottom-24 right-6 w-14 h-14 bg-accent text-accent-foreground rounded-full shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center z-40"
          >
            <Plus className="w-6 h-6" />
          </button>
        )}
      </div>

      <BottomNav />
    </div>
  );
}