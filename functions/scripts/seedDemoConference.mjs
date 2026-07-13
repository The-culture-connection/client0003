/**
 * Seed a mock conference + a networking deck of demo "bots" into a Firebase
 * project (default: mortar-demo) so testers can experience the Conference Center
 * end-to-end. Each bot is a full networkingProfile (enabled + isDemoBot) plus a
 * users/{uid} doc so the deck cards, profile modal, and DM chat all resolve.
 *
 * Because the bots carry `isDemoBot: true`, `recordConferenceSwipe` auto-matches
 * when a tester swipes right on one — a single tester gets the full
 * match → "It's a match!" → seeded DM flow with no second person.
 *
 * PREREQS (run once):
 *   1. Application Default Credentials for the target project, EITHER:
 *        gcloud auth application-default login          (browser)
 *      OR a service-account key:
 *        export GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json   (Git Bash)
 *        setx GOOGLE_APPLICATION_CREDENTIALS "C:\path\to\sa.json" (PowerShell, new shell)
 *   2. firebase-admin is available (this file lives in functions/, run from there).
 *
 * RUN:
 *   cd functions
 *   node scripts/seedDemoConference.mjs                 # seeds mortar-demo
 *   FIREBASE_PROJECT=mortar-demo node scripts/seedDemoConference.mjs
 *
 * Safety: refuses to run unless the project id contains "demo" (override with
 * FORCE=1) so it can never accidentally seed dev/stage/prod.
 */
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";

const PROJECT_ID = process.env.FIREBASE_PROJECT || "mortar-demo";
const FORCE = process.env.FORCE === "1";
const CONFERENCE_ID = process.env.CONFERENCE_ID || "demo-expansion-2026";

if (!PROJECT_ID.includes("demo") && !FORCE) {
  console.error(
    `Refusing to seed project "${PROJECT_ID}" — it doesn't look like a demo project.\n` +
      `Set FORCE=1 to override.`,
  );
  process.exit(1);
}

initializeApp({ projectId: PROJECT_ID, credential: applicationDefault() });
const db = getFirestore();

const now = new Date();
const daysFromNow = (d) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

const conference = {
  name: "Expansion Summit 2026 (Demo)",
  description:
    "A hands-on demo conference for founders, operators, and investors. Swipe to meet the right people, browse sessions, and explore the sponsor hall.",
  status: "active",
  location: "The Culture Connection · Virtual + Atlanta, GA",
  timezone: "America/New_York",
  priceCents: 0,
  currency: "usd",
  heroImageUrl: "",
  startDate: Timestamp.fromDate(now),
  endDate: Timestamp.fromDate(daysFromNow(2)),
  expiresAt: Timestamp.fromDate(daysFromNow(365)),
  activeFrom: Timestamp.fromDate(daysFromNow(-1)),
  activeUntil: Timestamp.fromDate(daysFromNow(365)),
  attendeeCount: 0,
  checkInTotal: 0,
  isDemo: true,
  createdAt: FieldValue.serverTimestamp(),
  updatedAt: FieldValue.serverTimestamp(),
};

// Varied personas so the ranking produces different scores + "why you should
// meet" reasons when a tester's profile overlaps (skills offered↔sought, shared
// goals, same industry).
const bots = [
  {
    id: "demobot-sarah-chen",
    displayName: "Sarah Chen",
    profession: "AI Research Lead",
    industry: "Artificial Intelligence",
    location: "San Francisco, CA",
    photo: 5,
    offers: ["Machine Learning", "Mentorship", "Hiring"],
    seeks: ["Fundraising", "Co-founder"],
    goals: ["Raise capital", "Build a team"],
    bio: "Building applied AI for healthcare. Ex-DeepMind. Love talking models, moats, and hiring.",
  },
  {
    id: "demobot-marcus-rivera",
    displayName: "Marcus Rivera",
    profession: "Founder & CEO",
    industry: "SaaS",
    location: "Austin, TX",
    photo: 12,
    offers: ["Go-to-Market", "Investor Intros", "Fundraising"],
    seeks: ["Engineering", "Design"],
    goals: ["Grow revenue", "Find customers"],
    bio: "Second-time founder. Scaled infra to 10M users. Happy to share fundraising war stories.",
  },
  {
    id: "demobot-aisha-bello",
    displayName: "Aisha Bello",
    profession: "Head of Product",
    industry: "Health & Wellness",
    location: "Atlanta, GA",
    photo: 47,
    offers: ["Product Strategy", "UX Research"],
    seeks: ["Fractional Design", "Advisors"],
    goals: ["Launch a product", "Find customers"],
    bio: "I turn 0→1 messes into shipped products. Obsessed with onboarding and retention.",
  },
  {
    id: "demobot-diego-santos",
    displayName: "Diego Santos",
    profession: "Engineering Director",
    industry: "SaaS",
    location: "Atlanta, GA",
    photo: 33,
    offers: ["System Design", "Engineering", "Mentorship"],
    seeks: ["Contract Work", "Speaking Gigs"],
    goals: ["Build a team", "Grow my network"],
    bio: "Distributed systems nerd. I like whiteboards, coffee, and a good on-call story.",
  },
  {
    id: "demobot-priya-nair",
    displayName: "Priya Nair",
    profession: "Growth Marketer",
    industry: "Marketing",
    location: "Toronto, ON",
    photo: 24,
    offers: ["Paid Growth", "Brand", "Go-to-Market"],
    seeks: ["Founders to help", "New Role"],
    goals: ["Find customers", "Grow my network"],
    bio: "Took 3 startups from $0→$1M ARR. Ask me about creative testing and lifecycle.",
  },
  {
    id: "demobot-tom-becker",
    displayName: "Tom Becker",
    profession: "Angel Investor",
    industry: "Finance",
    location: "New York, NY",
    photo: 15,
    offers: ["Angel Checks", "Investor Intros", "Fundraising"],
    seeks: ["Pre-seed AI", "Fintech Founders"],
    goals: ["Find deals", "Grow my network"],
    bio: "Writing $25–100k checks into technical founders. Former operator, still tinkering.",
  },
  {
    id: "demobot-lena-okafor",
    displayName: "Lena Okafor",
    profession: "Design Lead",
    industry: "Design",
    location: "Remote",
    photo: 44,
    offers: ["UX Research", "Brand", "Design"],
    seeks: ["Startup Role", "Mentorship"],
    goals: ["Launch a product", "Find a mentor"],
    bio: "Product designer who ships. Design systems, prototyping, and scrappy user testing.",
  },
  {
    id: "demobot-james-park",
    displayName: "James Park",
    profession: "Sales Leader",
    industry: "SaaS",
    location: "Chicago, IL",
    photo: 51,
    offers: ["Sales", "Go-to-Market", "Partnerships"],
    seeks: ["Co-founder", "Engineering"],
    goals: ["Grow revenue", "Find a co-founder"],
    bio: "Built and led sales teams from first rep to $10M ARR. Ask me about enterprise deals.",
  },
  {
    id: "demobot-nadia-hassan",
    displayName: "Nadia Hassan",
    profession: "Data Scientist",
    industry: "Artificial Intelligence",
    location: "Atlanta, GA",
    photo: 26,
    offers: ["Machine Learning", "Analytics"],
    seeks: ["Fundraising", "Advisors"],
    goals: ["Raise capital", "Find a mentor"],
    bio: "Turning messy data into product features. Recsys, forecasting, and a soft spot for NLP.",
  },
  {
    id: "demobot-oliver-grant",
    displayName: "Oliver Grant",
    profession: "Operations Partner",
    industry: "Consulting",
    location: "Boston, MA",
    photo: 60,
    offers: ["Operations", "Fundraising", "Mentorship"],
    seeks: ["New Role", "Founders to help"],
    goals: ["Grow my network", "Find customers"],
    bio: "Fractional COO for early-stage teams. Hiring, finance, and getting ops out of chaos.",
  },
];

function splitName(full) {
  const parts = full.trim().split(/\s+/);
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ") };
}

async function run() {
  console.log(`Seeding project "${PROJECT_ID}", conference "${CONFERENCE_ID}"…`);
  const confRef = db.collection("conferences").doc(CONFERENCE_ID);
  await confRef.set(conference, { merge: true });
  console.log(`  ✓ conference: ${conference.name}`);

  let n = 0;
  for (const b of bots) {
    const { first, last } = splitName(b.displayName);
    const photoUrl = `https://i.pravatar.cc/500?img=${b.photo}`;

    // Deck snapshot (what the networking screen reads).
    await confRef.collection("networkingProfiles").doc(b.id).set(
      {
        uid: b.id,
        displayName: b.displayName,
        profession: b.profession,
        industry: b.industry,
        location: b.location,
        photoUrl,
        offers: b.offers,
        seeks: b.seeks,
        goals: b.goals,
        bio: b.bio,
        enabled: true,
        isDemoBot: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    // Backing user doc so the DM chat + profile lookups show the bot's name/photo.
    await db.collection("users").doc(b.id).set(
      {
        first_name: first,
        last_name: last,
        display_name: b.displayName,
        photo_url: photoUrl,
        profession: b.profession,
        tribe: b.industry,
        industry: b.industry,
        bio: b.bio,
        confident_skills: b.offers,
        desired_skills: b.seeks,
        business_goals: b.goals,
        isDemoBot: true,
      },
      { merge: true },
    );
    n++;
  }
  console.log(`  ✓ ${n} networking demo bots (profiles + user docs)`);
  console.log("\nDone. Testers who enter this conference will see a full swipe deck;");
  console.log("swiping right on any bot instantly matches and opens a seeded chat.");
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
