import { defineConfig, type Plugin } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

/**
 * Logs which Firebase project the client bundle will use (matches `src/app/lib/firebase.ts`).
 * Shows up in Railway / CI **build** logs — not in runtime server logs.
 */
function logFirebaseBuildTarget(): Plugin {
  return {
    name: 'mortar-log-firebase-build-target',
    buildStart() {
      const apiKey = process.env.VITE_FIREBASE_API_KEY
      const pid = process.env.VITE_FIREBASE_PROJECT_ID
      const appId = process.env.VITE_FIREBASE_APP_ID

      let resolved: string
      let label: string

      if (pid?.trim() && apiKey?.trim() && appId?.trim()) {
        resolved = pid.trim()
        label = 'explicit VITE_FIREBASE_* (apiKey + projectId + appId set)'
      } else {
        const v = (process.env.VITE_FIREBASE_ENV || 'dev').toLowerCase().trim()
        if (v === 'stage' || v === 'staging') {
          resolved = 'mortar-stage'
          label = 'preset stage (VITE_FIREBASE_ENV=stage|staging)'
        } else if (v === 'prod' || v === 'production') {
          resolved = pid?.trim() || 'mortar-9d29d'
          label = 'preset prod (VITE_FIREBASE_ENV=prod|production)'
        } else {
          resolved = 'mortar-dev'
          label = 'preset dev (VITE_FIREBASE_ENV unset, dev, or development)'
        }
      }

      // eslint-disable-next-line no-console -- intentional build output for Railway/CI
      console.log('')
      // eslint-disable-next-line no-console
      console.log('========== FIREBASE WEB (Vite build) ==========')
      // eslint-disable-next-line no-console
      console.log(`  VITE_FIREBASE_ENV          = ${JSON.stringify(process.env.VITE_FIREBASE_ENV ?? '(not set)')}`)
      // eslint-disable-next-line no-console
      console.log(`  VITE_FIREBASE_PROJECT_ID   = ${JSON.stringify(process.env.VITE_FIREBASE_PROJECT_ID ?? '(not set)')}`)
      // eslint-disable-next-line no-console
      console.log(`  → bundled Firebase project = ${resolved}`)
      // eslint-disable-next-line no-console
      console.log(`  → how resolved             = ${label}`)
      // eslint-disable-next-line no-console
      console.log('================================================')
      // eslint-disable-next-line no-console
      console.log('')
    },
  }
}

export default defineConfig({
  plugins: [
    logFirebaseBuildTarget(),
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
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
