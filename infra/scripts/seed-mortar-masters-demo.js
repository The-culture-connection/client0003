const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");

const PROJECT_ID = "mortar-stage";
const CREDS_PATH = path.resolve(
  __dirname,
  "../../ExpansionNetworkApp/mortar-stage-firebase-adminsdk-fbsvc-5bfe3d34b4.json"
);
const VIDEO_URL = "https://youtu.be/g1TkE84pGII?si=s5mc9YftpJSNMMxi";
const VIDEO_ID = "g1TkE84pGII";

const IMAGE_PATHS = [
  "C:/Users/Owner/.cursor/projects/c-Users-Owner-Documents-TheCultureConnectionTechnologySolutions-WorkingMortarProj/assets/c__Users_Owner_AppData_Roaming_Cursor_User_workspaceStorage_74d6cb0a22239deed60d78b196c2c276_images_image-25963bb8-8546-4f6b-b938-b6e94fbbdd1e.png",
  "C:/Users/Owner/.cursor/projects/c-Users-Owner-Documents-TheCultureConnectionTechnologySolutions-WorkingMortarProj/assets/c__Users_Owner_AppData_Roaming_Cursor_User_workspaceStorage_74d6cb0a22239deed60d78b196c2c276_images_image-1c6e8f5d-e1ca-49f4-a372-6577031e3ccc.png",
  "C:/Users/Owner/.cursor/projects/c-Users-Owner-Documents-TheCultureConnectionTechnologySolutions-WorkingMortarProj/assets/c__Users_Owner_AppData_Roaming_Cursor_User_workspaceStorage_74d6cb0a22239deed60d78b196c2c276_images_image-d4252b7e-bd1b-4e89-b4ae-2d494a58c971.png",
  "C:/Users/Owner/.cursor/projects/c-Users-Owner-Documents-TheCultureConnectionTechnologySolutions-WorkingMortarProj/assets/c__Users_Owner_AppData_Roaming_Cursor_User_workspaceStorage_74d6cb0a22239deed60d78b196c2c276_images_image-d60578f5-ee0e-429f-9766-0bf9afded4c8.png",
  "C:/Users/Owner/.cursor/projects/c-Users-Owner-Documents-TheCultureConnectionTechnologySolutions-WorkingMortarProj/assets/c__Users_Owner_AppData_Roaming_Cursor_User_workspaceStorage_74d6cb0a22239deed60d78b196c2c276_images_image-552ab985-d09e-483a-8e2c-6b113d55746c.png",
  "C:/Users/Owner/.cursor/projects/c-Users-Owner-Documents-TheCultureConnectionTechnologySolutions-WorkingMortarProj/assets/c__Users_Owner_AppData_Roaming_Cursor_User_workspaceStorage_74d6cb0a22239deed60d78b196c2c276_images_image-9f3c9995-57ba-4223-a84e-6346dc510104.png",
  "C:/Users/Owner/.cursor/projects/c-Users-Owner-Documents-TheCultureConnectionTechnologySolutions-WorkingMortarProj/assets/c__Users_Owner_AppData_Roaming_Cursor_User_workspaceStorage_74d6cb0a22239deed60d78b196c2c276_images_image-8339e58f-05fe-4bd8-8f15-7aae5ac722d8.png",
  "C:/Users/Owner/.cursor/projects/c-Users-Owner-Documents-TheCultureConnectionTechnologySolutions-WorkingMortarProj/assets/c__Users_Owner_AppData_Roaming_Cursor_User_workspaceStorage_74d6cb0a22239deed60d78b196c2c276_images_image-2bd5d190-1d32-4017-9480-c14688e4f780.png",
];

function init() {
  if (admin.apps.length) return;
  if (!fs.existsSync(CREDS_PATH)) {
    throw new Error(`Credentials file not found: ${CREDS_PATH}`);
  }
  const serviceAccount = JSON.parse(fs.readFileSync(CREDS_PATH, "utf8"));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: PROJECT_ID,
    storageBucket: `${PROJECT_ID}.firebasestorage.app`,
  });
}

async function uploadImage(localPath, lessonId, order) {
  const bucket = admin.storage().bucket();
  const ext = path.extname(localPath) || ".png";
  const filename = `slide_${String(order + 1).padStart(2, "0")}${ext}`;
  const dest = `curriculum_content/mortar_masters_demo/${lessonId}/images/${filename}`;
  await bucket.upload(localPath, {
    destination: dest,
    metadata: { contentType: "image/png" },
  });
  const file = bucket.file(dest);
  await file.makePublic();
  return {
    storage_path: dest,
    image_url: `https://storage.googleapis.com/${bucket.name}/${dest}`,
  };
}

async function run() {
  init();
  const db = admin.firestore();
  const now = FieldValue.serverTimestamp();
  const createdBy = "seed-script";

  const curriculumRef = db.collection("curricula").doc();
  const moduleRef = curriculumRef.collection("modules").doc();
  const chapterRef = moduleRef.collection("chapters").doc();
  const lessonRef = chapterRef.collection("lessons").doc();
  const courseRef = db.collection("courses").doc();

  const lessonId = lessonRef.id;

  await curriculumRef.set({
    title: "Mortar Masters Demo Curriculum",
    description: "Seeded demo curriculum for Lesson 4.",
    created_by_uid: createdBy,
    created_at: now,
    updated_at: now,
  });

  await moduleRef.set({
    title: "Verse One: Foundations",
    order: 1,
    created_at: now,
    updated_at: now,
  });

  await chapterRef.set({
    title: "Main Chapter",
    order: 1,
    created_at: now,
    updated_at: now,
  });

  await lessonRef.set({
    title: "Fade In",
    order: 1,
    theme: "dark_slide",
    is_published: true,
    created_by_uid: createdBy,
    curriculum_id: curriculumRef.id,
    module_id: moduleRef.id,
    chapter_id: chapterRef.id,
    content_type: "media",
    created_at: now,
    updated_at: now,
  });

  const contentRef = lessonRef.collection("lesson_content");
  await contentRef.add({
    order: 0,
    type: "video",
    video_provider: "youtube",
    video_id: VIDEO_ID,
    video_url: VIDEO_URL,
    caption: "Lesson Four Introduction",
    background_color: "#000000",
    created_at: now,
    updated_at: now,
  });

  for (let i = 0; i < IMAGE_PATHS.length; i++) {
    const local = IMAGE_PATHS[i];
    if (!fs.existsSync(local)) {
      throw new Error(`Slide image missing: ${local}`);
    }
    const uploaded = await uploadImage(local, lessonId, i);
    await contentRef.add({
      order: i + 1,
      type: "image",
      image_url: uploaded.image_url,
      storage_path: uploaded.storage_path,
      alt_text: `Fade In slide ${i + 1}`,
      created_at: now,
      updated_at: now,
    });
  }

  await courseRef.set({
    title: "Mortar Masters Demo",
    description: "Lesson 4 Fade In demo course seeded from Thinkific screenshots.",
    currency: "USD",
    modules: [
      {
        title: "Verse One: Foundations",
        order: 1,
        price: 0,
        durationMonths: 0,
        lessons: [{ title: "Fade In", order: 1 }],
      },
    ],
    createdBy,
    status: "published",
    totalDuration: 0,
    totalPrice: 0,
    curriculumMapping: {
      curriculumId: curriculumRef.id,
      modules: [
        {
          moduleId: moduleRef.id,
          chapters: [{ chapterId: chapterRef.id, lessons: [{ lessonId, title: "Fade In" }] }],
        },
      ],
    },
    createdAt: now,
    updatedAt: now,
  });

  await db.doc(`courses/${courseRef.id}/lessonSurveys/${lessonId}`).set({
    checkpoints: [
      {
        id: "fadein_reflection_mid",
        enabled: true,
        title: "Vision and Mission Reflection",
        afterSlideIndex: 5,
        order: 0,
        questions: [
          { order: 0, question: "In one sentence, what is your business vision?" },
          { order: 1, question: "Who is your ideal customer and what result do they want?" },
          { order: 2, question: "What culture or vibe should people feel from your business?" },
        ],
      },
      {
        id: "fadein_why_end",
        enabled: true,
        title: "Your WHY Check-in",
        afterSlideIndex: -1,
        order: 1,
        questions: [
          { order: 0, question: "What motivates you most to build this business right now?" },
          { order: 1, question: "What problem are you committed to solving for customers?" },
        ],
      },
    ],
    updated_at: now,
  });

  await db.doc(`courses/${courseRef.id}/lessonQuizzes/${lessonId}`).set({
    enabled: true,
    maxAttempts: 3,
    passPercentage: 70,
    questions: [
      {
        order: 0,
        question: "What is the primary purpose of a vision statement?",
        optionA: "Describe what customers and stakeholders should experience",
        optionB: "List every service and product in detail",
        optionC: "Set payroll and tax policy",
        optionD: "Replace a mission statement entirely",
        correctAnswer: "A",
      },
      {
        order: 1,
        question: "A mission statement most directly explains:",
        optionA: "The color palette for branding",
        optionB: "Why the company exists and how it delivers value",
        optionC: "Social media posting schedule",
        optionD: "How many employees to hire first",
        correctAnswer: "B",
      },
      {
        order: 2,
        question: "In the lesson exercise, identifying your WHY helps you:",
        optionA: "Avoid customer research",
        optionB: "Replace pricing with intuition",
        optionC: "Clarify motivation and decision-making",
        optionD: "Skip writing any business statements",
        correctAnswer: "C",
      },
      {
        order: 3,
        question: "Which statement aligns with the lesson's guidance?",
        optionA: "Mission and vision are only for large companies",
        optionB: "You should avoid narrowing your concept",
        optionC: "Founders should define the desired customer experience",
        optionD: "Reflection exercises are optional and not useful",
        correctAnswer: "C",
      },
      {
        order: 4,
        question: "The template slide asks you to define company culture/vibe to:",
        optionA: "Increase logo file resolution",
        optionB: "Guide how people feel when engaging your business",
        optionC: "Set legal ownership percentages",
        optionD: "Choose your accounting software",
        correctAnswer: "B",
      },
    ],
    updated_at: now,
  });

  console.log("Created course successfully.");
  console.log(`courseId=${courseRef.id}`);
  console.log(`curriculumId=${curriculumRef.id}`);
  console.log(`moduleId=${moduleRef.id}`);
  console.log(`chapterId=${chapterRef.id}`);
  console.log(`lessonId=${lessonId}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
