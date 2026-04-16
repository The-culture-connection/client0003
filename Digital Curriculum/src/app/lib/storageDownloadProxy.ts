/**
 * Download URL for a Storage object path via the `getCourseFile` HTTPS proxy.
 * Avoids browser CORS to `firebasestorage.googleapis.com` (see `PDFViewer.tsx`).
 */
import { firebaseProjectId } from "./firebase";

export function getStorageObjectViaFunctionsProxy(storagePath: string): string {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseProjectId;
  const functionsUrl =
    import.meta.env.VITE_FUNCTIONS_URL || `https://us-central1-${projectId}.cloudfunctions.net`;
  return `${functionsUrl}/getCourseFile?path=${encodeURIComponent(storagePath)}`;
}
