/**
 * Verify Thinkific API keys and print your course structure.
 *
 * This is the first thing to run after adding your keys — it confirms the
 * credentials work and shows the real chapters/contents we'll map onto the
 * MORTAR lesson shells in the content-migration phase.
 *
 * Usage:
 *   node tools/thinkific-migrate/list-thinkific.js              # list all courses
 *   node tools/thinkific-migrate/list-thinkific.js <courseId>   # full tree for one course
 *   THINKIFIC_COURSE_ID=123 node tools/thinkific-migrate/list-thinkific.js
 *
 * Keys are read from tools/thinkific-migrate/.env (THINKIFIC_API_KEY,
 * THINKIFIC_SUBDOMAIN) or the environment.
 */

const { ThinkificClient, loadDotEnv } = require("./thinkific-client");

async function run() {
  loadDotEnv();
  const client = new ThinkificClient();

  const courseId = process.argv[2] || process.env.THINKIFIC_COURSE_ID;

  if (!courseId) {
    console.log("Fetching all courses…\n");
    const courses = await client.listCourses();
    if (!courses.length) {
      console.log("No courses returned. (Keys work, but no courses found.)");
      return;
    }
    for (const c of courses) {
      console.log(`  [${c.id}] ${c.name}  —  ${c.chapter_ids?.length || 0} chapters`);
    }
    console.log(
      `\nRe-run with a course id to see its full structure:\n` +
        `  node tools/thinkific-migrate/list-thinkific.js ${courses[0].id}`
    );
    return;
  }

  console.log(`Fetching full tree for course ${courseId}…\n`);
  const tree = await client.getCourseTree(courseId);
  console.log(`Course: ${tree.name}  (id ${tree.id})`);
  console.log(`Chapters: ${tree.chapters.length}\n`);
  for (const ch of tree.chapters) {
    console.log(`▸ Chapter [${ch.id}] ${ch.name}  (${ch.contents.length} contents)`);
    for (const ct of ch.contents) {
      console.log(`    - [${ct.id}] (${ct.contentable_type}) ${ct.name}`);
    }
  }
  console.log(
    `\nUse these chapter/content ids to map Thinkific content onto the MORTAR ` +
      `lesson shells in tools/thinkific-migrate/course-ids.json.`
  );
}

run().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
