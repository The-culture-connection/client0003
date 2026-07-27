import { Search, Sparkles } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { mockMessages } from '../data/mockData';
import { Link } from 'react-router';

export default function Messages() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background z-10 border-b border-border px-6 py-4">
          <h1 className="text-2xl mb-4">Messages</h1>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search messages..."
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-accent outline-none transition-colors"
            />
          </div>
        </div>

        {/* Message List */}
        <div className="divide-y divide-border">
          {mockMessages.map((message) => (
            <Link
              key={message.id}
              to={`/messages/${message.id}`}
              className="flex items-start gap-4 px-6 py-4 hover:bg-secondary transition-colors"
            >
              <div className="relative">
                <img
                  src={message.user.avatar}
                  alt={message.user.name}
                  className="w-14 h-14 rounded-full object-cover"
                />
                {message.unread > 0 && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-accent text-white rounded-full flex items-center justify-center text-xs">
                    {message.unread}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{message.user.name}</h3>
                    {message.isNewMatch && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/10 text-accent rounded-full text-xs">
                        <Sparkles className="w-3 h-3" />
                        New Match
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{message.timestamp}</span>
                </div>
                <p className="text-sm text-muted-foreground truncate">{message.lastMessage}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
