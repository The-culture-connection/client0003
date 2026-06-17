/**
 * check-analytics.js — read-only analytics health check against mortar-stage.
 * Verifies events are landing and rollups are being produced.
 *
 *   node tools/admin-claims/check-analytics.js
 */
const path = require("path");
const admin = require(path.join(__dirname, "..", "..", "functions", "node_modules", "firebase-admin"));
const SERVICE_ACCOUNT = path.join(__dirname, "..", "..", "mortar-stage-firebase-adminsdk-fbsvc-c7748b6158.json");

admin.initializeApp({ credential: admin.credential.cert(require(SERVICE_ACCOUNT)) });
const db = admin.firestore();

function tsToIso(v) {
  try {
    if (!v) return "(none)";
    if (typeof v.toDate === "function") return v.toDate().toISOString();
    if (typeof v === "number") return new Date(v).toISOString();
    return String(v);
  } catch { return "(unparseable)"; }
}

async function collInfo(name, tsFields) {
  const out = { name, total: null, latest: "(none)", latestField: null };
  try {
    const agg = await db.collection(name).count().get();
    out.total = agg.data().count;
  } catch (e) {
    out.total = `ERR: ${e.code || e.message}`;
  }
  for (const f of tsFields) {
    try {
      const snap = await db.collection(name).orderBy(f, "desc").limit(1).get();
      if (!snap.empty) {
        out.latest = tsToIso(snap.docs[0].get(f));
        out.latestField = f;
        break;
      }
    } catch { /* field not indexed/absent — try next */ }
  }
  return out;
}

async function eventNameBreakdown(name, tsFields, nameFields) {
  // Pull a recent sample and tally event names to spot empties / skew.
  for (const f of tsFields) {
    try {
      const snap = await db.collection(name).orderBy(f, "desc").limit(200).get();
      if (snap.empty) continue;
      const tally = {};
      let blank = 0;
      snap.forEach((d) => {
        let nm = null;
        for (const nf of nameFields) { const v = d.get(nf); if (typeof v === "string" && v) { nm = v; break; } }
        if (!nm) blank++; else tally[nm] = (tally[nm] || 0) + 1;
      });
      return { sampled: snap.size, byField: f, blankName: blank, top: Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 8) };
    } catch { /* try next ts field */ }
  }
  return null;
}

async function main() {
  console.log("=== mortar-stage analytics health ===");
  const now = Date.now();

  const collections = [
    ["analytics_events", ["created_at", "timestamp"]],
    ["analytics_raw_events", ["created_at", "timestamp"]],
    ["expansion_analytics_events", ["ingested_at", "created_at"]],
    ["analytics_daily_summaries", ["date", "created_at"]],
    ["daily_metrics", ["date", "created_at"]],
    ["derived_metrics", ["date", "created_at"]],
    ["user_analytics_summary", ["updated_at", "created_at"]],
  ];

  console.log("\n-- collection counts + most recent doc --");
  for (const [name, tsFields] of collections) {
    const info = await collInfo(name, tsFields);
    let age = "";
    if (info.latest && info.latest.endsWith("Z")) {
      const ageH = (now - new Date(info.latest).getTime()) / 3600000;
      age = ` (${ageH < 48 ? ageH.toFixed(1) + "h ago" : (ageH / 24).toFixed(1) + "d ago"})`;
    }
    console.log(`  ${name.padEnd(28)} count=${String(info.total).padEnd(7)} latest[${info.latestField || "-"}]=${info.latest}${age}`);
  }

  console.log("\n-- recent event-name breakdown (sample <=200) --");
  for (const [name, tsFields] of [["analytics_events", ["created_at", "timestamp"]], ["expansion_analytics_events", ["ingested_at", "created_at"]]]) {
    const b = await eventNameBreakdown(name, tsFields, ["event_name", "event_type", "name"]);
    if (!b) { console.log(`  ${name}: no sample`); continue; }
    console.log(`  ${name}: sampled ${b.sampled} by ${b.byField}, blank-name=${b.blankName}`);
    for (const [nm, c] of b.top) console.log(`      ${String(c).padStart(4)}  ${nm}`);
  }

  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
