import { useState } from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import { CheckCircle2, Circle, ChevronRight, ChevronLeft } from "lucide-react";

export function WebQuizzes() {
  const [activeQuiz, setActiveQuiz] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);

  const mockQuizzes = [
    {
      id: 1,
      title: "Object-Oriented Programming Fundamentals",
      module: "Advanced Concepts",
      questions: 10,
      duration: "15 min",
      status: "completed",
      score: 85,
    },
    {
      id: 2,
      title: "Functional Programming Concepts",
      module: "Advanced Concepts",
      questions: 12,
      duration: "20 min",
      status: "available",
      score: null,
    },
    {
      id: 3,
      title: "Design Patterns Overview",
      module: "Advanced Concepts",
      questions: 15,
      duration: "25 min",
      status: "locked",
      score: null,
    },
  ];

  const mockQuestions = [
    {
      id: 1,
      question: "What is the main principle of Object-Oriented Programming?",
      options: [
        "Encapsulation, Inheritance, Polymorphism",
        "Variables, Functions, Classes",
        "HTML, CSS, JavaScript",
        "Database, Server, Client",
      ],
      correctAnswer: 0,
    },
    {
      id: 2,
      question: "Which of the following is NOT a pillar of OOP?",
      options: ["Encapsulation", "Inheritance", "Compilation", "Abstraction"],
      correctAnswer: 2,
    },
  ];

  const handleStartQuiz = (quizId: number) => {
    setActiveQuiz(quizId);
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowResults(false);
  };

  const handleNextQuestion = () => {
    if (currentQuestion < mockQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
    } else {
      setShowResults(true);
    }
  };

  const handleBackToQuizzes = () => {
    setActiveQuiz(null);
    setShowResults(false);
  };

  if (activeQuiz && !showResults) {
    const progress = ((currentQuestion + 1) / mockQuestions.length) * 100;
    const question = mockQuestions[currentQuestion];

    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={handleBackToQuizzes}
            className="text-muted-foreground hover:text-foreground mb-4"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Quizzes
          </Button>
          <h1 className="text-2xl text-foreground mb-2">
            Functional Programming Concepts
          </h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Question {currentQuestion + 1} of {mockQuestions.length}</span>
            <span>•</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
        </div>

        <Progress value={progress} className="h-2 mb-8" />

        <Card className="p-8 bg-card border-border">
          <h2 className="text-xl text-foreground mb-6">{question.question}</h2>

          <div className="space-y-3">
            {question.options.map((option, index) => (
              <button
                key={index}
                onClick={() => setSelectedAnswer(index)}
                className={`w-full text-left p-4 rounded-lg border transition-all ${
                  selectedAnswer === index
                    ? "border-accent bg-accent/10"
                    : "border-border hover:border-accent/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      selectedAnswer === index
                        ? "border-accent bg-accent"
                        : "border-muted-foreground"
                    }`}
                  >
                    {selectedAnswer === index && (
                      <div className="w-2 h-2 bg-accent-foreground rounded-full" />
                    )}
                  </div>
                  <span className="text-foreground">{option}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
              disabled={currentQuestion === 0}
              className="border-border"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            <Button
              onClick={handleNextQuestion}
              disabled={selectedAnswer === null}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {currentQuestion === mockQuestions.length - 1 ? "Finish Quiz" : "Next Question"}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (showResults) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card className="p-8 bg-card border-border text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-accent/20 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-accent" />
          </div>
          <h1 className="text-3xl text-foreground mb-2">Quiz Completed!</h1>
          <p className="text-muted-foreground mb-8">
            Great job! You've finished the quiz.
          </p>

          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="p-6 rounded-lg bg-muted/20">
              <p className="text-3xl text-accent mb-2">85%</p>
              <p className="text-sm text-muted-foreground">Score</p>
            </div>
            <div className="p-6 rounded-lg bg-muted/20">
              <p className="text-3xl text-foreground mb-2">17/20</p>
              <p className="text-sm text-muted-foreground">Correct Answers</p>
            </div>
            <div className="p-6 rounded-lg bg-muted/20">
              <p className="text-3xl text-foreground mb-2">12:30</p>
              <p className="text-sm text-muted-foreground">Time Spent</p>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleBackToQuizzes}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              Back to Quizzes
            </Button>
            <Button variant="outline" className="w-full border-border">
              Review Answers
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl text-foreground mb-2">Quizzes</h1>
        <p className="text-muted-foreground">
          Test your knowledge and track your progress
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockQuizzes.map((quiz) => (
          <Card key={quiz.id} className="p-6 bg-card border-border">
            <div className="mb-4">
              <Badge
                className={
                  quiz.status === "completed"
                    ? "bg-accent text-accent-foreground"
                    : quiz.status === "available"
                    ? "bg-accent/20 text-accent border border-accent"
                    : "bg-muted text-muted-foreground"
                }
              >
                {quiz.status === "completed"
                  ? "Completed"
                  : quiz.status === "available"
                  ? "Available"
                  : "Locked"}
              </Badge>
            </div>

            <h3 className="text-foreground mb-2">{quiz.title}</h3>
            <p className="text-sm text-muted-foreground mb-4">{quiz.module}</p>

            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
              <span>{quiz.questions} questions</span>
              <span>•</span>
              <span>{quiz.duration}</span>
            </div>

            {quiz.score !== null && (
              <div className="mb-4 p-3 rounded-lg bg-accent/10 border border-accent">
                <p className="text-sm text-muted-foreground mb-1">Your Score</p>
                <p className="text-2xl text-accent">{quiz.score}%</p>
              </div>
            )}

            <Button
              onClick={() => handleStartQuiz(quiz.id)}
              disabled={quiz.status === "locked"}
              className={
                quiz.status === "locked"
                  ? "w-full"
                  : "w-full bg-accent hover:bg-accent/90 text-accent-foreground"
              }
            >
              {quiz.status === "completed"
                ? "Retake Quiz"
                : quiz.status === "available"
                ? "Start Quiz"
                : "Locked"}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
