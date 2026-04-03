import { Search, Users, MessageCircle } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { useState } from 'react';
import { useNavigate } from 'react-router';

export default function Groups() {
  const navigate = useNavigate();

  const groups = [
    {
      id: 1,
      name: "Tech Entrepreneurs",
      members: 156,
      messages: 45,
      category: "Industry",
      joined: true,
    },
    {
      id: 2,
      name: "Class of 2024",
      members: 89,
      messages: 23,
      category: "Cohort",
      joined: true,
    },
    {
      id: 3,
      name: "Marketing Professionals",
      members: 134,
      messages: 67,
      category: "Industry",
      joined: false,
    },
    {
      id: 4,
      name: "Bay Area Alumni",
      members: 78,
      messages: 34,
      category: "Location",
      joined: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background z-10 border-b border-border px-4 py-4">
          <h1 className="text-2xl text-foreground mb-1">Groups</h1>
          <p className="text-sm text-muted-foreground">
            Connect with like-minded members
          </p>
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search groups..."
              className="w-full pl-10 pr-4 py-2.5 bg-input-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Groups List */}
        <div className="px-4 space-y-3">
          {groups.map((group) => (
            <div 
              key={group.id} 
              className="p-4 bg-card border border-border rounded-xl cursor-pointer hover:border-accent/50 transition-colors"
              onClick={() => navigate(`/groups/${group.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-foreground font-medium mb-1">
                    {group.name}
                  </h3>
                  <span className="inline-block bg-accent/10 text-accent text-xs px-2 py-1 rounded">
                    {group.category}
                  </span>
                </div>
                {group.joined && (
                  <span className="bg-accent text-accent-foreground text-xs px-2 py-1 rounded">
                    Joined
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{group.members}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageCircle className="w-4 h-4" />
                  <span>{group.messages} today</span>
                </div>
              </div>

              {group.joined ? (
                <button className="w-full py-2 border border-border text-foreground rounded-lg hover:bg-secondary transition-colors">
                  View Group
                </button>
              ) : (
                <button className="w-full py-2 bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg transition-colors">
                  Join Group
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}