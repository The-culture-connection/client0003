import {
  ArrowLeft,
  Send,
  MoreVertical,
  Phone,
  Video,
  Calendar,
  Plus,
  Image as ImageIcon,
  Mic,
  Home,
  Users,
  MessageSquare,
  User,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { motion } from 'motion/react';
import { useState } from 'react';

export default function ConferenceDirectMessage() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [message, setMessage] = useState('');

  // Mock user data
  const user = {
    name: 'Sarah Chen',
    title: 'Keynote Speaker',
    avatar: 'SC',
    online: true,
    color: '#e6dbb4',
  };

  const messages = [
    {
      id: 1,
      sender: 'them',
      content: 'Hey! Thanks for attending my session on AI in Startups',
      time: '10:23 AM',
    },
    {
      id: 2,
      sender: 'me',
      content: 'It was amazing! Really loved your insights on product-market fit',
      time: '10:24 AM',
    },
    {
      id: 3,
      sender: 'them',
      content: 'Thank you! Are you attending any other sessions today?',
      time: '10:25 AM',
    },
    {
      id: 4,
      sender: 'me',
      content: 'Yes, I\'m heading to the scalability workshop in 30 minutes',
      time: '10:26 AM',
    },
    {
      id: 5,
      sender: 'them',
      content: 'Perfect! That one is excellent. We should connect after the conference too',
      time: '10:27 AM',
    },
    {
      id: 6,
      sender: 'me',
      content: 'Definitely! Would love to stay in touch',
      time: '10:28 AM',
    },
  ];

  const handleSend = () => {
    if (message.trim()) {
      // Handle send logic here
      setMessage('');
    }
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden flex flex-col">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a1510] via-black to-black" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(230,219,180,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(230,219,180,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />

      {/* Ambient orbs */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-[#e6dbb4]/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-40 right-10 w-80 h-80 bg-[#e6dbb4]/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative z-10 flex flex-col h-screen">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/10 bg-black/50 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => navigate('/conference/messages')}
              className="flex items-center gap-2 text-gray-400 hover:text-[#e6dbb4] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Messages</span>
            </button>
            <div className="flex gap-2">
              <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-all">
                <Phone className="w-5 h-5" />
              </button>
              <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-all">
                <Video className="w-5 h-5" />
              </button>
              <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-all">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* User Info */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center border-2"
                style={{
                  backgroundColor: `${user.color}20`,
                  borderColor: user.color,
                }}
              >
                <span className="text-white text-sm">{user.avatar}</span>
              </div>
              {user.online && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-black" />
              )}
            </div>
            <div>
              <h2 className="text-white font-medium">{user.name}</h2>
              <p className="text-sm text-gray-400">{user.title}</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.map((msg, index) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] ${
                  msg.sender === 'me'
                    ? 'bg-[#e6dbb4] text-black'
                    : 'bg-white/10 text-white border border-white/10'
                } rounded-2xl px-4 py-3 backdrop-blur-xl`}
              >
                <p className="text-sm">{msg.content}</p>
                <span
                  className={`text-xs mt-1 block ${
                    msg.sender === 'me' ? 'text-black/60' : 'text-gray-400'
                  }`}
                >
                  {msg.time}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="px-6 py-2 border-t border-white/10 bg-black/50 backdrop-blur-xl">
          <div className="flex gap-2">
            <button className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-[#e6dbb4]/30 transition-all text-xs flex items-center gap-2">
              <Calendar className="w-3 h-3" />
              Schedule Meeting
            </button>
            <button className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-[#e6dbb4]/30 transition-all text-xs flex items-center gap-2">
              <Video className="w-3 h-3" />
              Video Call
            </button>
          </div>
        </div>

        {/* Input */}
        <div className="px-6 py-4 pb-24 border-t border-white/10 bg-black/50 backdrop-blur-xl">
          <div className="flex items-end gap-2">
            <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-all flex-shrink-0">
              <Plus className="w-5 h-5" />
            </button>
            <div className="flex-1 relative">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Type a message..."
                rows={1}
                className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#e6dbb4]/40 focus:bg-white/10 transition-all resize-none"
                style={{ minHeight: '44px', maxHeight: '120px' }}
              />
              <button className="absolute right-2 bottom-2 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-all">
                <ImageIcon className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={handleSend}
              disabled={!message.trim()}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-[#e6dbb4] to-[#d4c9a3] flex items-center justify-center text-black hover:shadow-lg hover:shadow-[#e6dbb4]/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
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
