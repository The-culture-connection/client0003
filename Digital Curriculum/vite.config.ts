import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
      // Force ../../lib/auth to resolve to app lib (avoids resolution issues when build cwd differs, e.g. Railway)
      '../../lib/auth': path.resolve(__dirname, './src/app/lib/auth.ts'),
      // Standalone deploys (e.g. Railway root = Digital Curriculum) do not include ../functions.
      // Committed copy: src/mortar-analytics-contract/ — refreshed by scripts/sync-analytics-contract.mjs in prebuild when monorepo exists.
      '@mortar/analytics-contract': path.resolve(__dirname, './src/mortar-analytics-contract'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
