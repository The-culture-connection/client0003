/**
 * Seed Expansion mock data: fixed users + community feed_posts ONLY (no jobs, skills, events, groups).
 *
 * Creates Firebase Auth accounts with explicit UIDs `user_001` … `user_020` and matching `users/{uid}` docs.
 * Feed posts use **post_details** as the visible body; **post_title** is empty and **post_category** is `General`.
 *
 * Prerequisites (pick one):
 *   - `--credentials path/to/serviceAccount.json`, or
 *   - `GOOGLE_APPLICATION_CREDENTIALS`, or
 *   - `gcloud auth application-default login`
 *
 * Example:
 *   node seed-expansion-stage-mock.js --project mortar-stage --credentials C:\\path\\to\\mortar-stage-adminsdk.json
 *
 * From monorepo root (WorkingMortarProj), not expansion_network/, with a service account JSON:
 *   PowerShell — if "npm.ps1 cannot be loaded" (execution policy), use npm.cmd:
 *     $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\\path\\to\\mortar-stage-adminsdk.json"
 *     npm.cmd run seed:stage:expansion-mock
 *   Or call node directly (no npm):
 *     node infra/scripts/seed-expansion-stage-mock.js --project mortar-stage --credentials "C:\\path\\to\\file.json"
 *
 * Optional: SEED_DRY_RUN=1 or --dry-run (no credentials required for dry run)
 */

const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");
const { FieldValue, Timestamp } = require("firebase-admin/firestore");

const DEFAULT_PROJECT = "mortar-dev";
const DEFAULT_PASSWORD = process.env.SEED_USER_PASSWORD || "MortarDevSeed!2026";
const DRY_RUN = process.env.SEED_DRY_RUN === "1" || process.argv.includes("--dry-run");

function argProject() {
  const i = process.argv.indexOf("--project");
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return (
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    DEFAULT_PROJECT
  );
}

function argCredentialsPath() {
  const i = process.argv.indexOf("--credentials");
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return null;
}

const PROJECT_ID = argProject();

function resolveCredentialsPath() {
  const flagPath = argCredentialsPath();
  const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  return flagPath || envPath || null;
}

function initFirebaseAdmin() {
  if (admin.apps.length) return;
  const keyPath = resolveCredentialsPath();
  if (!keyPath) {
    if (DRY_RUN) {
      admin.initializeApp({ projectId: PROJECT_ID });
      return;
    }
    console.error(`
No service account JSON found. Firebase Admin cannot use mortar-stage without credentials on this machine.

Do one of the following (run from monorepo root WorkingMortarProj):

  1) PowerShell — use $env: (leading dollar sign). If npm fails with Execution Policy, use npm.cmd:
     $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\\path\\to\\mortar-stage-adminsdk.json"
     npm.cmd run seed:stage:expansion-mock

  2) Git Bash:
     export GOOGLE_APPLICATION_CREDENTIALS="/c/path/to/mortar-stage-adminsdk.json"
     npm run seed:stage:expansion-mock

  3) Any shell — bypass npm entirely:
     node infra/scripts/seed-expansion-stage-mock.js --project mortar-stage --credentials "C:\\path\\to\\mortar-stage-adminsdk.json"

Download a key: Firebase Console → Project settings → Service accounts → Generate new private key (do not commit the file).

Dry run (no Auth/Firestore calls): SEED_DRY_RUN=1 or add --dry-run
`);
    process.exit(1);
  }
  const abs = path.resolve(keyPath);
  if (!fs.existsSync(abs)) {
    console.error(`Service account file not found: ${abs}`);
    process.exit(1);
  }
  const json = JSON.parse(fs.readFileSync(abs, "utf8"));
  admin.initializeApp({
    credential: admin.credential.cert(json),
    projectId: PROJECT_ID,
  });
  console.log(`Using credentials file: ${abs}`);
}

function ts(dateStr) {
  return Timestamp.fromDate(new Date(dateStr));
}

function name(u) {
  return `${u.first_name} ${u.last_name}`.trim();
}

function buildUserDoc(uid, bp) {
  const roles = Array.isArray(bp.roles) && bp.roles.length ? bp.roles : ["Alumni"];
  return {
    uid,
    email: bp.email,
    email_verified: true,
    display_name: null,
    photo_url: null,
    first_name: bp.first_name,
    last_name: bp.last_name,
    industry: bp.industry,
    city: bp.city || "Cincinnati",
    state: bp.state || "Ohio",
    bio: bp.bio || "",
    profession: bp.profession || "",
    roles,
    badges: { earned: [], visible: [] },
    business_goals: bp.business_goals || [],
    confident_skills: bp.confident_skills || [],
    desired_skills: bp.desired_skills || [],
    membership: { status: "active", paid_modules: [] },
    onboarding_status: "complete",
    not_in_cohort: true,
    profile_completed: true,
    permissions: { hidden_videos: [] },
    points: { balance: 0, history_summary: [] },
    work_structure: { flexibility: 7, ownership: 5, weekly_hours: 40 },
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  };
}

/**
 * Prefer fixed UID `bp.uid`. If that Auth user exists, reuse; else create with that uid.
 * If email is already taken by another uid, createUser will fail — resolve in Firebase Console first.
 */
async function getOrCreateAuthUser(auth, bp, password) {
  if (DRY_RUN) {
    return { uid: bp.uid, isNew: true };
  }
  try {
    const u = await auth.getUser(bp.uid);
    return { uid: u.uid, isNew: false };
  } catch (e) {
    if (e.code !== "auth/user-not-found") throw e;
  }
    const created = await auth.createUser({
    uid: bp.uid,
      email: bp.email,
      password,
      displayName: `${bp.first_name} ${bp.last_name}`,
      emailVerified: true,
    });
    return { uid: created.uid, isNew: true };
}

/** Firestore batch max ~500 ops. */
function createBatchWriter(db) {
  let batch = db.batch();
  let count = 0;
  const commits = [];
  function set(ref, data, opt) {
    if (opt?.merge) batch.set(ref, data, { merge: true });
    else batch.set(ref, data);
    count++;
    if (count >= 450) {
      commits.push(batch.commit());
      batch = db.batch();
      count = 0;
    }
  }
  async function commit() {
    if (count > 0) commits.push(batch.commit());
    await Promise.all(commits);
  }
  return { set, commit };
}

// --- Fixtures: 20 users (order matches post authors 1:1) ---

const MOCK_USERS = [
  {
    uid: "user_001",
    first_name: "Alana",
    last_name: "Pierce",
    email: "alana.pierce@example.com",
    role: "Alumni",
    roles: ["Alumni"],
    city: "Cincinnati",
    state: "Ohio",
    bio: "I run a dessert brand and want to scale into wholesale.",
    industry: "Food & Beverage",
    profession: "Bakery Owner",
    business_goals: ["Sell skills/services", "Build partnerships", "Grow my network"],
    confident_skills: [
      "Service design and packaging",
      "Pricing strategy and margin analysis",
      "Customer persona development",
    ],
    desired_skills: [
      "Strategic partnerships and distribution channels",
      "Brand identity development",
      "Hiring and onboarding systems",
    ],
  },
  {
    uid: "user_002",
    first_name: "Jalen",
    last_name: "Cross",
    email: "jalen.cross@example.com",
    role: "Alumni",
    roles: ["Alumni"],
    city: "Cincinnati",
    state: "Ohio",
    bio: "I help businesses automate operations.",
    industry: "Technology",
    profession: "Automation Specialist",
    business_goals: ["Sell skills/services", "Learn more technical skills", "Grow my network"],
    confident_skills: [
      "Automation and workflow optimization",
      "Digital tool stack development",
      "AI tools for business productivity",
    ],
    desired_skills: [
      "Sales conversation and closing techniques",
      "Lead generation strategy",
      "Public speaking and thought leadership",
    ],
  },
  {
    uid: "user_003",
    first_name: "Taryn",
    last_name: "Bishop",
    email: "taryn.bishop@example.com",
    role: "Alumni",
    roles: ["Alumni"],
    city: "Cincinnati",
    state: "Ohio",
    bio: "Growing a fashion boutique and want better retention.",
    industry: "Retail",
    profession: "Boutique Owner",
    business_goals: ["Sell skills/services", "Buy skills/services", "Grow my network"],
    confident_skills: [
      "Brand identity development",
      "Story-driven brand positioning",
      "Customer persona development",
    ],
    desired_skills: [
      "Customer lifetime value optimization",
      "Email marketing and retention systems",
      "Cash flow management and forecasting",
    ],
  },
  {
    uid: "user_004",
    first_name: "Derrick",
    last_name: "Lofton",
    email: "derrick.lofton@example.com",
    role: "Alumni",
    roles: ["Alumni"],
    city: "Cincinnati",
    state: "Ohio",
    bio: "Scaling a logistics company.",
    industry: "Logistics",
    profession: "Logistics Owner",
    business_goals: ["Build partnerships", "Grow my network", "Buy skills/services"],
    confident_skills: ["Operational workflow design", "Vendor sourcing and supply chain management"],
    desired_skills: ["Lead generation strategy", "CRM systems", "Brand identity development"],
  },
  {
    uid: "user_005",
    first_name: "Monique",
    last_name: "Reed",
    email: "monique.reed@example.com",
    role: "Alumni",
    roles: ["Alumni"],
    city: "Cincinnati",
    state: "Ohio",
    bio: "Helping founders tell better stories.",
    industry: "Marketing",
    profession: "Brand Strategist",
    business_goals: ["Sell skills/services", "Grow my network"],
    confident_skills: ["Story-driven brand positioning", "Executive communication"],
    desired_skills: ["Business financial modeling", "Negotiation and deal structuring"],
  },
  {
    uid: "user_006",
    first_name: "Isaiah",
    last_name: "Cole",
    email: "isaiah.cole@example.com",
    role: "Alumni",
    roles: ["Alumni"],
    city: "Cincinnati",
    state: "Ohio",
    bio: "Fitness entrepreneur building community.",
    industry: "Fitness",
    profession: "Gym Owner",
    business_goals: ["Grow my network", "Build partnerships"],
    confident_skills: ["Community engagement", "Public speaking"],
    desired_skills: ["Pricing strategy", "Cash flow management"],
  },
  {
    uid: "user_007",
    first_name: "Kendra",
    last_name: "Sloan",
    email: "kendra.sloan@example.com",
    role: "Alumni",
    roles: ["Alumni"],
    city: "Cincinnati",
    state: "Ohio",
    bio: "Consultant helping founders scale.",
    industry: "Consulting",
    profession: "Business Consultant",
    business_goals: ["Sell skills/services", "Build partnerships"],
    confident_skills: ["Vision articulation", "Founder decision-making"],
    desired_skills: ["Lead generation", "Marketing funnels"],
  },
  {
    uid: "user_008",
    first_name: "Marcus",
    last_name: "Fleming",
    email: "marcus.fleming@example.com",
    role: "Alumni",
    roles: ["Alumni"],
    city: "Cincinnati",
    state: "Ohio",
    bio: "Finance focused operator.",
    industry: "Finance",
    profession: "Financial Strategist",
    business_goals: ["Sell skills/services"],
    confident_skills: ["Financial modeling", "Budget development"],
    desired_skills: ["Brand strategy", "Networking"],
  },
  {
    uid: "user_009",
    first_name: "Zaria",
    last_name: "Knight",
    email: "zaria.knight@example.com",
    role: "Alumni",
    roles: ["Alumni"],
    city: "Cincinnati",
    state: "Ohio",
    bio: "Building a skincare brand.",
    industry: "Beauty",
    profession: "Founder",
    business_goals: ["Sell skills/services", "Grow my network"],
    confident_skills: ["Customer persona", "Brand identity"],
    desired_skills: ["Operations systems", "Hiring"],
  },
  {
    uid: "user_010",
    first_name: "Devon",
    last_name: "Hayes",
    email: "devon.hayes@example.com",
    role: "Alumni",
    roles: ["Alumni"],
    city: "Cincinnati",
    state: "Ohio",
    bio: "Event-based business builder.",
    industry: "Events",
    profession: "Event Organizer",
    business_goals: ["Build partnerships"],
    confident_skills: ["Networking", "Public speaking"],
    desired_skills: ["Financial planning", "Marketing"],
  },
  {
    uid: "user_011",
    first_name: "Tristan",
    last_name: "Moore",
    email: "tristan.moore@example.com",
    role: "Alumni",
    roles: ["Alumni"],
    city: "Cincinnati",
    state: "Ohio",
    bio: "Tech founder building SaaS.",
    industry: "Tech",
    profession: "Founder",
    business_goals: ["Build partnerships"],
    confident_skills: ["MVP development", "Automation"],
    desired_skills: ["Sales", "Investor communication"],
  },
  {
    uid: "user_012",
    first_name: "Laila",
    last_name: "Grant",
    email: "laila.grant@example.com",
    role: "Alumni",
    roles: ["Alumni"],
    city: "Cincinnati",
    state: "Ohio",
    bio: "Retail expansion strategist.",
    industry: "Retail",
    profession: "Retail Owner",
    business_goals: ["Sell skills/services"],
    confident_skills: ["Pricing", "Customer journey"],
    desired_skills: ["Partnerships", "CRM"],
  },
  {
    uid: "user_013",
    first_name: "Andre",
    last_name: "Mason",
    email: "andre.mason@example.com",
    role: "Alumni",
    roles: ["Alumni"],
    city: "Cincinnati",
    state: "Ohio",
    bio: "Operations builder.",
    industry: "Operations",
    profession: "Operator",
    business_goals: ["Sell skills/services"],
    confident_skills: ["SOPs", "Workflow"],
    desired_skills: ["Branding", "Sales"],
  },
  {
    uid: "user_014",
    first_name: "Brielle",
    last_name: "Banks",
    email: "brielle.banks@example.com",
    role: "Alumni",
    roles: ["Alumni"],
    city: "Cincinnati",
    state: "Ohio",
    bio: "Creative entrepreneur.",
    industry: "Creative",
    profession: "Designer",
    business_goals: ["Sell skills/services"],
    confident_skills: ["Branding", "UX"],
    desired_skills: ["Finance", "Sales"],
  },
  {
    uid: "user_015",
    first_name: "Noah",
    last_name: "Daniels",
    email: "noah.daniels@example.com",
    role: "Alumni",
    roles: ["Alumni"],
    city: "Cincinnati",
    state: "Ohio",
    bio: "Product founder.",
    industry: "Product",
    profession: "Founder",
    business_goals: ["Build partnerships"],
    confident_skills: ["Product testing", "UX"],
    desired_skills: ["Sales", "Distribution"],
  },
  {
    uid: "user_016",
    first_name: "Camille",
    last_name: "Ross",
    email: "camille.ross@example.com",
    role: "Alumni",
    roles: ["Alumni"],
    city: "Cincinnati",
    state: "Ohio",
    bio: "Marketing builder.",
    industry: "Marketing",
    profession: "Marketer",
    business_goals: ["Sell skills/services"],
    confident_skills: ["Funnels", "Email marketing"],
    desired_skills: ["Finance", "Negotiation"],
  },
  {
    uid: "user_017",
    first_name: "Ethan",
    last_name: "Bryant",
    email: "ethan.bryant@example.com",
    role: "Alumni",
    roles: ["Alumni"],
    city: "Cincinnati",
    state: "Ohio",
    bio: "Contractor scaling business.",
    industry: "Construction",
    profession: "Contractor",
    business_goals: ["Build partnerships"],
    confident_skills: ["Operations", "Hiring"],
    desired_skills: ["Branding", "Lead gen"],
  },
  {
    uid: "user_018",
    first_name: "Nyla",
    last_name: "Carter",
    email: "nyla.carter@example.com",
    role: "Alumni",
    roles: ["Alumni"],
    city: "Cincinnati",
    state: "Ohio",
    bio: "Beauty entrepreneur.",
    industry: "Beauty",
    profession: "Founder",
    business_goals: ["Sell skills/services"],
    confident_skills: ["Brand", "Community"],
    desired_skills: ["Finance", "Systems"],
  },
  {
    uid: "user_019",
    first_name: "Trevor",
    last_name: "Scott",
    email: "trevor.scott@example.com",
    role: "Alumni",
    roles: ["Alumni"],
    city: "Cincinnati",
    state: "Ohio",
    bio: "Consultant scaling clients.",
    industry: "Consulting",
    profession: "Consultant",
    business_goals: ["Sell skills/services"],
    confident_skills: ["Sales", "CRM"],
    desired_skills: ["Brand", "Marketing"],
  },
  {
    uid: "user_020",
    first_name: "Arielle",
    last_name: "Vance",
    email: "arielle.vance@example.com",
    role: "Alumni",
    roles: ["Alumni"],
    city: "Cincinnati",
    state: "Ohio",
    bio: "Community builder.",
    industry: "Community",
    profession: "Organizer",
    business_goals: ["Grow my network"],
    confident_skills: ["Networking", "Events"],
    desired_skills: ["Funding", "Operations"],
  },
];

/** Post body in app = post_details; timestamps preserved from fixtures. */
const MOCK_FEED_POSTS = [
  {
    details:
      "What are some low-cost ways y’all are getting new customers in person? I feel like social media alone is not enough.",
    created_at: "2026-03-25T20:56:17-04:00",
  },
  {
    details:
      "I’m reworking my brand and realizing my visuals look polished but my messaging still feels vague. How did you all tighten your brand voice?",
    created_at: "2026-03-26T09:14:00-04:00",
  },
  {
    details:
      "I need to get more organized before I grow any more. What’s the first system you would put in place for a small retail business?",
    created_at: "2026-03-26T11:22:00-04:00",
  },
  {
    details:
      "Has anyone had success finding real collaboration partners through networking events? I’m trying to be more intentional and not just collect contacts.",
    created_at: "2026-03-26T13:48:00-04:00",
  },
  {
    details:
      "What tools are you all using to automate repetitive business tasks? I’m trying to save time without creating a complicated setup.",
    created_at: "2026-03-26T15:05:00-04:00",
  },
  {
    details:
      "I get interest in my services but a lot of people never follow through. What helped you improve your conversion rate?",
    created_at: "2026-03-26T18:31:00-04:00",
  },
  {
    details:
      "For those of you who have hired your first employee or contractor, what did you wish you had in place before hiring?",
    created_at: "2026-03-27T08:17:00-04:00",
  },
  {
    details:
      "I’m trying to decide whether I should bootstrap longer or start applying for grants. How did you know it was time to seek outside funding?",
    created_at: "2026-03-27T10:42:00-04:00",
  },
  {
    details:
      "Email marketing feels important but I honestly have no clue where to start. Are newsletters worth it when your audience is still small?",
    created_at: "2026-03-27T12:08:00-04:00",
  },
  {
    details:
      "I offer multiple services right now and I think it’s confusing people. Did simplifying your offers help you sell more?",
    created_at: "2026-03-27T16:55:00-04:00",
  },
  {
    details:
      "How are you all handling founder burnout? I’m realizing that being constantly available is making me less effective.",
    created_at: "2026-03-28T09:10:00-04:00",
  },
  {
    details:
      "I want to meet more founders who are serious and actually building. Where are you all finding good community right now?",
    created_at: "2026-03-28T11:37:00-04:00",
  },
  {
    details:
      "I’m losing time because too much is still in my head. What’s the easiest way to start documenting SOPs without overcomplicating it?",
    created_at: "2026-03-28T14:02:00-04:00",
  },
  {
    details:
      "For product-based businesses, what has helped most with repeat purchases? I’m trying to increase retention instead of always chasing new buyers.",
    created_at: "2026-03-28T18:19:00-04:00",
  },
  {
    details:
      "I’m thinking about partnering with another local business for a shared event. What makes a partnership actually work instead of becoming extra work?",
    created_at: "2026-03-29T08:25:00-04:00",
  },
  {
    details:
      "Do you all separate your personal and business money completely from day one? Curious what financial habits helped you early on.",
    created_at: "2026-03-29T10:53:00-04:00",
  },
  {
    details:
      "I’m struggling with delegation because I feel like I can do everything faster myself. How did you get better at letting go?",
    created_at: "2026-03-29T13:16:00-04:00",
  },
  {
    details:
      "How many times did you test or tweak your offer before it started resonating? I’m trying not to pivot too fast, but I also don’t want to ignore feedback.",
    created_at: "2026-03-29T15:44:00-04:00",
  },
  {
    details:
      "What’s one thing that made your business feel more premium or more trustworthy to customers without spending a ton?",
    created_at: "2026-03-30T09:01:00-04:00",
  },
  {
    details:
      "Would people be interested in a casual meetup for founders trying to get more organized before Q2? I think it could be helpful to talk through goals in person.",
    created_at: "2026-03-30T12:20:00-04:00",
  },
];

async function main() {
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    console.warn("WARN: FIRESTORE_EMULATOR_HOST is set. Unset for cloud project seeding.");
  }

  if (MOCK_FEED_POSTS.length !== MOCK_USERS.length) {
    console.error(
      `Fixture mismatch: ${MOCK_USERS.length} users vs ${MOCK_FEED_POSTS.length} posts (expected equal for 1:1 authors).`
    );
    process.exit(1);
  }

  console.log(`Project: ${PROJECT_ID}${DRY_RUN ? " (DRY RUN)" : ""}`);

  initFirebaseAdmin();

  const auth = admin.auth();
  const db = admin.firestore();

  const resolved = [];
  for (let i = 0; i < MOCK_USERS.length; i++) {
    const bp = MOCK_USERS[i];
    const { uid, isNew } = await getOrCreateAuthUser(auth, bp, DEFAULT_PASSWORD);
    resolved.push({ ...bp, uid, authIsNew: isNew });
    if (!DRY_RUN) {
      await db.collection("users").doc(uid).set(buildUserDoc(uid, bp), { merge: true });
    }
    console.log(`User ${bp.email} -> ${uid}${isNew ? " (new)" : ""}`);
    if (!DRY_RUN && i % 5 === 4) {
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  const users = resolved;
  const bw = DRY_RUN ? null : createBatchWriter(db);

  if (!DRY_RUN && bw) {
    MOCK_FEED_POSTS.forEach((p, i) => {
      const author = users[i];
      const id = `seed_mock_feed_${String(i).padStart(2, "0")}`;
      bw.set(db.collection("feed_posts").doc(id), {
        post_details: p.details,
        post_title: "",
        post_category: "General",
          author_id: author.uid,
          author_name: name(author),
        created_at: ts(p.created_at),
        updated_at: ts(p.created_at),
        });
      });
    await bw.commit();
  }

  console.log("\nSummary (users + feed_posts only):");
  console.log(`  Auth + users/{uid}: ${MOCK_USERS.length} (UIDs user_001 … user_020)`);
  console.log(`  feed_posts: ${MOCK_FEED_POSTS.length} (ids seed_mock_feed_00 …)`);
  console.log(`  Password (new accounts): ${DEFAULT_PASSWORD}`);
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
