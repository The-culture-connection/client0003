/**
 * Browser `Origin` headers allowed for Gen 2 HTTPS callables (`onCall({ cors: … })`).
 * Without a match, the **OPTIONS** preflight gets no `Access-Control-Allow-Origin` →
 * DevTools: "blocked by CORS policy".
 *
 * Add each new Railway / custom domain as a full `https://…` string (no trailing slash),
 * then `firebase deploy --only functions --project mortar-stage`.
 */
export const callableCorsAllowlist: (string | RegExp)[] = [
  "https://mortar-stage-stage.up.railway.app",
  "https://mortar-web-staging.up.railway.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "https://mortar-dev.firebaseapp.com",
  "https://mortar-dev.web.app",
  "https://mortar-stage.firebaseapp.com",
  "https://mortar-stage.web.app",
  // Default `*.up.railway.app` service URLs (single DNS label before `.up`).
  /^https:\/\/[a-z0-9][a-z0-9-]{0,61}\.up\.railway\.app$/i,
];
