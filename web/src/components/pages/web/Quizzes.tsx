"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  AlertCircle,
} from "lucide-react";

export function WebQuizzes() {
  const [selectedQuiz, setSelectedQuiz] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const quizzes = [
    {
      id: 1,
      title: "Business Fundamentals Quiz",
      questions: 10,
      duration: "15 min",
      status: "completed",
      score: 85,
      passed: true,
    },
    {
      id: 2,
      title: "Marketing Strategy Assessment",
      questions: 15,
      duration: "20 min",
      status: "available",
      score: null,
      passed: null,
    },
    {
      id: 3,
      title: "Financial Planning Test",
      questions: 12,
      duration: "18 min",
      status: "locked",
      score: null,
      passed: null,
    },
  ];

  const mockQuestions = [
    {
      question: "What is the primary goal of a business plan?",
      options: [
        "To secure funding",
        "To guide business operations",
        "To attract customers",
        "All of the above",
      ],
    },
    {
      question: "Which metric measures customer acquisition efficiency?",
      options: ["CAC", "LTV", "ROI", "NPV"],
    },
  ];

  const handleStartQuiz = (quizId: number) => {
    setSelectedQuiz(quizId);
    setCurrentQuestion(0);
    setShowResults(false);
  };

  const handleSubmitQuiz = () => {
    setShowResults(true);
  };

  if (selectedQuiz && !showResults) {
    return (
      <div className="p-8">
        <div className="max-w-3xl mx-auto">
          <Card className="p-8 bg-card border-border">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <Badge variant="secondary" className="bg-muted">
                  Question {currentQuestion + 1} of{" "}
                  {mockQuestions.length}
                </Badge>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">12:34 remaining</span>
                </div>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent"
                  style={{
                    width: `${
                      ((currentQuestion + 1) / mockQuestions.length) * 100
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-xl text-foreground mb-6">
                {mockQuestions[currentQuestion].question}
              </h2>
              <div className="space-y-3">
                {mockQuestions[currentQuestion].options.map((option, idx) => (
                  <label
                    key={idx}
                    className="flex items-center p-4 border border-border rounded-lg hover:border-accent hover:bg-accent/5 cursor-pointer transition-colors"
                  >
                    <input
                      type="radio"
                      name="answer"
                      className="w-4 h-4 text-accent"
                    />
                    <span className="ml-3 text-foreground">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setSelectedQuiz(null)}
                className="border-border text-foreground"
              >
                Exit Quiz
              </Button>
              <div className="flex gap-3">
                {currentQuestion > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => setCurrentQuestion(currentQuestion - 1)}
                    className="border-border text-foreground"
                  >
                    Previous
                  </Button>
                )}
                {currentQuestion < mockQuestions.length - 1 ? (
                  <Button
                    onClick={() => setCurrentQuestion(currentQuestion + 1)}
                    className="bg-accent hover:bg-accent/90 text-accent-foreground"
                  >
                    Next Question
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmitQuiz}
                    className="bg-accent hover:bg-accent/90 text-accent-foreground"
                  >
                    Submit Quiz
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (showResults) {
    return (
      <div className="p-8">
        <div className="max-w-3xl mx-auto">
          <Card className="p-8 bg-card border-border text-center">
            <div className="mb-6">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-accent/10 flex items-center justify-center">
                <Award className="w-10 h-10 text-accent" />
              </div>
              <h2 className="text-2xl text-foreground mb-2">Quiz Completed!</h2>
              <p className="text-muted-foreground">
                Great job on completing the quiz
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="p-4 border border-border rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Score</p>
                <p className="text-3xl font-bold text-foreground">92%</p>
              </div>
              <div className="p-4 border border-border rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Correct</p>
                <p className="text-3xl font-bold text-accent">9/10</p>
              </div>
              <div className="p-4 border border-border rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Time</p>
                <p className="text-3xl font-bold text-foreground">12m</p>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedQuiz(null);
                  setShowResults(false);
                }}
                className="border-border text-foreground"
              >
                Back to Quizzes
              </Button>
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                View Detailed Results
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
          Test your knowledge and earn certificates
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {quizzes.map((quiz) => (
          <Card key={quiz.id} className="p-6 bg-card border-border">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl text-foreground">{quiz.title}</h2>
                  {quiz.status === "completed" && quiz.passed && (
                    <Badge className="bg-accent text-accent-foreground">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Passed
                    </Badge>
                  )}
                  {quiz.status === "completed" && !quiz.passed && (
                    <Badge variant="destructive">
                      <XCircle className="w-3 h-3 mr-1" />
                      Failed
                    </Badge>
                  )}
                  {quiz.status === "locked" && (
                    <Badge variant="secondary" className="bg-muted">
                      Locked
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    {quiz.questions} questions
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {quiz.duration}
                  </span>
                  {quiz.score !== null && (
                    <span className="flex items-center gap-1 text-accent">
                      <Award className="w-4 h-4" />
                      Score: {quiz.score}%
                    </span>
                  )}
                </div>

                {quiz.status === "available" && (
                  <div className="flex items-start gap-2 p-3 bg-accent/10 border border-accent/20 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground">
                      You must score 70% or higher to pass this quiz and earn
                      your certificate.
                    </p>
                  </div>
                )}
              </div>

              <div className="ml-4">
                {quiz.status === "completed" && (
                  <Button
                    variant="outline"
                    onClick={() => handleStartQuiz(quiz.id)}
                    className="border-border text-foreground"
                  >
                    Retake Quiz
                  </Button>
                )}
                {quiz.status === "available" && (
                  <Button
                    onClick={() => handleStartQuiz(quiz.id)}
                    className="bg-accent hover:bg-accent/90 text-accent-foreground"
                  >
                    Start Quiz
                  </Button>
                )}
                {quiz.status === "locked" && (
                  <Button disabled className="bg-muted text-muted-foreground">
                    Locked
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
