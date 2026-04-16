/**
 * Returns the next quiz variant question sheet without exposing correct answers.
 * Mirrors attempt/variant selection logic in submitQuizAttempt.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { z } from "zod";
import { callableCorsAllowlist } from "../callableCorsAllowlist";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

const schema = z.object({
  quiz_id: z.string().min(1),
});

function extractOptions(q: Record<string, unknown>): string[] {
  const opts = q.options;
  if (Array.isArray(opts)) {
    return opts.map((o) => String(o));
  }
  const letters = ["A", "B", "C", "D", "E", "F"];
  const out: string[] = [];
  for (const L of letters) {
    const v = q[`option_${L}`] ?? q[`option${L}`];
    if (v != null && String(v).trim() !== "") {
      out.push(String(v));
    }
  }
  if (out.length > 0) {
    return out;
  }
  for (let i = 0; i < 8; i++) {
    const v = q[`option_${i}`];
    if (v != null) {
      out.push(String(v));
    }
  }
  return out.length > 0 ? out : ["Option 1", "Option 2", "Option 3", "Option 4"];
}

export const getQuizForAttempt = onCall(
  { region: "us-central1", cors: callableCorsAllowlist },
  async (request) => {
    const callerUid = request.auth?.uid;
    if (!callerUid) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const parsed = schema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", parsed.error.message);
    }

    const { quiz_id } = parsed.data;

    const quizRef = db.collection("quizzes").doc(quiz_id);
    const quizDoc = await quizRef.get();
    if (!quizDoc.exists) {
      throw new HttpsError("not-found", "Quiz not found");
    }

    const quiz = quizDoc.data()!;
    const passingScore = (quiz.passing_score as number) || 70;
    const variantCount = (quiz.variant_count as number) || 1;

    const attemptsSnap = await db
      .collection("quiz_attempts")
      .where("user_id", "==", callerUid)
      .where("quiz_id", "==", quiz_id)
      .get();
    const attemptNumber = attemptsSnap.size + 1;
    const variantNumber = ((attemptNumber - 1) % variantCount) + 1;
    const variantRef = quizRef.collection("variants").doc(`variant_${variantNumber}`);
    const variantDoc = await variantRef.get();
    if (!variantDoc.exists) {
      throw new HttpsError("not-found", "Quiz variant not found");
    }

    const variant = variantDoc.data()!;
    const questions = (variant.questions as Record<string, unknown>[]) || [];

    const sanitized = questions.map((q) => {
      const qid = String(q.id ?? "");
      const prompt = String(q.question ?? q.text ?? "");
      return {
        id: qid,
        prompt,
        options: extractOptions(q),
        points: typeof q.points === "number" ? q.points : 1,
      };
    });

    return {
      success: true,
      quiz_id,
      passing_score: passingScore,
      attempt_number: attemptNumber,
      variant_id: variantRef.id,
      questions: sanitized,
    };
  }
);
