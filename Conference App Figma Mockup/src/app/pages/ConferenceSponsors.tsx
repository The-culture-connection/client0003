import {
  ArrowLeft,
  Briefcase,
  ExternalLink,
  Gift,
  MessageCircle,
  Star,
  TrendingUp,
  Users,
  Zap,
  Award,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { useState } from 'react';

export default function ConferenceSponsors() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all' | 'platinum' | 'gold'>('all');

  const sponsors = [
    {
      id: 1,
      name: 'TechCorp Global',
      tier: 'platinum',
      logo: 'TC',
      tagline: 'Building the future of cloud infrastructure',
      color: '#C1121F',
      booth: 'Booth A1',
      visitors: 234,
      perks: ['Free Trial', 'Swag Bag', 'Meet & Greet'],
      hasGiveaway: true,
    },
    {
      id: 2,
      name: 'InnovateLabs',
      tier: 'platinum',
      logo: 'IL',
      tagline: 'AI-powered solutions for modern enterprises',
      color: '#8B5CF6',
      booth: 'Booth A2',
      visitors: 189,
      perks: ['Demo Access', 'T-Shirt', 'Networking Hour'],
      hasGiveaway: true,
    },
    {
      id: 3,
      name: 'CloudScale Systems',
      tier: 'gold',
      logo: 'CS',
      tagline: 'Scale your infrastructure effortlessly',
      color: '#F59E0B',
      booth: 'Booth B3',
      visitors: 156,
      perks: ['Free Credits', 'Stickers'],
      hasGiveaway: false,
    },
    {
      id: 4,
      name: 'DevTools Pro',
      tier: 'gold',
      logo: 'DT',
      tagline: 'Developer tools that just work',
      color: '#10B981',
      booth: 'Booth B4',
      visitors: 142,
      perks: ['License Discount', 'Swag'],
      hasGiveaway: true,
    },
  ];

  const filteredSponsors = sponsors.filter((sponsor) => {
    if (activeTab === 'all') return true;
    return sponsor.tier === activeTab;
  });

  const giveaways = [
    {
      sponsor: 'TechCorp Global',
      prize: 'MacBook Pro M3',
      entries: 456,
      endsIn: '2h 34m',
      color: '#C1121F',
    },
    {
      sponsor: 'InnovateLabs',
      prize: '$500 Cloud Credits',
      entries: 312,
      endsIn: '4h 12m',
      color: '#8B5CF6',
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
              <Briefcase className="w-6 h-6 text-[#e6dbb4]" />
              <h1 className="text-2xl text-white uppercase tracking-tight">
                Sponsor Hall
              </h1>
            </div>
            <button className="w-10 h-10 rounded-full bg-[#e6dbb4]/20 border border-[#e6dbb4]/30 flex items-center justify-center text-[#e6dbb4] hover:bg-[#e6dbb4]/30 transition-colors">
              <Gift className="w-5 h-5" />
            </button>
          </div>

          <p className="text-gray-400 text-sm">Meet our amazing sponsors</p>
        </div>

        {/* Tabs */}
        <div className="px-6 mb-6">
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
              onClick={() => setActiveTab('platinum')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm uppercase tracking-wide transition-all ${
                activeTab === 'platinum'
                  ? 'bg-[#e6dbb4] text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Platinum
            </button>
            <button
              onClick={() => setActiveTab('gold')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm uppercase tracking-wide transition-all ${
                activeTab === 'gold'
                  ? 'bg-[#e6dbb4] text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Gold
            </button>
          </div>
        </div>

        {/* Active Giveaways */}
        <div className="px-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Gift className="w-5 h-5 text-amber-500" />
            <h2 className="text-white uppercase tracking-tight">Active Giveaways</h2>
          </div>

          <div className="space-y-3">
            {giveaways.map((giveaway, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 backdrop-blur-xl"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-white mb-1">{giveaway.prize}</h3>
                    <p className="text-sm text-gray-400">by {giveaway.sponsor}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-amber-400 text-sm">Ends in</p>
                    <p className="text-white">{giveaway.endsIn}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Users className="w-4 h-4" />
                    <span>{giveaway.entries} entries</span>
                  </div>
                  <button
                    className="px-4 py-2 rounded-lg text-white text-sm uppercase tracking-wide transition-all"
                    style={{
                      backgroundColor: `${giveaway.color}40`,
                      border: `1px solid ${giveaway.color}60`,
                    }}
                  >
                    Enter Now
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Sponsor Booths */}
        <div className="px-6">
          <h2 className="text-white uppercase tracking-tight mb-3">Virtual Booths</h2>

          <div className="space-y-4">
            {filteredSponsors.map((sponsor, index) => (
              <motion.div
                key={sponsor.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl hover:border-white/20 transition-all overflow-hidden group"
              >
                {/* Tier Badge */}
                <div className="absolute top-4 right-4">
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs uppercase tracking-wide"
                    style={{
                      backgroundColor: sponsor.tier === 'platinum' ? '#C1121F20' : '#F59E0B20',
                      borderColor: sponsor.tier === 'platinum' ? '#C1121F40' : '#F59E0B40',
                      color: sponsor.tier === 'platinum' ? '#C1121F' : '#F59E0B',
                    }}
                  >
                    <Award className="w-3 h-3" />
                    <span>{sponsor.tier}</span>
                  </div>
                </div>

                {/* Logo & Info */}
                <div className="flex items-start gap-4 mb-4">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl text-white border-2 flex-shrink-0"
                    style={{ backgroundColor: `${sponsor.color}40`, borderColor: sponsor.color }}
                  >
                    {sponsor.logo}
                  </div>
                  <div className="flex-1 pr-20">
                    <h3 className="text-white text-lg mb-1">{sponsor.name}</h3>
                    <p className="text-sm text-gray-400 mb-2">{sponsor.tagline}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3" style={{ color: sponsor.color }} />
                        {sponsor.booth}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" style={{ color: sponsor.color }} />
                        {sponsor.visitors} visitors
                      </span>
                    </div>
                  </div>
                </div>

                {/* Perks */}
                <div className="mb-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Perks</p>
                  <div className="flex flex-wrap gap-2">
                    {sponsor.perks.map((perk, perkIndex) => (
                      <span
                        key={perkIndex}
                        className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-xs"
                      >
                        {perk}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    className="flex-1 py-3 rounded-xl text-white uppercase tracking-wide text-sm flex items-center justify-center gap-2 transition-all"
                    style={{
                      backgroundColor: `${sponsor.color}40`,
                      border: `1px solid ${sponsor.color}60`,
                    }}
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Visit Booth</span>
                  </button>
                  <button
                    className="px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-gray-400 hover:text-white hover:border-white/30 transition-all"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </button>
                </div>

                {sponsor.hasGiveaway && (
                  <div className="mt-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                    <span className="text-amber-400 text-xs uppercase tracking-wide flex items-center justify-center gap-1">
                      <Gift className="w-3 h-3" />
                      Active Giveaway
                    </span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
