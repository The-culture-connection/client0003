import {
  ArrowLeft,
  TrendingUp,
  Users,
  Calendar,
  MessageSquare,
  Eye,
  Award,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';

export default function ConferenceAnalytics() {
  const navigate = useNavigate();

  const stats = [
    {
      title: 'Total Attendees',
      value: '1,205',
      change: '+12.5%',
      trend: 'up',
      icon: Users,
      color: '#C1121F',
    },
    {
      title: 'Active Sessions',
      value: '24',
      change: '+4',
      trend: 'up',
      icon: Calendar,
      color: '#8B5CF6',
    },
    {
      title: 'Engagement Rate',
      value: '87%',
      change: '+5.3%',
      trend: 'up',
      icon: TrendingUp,
      color: '#10B981',
    },
    {
      title: 'Messages Sent',
      value: '12.4K',
      change: '-2.1%',
      trend: 'down',
      icon: MessageSquare,
      color: '#F59E0B',
    },
  ];

  const topSessions = [
    { title: 'The Future of AI in Startups', attendees: 342, rating: 4.8 },
    { title: 'Building Scalable Systems', attendees: 289, rating: 4.6 },
    { title: 'Product-Market Fit Strategies', attendees: 256, rating: 4.7 },
    { title: 'Design Systems at Scale', attendees: 198, rating: 4.5 },
  ];

  const sponsorMetrics = [
    { sponsor: 'TechCorp Global', booth: 'Booth A1', visits: 234, engagement: 92 },
    { sponsor: 'InnovateLabs', booth: 'Booth A2', visits: 189, engagement: 87 },
    { sponsor: 'CloudScale Systems', booth: 'Booth B3', visits: 156, engagement: 81 },
    { sponsor: 'DevTools Pro', booth: 'Booth B4', visits: 142, engagement: 79 },
  ];

  const communityHealth = [
    { metric: 'Daily Active Users', value: 682, target: 800, percentage: 85 },
    { metric: 'Posts per Day', value: 234, target: 300, percentage: 78 },
    { metric: 'Connections Made', value: 456, target: 500, percentage: 91 },
    { metric: 'Session Attendance', value: 1024, target: 1200, percentage: 85 },
  ];

  return (
    <div className="min-h-screen bg-black relative overflow-hidden pb-24">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#C1121F]/10 via-black to-black" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(193,18,31,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(193,18,31,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />

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

          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-6 h-6 text-[#C1121F]" />
            <h1 className="text-2xl text-white uppercase tracking-tight">
              Analytics Dashboard
            </h1>
          </div>

          <p className="text-gray-400 text-sm">Real-time conference metrics</p>
        </div>

        {/* Key Stats Grid */}
        <div className="px-6 mb-6">
          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                  style={{ backgroundColor: `${stat.color}20`, border: `1px solid ${stat.color}40` }}
                >
                  <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                </div>

                <p className="text-2xl text-white mb-1">{stat.value}</p>
                <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">{stat.title}</p>

                <div
                  className={`flex items-center gap-1 text-xs ${
                    stat.trend === 'up' ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {stat.trend === 'up' ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3" />
                  )}
                  <span>{stat.change}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Top Sessions */}
        <div className="px-6 mb-6">
          <h2 className="text-white uppercase tracking-tight mb-3">Top Sessions</h2>

          <div className="space-y-2">
            {topSessions.map((session, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.05 }}
                className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-6 h-6 rounded-full bg-[#C1121F]/40 border border-[#C1121F] flex items-center justify-center text-white text-xs">
                        {index + 1}
                      </span>
                      <h3 className="text-white text-sm">{session.title}</h3>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3 text-gray-400">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {session.attendees}
                    </span>
                    <span className="flex items-center gap-1">
                      <Award className="w-3 h-3 text-amber-500" />
                      {session.rating}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Sponsor Engagement */}
        <div className="px-6 mb-6">
          <h2 className="text-white uppercase tracking-tight mb-3">Sponsor Engagement</h2>

          <div className="space-y-3">
            {sponsorMetrics.map((sponsor, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-white mb-0.5">{sponsor.sponsor}</h3>
                    <p className="text-xs text-gray-400">{sponsor.booth}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white">{sponsor.engagement}%</p>
                    <p className="text-xs text-gray-400">Engagement</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      Booth Visits
                    </span>
                    <span className="text-white">{sponsor.visits}</span>
                  </div>

                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#C1121F] to-purple-600 rounded-full"
                      style={{ width: `${sponsor.engagement}%` }}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Community Health */}
        <div className="px-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-green-500" />
            <h2 className="text-white uppercase tracking-tight">Community Health</h2>
          </div>

          <div className="space-y-3">
            {communityHealth.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.05 }}
                className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white text-sm">{item.metric}</span>
                  <span className="text-gray-400 text-sm">
                    {item.value} / {item.target}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-green-400 w-10 text-right">{item.percentage}%</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Export Button */}
        <div className="px-6">
          <motion.button
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#C1121F] to-[#C1121F]/80 text-white uppercase tracking-wide shadow-lg shadow-[#C1121F]/30 hover:shadow-xl transition-all flex items-center justify-center gap-2"
          >
            <TrendingUp className="w-5 h-5" />
            <span>Export Full Report</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
