import { Search, Briefcase, Users, MapPin, TrendingUp, Sparkles, MessageCircle, Bell } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { useState } from 'react';
import { useNavigate } from 'react-router';

export default function Explore() {
  const navigate = useNavigate();
  
  const opportunities = [
    {
      id: 1,
      type: "job",
      title: "Senior Product Manager",
      company: "TechCorp",
      location: "San Francisco, CA",
      posted: "2d ago",
      match: 95,
    },
    {
      id: 2,
      type: "connection",
      title: "Connect with Maria Garcia",
      company: "Marketing Director • Class of 2022",
      location: "New York, NY",
      posted: "1w ago",
      match: 88,
      userId: "maria-garcia",
    },
    {
      id: 3,
      type: "job",
      title: "Marketing Specialist",
      company: "StartupXYZ",
      location: "Remote",
      posted: "3d ago",
      match: 82,
    },
    {
      id: 4,
      type: "connection",
      title: "Connect with James Wilson",
      company: "Tech Entrepreneur • Class of 2021",
      location: "Austin, TX",
      posted: "2w ago",
      match: 76,
      userId: "james-wilson",
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background z-10 border-b border-border px-4 py-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl text-foreground mb-1">Explore</h1>
              <p className="text-sm text-muted-foreground">
                Discover opportunities matched to you
              </p>
            </div>
            <button
              onClick={() => navigate('/messages')}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <Bell className="w-6 h-6 text-foreground" />
            </button>
          </div>
        </div>

        {/* Run Matching Button */}
        <div className="p-4">
          <button 
            onClick={() => navigate('/matching')}
            className="w-full p-4 bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70 text-accent-foreground rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2 font-medium"
          >
            <Sparkles className="w-5 h-5" />
            Run Matching Algorithm
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search opportunities..."
              className="w-full pl-10 pr-4 py-2.5 bg-input-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Filter Badges */}
        <div className="flex gap-2 px-4 mb-4 overflow-x-auto pb-2">
          <span className="bg-accent text-accent-foreground whitespace-nowrap px-3 py-1 rounded-lg text-sm">
            All
          </span>
          <span className="bg-muted text-muted-foreground whitespace-nowrap px-3 py-1 rounded-lg text-sm">
            Jobs
          </span>
          <span className="bg-muted text-muted-foreground whitespace-nowrap px-3 py-1 rounded-lg text-sm">
            Connections
          </span>
        </div>

        {/* Opportunities List */}
        <div className="px-4 space-y-3">
          {opportunities.map((opp) => (
            <div key={opp.id} className="p-4 bg-card border border-border rounded-xl">
              <div className="flex items-start gap-3 mb-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  {opp.type === "job" ? (
                    <Briefcase className="w-5 h-5 text-accent" />
                  ) : (
                    <Users className="w-5 h-5 text-accent" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-foreground font-medium mb-1">
                    {opp.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {opp.company}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {opp.location}
                    </span>
                    <span>• {opp.posted}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-accent" />
                  <span className="text-sm text-accent font-medium">
                    {opp.match}% match
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {opp.type === "connection" && (
                    <button 
                      onClick={() => navigate(`/messages/direct/${opp.userId}`)}
                      className="px-3 py-2 bg-card border border-border hover:bg-secondary text-foreground rounded-lg transition-colors flex items-center gap-1"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  )}
                  <button className="px-4 py-2 bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg transition-colors">
                    {opp.type === "job" ? "Apply" : "Connect"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}