import {
  ArrowLeft,
  MessageSquare,
  Search,
  Send,
  MoreVertical,
  Users,
  Video,
  Phone,
  Calendar,
  CheckCheck,
  Clock,
  Home,
  User,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { useState } from 'react';

export default function ConferenceMessages() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all' | 'attendees' | 'speakers'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const conversations = [
    {
      id: 1,
      name: 'Sarah Chen',
      title: 'Keynote Speaker',
      avatar: 'SC',
      lastMessage: 'Thanks for attending my session!',
      time: '5m ago',
      unread: 2,
      online: true,
      type: 'speaker',
      color: '#e6dbb4',
    },
    {
      id: 2,
      name: 'Alex Thompson',
      title: 'Product Manager @ TechCorp',
      avatar: 'AT',
      lastMessage: 'Would love to connect after the conference',
      time: '12m ago',
      unread: 0,
      online: true,
      type: 'attendee',
      color: '#e6dbb4',
    },
    {
      id: 3,
      name: 'Conference Organizers',
      title: 'Official Group',
      avatar: 'CO',
      lastMessage: 'Session "AI in Startups" starting in 30 min',
      time: '1h ago',
      unread: 1,
      online: true,
      type: 'group',
      color: '#e6dbb4',
    },
    {
      id: 4,
      name: 'Jordan Lee',
      title: 'Founder @ StartupXYZ',
      avatar: 'JL',
      lastMessage: 'Great to meet you at the networking zone!',
      time: '2h ago',
      unread: 0,
      online: false,
      type: 'attendee',
      color: '#e6dbb4',
    },
    {
      id: 5,
      name: 'Tech Entrepreneurs Group',
      title: '23 members',
      avatar: 'TE',
      lastMessage: 'Anyone up for coffee after this session?',
      time: '3h ago',
      unread: 5,
      online: true,
      type: 'group',
      color: '#e6dbb4',
    },
    {
      id: 6,
      name: 'Mike Rodriguez',
      title: 'Engineering Director @ CloudScale',
      avatar: 'MR',
      lastMessage: 'Let me know if you have questions about the demo',
      time: '5h ago',
      unread: 0,
      online: false,
      type: 'speaker',
      color: '#e6dbb4',
    },
  ];

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === 'all') return matchesSearch;
    if (activeTab === 'attendees') return matchesSearch && conv.type === 'attendee';
    if (activeTab === 'speakers') return matchesSearch && conv.type === 'speaker';
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-black relative overflow-hidden pb-24">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a1510] via-black to-black" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(230,219,180,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(230,219,180,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />

      {/* Ambient orbs */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-[#e6dbb4]/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-40 right-10 w-80 h-80 bg-[#e6dbb4]/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative z-10">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <button
            onClick={() => navigate('/mortarverse')}
            className="flex items-center gap-2 text-gray-400 hover:text-[#e6dbb4] transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Mortarverse</span>
          </button>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-[#e6dbb4]" />
              <h1 className="text-2xl text-white uppercase tracking-tight">
                Messages
              </h1>
            </div>
            <div className="flex gap-2">
              <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-all">
                <Search className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#e6dbb4]/40 focus:bg-white/10 transition-all"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-2 p-1 rounded-xl bg-white/5 border border-white/10">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm uppercase tracking-wide transition-all ${
                activeTab === 'all'
                  ? 'bg-[#e6dbb4] text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab('attendees')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm uppercase tracking-wide transition-all ${
                activeTab === 'attendees'
                  ? 'bg-[#e6dbb4] text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Attendees
            </button>
            <button
              onClick={() => setActiveTab('speakers')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm uppercase tracking-wide transition-all ${
                activeTab === 'speakers'
                  ? 'bg-[#e6dbb4] text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Speakers
            </button>
          </div>
        </div>

        {/* Conversations List */}
        <div className="px-6 space-y-2">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No conversations found</p>
            </div>
          ) : (
            filteredConversations.map((conv, index) => (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => navigate(`/conference/messages/${conv.id}`)}
                className="relative group cursor-pointer"
              >
                {/* Subtle glow on hover */}
                <div className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity blur-lg bg-[#e6dbb4]" />

                {/* Conversation Card */}
                <div className="relative p-4 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 backdrop-blur-xl hover:border-[#e6dbb4]/30 transition-all">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center border-2"
                        style={{
                          backgroundColor: `${conv.color}20`,
                          borderColor: conv.color,
                        }}
                      >
                        <span className="text-white text-sm">{conv.avatar}</span>
                      </div>
                      {conv.online && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-black" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white truncate">{conv.name}</h3>
                          <p className="text-xs text-gray-400 truncate">{conv.title}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 ml-2">
                          <span className="text-xs text-gray-500 whitespace-nowrap">{conv.time}</span>
                          {conv.unread > 0 && (
                            <div className="px-2 py-0.5 rounded-full bg-[#e6dbb4] text-black text-xs min-w-[20px] text-center">
                              {conv.unread}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {conv.unread === 0 && (
                          <CheckCheck className="w-3 h-3 text-[#e6dbb4]" />
                        )}
                        <p className="text-sm text-gray-400 truncate">{conv.lastMessage}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Quick Stats */}
        <div className="px-6 mt-6">
          <div className="p-4 rounded-xl bg-gradient-to-br from-[#e6dbb4]/10 to-[#e6dbb4]/5 border border-[#e6dbb4]/20 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#e6dbb4]" />
                <span className="text-sm text-gray-400">Active Connections</span>
              </div>
              <span className="text-white font-medium">{conversations.filter(c => c.online).length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Premium Bottom Navigation */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.3, type: 'spring' }}
        className="fixed bottom-4 left-4 right-4 z-50"
      >
        <div className="mx-auto max-w-md px-6 py-3 rounded-full bg-black/80 backdrop-blur-2xl border border-white/20 shadow-2xl">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/conference/lobby')}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all hover:bg-white/10"
            >
              <Home className="w-5 h-5 text-gray-400" />
              <span className="text-[10px] text-gray-400 uppercase tracking-wide">Lobby</span>
            </button>

            <button
              onClick={() => navigate('/conference/networking')}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all hover:bg-white/10"
            >
              <Users className="w-5 h-5 text-gray-400" />
              <span className="text-[10px] text-gray-400 uppercase tracking-wide">Network</span>
            </button>

            <button
              onClick={() => navigate('/conference/messages')}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all bg-[#e6dbb4]/20 border border-[#e6dbb4]/40 relative"
            >
              <MessageSquare className="w-5 h-5 text-[#e6dbb4]" />
              <span className="text-[10px] text-[#e6dbb4] uppercase tracking-wide">Messages</span>
              {/* Active glow */}
              <div className="absolute inset-0 rounded-xl bg-[#e6dbb4]/10 blur-lg -z-10" />
            </button>

            <button
              onClick={() => navigate('/conference/schedule')}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all hover:bg-white/10"
            >
              <Calendar className="w-5 h-5 text-gray-400" />
              <span className="text-[10px] text-gray-400 uppercase tracking-wide">Events</span>
            </button>

            <button
              onClick={() => navigate('/profile')}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all hover:bg-white/10"
            >
              <User className="w-5 h-5 text-gray-400" />
              <span className="text-[10px] text-gray-400 uppercase tracking-wide">Profile</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
