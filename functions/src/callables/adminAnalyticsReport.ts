/**
 * adminAnalyticsReport Callable Function
 * Admin-only analytics reporting function
 * Prefers BigQuery if extension installed, else uses Firestore snapshots
 */

import {onCall, HttpsError} from "firebase-functions/v2/https";
import {initializeApp, getApps} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {getFirestore} from "firebase-admin/firestore";
import {z} from "zod";
import * as logger from "firebase-functions/logger";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const auth = getAuth();

const adminAnalyticsReportSchema = z.object({
  query_type: z.enum([
    "completion_rate",
    "avg_time_per_lesson",
    "quiz_pass_fail_rates",
    "attempt_distribution",
    "cohort_breakdown",
    "city_breakdown",
    "referral_breakdown",
  ]),
  date_range: z.object({
    start_date: z.string().optional(),
    end_date: z.string().optional(),
  }).optional(),
  filters: z.record(z.string(), z.any()).optional(),
});

export const adminAnalyticsReport = onCall(async (request) => {
  const callerUid = request.auth?.uid;

  if (!callerUid) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  // Verify caller is Admin
  const callerRecord = await auth.getUser(callerUid);
  const callerRoles = callerRecord.customClaims?.roles || [];

  if (!callerRoles.includes("Admin")) {
    throw new HttpsError(
      "permission-denied",
      "Only Admin can access analytics reports"
    );
  }

  const validationResult = adminAnalyticsReportSchema.safeParse(request.data);
  if (!validationResult.success) {
    throw new HttpsError(
      "invalid-argument",
      `Invalid input: ${validationResult.error.message}`
    );
  }

  const {query_type} = validationResult.data;

  try {
    // TODO: If BigQuery extension is installed, use BigQuery
    // For now, use Firestore snapshots

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: Record<string, any> = {};

    switch (query_type) {
    case "completion_rate": {
      // Calculate completion rate across all users
      const usersSnapshot = await db.collection("users").get();
      const totalUsers = usersSnapshot.size;

      const curriculumResultsSnapshot = await db.collectionGroup("curriculum_results")
        .where("curriculum_id", "==", "mortar_masters_online")
        .where("graduated", "==", true)
        .get();

      const graduatedUsers = curriculumResultsSnapshot.size;
      result = {
        total_users: totalUsers,
        graduated_users: graduatedUsers,
        completion_rate: totalUsers > 0 ? (graduatedUsers / totalUsers) * 100 : 0,
      };
      break;
    }

    case "avg_time_per_lesson": {
      // Calculate average time spent per lesson
      const lessonProgressSnapshot = await db.collectionGroup("lesson_progress").get();
      let totalTime = 0;
      let lessonCount = 0;

      lessonProgressSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.time_spent_seconds) {
          totalTime += data.time_spent_seconds;
          lessonCount++;
        }
      });

      result = {
        avg_time_seconds: lessonCount > 0 ? totalTime / lessonCount : 0,
        total_lessons_tracked: lessonCount,
      };
      break;
    }

    case "quiz_pass_fail_rates": {
      const attemptsSnapshot = await db.collection("quiz_attempts").get();
      let passed = 0;
      let failed = 0;

      attemptsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.passed) {
          passed++;
        } else {
          failed++;
        }
      });

      const total = passed + failed;
      result = {
        total_attempts: total,
        passed,
        failed,
        pass_rate: total > 0 ? (passed / total) * 100 : 0,
        fail_rate: total > 0 ? (failed / total) * 100 : 0,
      };
      break;
    }

    case "attempt_distribution": {
      // Distribution of quiz attempts per user
      const attemptsSnapshot = await db.collection("quiz_attempts").get();
      const attemptsByUser: Record<string, number> = {};

      attemptsSnapshot.forEach((doc) => {
        const userId = doc.data().user_id;
        attemptsByUser[userId] = (attemptsByUser[userId] || 0) + 1;
      });

      const distribution = Object.values(attemptsByUser).reduce((acc, count) => {
        acc[count] = (acc[count] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      result = {
        distribution,
        total_users: Object.keys(attemptsByUser).length,
      };
      break;
    }

    case "cohort_breakdown": {
      const usersSnapshot = await db.collection("users").get();
      const cohortCounts: Record<string, number> = {};

      usersSnapshot.forEach((doc) => {
        const cohort = doc.data()?.business_profile?.cohort_name;
        if (cohort) {
          cohortCounts[cohort] = (cohortCounts[cohort] || 0) + 1;
        }
      });

      result = {
        cohort_counts: cohortCounts,
      };
      break;
    }

    case "city_breakdown": {
      const usersSnapshot = await db.collection("users").get();
      const cityCounts: Record<string, number> = {};

      usersSnapshot.forEach((doc) => {
        const city = doc.data()?.business_profile?.city;
        if (city) {
          cityCounts[city] = (cityCounts[city] || 0) + 1;
        }
      });

      result = {
        city_counts: cityCounts,
      };
      break;
    }

    case "referral_breakdown": {
      // Placeholder - would track referral sources
      result = {
        message: "Referral tracking not yet implemented",
      };
      break;
    }
    }

    logger.info(`Analytics report generated for ${callerUid}: ${query_type}`);

    return {
      success: true,
      query_type,
      data: result,
    };
  } catch (error) {
    logger.error(`Error generating analytics report for ${callerUid}:`, error);
    throw new HttpsError(
      "internal",
      `Failed to generate analytics report: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
});
