import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Bookmark,
  Radio,
  ChevronRight,
  Filter,
  Search,
  Star,
  MessageSquare,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { useState } from 'react';

export default function ConferenceSchedule() {
  const navigate = useNavigate();
  const [activeDay, setActiveDay] = useState(0);
  const [savedSessions, setSavedSessions] = useState<number[]>([1, 3]);

  const days = ['May 6', 'May 7', 'May 8'];

  const sessions = [
    {
      id: 1,
      title: 'The Future of AI in Startups',
      speaker: 'Dr. Sarah Chen',
      speakerTitle: 'AI Research Lead, TechCorp',
      time: '9:00 AM - 10:00 AM',
      room: 'Main Stage',
      capacity: 500,
      registered: 342,
      track: 'AI/ML',
      level: 'Intermediate',
      color: '#e6dbb4',
    },
    {
      id: 2,
      title: 'Building Scalable Systems',
      speaker: 'Michael Rodriguez',
      speakerTitle: 'Engineering Director, CloudScale',
      time: '10:30 AM - 11:30 AM',
      room: 'Tech Track',
      capacity: 200,
      registered: 127,
      track: 'Engineering',
      level: 'Advanced',
      color: '#e6dbb4',
    },
    {
      id: 3,
      title: 'Product-Market Fit Strategies',
      speaker: 'Jordan Lee',
      speakerTitle: 'Founder & CEO, StartupXYZ',
      time: '1:00 PM - 2:00 PM',
      room: 'Startup Hall',
      capacity: 150,
      registered: 98,
      track: 'Product',
      level: 'Beginner',
      color: '#e6dbb4',
    },
    {
      id: 4,
      title: 'Design Systems at Scale',
      speaker: 'Alex Kim',
      speakerTitle: 'Design Lead, CreativeHub',
      time: '2:30 PM - 3:30 PM',
      room: 'Design Studio',
      capacity: 100,
      registered: 76,
      track: 'Design',
      level: 'Intermediate',
      color: '#e6dbb4',
    },
  ];

  const toggleSave = (sessionId: number) => {
    setSavedSessions((prev) =>
      prev.includes(sessionId)
        ? prev.filter((id) => id !== sessionId)
        : [...prev, sessionId]
    );
  };

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
              <Calendar className="w-6 h-6 text-[#e6dbb4]" />
              <h1 className="text-2xl text-white uppercase tracking-tight">
                Event Schedule
              </h1>
            </div>
            <div className="flex gap-2">
              <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-all">
                <Search className="w-5 h-5" />
              </button>
              <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-all">
                <Filter className="w-5 h-5" />
              </button>
            </div>
          </div>

          <p className="text-gray-400 text-sm">Tech Summit 2026</p>
        </div>

        {/* Day Selector */}
        <div className="px-6 mb-6">
          <div className="flex gap-2">
            {days.map((day, index) => (
              <button
                key={index}
                onClick={() => setActiveDay(index)}
                className={`flex-1 py-3 px-4 rounded-xl uppercase tracking-wide text-sm transition-all ${
                  activeDay === index
                    ? 'bg-[#e6dbb4] text-black shadow-lg shadow-[#e6dbb4]/30'
                    : 'bg-white/5 border border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* Saved Sessions Counter */}
        <div className="px-6 mb-6">
          <div className="p-3 rounded-xl bg-[#e6dbb4]/10 border border-[#e6dbb4]/20 backdrop-blur-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-[#e6dbb4]" />
              <span className="text-white">{savedSessions.length} sessions saved</span>
            </div>
            <button className="text-sm text-[#e6dbb4] hover:text-[#e6dbb4]/80 transition-colors uppercase tracking-wide">
              View All
            </button>
          </div>
        </div>

        {/* Sessions */}
        <div className="px-6 space-y-4">
          {sessions.map((session, index) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => navigate(`/conference/session/${session.id}`)}
              className="relative p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl hover:border-[#e6dbb4]/40 transition-all cursor-pointer overflow-hidden group"
            >
              {/* Save Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSave(session.id);
                }}
                className={`absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  savedSessions.includes(session.id)
                    ? 'bg-[#e6dbb4] text-black'
                    : 'bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${savedSessions.includes(session.id) ? 'fill-current' : ''}`} />
              </button>

              {/* Track Badge */}
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs mb-3 border"
                style={{
                  backgroundColor: `${session.color}20`,
                  borderColor: `${session.color}40`,
                  color: session.color,
                }}
              >
                <span className="uppercase tracking-wide">{session.track}</span>
              </div>

              {/* Content */}
              <h3 className="text-white text-lg mb-2 pr-12">{session.title}</h3>

              {/* Speaker */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm border-2"
                  style={{ backgroundColor: `${session.color}40`, borderColor: session.color }}
                >
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

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Clock className="w-4 h-4" style={{ color: session.color }} />
                  <span>{session.time}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <MapPin className="w-4 h-4" style={{ color: session.color }} />
                  <span>{session.room}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Users className="w-4 h-4" style={{ color: session.color }} />
                  <span>
                    {session.registered}/{session.capacity}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Star className="w-4 h-4" style={{ color: session.color }} />
                  <span>{session.level}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(session.registered / session.capacity) * 100}%`,
                      backgroundColor: session.color,
                    }}
                  />
                </div>
              </div>

              {/* Action Button */}
              <button
                className="w-full py-3 rounded-xl bg-[#e6dbb4] text-black uppercase tracking-wide flex items-center justify-center gap-2 hover:bg-[#e6dbb4]/90 transition-all shadow-lg shadow-[#e6dbb4]/20"
              >
                <MessageSquare className="w-5 h-5" />
                <span>Join Chat</span>
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
