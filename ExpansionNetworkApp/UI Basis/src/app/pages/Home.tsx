import { Heart, MessageCircle, Users, Calendar, Briefcase, TrendingUp, Sparkles, ArrowRight } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { useNavigate } from 'react-router';

export default function Home() {
  const navigate = useNavigate();

  // Recent Posts Widget
  const recentPosts = [
    {
      id: 1,
      author: "Sarah Johnson",
      avatar: "SJ",
      content: "Just landed my dream job at a tech startup! 🚀",
      likes: 24,
      time: "2h ago",
    },
    {
      id: 2,
      author: "Michael Chen",
      avatar: "MC",
      content: "Anyone attending the networking workshop tomorrow?",
      likes: 12,
      time: "5h ago",
    },
  ];

  // Upcoming Events Widget
  const upcomingEvents = [
    {
      id: 1,
      title: "Networking Workshop",
      date: "Feb 28",
      time: "2:00 PM",
      registered: true,
    },
    {
      id: 2,
      title: "Guest Speaker Series",
      date: "Mar 2",
      time: "6:00 PM",
      registered: false,
    },
  ];

  // Groups Widget
  const myGroups = [
    { id: 1, name: "Tech Entrepreneurs", members: 156 },
    { id: 2, name: "Class of 2024", members: 89 },
    { id: 3, name: "Marketing Professionals", members: 134 },
  ];

  // Top Matches Widget
  const topMatches = [
    {
      id: 1,
      type: "job",
      title: "Senior Product Manager",
      company: "TechCorp",
      match: 95,
    },
    {
      id: 2,
      type: "connection",
      title: "Maria Garcia",
      company: "Marketing Director",
      match: 88,
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background z-10 border-b border-border px-4 py-4">
          <h1 className="text-2xl text-foreground mb-1">Home</h1>
          <p className="text-sm text-muted-foreground">
            Your personalized dashboard
          </p>
        </div>

        <div className="p-4">
          {/* Grid Layout */}
          <div className="grid grid-cols-2 gap-3">
            {/* Quick Actions Widget - Full Width */}
            <div className="col-span-2 p-4 bg-gradient-to-br from-accent to-accent/80 rounded-xl text-accent-foreground">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-lg font-medium mb-1">Welcome Back!</h2>
                  <p className="text-sm text-accent-foreground/90">
                    Discover new opportunities
                  </p>
                </div>
                <Sparkles className="w-8 h-8" />
              </div>
              <button
                onClick={() => navigate('/matching')}
                className="w-full py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm font-medium"
              >
                Run Smart Matching
              </button>
            </div>

            {/* My Groups Widget - Left Column */}
            <div className="col-span-1 p-3 bg-card border border-border rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm text-foreground font-medium">Groups</h2>
                <button
                  onClick={() => navigate('/groups')}
                  className="text-accent"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                {myGroups.slice(0, 2).map((group) => (
                  <div
                    key={group.id}
                    onClick={() => navigate(`/groups/${group.id}`)}
                    className="p-2 bg-background rounded-lg cursor-pointer hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <Users className="w-3 h-3 text-accent" />
                      <span className="text-xs text-foreground font-medium truncate">{group.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {group.members} members
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Events Widget - Right Column */}
            <div className="col-span-1 p-3 bg-card border border-border rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm text-foreground font-medium">Events</h2>
                <button
                  onClick={() => navigate('/feed')}
                  className="text-accent"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="p-2 bg-background rounded-lg">
                    <div className="flex items-center gap-1 mb-1">
                      <Calendar className="w-3 h-3 text-accent" />
                      <h3 className="text-xs text-foreground font-medium truncate">
                        {event.title}
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {event.date} • {event.time}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Feed Widget - Full Width */}
            <div className="col-span-2 p-3 bg-card border border-border rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm text-foreground font-medium">Recent Activity</h2>
                <button
                  onClick={() => navigate('/feed')}
                  className="text-accent text-xs flex items-center gap-1"
                >
                  View All <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-2">
                {recentPosts.map((post) => (
                  <div key={post.id} className="pb-2 border-b border-border last:border-0 last:pb-0">
                    <div className="flex items-start gap-2 mb-1">
                      <div className="w-7 h-7 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-medium">
                        {post.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-foreground text-xs font-medium">
                          {post.author}
                        </h3>
                        <p className="text-xs text-muted-foreground">{post.time}</p>
                      </div>
                    </div>
                    <p className="text-xs text-foreground mb-1 line-clamp-2">{post.content}</p>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Heart className="w-3 h-3" />
                      <span className="text-xs">{post.likes}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Matches Widget - Full Width */}
            <div className="col-span-2 p-3 bg-card border border-border rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm text-foreground font-medium">Top Matches</h2>
                <button
                  onClick={() => navigate('/explore')}
                  className="text-accent text-xs flex items-center gap-1"
                >
                  View All <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {topMatches.map((match) => (
                  <div key={match.id} className="p-2 bg-background rounded-lg">
                    <div className="flex items-start gap-2 mb-2">
                      <div className="p-1.5 rounded-lg bg-accent/10">
                        {match.type === "job" ? (
                          <Briefcase className="w-4 h-4 text-accent" />
                        ) : (
                          <Users className="w-4 h-4 text-accent" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-foreground font-medium text-xs mb-0.5 line-clamp-1">
                          {match.title}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {match.company}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-accent" />
                      <span className="text-xs text-accent font-medium">
                        {match.match}% match
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}