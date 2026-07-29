/* READ-ONLY audit of one Firebase project. Writes nothing. */
const admin = require("firebase-admin");

const KEY = process.argv[2];
const key = require(KEY);
const db = admin.initializeApp({ credential: admin.credential.cert(key) }).firestore();

const COLLECTIONS = [
  "shopItems",
  "users",
  "conferences",
  "expansion_analytics_events",
  "user_analytics_summary",
  "badge_definitions",
  "badge_progress",
  "user_badges",
  "conference_missions",
  "mission_progress",
  "feed_posts",
  "events_mobile",
  "groups_mobile",
  "dm_threads",
  "analytics_raw_events",
  "daily_metrics",
];

async function count(name) {
  try {
    const snap = await db.collection(name).count().get();
    return snap.data().count;
  } catch (e) {
    return `err:${e.code ?? e.message}`;
  }
}

(async () => {
  console.log(`PROJECT: ${key.project_id}\n`);
  console.log("collection".padEnd(32), "docs".padStart(9));
  console.log("-".repeat(43));
  for (const c of COLLECTIONS) {
    console.log(c.padEnd(32), String(await count(c)).padStart(9));
  }

  const shop = await db.collection("shopItems").get();
  console.log(`\n=== shopItems (${shop.size}) ===`);
  shop.docs.slice(0, 25).forEach((d) => {
    const x = d.data();
    console.log(`  ${d.id}  ${JSON.stringify(x.name ?? x.title ?? "(unnamed)")}`);
  });

  const confs = await db.collection("conferences").get();
  console.log(`\n=== conferences (${confs.size}) ===`);
  confs.docs.forEach((d) => {
    const x = d.data();
    console.log(`  ${d.id}  status=${x.status}  name=${JSON.stringify(x.name)}  hero=${!!x.heroImageUrl} logo=${!!x.logoUrl}`);
  });

  // How stale is the analytics data?
  try {
    const oldest = await db.collection("expansion_analytics_events").orderBy("ingested_at", "asc").limit(1).get();
    const newest = await db.collection("expansion_analytics_events").orderBy("ingested_at", "desc").limit(1).get();
    const iso = (s) => (s.empty ? "—" : s.docs[0].data().ingested_at?.toDate?.().toISOString() ?? "—");
    console.log(`\n=== expansion_analytics_events range ===`);
    console.log(`  oldest: ${iso(oldest)}`);
    console.log(`  newest: ${iso(newest)}`);
  } catch (e) {
    console.log(`\n  analytics range unavailable: ${e.message}`);
  }

  // Users already carrying earned badges / cumulative counters from testing.
  const users = await db.collection("users").limit(500).get();
  let badged = 0;
  users.docs.forEach((d) => {
    const e = d.data()?.badges?.earned;
    if (Array.isArray(e) && e.length) badged++;
  });
  const summaries = await db.collection("user_analytics_summary").limit(500).get();
  let withCounts = 0;
  summaries.docs.forEach((d) => {
    const c = d.data()?.counts;
    if (c && Object.keys(c).length) withCounts++;
  });
  console.log(`\n  users sampled: ${users.size} — with earned badges: ${badged}`);
  console.log(`  user_analytics_summary sampled: ${summaries.size} — with counters: ${withCounts}`);

  process.exit(0);
})().catch((e) => {
  console.error("AUDIT FAILED:", e.message);
  process.exit(1);
});
