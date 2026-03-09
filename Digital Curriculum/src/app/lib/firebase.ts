/**
 * Firebase configuration and initialization
 */

import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, Auth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, Firestore } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator, Functions } from "firebase/functions";
import { getStorage, connectStorageEmulator, FirebaseStorage } from "firebase/storage";

// Firebase configs for different environments
const firebaseConfigs = {
  dev: {
    apiKey: "AIzaSyD1cDEF3bATeBq5F4O5t5F1VD5fvf2unz8",
    authDomain: "mortar-dev.firebaseapp.com",
    projectId: "mortar-dev",
    storageBucket: "mortar-dev.firebasestorage.app",
    messagingSenderId: "260497170681",
    appId: "1:260497170681:web:11edf26a24a29d54990228",
    measurementId: "G-6KR5VWS98Y",
  },
  stage: {
    apiKey: "AIzaSyBUJreREmYaNjbv7zlLLkdTNk-tiFODwA8",
    authDomain: "mortar-stage.firebaseapp.com",
    projectId: "mortar-stage",
    storageBucket: "mortar-stage.firebasestorage.app",
    messagingSenderId: "999601815280",
    appId: "1:999601815280:web:ea9680e90fc149160b8c35",
    measurementId: "G-XQ2CZ5J7TX",
  },
  prod: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyB_cZlRhGxQkrTw6rUMfEpEPyvW-mPzfcs",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mortar-9d29d.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mortar-9d29d",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mortar-9d29d.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "83025733087",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:83025733087:web:4140d965a670e3ca67d06a",
  },
};

// Determine environment (use VITE_ prefix for Vite projects)
const env = (import.meta.env.VITE_FIREBASE_ENV || "dev") as keyof typeof firebaseConfigs;
// Use emulators ONLY if explicitly enabled via environment variable
const useEmulator = import.meta.env.VITE_USE_EMULATOR === "true";

// Initialize Firebase (client-side only to avoid SSR hydration issues)
let app: FirebaseApp | null = null;
let auth: Auth;
let db: Firestore;
let functions: Functions;
let storage: FirebaseStorage;

// Lazy initialization function (only called on client)
function initializeFirebase() {
  if (typeof window === "undefined") {
    return;
  }

  if (!app) {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfigs[env]);
    } else {
      app = getApps()[0];
    }

    // Initialize services
    auth = getAuth(app);
    db = getFirestore(app);
    functions = getFunctions(app, "us-central1");
    storage = getStorage(app);

    // Connect to emulators ONLY if explicitly enabled
    if (useEmulator) {
      try {
        // Use type assertion to access internal properties for emulator check
        const authAny = auth as any;
        const dbAny = db as any;
        const functionsAny = functions as any;
        const storageAny = storage as any;

        if (!authAny._delegate?._config?.emulator) {
          connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
        }
        if (!dbAny._delegate?._settings?.host?.includes("localhost")) {
          connectFirestoreEmulator(db, "localhost", 8085);
        }
        if (!functionsAny._delegate?._url?.includes("localhost")) {
          connectFunctionsEmulator(functions, "localhost", 5001);
        }
        if (!storageAny._delegate?._host?.includes("localhost")) {
          connectStorageEmulator(storage, "localhost", 9199);
        }
        console.log("🔥 Firebase Emulators enabled");
      } catch (error) {
        // Emulators already connected, ignore error
        console.warn("Emulator connection warning:", error);
      }
    } else {
      console.log(`🔥 Using real Firebase services (${env} environment)`);
    }
  }
}

// Initialize on client side
if (typeof window !== "undefined") {
  initializeFirebase();
} else {
  // Server-side: create dummy objects to avoid import errors
  auth = {} as Auth;
  db = {} as Firestore;
  functions = {} as Functions;
  storage = {} as FirebaseStorage;
}

export { auth, db, functions, storage };
export default app;
