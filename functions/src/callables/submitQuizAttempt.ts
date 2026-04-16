/**
 * submitQuizAttempt Callable Function
 * Server-authoritative quiz submission and scoring
 * Handles quiz variants, attempt tracking, and failure notifications
 */

import {onCall, HttpsError} from "firebase-functions/v2/https";
import {initializeApp, getApps} from "firebase-admin/app";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {z} from "zod";
import * as logger from "firebase-functions/logger";
import {callableCorsAllowlist} from "../callableCorsAllowlist";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

const submitQuizAttemptSchema = z.object({
  quiz_id: z.string().min(1),
  answers: z.record(z.string(), z.number()),
});

export const submitQuizAttempt = onCall(
  {region: "us-central1", cors: callableCorsAllowlist},
  async (request) => {
  const callerUid = request.auth?.uid;

  if (!callerUid) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const validationResult = submitQuizAttemptSchema.safeParse(request.data);
  if (!validationResult.success) {
    throw new HttpsError(
      "invalid-argument",
      `Invalid input: ${validationResult.error.message}`
    );
  }

  const {quiz_id, answers} = validationResult.data;

  try {
    // Get quiz document
    const quizRef = db.collection("quizzes").doc(quiz_id);
    const quizDoc = await quizRef.get();

    if (!quizDoc.exists) {
      throw new HttpsError("not-found", "Quiz not found");
    }

    const quiz = quizDoc.data();
    const passingScore = quiz?.passing_score || 70;

    // Get user's previous attempts (count only, no orderBy needed for count)
    const attemptsRef = db.collection("quiz_attempts");
    const attemptsQuery = attemptsRef
      .where("user_id", "==", callerUid)
      .where("quiz_id", "==", quiz_id);

    const attemptsSnapshot = await attemptsQuery.get();
    const attemptNumber = attemptsSnapshot.size + 1;

    // Determine variant (deterministic based on attempt number)
    const variantNumber = ((attemptNumber - 1) % (quiz?.variant_count || 1)) + 1;
    const variantRef = quizRef.collection("variants").doc(`variant_${variantNumber}`);
    const variantDoc = await variantRef.get();

    if (!variantDoc.exists) {
      throw new HttpsError("not-found", "Quiz variant not found");
    }

    const variant = variantDoc.data();
    const questions = variant?.questions || [];

    // Score the quiz (server-authoritative)
    let correctAnswers = 0;
    let totalPoints = 0;
    let earnedPoints = 0;

    for (const question of questions) {
      totalPoints += question.points || 1;
      const userAnswer = answers[question.id];
      if (userAnswer === question.correct_answer) {
        correctAnswers++;
        earnedPoints += question.points || 1;
      }
    }

    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const passed = score >= passingScore;

    // Create attempt document
    const attemptRef = db.collection("quiz_attempts").doc();
    await attemptRef.set({
      id: attemptRef.id,
      user_id: callerUid,
      quiz_id,
      variant_id: variantRef.id,
      answers,
      score,
      passed,
      attempt_number: attemptNumber,
      time_spent_seconds: 0, // Could be tracked client-side
      created_at: FieldValue.serverTimestamp(),
    });

    // Update chapter result with quiz status
    if (quiz?.chapter_id) {
      const chapterResultRef = db
        .collection("user_progress")
        .doc(callerUid)
        .collection("chapter_results")
        .doc(quiz.chapter_id);

      await chapterResultRef.set(
        {
          quiz_passed: passed,
          quiz_attempts: attemptNumber,
          updated_at: FieldValue.serverTimestamp(),
        },
        {merge: true}
      );
    }

    // Log analytics
    db.collection("analytics_events").doc().set({
      event_type: passed ? "quiz_passed" : "quiz_failed",
      user_id: callerUid,
      timestamp: FieldValue.serverTimestamp(),
      metadata: {
        quiz_id,
        attempt_number: attemptNumber,
        score,
        passed,
      },
    }).catch((err) => logger.error("Failed to log analytics:", err));

    // If failed twice, trigger email notification (stub)
    if (!passed && attemptNumber === 2) {
      logger.warn(`User ${callerUid} failed quiz ${quiz_id} twice - email notification needed`);
      // TODO: Integrate email service (SendGrid, Mailgun, etc.)
      // await sendEmailStub('quiz_failed_twice', callerUid, {quiz_id});
    }

    return {
      success: true,
      score,
      passed,
      attempt_number: attemptNumber,
      correct_answers: correctAnswers,
      total_questions: questions.length,
      failed_twice: !passed && attemptNumber === 2,
    };
  } catch (error) {
    logger.error(`Error submitting quiz attempt for ${callerUid}:`, error);
    throw new HttpsError(
      "internal",
      `Failed to submit quiz attempt: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
  }
);
