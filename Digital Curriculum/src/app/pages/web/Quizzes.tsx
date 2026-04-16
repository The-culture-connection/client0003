import { useState, useEffect, useCallback } from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../components/auth/AuthProvider";
import {
  listQuizzesForUser,
  fetchQuizQuestions,
  submitChapterQuizAttempt,
  type QuizListItem,
  type QuizQuestionClient,
} from "../../lib/chapterQuizzes";

type QuizResult = {
  score: number;
  passed: boolean;
  attempt_number: number;
  correct_answers: number;
  total_questions: number;
};

export function WebQuizzes() {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<QuizListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [selectedTitle, setSelectedTitle] = useState("");
  const [questions, setQuestions] = useState<QuizQuestionClient[]>([]);
  const [passingScore, setPassingScore] = useState(70);
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const refreshList = useCallback(async () => {
    if (!user?.uid) {
      setQuizzes([]);
      setListLoading(false);
      return;
    }
    setListLoading(true);
    try {
      const list = await listQuizzesForUser(user.uid);
      setQuizzes(list);
    } catch (e) {
      console.error(e);
      toast.error("Could not load quizzes.");
      setQuizzes([]);
    } finally {
      setListLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  const handleStartQuiz = async (quiz: QuizListItem) => {
    setSessionLoading(true);
    try {
      const data = await fetchQuizQuestions(quiz.id);
      if (!data.questions.length) {
        toast.error("This quiz has no questions yet.");
        return;
      }
      setSelectedQuizId(quiz.id);
      setSelectedTitle(quiz.title);
      setQuestions(data.questions);
      setPassingScore(data.passing_score);
      setAttemptNumber(data.attempt_number);
      setCurrentQuestion(0);
      setAnswers({});
      setShowResults(false);
      setResult(null);
    } catch (e) {
      console.error(e);
      toast.error("Could not start quiz. Try again later.");
    } finally {
      setSessionLoading(false);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!selectedQuizId || !user?.uid) return;
    for (const q of questions) {
      if (answers[q.id] === undefined) {
        toast.error("Please answer every question before submitting.");
        return;
      }
    }
    setSubmitting(true);
    try {
      const data = await submitChapterQuizAttempt(selectedQuizId, answers);
      setResult({
        score: Math.round(data.score),
        passed: data.passed,
        attempt_number: data.attempt_number,
        correct_answers: data.correct_answers,
        total_questions: data.total_questions,
      });
      setShowResults(true);
      await refreshList();
    } catch (e) {
      console.error(e);
      toast.error("Submit failed. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="p-8">
        <h1 className="text-3xl text-foreground mb-2">Quizzes</h1>
        <p className="text-muted-foreground">Sign in to view and take quizzes.</p>
      </div>
    );
  }

  if (selectedQuizId && !showResults) {
    const q = questions[currentQuestion];
    const n = questions.length;
    return (
      <div className="p-8">
        <div className="max-w-3xl mx-auto">
          <Card className="p-8 bg-card border-border">
            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-2">{selectedTitle}</p>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <Badge variant="secondary" className="bg-muted">
                  Question {currentQuestion + 1} of {n}
                </Badge>
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Clock className="w-4 h-4" />
                  <span>Attempt #{attemptNumber}</span>
                  <span className="text-muted-foreground/60">·</span>
                  <span>Pass {passingScore}%+</span>
                </div>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent transition-all"
                  style={{ width: `${((currentQuestion + 1) / n) * 100}%` }}
                />
              </div>
            </div>

            {q && (
              <div className="mb-8">
                <h2 className="text-xl text-foreground mb-6">{q.prompt}</h2>
                <div className="space-y-3">
                  {q.options.map((option, idx) => (
                    <label
                      key={idx}
                      className="flex items-center p-4 border border-border rounded-lg hover:border-accent hover:bg-accent/5 cursor-pointer transition-colors"
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        className="w-4 h-4 text-accent"
                        checked={answers[q.id] === idx}
                        onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: idx }))}
                      />
                      <span className="ml-3 text-foreground">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-4 flex-wrap">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedQuizId(null);
                  setQuestions([]);
                }}
                className="border-border text-foreground"
                disabled={submitting}
              >
                Exit Quiz
              </Button>
              <div className="flex gap-3">
                {currentQuestion > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => setCurrentQuestion((i) => i - 1)}
                    className="border-border text-foreground"
                    disabled={submitting}
                  >
                    Previous
                  </Button>
                )}
                {currentQuestion < n - 1 ? (
                  <Button
                    onClick={() => setCurrentQuestion((i) => i + 1)}
                    className="bg-accent hover:bg-accent/90 text-accent-foreground"
                    disabled={submitting}
                  >
                    Next Question
                  </Button>
                ) : (
                  <Button
                    onClick={() => void handleSubmitQuiz()}
                    className="bg-accent hover:bg-accent/90 text-accent-foreground"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting…
                      </>
                    ) : (
                      "Submit Quiz"
                    )}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (showResults && result) {
    return (
      <div className="p-8">
        <div className="max-w-3xl mx-auto">
          <Card className="p-8 bg-card border-border text-center">
            <div className="mb-6">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-accent/10 flex items-center justify-center">
                {result.passed ? (
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                ) : (
                  <XCircle className="w-10 h-10 text-destructive" />
                )}
              </div>
              <h2 className="text-2xl text-foreground mb-2">
                {result.passed ? "You passed!" : "Not quite there yet"}
              </h2>
              <p className="text-muted-foreground">
                {selectedTitle} · Attempt #{result.attempt_number}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="p-4 border border-border rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Score</p>
                <p className="text-3xl font-bold text-foreground">{result.score}%</p>
              </div>
              <div className="p-4 border border-border rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Correct</p>
                <p className="text-3xl font-bold text-accent">
                  {result.correct_answers}/{result.total_questions}
                </p>
              </div>
              <div className="p-4 border border-border rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Passing</p>
                <p className="text-3xl font-bold text-foreground">{passingScore}%</p>
              </div>
            </div>

            <div className="flex gap-3 justify-center flex-wrap">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedQuizId(null);
                  setShowResults(false);
                  setResult(null);
                  setQuestions([]);
                }}
                className="border-border text-foreground"
              >
                Back to Quizzes
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl text-foreground mb-2">Quizzes</h1>
        <p className="text-muted-foreground">
          Test your knowledge. Scores are recorded when you submit.
        </p>
      </div>

      {listLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading quizzes…
        </div>
      ) : quizzes.length === 0 ? (
        <Card className="p-8 border-border">
          <p className="text-muted-foreground">No quizzes are published yet.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {quizzes.map((quiz) => (
            <Card key={quiz.id} className="p-6 bg-card border-border">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h2 className="text-xl text-foreground">{quiz.title}</h2>
                    {quiz.lastPassed === true && (
                      <Badge className="bg-accent text-accent-foreground">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Passed
                      </Badge>
                    )}
                    {quiz.lastPassed === false && quiz.lastScore != null && (
                      <Badge variant="destructive">
                        <XCircle className="w-3 h-3 mr-1" />
                        Last attempt failed
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4 flex-wrap">
                    <span className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      {quiz.attemptCount} attempt{quiz.attemptCount === 1 ? "" : "s"}
                    </span>
                    {quiz.lastScore != null && (
                      <span className="flex items-center gap-1 text-accent">
                        <Award className="w-4 h-4" />
                        Best recent: {Math.round(quiz.lastScore)}%
                      </span>
                    )}
                  </div>

                  <div className="flex items-start gap-2 p-3 bg-accent/10 border border-accent/20 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground">
                      You need {quiz.passingScore}% or higher to pass. Each retake may use a different
                      question set.
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  <Button
                    onClick={() => void handleStartQuiz(quiz)}
                    disabled={sessionLoading}
                    className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto"
                  >
                    {sessionLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : quiz.lastPassed ? (
                      "Retake Quiz"
                    ) : (
                      "Start Quiz"
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
