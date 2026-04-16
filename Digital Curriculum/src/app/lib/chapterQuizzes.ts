/**
 * Chapter-level quizzes in Firestore `quizzes` + callable scoring.
 */
import { collection, getDocs, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "./firebase";

export interface QuizListItem {
  id: string;
  title: string;
  passingScore: number;
  lastScore: number | null;
  lastPassed: boolean | null;
  attemptCount: number;
}

export interface QuizQuestionClient {
  id: string;
  prompt: string;
  options: string[];
  points: number;
}

function latestAttemptFromDocs(
  docs: { data: () => Record<string, unknown> }[]
): { lastScore: number | null; lastPassed: boolean | null } {
  if (!docs.length) return { lastScore: null, lastPassed: null };
  let best: { score: number; passed: boolean; t: number } | null = null;
  for (const ad of docs) {
    const a = ad.data();
    const created = a.created_at as { toMillis?: () => number } | undefined;
    const t = typeof created?.toMillis === "function" ? created.toMillis() : 0;
    const score = typeof a.score === "number" ? a.score : Number(a.score ?? 0);
    const passed = Boolean(a.passed);
    if (!best || t >= best.t) best = { score, passed, t };
  }
  return { lastScore: best!.score, lastPassed: best!.passed };
}

export async function listQuizzesForUser(uid: string): Promise<QuizListItem[]> {
  const snap = await getDocs(collection(db, "quizzes"));
  const items: QuizListItem[] = [];

  for (const docSnap of snap.docs) {
    const d = docSnap.data();
    const attemptsSnap = await getDocs(
      query(
        collection(db, "quiz_attempts"),
        where("user_id", "==", uid),
        where("quiz_id", "==", docSnap.id)
      )
    );
    const { lastScore, lastPassed } = latestAttemptFromDocs(attemptsSnap.docs);

    items.push({
      id: docSnap.id,
      title: String(d.title ?? d.name ?? docSnap.id),
      passingScore: typeof d.passing_score === "number" ? d.passing_score : 70,
      lastScore,
      lastPassed,
      attemptCount: attemptsSnap.size,
    });
  }

  return items.sort((a, b) => a.title.localeCompare(b.title));
}

export async function fetchQuizQuestions(quizId: string): Promise<{
  passing_score: number;
  attempt_number: number;
  questions: QuizQuestionClient[];
}> {
  const fn = httpsCallable(functions, "getQuizForAttempt");
  const res = await fn({ quiz_id: quizId });
  const data = res.data as {
    passing_score: number;
    attempt_number: number;
    questions: QuizQuestionClient[];
  };
  return {
    passing_score: data.passing_score,
    attempt_number: data.attempt_number,
    questions: data.questions ?? [],
  };
}

export async function submitChapterQuizAttempt(
  quizId: string,
  answers: Record<string, number>
): Promise<{ score: number; passed: boolean; attempt_number: number; correct_answers: number; total_questions: number }> {
  const fn = httpsCallable(functions, "submitQuizAttempt");
  const res = await fn({ quiz_id: quizId, answers });
  const data = res.data as {
    score: number;
    passed: boolean;
    attempt_number: number;
    correct_answers: number;
    total_questions: number;
  };
  return data;
}
