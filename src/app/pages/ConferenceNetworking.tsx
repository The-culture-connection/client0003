import {
  ArrowLeft,
  MapPin,
  Briefcase,
  QrCode,
  X,
  Heart,
  MessageCircle,
  Users,
  Sparkles,
  Radio,
  Filter,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { motion, useMotionValue, useTransform } from 'motion/react';
import { useState } from 'react';

export default function ConferenceNetworking() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'nearby' | 'matches' | 'connected'>('nearby');
  const [currentIndex, setCurrentIndex] = useState(0);

  const attendees = [
    {
      name: 'Alex Thompson',
      title: 'Senior Product Manager',
      company: 'TechCorp',
      interests: ['AI/ML', 'Product Strategy', 'UX'],
      location: '15m away',
      matchScore: 92,
      avatar: 'AT',
      color: '#e6dbb4',
    },
    {
      name: 'Jordan Lee',
      title: 'Software Engineer',
      company: 'StartupXYZ',
      interests: ['Web3', 'React', 'DevOps'],
      location: '23m away',
      matchScore: 87,
      avatar: 'JL',
      color: '#e6dbb4',
    },
    {
      name: 'Sam Rivera',
      title: 'Founder & CEO',
      company: 'InnovateLabs',
      interests: ['Startups', 'Funding', 'AI'],
      location: '8m away',
      matchScore: 95,
      avatar: 'SR',
      color: '#e6dbb4',
    },
  ];

  const connectedUsers = [
    { name: 'Maya Chen', title: 'Designer', avatar: 'MC', online: true },
    { name: 'Chris Park', title: 'Developer', avatar: 'CP', online: true },
    { name: 'Taylor Swift', title: 'Marketing Lead', avatar: 'TS', online: false },
  ];

  const currentAttendee = attendees[currentIndex % attendees.length];

  const handleSwipe = (direction: 'left' | 'right') => {
    setCurrentIndex((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#e6dbb4]/10 via-black to-black" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(230,219,180,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(230,219,180,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative z-10 min-h-screen flex flex-col">
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
              <Users className="w-6 h-6 text-[#e6dbb4]" />
              <h1 className="text-2xl text-white uppercase tracking-tight">
                Networking Zone
              </h1>
            </div>
            <div className="flex gap-2">
              <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-all">
                <Filter className="w-5 h-5" />
              </button>
              <button className="w-10 h-10 rounded-full bg-[#e6dbb4]/20 border border-[#e6dbb4]/30 flex items-center justify-center text-[#e6dbb4] hover:bg-[#e6dbb4]/30 transition-colors">
                <QrCode className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>45 attendees nearby</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 mb-6">
          <div className="flex gap-2 p-1 rounded-xl bg-white/5 border border-white/10">
            <button
              onClick={() => setActiveTab('nearby')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm uppercase tracking-wide transition-all ${
                activeTab === 'nearby'
                  ? 'bg-[#e6dbb4] text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Nearby
            </button>
            <button
              onClick={() => setActiveTab('matches')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm uppercase tracking-wide transition-all ${
                activeTab === 'matches'
                  ? 'bg-[#e6dbb4] text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Matches
            </button>
            <button
              onClick={() => setActiveTab('connected')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm uppercase tracking-wide transition-all ${
                activeTab === 'connected'
                  ? 'bg-[#e6dbb4] text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Connected
            </button>
          </div>
        </div>

        {/* Nearby & Matches - Swipe Cards */}
        {(activeTab === 'nearby' || activeTab === 'matches') && (
          <div className="flex-1 px-6 pb-6">
            <div className="relative h-[500px]">
              <motion.div
                key={currentIndex}
                initial={{ scale: 0.9, opacity: 0, rotateY: -10 }}
                animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 backdrop-blur-xl overflow-hidden"
              >
                {/* Match Score Badge */}
                <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-[#e6dbb4] text-black text-sm flex items-center gap-1">
                  <Sparkles className="w-4 h-4" />
                  <span>{currentAttendee.matchScore}% Match</span>
                </div>

                <div className="h-full flex flex-col p-6">
                  {/* Avatar */}
                  <div className="flex-1 flex items-center justify-center mb-6">
                    <div
                      className="w-32 h-32 rounded-full flex items-center justify-center text-4xl text-white border-4"
                      style={{
                        backgroundColor: `${currentAttendee.color}40`,
                        borderColor: currentAttendee.color,
                      }}
                    >
                      {currentAttendee.avatar}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-2xl text-white mb-1">{currentAttendee.name}</h2>
                      <p className="text-gray-400">{currentAttendee.title}</p>
                    </div>

                    <div className="flex items-center gap-2 text-gray-400">
                      <Briefcase className="w-4 h-4" />
                      <span>{currentAttendee.company}</span>
                    </div>

                    <div className="flex items-center gap-2 text-gray-400">
                      <MapPin className="w-4 h-4 text-[#e6dbb4]" />
                      <span>{currentAttendee.location}</span>
                    </div>

                    {/* Interests */}
                    <div>
                      <p className="text-gray-400 text-sm mb-2">Interests</p>
                      <div className="flex flex-wrap gap-2">
                        {currentAttendee.interests.map((interest, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-sm"
                          >
                            {interest}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Background Cards */}
              <div className="absolute inset-0 -z-10 translate-y-4 scale-95 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl" />
              <div className="absolute inset-0 -z-20 translate-y-8 scale-90 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl" />
            </div>

            {/* Swipe Actions */}
            <div className="flex items-center justify-center gap-6 mt-8">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => handleSwipe('left')}
                className="w-16 h-16 rounded-full bg-white/5 border-2 border-white/20 flex items-center justify-center text-gray-400 hover:bg-white/10 hover:border-white/30 transition-all"
              >
                <X className="w-7 h-7" />
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-[#e6dbb4] to-[#e6dbb4]/80 border-2 border-[#e6dbb4] flex items-center justify-center text-black shadow-lg shadow-[#e6dbb4]/30 hover:shadow-xl transition-all"
              >
                <Heart className="w-8 h-8" />
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => handleSwipe('right')}
                className="w-16 h-16 rounded-full bg-white/5 border-2 border-white/20 flex items-center justify-center text-gray-400 hover:bg-white/10 hover:border-white/30 transition-all"
              >
                <MessageCircle className="w-7 h-7" />
              </motion.button>
            </div>
          </div>
        )}

        {/* Connected Tab */}
        {activeTab === 'connected' && (
          <div className="flex-1 px-6 pb-6">
            <div className="mb-4">
              <p className="text-gray-400 text-sm">
                {connectedUsers.length} connections at this event
              </p>
            </div>

            <div className="space-y-3">
              {connectedUsers.map((user, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl hover:border-white/20 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-[#e6dbb4]/40 border-2 border-[#e6dbb4] flex items-center justify-center text-white">
                        {user.avatar}
                      </div>
                      {user.online && (
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-black" />
                      )}
                    </div>

                    <div className="flex-1">
                      <h3 className="text-white mb-0.5">{user.name}</h3>
                      <p className="text-sm text-gray-400">{user.title}</p>
                    </div>

                    <button className="w-10 h-10 rounded-full bg-[#e6dbb4]/20 border border-[#e6dbb4]/30 flex items-center justify-center text-[#e6dbb4] hover:bg-[#e6dbb4]/30 transition-colors">
                      <MessageCircle className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* QR Scan Button */}
        <div className="px-6 pb-6">
          <motion.button
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#e6dbb4] to-[#e6dbb4]/80 text-black uppercase tracking-wide shadow-lg shadow-[#e6dbb4]/30 hover:shadow-xl transition-all flex items-center justify-center gap-2"
          >
            <QrCode className="w-5 h-5" />
            <span>Scan QR to Connect</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
