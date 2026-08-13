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

  build: {
    rollupOptions: {
      output: {
        // Coarse vendor grouping so the dashboard path only downloads what it
        // needs and vendor chunks stay cacheable across app deploys. Keep the
        // groups whole-package (never split a package) to avoid circular-init
        // problems between chunks.
        manualChunks(id: string) {
          // NOTE: ids can carry a `\0` virtual-module prefix and query
          // suffixes (commonjs proxies), so package tests must not anchor on
          // the start of the id. Package rules run first so a pdf package's
          // commonjs proxy still lands in vendor-pdf.
          if (id.includes('node_modules')) {
            if (id.includes('node_modules/firebase/') || id.includes('node_modules/@firebase/')) {
              return 'vendor-firebase'
            }
            if (/node_modules\/(pdfjs-dist|react-pdf|pdf-lib|jspdf)\//.test(id)) {
              return 'vendor-pdf'
            }
            if (/node_modules\/(recharts|victory-vendor|d3-[a-z-]+|recharts-scale)\//.test(id)) {
              return 'vendor-charts'
            }
            if (/node_modules\/(react|react-dom|scheduler|react-router)\//.test(id)) {
              return 'vendor-react'
            }
            if (id.includes('node_modules/@radix-ui/')) {
              return 'vendor-radix'
            }
            // Tiny utilities shared by essentially every chunk. Left
            // unassigned, Rollup colocated them inside vendor-charts, which
            // made the entry statically preload chart code it never uses.
            if (/node_modules\/(clsx|tailwind-merge|class-variance-authority|lucide-react|date-fns)\//.test(id)) {
              return 'vendor-react'
            }
            return undefined
          }
          // Pure virtual helpers (Vite preload helper, commonjsHelpers):
          // keep them in a chunk the entry loads anyway — left unassigned,
          // Rollup placed them in vendor-pdf, dragging ~930 kB of PDF code
          // into the initial load.
          if (id.startsWith('\0')) {
            return 'vendor-react'
          }
          return undefined
        },
      },
    },
  },
})
