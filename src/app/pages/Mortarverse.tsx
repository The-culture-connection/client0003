import { Sparkles, Users, Calendar, X } from 'lucide-react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import networkingShop from '../../imports/Untitled_design__8_.png';
import conferenceShop from '../../imports/Untitled_design__7_.png';

export default function Mortarverse() {
  const navigate = useNavigate();
  const [selectedShop, setSelectedShop] = useState<string | null>(null);

  const shops = [
    {
      id: 'networking',
      title: 'Networking Hall',
      subtitle: 'Connect • Grow • Collaborate',
      description: 'Build meaningful connections with alumni and peers',
      icon: Users,
      route: '/home',
      stats: { members: 2847, online: 341 },
      image: networkingShop,
      colors: {
        primary: '#C1121F',
        secondary: '#000000',
      },
    },
    {
      id: 'conference',
      title: 'Conference Center',
      subtitle: 'Learn • Engage • Network',
      description: 'Join sessions, earn badges, and engage with the community',
      icon: Calendar,
      route: '/conference/lobby',
      stats: { sessions: 12, attendees: 1205 },
      image: conferenceShop,
      colors: {
        primary: '#e6dbb4',
        secondary: '#000000',
      },
    },
  ];

  const selectedShopData = shops.find((s) => s.id === selectedShop);

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Silver gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-black to-black" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-700/10 via-transparent to-transparent" />

      {/* Starfield effect */}
      <div className="absolute inset-0">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-px h-px bg-gray-400 rounded-full"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.5 + 0.3,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="p-6 text-center mt-8"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-6 h-6 text-gray-400" />
            <h1 className="text-3xl text-white uppercase tracking-tight">
              The Mortarverse
            </h1>
            <Sparkles className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-500 text-sm">
            Explore the digital neighborhood
          </p>
        </motion.div>

        {/* Shops - Storefront Style */}
        <div className="flex-1 flex flex-col justify-center items-center px-6 pb-32 space-y-6">
          {shops.map((shop, index) => (
            <motion.div
              key={shop.id}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedShop(shop.id)}
              className="w-full max-w-[240px] cursor-pointer"
            >
              {/* Storefront Container */}
              <div className="relative">
                {/* Bright glow background */}
                <div
                  className="absolute -inset-2 rounded-3xl blur-2xl opacity-40"
                  style={{
                    backgroundColor: shop.colors.primary,
                  }}
                />

                {/* Storefront Image */}
                <div className="relative rounded-2xl overflow-hidden border-2" style={{ borderColor: shop.colors.primary }}>
                  <img
                    src={shop.image}
                    alt={shop.title}
                    className="w-full h-auto brightness-125 contrast-110"
                  />

                  {/* Bright overlay for visibility */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                </div>

                {/* Shop Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/90 to-transparent rounded-b-2xl">
                  <div className="text-center">
                    <div
                      className="inline-block px-3 py-1 rounded-full border-2 mb-2"
                      style={{
                        backgroundColor: shop.colors.primary,
                        borderColor: shop.colors.primary,
                      }}
                    >
                      <span className="text-xs uppercase tracking-wider font-semibold text-black">
                        Open Now
                      </span>
                    </div>
                    <h2 className="text-xl text-white uppercase tracking-tight mb-1 font-bold">
                      {shop.title}
                    </h2>
                    <p className="text-gray-300 text-sm">{shop.subtitle}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

      </div>

      {/* Shop Detail Modal */}
      <AnimatePresence>
        {selectedShop && selectedShopData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end justify-center p-6"
            onClick={() => setSelectedShop(null)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl border-2 p-6 relative"
              style={{
                backgroundColor: selectedShopData.colors.wall,
                borderColor: selectedShopData.colors.primary,
              }}
            >
              {/* Close button */}
              <button
                onClick={() => setSelectedShop(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Icon */}
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border-2"
                style={{
                  backgroundColor: `${selectedShopData.colors.primary}20`,
                  borderColor: selectedShopData.colors.primary,
                }}
              >
                <selectedShopData.icon className="w-8 h-8" style={{ color: selectedShopData.colors.primary }} />
              </div>

              {/* Title */}
              <h2 className="text-2xl text-white uppercase tracking-tight mb-2">
                {selectedShopData.title}
              </h2>
              <p className="text-gray-400 mb-4">{selectedShopData.description}</p>

              {/* Stats */}
              <div className="flex gap-3 mb-6">
                {Object.entries(selectedShopData.stats).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex-1 p-3 rounded-xl border"
                    style={{
                      backgroundColor: `${selectedShopData.colors.primary}10`,
                      borderColor: `${selectedShopData.colors.primary}30`,
                    }}
                  >
                    <p className="text-white text-lg mb-1">{value}</p>
                    <p className="text-gray-400 text-xs uppercase tracking-wide">{key}</p>
                  </div>
                ))}
              </div>

              {/* Enter button */}
              <button
                onClick={() => navigate(selectedShopData.route)}
                className="w-full py-4 rounded-xl text-white uppercase tracking-wide transition-all shadow-lg"
                style={{
                  backgroundColor: selectedShopData.colors.primary,
                }}
              >
                Enter {selectedShopData.title}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
