import {
  ArrowLeft,
  Send,
  Users,
  Clock,
  MapPin,
  MoreVertical,
  Heart,
  Reply,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { motion } from 'motion/react';
import { useState } from 'react';

export default function SessionChat() {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const [message, setMessage] = useState('');

  const session = {
    title: 'The Future of AI in Startups',
    speaker: 'Dr. Sarah Chen',
    speakerTitle: 'AI Research Lead, TechCorp',
    time: '2:00 PM - 3:00 PM',
    room: 'Main Stage',
    attendees: 342,
  };

  const messages = [
    {
      id: 1,
      user: 'Alex Thompson',
      avatar: 'AT',
      message: 'Great insights on AI implementation! How do you handle data privacy concerns?',
      time: '2:15 PM',
      likes: 12,
    },
    {
      id: 2,
      user: 'Jordan Lee',
      avatar: 'JL',
      message: 'This is exactly what we needed to hear for our startup journey 🚀',
      time: '2:18 PM',
      likes: 8,
    },
    {
      id: 3,
      user: 'Sam Rivera',
      avatar: 'SR',
      message: 'Can you share more about the tools you mentioned?',
      time: '2:22 PM',
      likes: 15,
    },
    {
      id: 4,
      user: 'Maya Chen',
      avatar: 'MC',
      message: 'Taking so many notes! This session is incredible',
      time: '2:25 PM',
      likes: 5,
    },
  ];

  const handleSend = () => {
    if (message.trim()) {
      // Handle sending message
      setMessage('');
    }
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden flex flex-col">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#e6dbb4]/10 via-black to-black" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(230,219,180,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(230,219,180,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative z-10 flex flex-col h-screen">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/10">
          <button
            onClick={() => navigate('/conference/schedule')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Back to Schedule</span>
          </button>

          <div>
            <h1 className="text-xl text-white mb-2 uppercase tracking-tight">
              {session.title}
            </h1>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#e6dbb4]/40 border-2 border-[#e6dbb4] flex items-center justify-center text-white text-sm">
                {session.speaker
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </div>
              <div>
                <p className="text-white text-sm">{session.speaker}</p>
                <p className="text-gray-400 text-xs">{session.speakerTitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-400">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#e6dbb4]" />
                <span>{session.time}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#e6dbb4]" />
                <span>{session.room}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3 text-[#e6dbb4]" />
                <span>{session.attendees} attending</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.map((msg, index) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl"
            >
              <div className="flex items-start gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-[#e6dbb4]/40 border-2 border-[#e6dbb4] flex items-center justify-center text-white text-xs flex-shrink-0">
                  {msg.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-white text-sm">{msg.user}</h3>
                    <span className="text-xs text-gray-500">{msg.time}</span>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">{msg.message}</p>
                </div>
                <button className="text-gray-400 hover:text-white transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-4 ml-11">
                <button className="flex items-center gap-1 text-gray-400 hover:text-[#e6dbb4] transition-colors">
                  <Heart className="w-4 h-4" />
                  <span className="text-xs">{msg.likes}</span>
                </button>
                <button className="flex items-center gap-1 text-gray-400 hover:text-[#e6dbb4] transition-colors">
                  <Reply className="w-4 h-4" />
                  <span className="text-xs">Reply</span>
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Message Input */}
        <div className="p-6 border-t border-white/10">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Share your thoughts..."
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#e6dbb4]/40 transition-colors"
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!message.trim()}
              className="px-6 py-3 rounded-xl bg-[#e6dbb4] text-black hover:bg-[#e6dbb4]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
