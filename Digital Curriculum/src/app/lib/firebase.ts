/**
 * Firebase configuration and initialization.
 *
 * Railway / CI: set either
 * - `VITE_FIREBASE_ENV=stage` (or `staging`) to use the embedded stage preset, or
 * - full `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`, …
 *   to override (env-only config; ignores preset project).
 *
 * If `VITE_FIREBASE_ENV` is unset, the preset defaults to **dev** (local DX).
 * Set `VITE_FIREBASE_DEBUG=true` to log resolved project at build/runtime in the browser console.
 */

import type { FirebaseOptions } from "firebase/app";
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, Auth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, Firestore } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator, Functions } from "firebase/functions";
import { getStorage, connectStorageEmulator, FirebaseStorage } from "firebase/storage";

type FirebaseEnvPreset = "dev" | "stage" | "prod";

const presetConfigs: Record<FirebaseEnvPreset, FirebaseOptions> = {
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

function readEnvOverrides(): Partial<FirebaseOptions> {
  const mid = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID;
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    ...(mid ? { measurementId: mid } : {}),
  };
}

function nonEmpty(s: string | undefined): s is string {
  return typeof s === "string" && s.trim().length > 0;
}

/** True when Railway should drive the whole web config from variables (Firebase-style). */
function hasFullExplicitEnvConfig(o: Partial<FirebaseOptions>): boolean {
  return nonEmpty(o.apiKey) && nonEmpty(o.projectId) && nonEmpty(o.appId);
}

function mergeOntoPreset(base: FirebaseOptions, overrides: Partial<FirebaseOptions>): FirebaseOptions {
  const out: FirebaseOptions = { ...base };
  (Object.keys(overrides) as (keyof FirebaseOptions)[]).forEach((k) => {
    const v = overrides[k];
    if (typeof v === "string" && v.trim() !== "") {
      (out as Record<string, string>)[k] = v;
    }
  });
  return out;
}

function resolvePresetName(): FirebaseEnvPreset {
  const raw = (import.meta.env.VITE_FIREBASE_ENV || "dev").toLowerCase().trim();
  if (raw === "stage" || raw === "staging") return "stage";
  if (raw === "prod" || raw === "production") return "prod";
  if (raw === "dev" || raw === "development" || raw === "") return "dev";
  console.warn(
    `[Firebase] Unknown VITE_FIREBASE_ENV="${import.meta.env.VITE_FIREBASE_ENV}" — using dev preset.`,
  );
  return "dev";
}

/**
 * Resolved once at module load (Vite inlines import.meta.env at build time).
 * Use `firebaseProjectId` anywhere you previously defaulted to mortar-dev.
 */
export function resolveFirebaseWebConfig(): FirebaseOptions {
  const overrides = readEnvOverrides();

  if (hasFullExplicitEnvConfig(overrides)) {
    const pid = overrides.projectId!.trim();
    return {
      apiKey: overrides.apiKey!.trim(),
      authDomain: nonEmpty(overrides.authDomain)
        ? overrides.authDomain!.trim()
        : `${pid}.firebaseapp.com`,
      projectId: pid,
      storageBucket: nonEmpty(overrides.storageBucket)
        ? overrides.storageBucket!.trim()
        : `${pid}.firebasestorage.app`,
      messagingSenderId: nonEmpty(overrides.messagingSenderId)
        ? overrides.messagingSenderId!.trim()
        : "",
      appId: overrides.appId!.trim(),
      ...(nonEmpty(overrides.measurementId as string | undefined)
        ? { measurementId: (overrides.measurementId as string).trim() }
        : {}),
    };
  }

  const preset = resolvePresetName();
  return mergeOntoPreset(presetConfigs[preset], overrides);
}

const firebaseWebConfig = resolveFirebaseWebConfig();
export const firebaseProjectId = firebaseWebConfig.projectId ?? "";

const firebaseDebug =
  import.meta.env.DEV || import.meta.env.VITE_FIREBASE_DEBUG === "true";

if (firebaseDebug && typeof window !== "undefined") {
  console.info("[Firebase] Resolved web config", {
    projectId: firebaseProjectId,
    authDomain: firebaseWebConfig.authDomain,
    presetEnv: import.meta.env.VITE_FIREBASE_ENV ?? "(unset → dev preset)",
    source: hasFullExplicitEnvConfig(readEnvOverrides()) ? "VITE_FIREBASE_* env only" : "preset + optional overrides",
  });
}

// Use emulators ONLY if explicitly enabled via environment variable
const useEmulator = import.meta.env.VITE_USE_EMULATOR === "true";

let app: FirebaseApp | null = null;
let auth: Auth;
let db: Firestore;
let functions: Functions;
let storage: FirebaseStorage;

function initializeFirebase() {
  if (typeof window === "undefined") {
    return;
  }

  if (!app) {
    if (getApps().length === 0) {
      app = initializeApp(firebaseWebConfig);
    } else {
      app = getApps()[0];
    }

    auth = getAuth(app);
    db = getFirestore(app);
    functions = getFunctions(app, "us-central1");
    storage = getStorage(app);

    if (useEmulator) {
      try {
        const authAny = auth as unknown as { _delegate?: { _config?: { emulator?: unknown } } };
        const dbAny = db as unknown as { _delegate?: { _settings?: { host?: string } } };
        const functionsAny = functions as unknown as { _delegate?: { _url?: string } };
        const storageAny = storage as unknown as { _delegate?: { _host?: string } };

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
        console.warn("Emulator connection warning:", error);
      }
    } else {
      console.log(`🔥 Using real Firebase (project: ${firebaseProjectId})`);
    }
  }
}

if (typeof window !== "undefined") {
  initializeFirebase();
} else {
  auth = {} as Auth;
  db = {} as Firestore;
  functions = {} as Functions;
  storage = {} as FirebaseStorage;
}

export { auth, db, functions, storage };
export default app;
