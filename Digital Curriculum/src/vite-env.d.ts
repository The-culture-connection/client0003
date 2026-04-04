/// <reference types="vite/client" />

declare module "vite/client" {
  interface ImportMetaEnv {
    readonly VITE_FIREBASE_ENV?: string;
    readonly VITE_USE_EMULATOR?: string;
    readonly VITE_FIREBASE_API_KEY?: string;
    readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
    readonly VITE_FIREBASE_PROJECT_ID?: string;
    readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
    readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
    readonly VITE_FIREBASE_APP_ID?: string;
    readonly VITE_FIREBASE_MEASUREMENT_ID?: string;
    /** Set to "true" on Railway/stage to log resolved Firebase project in the browser console */
    readonly VITE_FIREBASE_DEBUG?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}
