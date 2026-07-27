import {
  ArrowLeft,
  MessageSquare,
  Users,
  Hash,
  TrendingUp,
  Plus,
  Send,
  Heart,
  MessageCircle as MessageCircleIcon,
  BadgeCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { useState } from 'react';

export default function ConferenceCommunity() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'feed' | 'topics' | 'rooms'>('feed');

  const posts = [
    {
      id: 1,
      author: 'Sarah Johnson',
      title: 'Product Manager',
      avatar: 'SJ',
      time: '15m ago',
      content: 'Just attended the AI/ML session - mind blown! 🤯 Anyone else catching the next one on scalability?',
      likes: 24,
      comments: 8,
      topic: 'AI/ML',
      isMortarEvent: true,
    },
    {
      id: 2,
      author: 'Mike Chen',
      title: 'Software Engineer',
      avatar: 'MC',
      time: '32m ago',
      content: 'Looking for people interested in forming a study group on Web3. DM me!',
      likes: 12,
      comments: 5,
      topic: 'Web3',
      isMortarEvent: false,
    },
    {
      id: 3,
      author: 'Alex Rivera',
      title: 'Startup Founder',
      avatar: 'AR',
      time: '1h ago',
      content: 'The networking here is incredible. Already made 5 valuable connections. This is what conferences should be like! 🔥',
      likes: 45,
      comments: 15,
      topic: 'General',
      isMortarEvent: false,
    },
  ];

  const topics = [
    { name: 'AI/ML', posts: 234, members: 567, color: '#C1121F' },
    { name: 'Web3', posts: 156, members: 423, color: '#8B5CF6' },
    { name: 'Startups', posts: 189, members: 501, color: '#10B981' },
    { name: 'Product', posts: 145, members: 389, color: '#F59E0B' },
    { name: 'Design', posts: 123, members: 345, color: '#EC4899' },
    { name: 'DevOps', posts: 98, members: 267, color: '#06B6D4' },
  ];

  const rooms = [
    {
      name: 'Main Stage Discussion',
      topic: 'AI/ML',
      active: 145,
      color: '#C1121F',
      live: true,
    },
    {
      name: 'Startup Founders Lounge',
      topic: 'Startups',
      active: 67,
      color: '#10B981',
      live: true,
    },
    {
      name: 'Tech Track Chat',
      topic: 'Engineering',
      active: 89,
      color: '#8B5CF6',
      live: false,
    },
  ];

  return (
    <div className="min-h-screen bg-black relative overflow-hidden pb-24">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#e6dbb4]/10 via-black to-black" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(230,219,180,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(230,219,180,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative z-10">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <button
            onClick={() => navigate('/mortarverse')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Back to Mortarverse</span>
          </button>

          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-[#e6dbb4]" />
              <h1 className="text-2xl text-white uppercase tracking-tight">
                Community Zone
              </h1>
            </div>
            <button className="w-10 h-10 rounded-full bg-[#e6dbb4]/20 border border-[#e6dbb4]/30 flex items-center justify-center text-[#e6dbb4] hover:bg-[#e6dbb4]/30 transition-colors">
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>234 active members</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 mb-6">
          <div className="flex gap-2 p-1 rounded-xl bg-white/5 border border-white/10">
            <button
              onClick={() => setActiveTab('feed')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm uppercase tracking-wide transition-all ${
                activeTab === 'feed'
                  ? 'bg-[#e6dbb4] text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Feed
            </button>
            <button
              onClick={() => setActiveTab('topics')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm uppercase tracking-wide transition-all ${
                activeTab === 'topics'
                  ? 'bg-[#e6dbb4] text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Topics
            </button>
            <button
              onClick={() => setActiveTab('rooms')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm uppercase tracking-wide transition-all ${
                activeTab === 'rooms'
                  ? 'bg-[#e6dbb4] text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Rooms
            </button>
          </div>
        </div>

        {/* Feed Tab */}
        {activeTab === 'feed' && (
          <div className="px-6 space-y-4">
            {posts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-xl border backdrop-blur-xl ${
                  post.isMortarEvent
                    ? 'bg-[#C1121F]/5 border-[#C1121F]/40'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[#C1121F]/40 border-2 border-[#C1121F] flex items-center justify-center text-white flex-shrink-0">
                    {post.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-white">{post.author}</h3>
                      {post.isMortarEvent && (
                        <BadgeCheck className="w-4 h-4 text-[#C1121F] flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-gray-400">{post.title}</p>
                  </div>
                  <span className="text-xs text-gray-500">{post.time}</span>
                </div>

                <p className="text-white mb-3 leading-relaxed">{post.content}</p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button className="flex items-center gap-2 text-gray-400 hover:text-[#C1121F] transition-colors">
                      <Heart className="w-5 h-5" />
                      <span className="text-sm">{post.likes}</span>
                    </button>
                    <button className="flex items-center gap-2 text-gray-400 hover:text-green-500 transition-colors">
                      <MessageCircleIcon className="w-5 h-5" />
                      <span className="text-sm">{post.comments}</span>
                    </button>
                  </div>
                  <span className="px-2 py-1 rounded-full bg-white/10 text-xs text-gray-400">
                    #{post.topic}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Topics Tab */}
        {activeTab === 'topics' && (
          <div className="px-6">
            <div className="grid grid-cols-2 gap-3">
              {topics.map((topic, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl cursor-pointer hover:border-white/20 transition-all"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
                    style={{ backgroundColor: `${topic.color}20`, border: `2px solid ${topic.color}40` }}
                  >
                    <Hash className="w-5 h-5" style={{ color: topic.color }} />
                  </div>
                  <h3 className="text-white mb-2 uppercase tracking-tight">{topic.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      <span>{topic.posts}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>{topic.members}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Rooms Tab */}
        {activeTab === 'rooms' && (
          <div className="px-6 space-y-3">
            {rooms.map((room, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl hover:border-white/20 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white">{room.name}</h3>
                      {room.live && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-xs">
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                          LIVE
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">#{room.topic}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Users className="w-4 h-4" style={{ color: room.color }} />
                    <span>{room.active} active</span>
                  </div>
                  <button
                    className="px-4 py-2 rounded-lg text-sm text-white uppercase tracking-wide transition-all"
                    style={{ backgroundColor: `${room.color}40`, border: `1px solid ${room.color}60` }}
                  >
                    Join
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
