import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Users, Bell } from 'lucide-react';
import { Button } from '../components/Button';
import { PostCard } from '../components/PostCard';
import { mockGroups, mockPosts } from '../data/mockData';
import { useState } from 'react';

export default function GroupDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const group = mockGroups.find((g) => g.id === id);
  const [isJoined, setIsJoined] = useState(false);

  if (!group) return null;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background z-10 border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl">Group</h1>
          </div>
        </div>

        {/* Group Header */}
        <div className="relative">
          <img
            src={group.image}
            alt={group.name}
            className="w-full h-48 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>

        <div className="px-6 -mt-8 relative z-10">
          <div className="bg-card rounded-2xl p-6 shadow-lg border border-border">
            <h2 className="text-xl mb-2">{group.name}</h2>
            <p className="text-muted-foreground mb-4">{group.description}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Users className="w-4 h-4" />
              <span>{group.members} members</span>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setIsJoined(!isJoined)}
                variant={isJoined ? 'secondary' : 'primary'}
                className="flex-1"
              >
                {isJoined ? 'Joined ✓' : 'Join Group'}
              </Button>
              {isJoined && (
                <Button variant="outline" className="px-4">
                  <Bell className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Members Preview */}
        <div className="px-6 py-6">
          <h3 className="font-medium mb-3">Members</h3>
          <div className="flex -space-x-2">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="w-10 h-10 rounded-full bg-muted border-2 border-background"
              />
            ))}
            <div className="w-10 h-10 rounded-full bg-accent text-accent-foreground border-2 border-background flex items-center justify-center text-xs">
              +{group.members - 8}
            </div>
          </div>
        </div>

        {/* Group Posts */}
        <div className="px-6 space-y-4">
          <h3 className="font-medium">Recent Posts</h3>
          {mockPosts.map((post) => (
            <PostCard key={post.id} {...post} />
          ))}
        </div>
      </div>
    </div>
  );
}
