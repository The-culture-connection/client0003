import {
  Users,
  Calendar,
  MessageSquare,
  Briefcase,
  Sparkles,
  ArrowLeft,
  Award,
  QrCode,
  Map,
  Home,
  User,
  Plus,
  TrendingUp,
  Flame,
  Zap,
  Clock,
  MapPin,
  Gift,
  Camera,
  Bell,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';

export default function ConferenceLobby() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'zones' | 'badges' | 'map'>('zones');
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [liveCount, setLiveCount] = useState(1205);
  const [timeToNext, setTimeToNext] = useState(1847);

  // Simulate live activity
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveCount(prev => prev + Math.floor(Math.random() * 3 - 1));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeToNext(prev => prev > 0 ? prev - 1 : 3600);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const zones = [
    {
      id: 'networking',
      title: 'Networking Zone',
      subtitle: 'Connect with founders',
      icon: Users,
      color: '#e6dbb4',
      route: '/conference/networking',
      liveCount: 45,
      activity: '12 new connections today',
      trending: 'AI Startups',
      avatars: 8,
      status: 'Very Active',
    },
    {
      id: 'schedule',
      title: 'Event Schedule',
      subtitle: 'Sessions & Workshops',
      icon: Calendar,
      color: '#e6dbb4',
      route: '/conference/schedule',
      liveCount: 234,
      activity: 'Next: Keynote in 31 min',
      trending: '12 sessions today',
      avatars: 12,
      status: 'Live Now',
    },
    {
      id: 'community',
      title: 'Community Hub',
      subtitle: 'Discussions & Topics',
      icon: MessageSquare,
      color: '#e6dbb4',
      route: '/conference/community',
      liveCount: 156,
      activity: 'Trending: Seed Funding',
      trending: '23 new posts',
      avatars: 6,
      status: 'Hot',
    },
    {
      id: 'sponsors',
      title: 'Sponsor Hall',
      subtitle: 'Booths & Giveaways',
      icon: Briefcase,
      color: '#e6dbb4',
      route: '/conference/sponsors',
      liveCount: 18,
      activity: '3 giveaways ending soon',
      trending: 'Featured: TechCorp',
      avatars: 4,
      status: 'Active',
    },
  ];

  const quickActions = [
    { id: 'scan', label: 'Scan QR', icon: QrCode },
    { id: 'chat', label: 'Start Chat', icon: MessageSquare },
    { id: 'checkin', label: 'Check In', icon: MapPin },
    { id: 'camera', label: 'Capture', icon: Camera },
  ];

  const liveActivities = [
    '🎯 Sarah just connected with 3 founders',
    '🔥 "AI in Healthcare" session trending',
    '🎁 New giveaway from TechCorp',
    '💬 12 people joined Community Hub',
    '⚡ Keynote starting in 31 minutes',
  ];

  const [currentActivity, setCurrentActivity] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentActivity(prev => (prev + 1) % liveActivities.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const badges = [
    { title: 'Attend 3 sessions', progress: 2, total: 3, icon: '🎯' },
    { title: 'Connect with 5 people', progress: 3, total: 5, icon: '🤝' },
    { title: 'Visit 2 sponsor booths', progress: 0, total: 2, icon: '🏆' },
  ];

  const minutes = Math.floor(timeToNext / 60);
  const seconds = timeToNext % 60;

  return (
    <div className="min-h-screen bg-black relative overflow-hidden pb-24">
      {/* Enhanced atmospheric background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a1510] via-black to-black" />

      {/* Animated gradient orbs */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-[#e6dbb4]/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-40 right-10 w-80 h-80 bg-[#e6dbb4]/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      {/* Floating particles */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-[#e6dbb4] rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, Math.random() * 200 - 100],
              x: [0, Math.random() * 100 - 50],
              opacity: [Math.random() * 0.5, 0]
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: 'linear'
            }}
          />
        ))}
      </div>

      {/* Grid floor with enhanced perspective */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(230,219,180,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(230,219,180,0.08)_1px,transparent_1px)] bg-[size:40px_40px]"
           style={{ transform: 'perspective(500px) rotateX(60deg)', transformOrigin: 'center bottom' }} />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Premium Hero Header */}
        <div className="px-6 pt-6 pb-6">
          <button
            onClick={() => navigate('/mortarverse')}
            className="flex items-center gap-2 text-gray-400 hover:text-[#e6dbb4] transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Exit Lobby</span>
          </button>

          {/* Immersive conference banner */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-gradient-to-br from-[#e6dbb4]/10 via-black/50 to-black/50 border border-[#e6dbb4]/30 p-6 backdrop-blur-xl mb-4 relative overflow-hidden"
          >
            {/* Animated glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#e6dbb4]/5 to-transparent animate-pulse" />

            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-[#e6dbb4]" />
                    <h1 className="text-2xl text-white uppercase tracking-tight">
                      Mortarverse Conference
                    </h1>
                  </div>
                  <p className="text-gray-400 text-sm">Tech Summit 2026 • May 6-8</p>
                </div>
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="px-3 py-1 rounded-full bg-[#e6dbb4] text-black text-xs uppercase tracking-wide"
                >
                  Live
                </motion.div>
              </div>

              {/* Live stats row */}
              <div className="flex gap-3 mb-4">
                <div className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center gap-1 mb-1">
                    <Users className="w-3 h-3 text-[#e6dbb4]" />
                    <span className="text-xs text-gray-400">Attendees</span>
                  </div>
                  <motion.p
                    key={liveCount}
                    initial={{ scale: 1.2, color: '#e6dbb4' }}
                    animate={{ scale: 1, color: '#ffffff' }}
                    className="text-white"
                  >
                    {liveCount}
                  </motion.p>
                </div>
                <div className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center gap-1 mb-1">
                    <Clock className="w-3 h-3 text-[#e6dbb4]" />
                    <span className="text-xs text-gray-400">Next Session</span>
                  </div>
                  <p className="text-white">{minutes}:{seconds.toString().padStart(2, '0')}</p>
                </div>
                <div className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center gap-1 mb-1">
                    <Flame className="w-3 h-3 text-[#e6dbb4]" />
                    <span className="text-xs text-gray-400">Activity</span>
                  </div>
                  <p className="text-white">Very High</p>
                </div>
              </div>

              {/* Live activity ticker */}
              <div className="px-3 py-2 rounded-lg bg-[#e6dbb4]/10 border border-[#e6dbb4]/20">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={currentActivity}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-sm text-[#e6dbb4] text-center"
                  >
                    {liveActivities[currentActivity]}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          {/* Welcome message */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-gray-400 text-sm mb-1"
          >
            Welcome back, <span className="text-white">Grace</span>
          </motion.p>
        </div>

        {/* Tabs - Hidden for immersive zones-first experience */}
        <div className="px-6 mb-6">
          <div className="flex gap-2 p-1 rounded-xl bg-white/5 border border-white/10">
            <button
              onClick={() => setActiveTab('zones')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm uppercase tracking-wide transition-all ${
                activeTab === 'zones'
                  ? 'bg-[#e6dbb4] text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Explore
            </button>
            <button
              onClick={() => setActiveTab('badges')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm uppercase tracking-wide transition-all ${
                activeTab === 'badges'
                  ? 'bg-[#e6dbb4] text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Badges
            </button>
            <button
              onClick={() => setActiveTab('map')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm uppercase tracking-wide transition-all ${
                activeTab === 'map'
                  ? 'bg-[#e6dbb4] text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Map
            </button>
          </div>
        </div>

        {/* Enhanced Zones - Immersive Cards */}
        {activeTab === 'zones' && (
          <div className="flex-1 px-6 space-y-4 mb-6">
            {zones.map((zone, index) => (
              <motion.div
                key={zone.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(zone.route)}
                className="relative cursor-pointer group"
              >
                {/* Floating glow effect */}
                <div
                  className="absolute -inset-1 rounded-2xl opacity-20 group-hover:opacity-40 transition-opacity blur-xl"
                  style={{ backgroundColor: zone.color }}
                />

                {/* Main card */}
                <div className="relative rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 backdrop-blur-xl p-5 overflow-hidden">
                  {/* Animated shimmer */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                  <div className="relative">
                    {/* Header row */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {/* Icon with glow */}
                        <div
                          className="w-14 h-14 rounded-xl flex items-center justify-center border-2 relative"
                          style={{
                            backgroundColor: `${zone.color}20`,
                            borderColor: zone.color,
                          }}
                        >
                          <zone.icon className="w-7 h-7" style={{ color: zone.color }} />
                          {/* Pulsing indicator */}
                          {zone.status === 'Live Now' && (
                            <motion.div
                              animate={{ scale: [1, 1.3, 1], opacity: [1, 0, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="absolute -top-1 -right-1 w-3 h-3 bg-[#e6dbb4] rounded-full"
                            />
                          )}
                        </div>

                        <div>
                          <h3 className="text-white uppercase tracking-tight mb-1">
                            {zone.title}
                          </h3>
                          <p className="text-gray-400 text-sm">{zone.subtitle}</p>
                        </div>
                      </div>

                      {/* Status badge */}
                      <div
                        className="px-3 py-1 rounded-full border text-xs uppercase tracking-wide"
                        style={{
                          backgroundColor: `${zone.color}20`,
                          borderColor: `${zone.color}40`,
                          color: zone.color,
                        }}
                      >
                        {zone.status}
                      </div>
                    </div>

                    {/* Live activity info */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-[#e6dbb4]" />
                        <span className="text-white">{zone.liveCount} active</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <TrendingUp className="w-4 h-4 text-[#e6dbb4]" />
                        <span className="text-gray-400">{zone.activity}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Zap className="w-4 h-4 text-[#e6dbb4]" />
                        <span className="text-gray-400">{zone.trending}</span>
                      </div>
                    </div>

                    {/* Avatar stack */}
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {[...Array(zone.avatars)].map((_, i) => (
                          <div
                            key={i}
                            className="w-8 h-8 rounded-full border-2 border-black bg-gradient-to-br from-[#e6dbb4] to-[#d4c9a3]"
                            style={{
                              zIndex: zone.avatars - i,
                            }}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-500">+{zone.liveCount - zone.avatars} more</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Badges Tab */}
        {activeTab === 'badges' && (
          <div className="px-6 pb-6">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-[#e6dbb4]" />
              <h2 className="text-white uppercase tracking-tight">Collect Badges</h2>
            </div>

            <div className="space-y-3">
              {badges.map((badge, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{badge.icon}</span>
                    <div className="flex-1">
                      <span className="text-white">{badge.title}</span>
                    </div>
                    <span className="text-sm text-gray-400">
                      {badge.progress}/{badge.total}
                    </span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#e6dbb4] to-[#e6dbb4]/60 transition-all"
                      style={{ width: `${(badge.progress / badge.total) * 100}%` }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Map Tab */}
        {activeTab === 'map' && (
          <div className="px-6 pb-6">
            <h2 className="text-white uppercase tracking-tight mb-4">Conference Map</h2>
            <div className="rounded-2xl overflow-hidden border border-[#e6dbb4]/20 bg-white/5 backdrop-blur-xl">
              <img
                src="/src/imports/image.png"
                alt="Conference Map"
                className="w-full h-auto"
              />
            </div>

            {/* Map Legend */}
            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl">
              <h3 className="text-white text-sm mb-3 uppercase tracking-tight">Locations</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-400">
                  <div className="w-3 h-3 rounded-full bg-[#e6dbb4]" />
                  <span>Main Stage</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <div className="w-3 h-3 rounded-full bg-[#e6dbb4]/60" />
                  <span>Breakout Rooms</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <div className="w-3 h-3 rounded-full bg-[#e6dbb4]/40" />
                  <span>Sponsor Hall</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Quick Actions Button */}
      <motion.div
        className="fixed bottom-28 right-6 z-40"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: 'spring' }}
      >
        <AnimatePresence>
          {showQuickActions && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              className="absolute bottom-16 right-0 space-y-2 mb-2"
            >
              {quickActions.map((action, index) => (
                <motion.button
                  key={action.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/20 transition-colors"
                >
                  <action.icon className="w-5 h-5 text-[#e6dbb4]" />
                  <span className="text-white text-sm whitespace-nowrap">{action.label}</span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={() => setShowQuickActions(!showQuickActions)}
          whileTap={{ scale: 0.9 }}
          animate={{ rotate: showQuickActions ? 45 : 0 }}
          className="w-14 h-14 rounded-full bg-gradient-to-br from-[#e6dbb4] to-[#d4c9a3] shadow-lg shadow-[#e6dbb4]/50 flex items-center justify-center relative"
        >
          <Plus className="w-6 h-6 text-black" />
          {/* Pulsing ring */}
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 rounded-full border-2 border-[#e6dbb4]"
          />
        </motion.button>
      </motion.div>

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
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all bg-[#e6dbb4]/20 border border-[#e6dbb4]/40 relative"
            >
              <Home className="w-5 h-5 text-[#e6dbb4]" />
              <span className="text-[10px] text-[#e6dbb4] uppercase tracking-wide">Lobby</span>
              {/* Active glow */}
              <div className="absolute inset-0 rounded-xl bg-[#e6dbb4]/10 blur-lg -z-10" />
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
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all hover:bg-white/10 relative"
            >
              <MessageSquare className="w-5 h-5 text-gray-400" />
              <span className="text-[10px] text-gray-400 uppercase tracking-wide">Messages</span>
              {/* Notification badge */}
              <div className="absolute top-1 right-2 w-2 h-2 bg-[#e6dbb4] rounded-full" />
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

      {/* Floating notifications */}
      <AnimatePresence>
        {liveCount % 5 === 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full bg-[#e6dbb4]/20 backdrop-blur-xl border border-[#e6dbb4]/40 flex items-center gap-2"
          >
            <Bell className="w-4 h-4 text-[#e6dbb4]" />
            <span className="text-sm text-white">New connection nearby</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
