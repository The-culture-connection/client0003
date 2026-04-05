/**
 * MORTAR STOMP ANIMATION - Standalone Component
 *
 * DEPENDENCIES REQUIRED:
 * - React 18+
 * - Motion (Framer Motion): npm install motion
 * - Tailwind CSS
 *
 * USAGE:
 * 1. Install dependencies: npm install motion react
 * 2. Ensure Tailwind CSS is configured in your project
 * 3. Replace the image imports with your actual image paths
 * 4. Import and use: <MortarStompAnimation />
 *
 * The animation will play once on mount. To replay:
 * - Add a key prop that changes: <MortarStompAnimation key={someState} />
 * - Or wrap in a component that remounts it
 */

import { motion } from "motion/react";

// REPLACE THESE IMPORTS WITH YOUR ACTUAL IMAGE PATHS
// Example: import mortarText from "./assets/mortar.png";
import mortarText from "figma:asset/06bbde617b26809a68784b6272894b2e4e1f4ad6.png";
import cincinnatiText from "figma:asset/a03d43041cf5c3ed0a8234264dfca7c3d282a5ef.png";

export function MortarStompAnimation() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-black relative overflow-hidden">
      {/* Camera shake container */}
      <motion.div
        className="relative flex flex-col items-center"
        animate={{
          x: [0, 0, -8, 8, -6, 6, -3, 3, 0],
          y: [0, 0, -4, 4, -2, 2, -1, 1, 0]
        }}
        transition={{
          delay: 0.35,
          duration: 0.6,
          times: [0, 0.5, 0.55, 0.6, 0.65, 0.7, 0.8, 0.9, 1]
        }}
      >
        {/* MORTAR text - stomps down with violent impact */}
        <motion.div
          className="relative z-10"
          initial={{ y: -400 }}
          animate={{ y: 0 }}
          transition={{
            delay: 0.1,
            duration: 0.3,
            ease: [0.34, 1.56, 0.64, 1]
          }}
        >
          <motion.img
            src={mortarText}
            alt="MORTAR"
            className="w-auto h-72 object-contain"
            initial={{ rotate: -8 }}
            animate={{ rotate: 0 }}
            transition={{
              delay: 0.1,
              duration: 0.3,
              ease: "easeOut"
            }}
            style={{
              filter: "drop-shadow(0 20px 40px rgba(0, 0, 0, 0.7))"
            }}
          />
        </motion.div>

        {/* CINCINNATI text - closer and bigger */}
        <motion.div
          className="-mt-48 relative z-10"
          initial={{ y: 100, opacity: 0 }}
          animate={{
            y: 0,
            opacity: 1,
            x: [0, -6, 6, -4, 4, -2, 2, 0]
          }}
          transition={{
            y: {
              delay: 0.45,
              duration: 0.2,
              ease: "easeOut"
            },
            opacity: {
              delay: 0.45,
              duration: 0.15
            },
            x: {
              delay: 0.5,
              duration: 0.4,
              times: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1]
            }
          }}
        >
          <motion.img
            src={cincinnatiText}
            alt="CINCINNATI"
            className="w-auto h-48 object-contain"
            style={{
              filter: "drop-shadow(0 10px 25px rgba(0, 0, 0, 0.5))"
            }}
          />
        </motion.div>

        {/* Debris chunks */}
        {[...Array(16)].map((_, i) => (
          <motion.div
            key={`debris-${i}`}
            className="absolute w-1 h-3 bg-red-600/60"
            style={{
              left: "50%",
              top: "48%",
              rotate: `${Math.random() * 360}deg`
            }}
            initial={{ scale: 0, x: 0, y: 0, opacity: 0 }}
            animate={{
              scale: [0, 1, 0.5],
              x: Math.cos((i / 16) * Math.PI * 2) * (100 + Math.random() * 100),
              y: Math.sin((i / 16) * Math.PI * 2) * (70 + Math.random() * 70) + 30,
              opacity: [0, 0.9, 0],
              rotate: Math.random() * 720
            }}
            transition={{
              duration: 1,
              delay: 0.35 + (i * 0.015),
              ease: "easeOut"
            }}
          />
        ))}
      </motion.div>
    </div>
  );
}

/**
 * EXAMPLE USAGE IN YOUR APP:
 *
 * import { MortarStompAnimation } from './MortarStompAnimation';
 *
 * function App() {
 *   return <MortarStompAnimation />;
 * }
 *
 * TO LOOP THE ANIMATION:
 *
 * import { useState, useEffect } from 'react';
 * import { MortarStompAnimation } from './MortarStompAnimation';
 *
 * function App() {
 *   const [key, setKey] = useState(0);
 *
 *   useEffect(() => {
 *     const interval = setInterval(() => {
 *       setKey(k => k + 1);
 *     }, 3000); // Replay every 3 seconds
 *
 *     return () => clearInterval(interval);
 *   }, []);
 *
 *   return <MortarStompAnimation key={key} />;
 * }
 */
