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
  // Production Firebase hosting (project `mortar-9d29d`).
  "https://mortar-9d29d.firebaseapp.com",
  "https://mortar-9d29d.web.app",
  // Mortar Railway service hostnames only (e.g. `mortar-stage-stage`, `mortar-web-staging`,
  // `mortar-prod-*`). Scoped to the `mortar-` prefix so an unrelated attacker-controlled
  // `*.up.railway.app` deployment cannot pass the allowlist.
  /^https:\/\/mortar-[a-z0-9-]{1,61}\.up\.railway\.app$/i,
  // Conference App Railway service hostnames (e.g. `conference-app-changes-dev`,
  // `conference-app-stage`, `conference-app-prod`). Scoped to the `conference-app-`
  // prefix for the same reason as the `mortar-` rule above.
  /^https:\/\/conference-app-[a-z0-9-]{1,61}\.up\.railway\.app$/i,
];
