/**
 * Seed taxonomies (skills, industries, roles) for matching system
 * Run: node infra/scripts/seed-taxonomies.js [--env=dev|stage|prod]
 */

const admin = require("firebase-admin");
const path = require("path");

// Parse environment
const args = process.argv.slice(2);
const envArg = args.find((arg) => arg.startsWith("--env="));
const env = envArg ? envArg.split("=")[1] : "dev";

// Initialize Firebase Admin
const serviceAccountPath = path.join(
  __dirname,
  "..",
  "Credentials",
  `mortar-${env}-service-account.json`
);

try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} catch (error) {
  console.error("Error loading service account:", error.message);
  console.log("Using default credentials (emulator or gcloud auth)");
  admin.initializeApp();
}

const db = admin.firestore();

// Taxonomies data
const skills = [
  { name: "JavaScript", synonyms: ["JS", "ECMAScript"] },
  { name: "TypeScript", synonyms: ["TS"] },
  { name: "React", synonyms: [] },
  { name: "Node.js", synonyms: ["Node", "NodeJS"] },
  { name: "Python", synonyms: [] },
  { name: "Product Management", synonyms: ["PM", "Product Manager"] },
  { name: "UI/UX Design", synonyms: ["User Interface Design", "User Experience Design"] },
  { name: "Marketing Strategy", synonyms: ["Marketing", "Digital Marketing"] },
  { name: "Sales", synonyms: ["Business Development", "BD"] },
  { name: "Finance", synonyms: ["Financial Analysis", "Accounting"] },
  { name: "Operations", synonyms: ["Ops", "Business Operations"] },
  { name: "Leadership", synonyms: ["Management", "Team Leadership"] },
  { name: "Entrepreneurship", synonyms: ["Startup", "Founding"] },
  { name: "Data Analysis", synonyms: ["Analytics", "Data Science"] },
  { name: "Project Management", synonyms: ["PM", "Program Management"] },
];

const industries = [
  { name: "Technology" },
  { name: "Healthcare" },
  { name: "Finance" },
  { name: "Education" },
  { name: "Retail" },
  { name: "Manufacturing" },
  { name: "Consulting" },
  { name: "Media & Entertainment" },
  { name: "Real Estate" },
  { name: "Non-profit" },
];

const roles = [
  { name: "Software Engineer" },
  { name: "Product Manager" },
  { name: "Designer" },
  { name: "Marketing Manager" },
  { name: "Sales Representative" },
  { name: "Operations Manager" },
  { name: "CEO" },
  { name: "CTO" },
  { name: "CFO" },
  { name: "Founder" },
];

async function seedTaxonomies() {
  console.log(`🌱 Seeding taxonomies for ${env} environment...`);

  try {
    // Seed skills
    console.log("📚 Seeding skills...");
    const skillsRef = db.collection("taxonomies").doc("skills").collection("items");
    for (const skill of skills) {
      const docRef = skillsRef.doc();
      await docRef.set({
        name: skill.name,
        synonyms: skill.synonyms || [],
        category_id: null,
        is_active: true,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`  ✓ ${skill.name}`);
    }

    // Seed industries
    console.log("🏭 Seeding industries...");
    const industriesRef = db.collection("taxonomies").doc("industries").collection("items");
    for (const industry of industries) {
      const docRef = industriesRef.doc();
      await docRef.set({
        name: industry.name,
        synonyms: [],
        category_id: null,
        is_active: true,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`  ✓ ${industry.name}`);
    }

    // Seed roles
    console.log("👔 Seeding roles...");
    const rolesRef = db.collection("taxonomies").doc("roles").collection("items");
    for (const role of roles) {
      const docRef = rolesRef.doc();
      await docRef.set({
        name: role.name,
        synonyms: [],
        category_id: null,
        is_active: true,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`  ✓ ${role.name}`);
    }

    console.log("✅ Taxonomies seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding taxonomies:", error);
    process.exit(1);
  }
}

seedTaxonomies();
