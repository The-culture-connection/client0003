const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "mortar-dev",
  },
  eslint: {
    // Only run ESLint on these directories during production builds
    dirs: ['src'],
    // Allow production builds to complete even with ESLint warnings
    ignoreDuringBuilds: false,
  },
  typescript: {
    // Allow production builds to complete even with TypeScript errors (if any)
    ignoreBuildErrors: false,
  },
  webpack: (config, { isServer, dir }) => {
    // Ensure path aliases are resolved correctly
    // Use 'dir' parameter which is the absolute path to the Next.js app directory
    const srcPath = path.resolve(dir || __dirname, 'src');
    
    // Set alias for @ to point to src directory
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': srcPath,
    };
    
    // Ensure client-side only modules are properly handled
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    
    return config;
  },
};

module.exports = nextConfig;
