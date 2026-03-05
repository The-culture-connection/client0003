"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  BookOpen,
  Lock,
  CheckCircle2,
  FileText,
  Play,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import { getLessons } from "@/lib/curriculum";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { useAuth } from "@/components/auth/AuthProvider";
import { canAccessQuiz } from "@/lib/quiz";

export default function ChapterDetailPage() {
  const params = useParams();
  const moduleId = params.moduleId as string;
  const chapterId = params.chapterId as string;
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [chapter, setChapter] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [lessonProgress, setLessonProgress] = useState<Record<string, any>>({});
  const [chapterProgress, setChapterProgress] = useState<any>(null);
  const [quizAccessible, setQuizAccessible] = useState(false);

  useEffect(() => {
    if (moduleId && chapterId && user?.uid) {
      loadChapterData();
    }
  }, [moduleId, chapterId, user]);

  const loadChapterData = async () => {
    if (!user?.uid) return;

    try {
      // Get chapter
      const chapterRef = doc(
        db,
        "curricula",
        "mortar_masters_online",
        "modules",
        moduleId,
        "chapters",
        chapterId
      );
      const chapterDoc = await getDoc(chapterRef);
      if (chapterDoc.exists()) {
        setChapter({ id: chapterDoc.id, ...chapterDoc.data() });
      }

      // Get lessons
      const lessonsData = await getLessons(moduleId, chapterId);
      setLessons(lessonsData);

      // Load lesson progress
      const lessonProgressRef = collection(
        db,
        "user_progress",
        user.uid,
        "lesson_progress"
      );
      const lessonProgressSnapshot = await getDocs(lessonProgressRef);
      const progress: Record<string, any> = {};

      lessonProgressSnapshot.forEach((doc) => {
        progress[doc.id] = doc.data();
      });
      setLessonProgress(progress);

      // Load chapter progress
      const chapterResultRef = doc(
        db,
        "user_progress",
        user.uid,
        "chapter_results",
        chapterId
      );
      const chapterResultDoc = await getDoc(chapterResultRef);
      if (chapterResultDoc.exists()) {
        setChapterProgress(chapterResultDoc.data());
      }

      // Check quiz access
      if (chapterDoc.data()?.quiz_id) {
        const canAccess = await canAccessQuiz(user.uid, chapterId);
        setQuizAccessible(canAccess);
      }
    } catch (error) {
      console.error("Error loading chapter:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading chapter...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Chapter not found</p>
        </div>
      </div>
    );
  }

  const allLessonsComplete =
    lessons.length > 0 &&
    lessons.every(
      (lesson) => lessonProgress[lesson.id]?.completed === true
    );

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href={`/curriculum/modules/${moduleId}`}
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Module
        </Link>
        <h1 className="text-3xl text-foreground mb-2">{chapter.title}</h1>
        {chapter.description && (
          <p className="text-muted-foreground">{chapter.description}</p>
        )}
      </div>

      {chapter.quiz_id && (
        <Card className="p-4 bg-card border-border mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <FileText className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="text-foreground font-medium">Chapter Quiz Required</h3>
                <p className="text-sm text-muted-foreground">
                  {allLessonsComplete
                    ? "Complete all lessons to unlock the quiz"
                    : "You must pass this quiz to progress to the next chapter"}
                </p>
              </div>
            </div>
            {allLessonsComplete && quizAccessible ? (
              <Link href={`/quizzes/${chapter.quiz_id}`}>
                <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  <Play className="w-4 h-4 mr-2" />
                  Take Quiz
                </Button>
              </Link>
            ) : (
              <Button disabled className="bg-muted text-muted-foreground">
                <Lock className="w-4 h-4 mr-2" />
                {allLessonsComplete ? "Unlocking..." : "Complete Lessons First"}
              </Button>
            )}
          </div>
        </Card>
      )}

      <div className="mb-6">
        <h2 className="text-xl text-foreground mb-4">Lessons</h2>
        <div className="grid grid-cols-1 gap-4">
          {lessons.map((lesson, idx) => {
            const progress = lessonProgress[lesson.id];
            const isComplete = progress?.completed === true;

            return (
              <Card
                key={lesson.id}
                className={`p-4 bg-card border-border ${
                  isComplete ? "border-accent/50" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm text-muted-foreground">
                        Lesson {idx + 1}
                      </span>
                      {isComplete && (
                        <Badge className="bg-accent text-accent-foreground">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Completed
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-foreground font-medium mb-1">
                      {lesson.title}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{lesson.duration_minutes} minutes</span>
                      {progress?.time_spent_seconds && (
                        <span>
                          Time: {Math.floor(progress.time_spent_seconds / 60)}m
                        </span>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/curriculum/modules/${moduleId}/chapters/${chapterId}/lessons/${lesson.id}`}
                  >
                    <Button
                      variant={isComplete ? "outline" : "default"}
                      className={
                        isComplete
                          ? "border-border text-foreground"
                          : "bg-accent hover:bg-accent/90 text-accent-foreground"
                      }
                    >
                      {isComplete ? (
                        <>
                          <BookOpen className="w-4 h-4 mr-2" />
                          Review
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Start
                        </>
                      )}
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {chapterProgress && (
        <Card className="p-4 bg-card border-border">
          <h3 className="text-foreground font-medium mb-3">Chapter Progress</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Lessons</span>
              <span className="text-foreground">
                {chapterProgress.lessons_completed || 0}/
                {chapterProgress.total_lessons || 0}
              </span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-accent"
                style={{
                  width: `${
                    chapterProgress.total_lessons > 0
                      ? (chapterProgress.lessons_completed /
                          chapterProgress.total_lessons) *
                        100
                      : 0
                  }%`,
                }}
              />
            </div>
            {chapter.quiz_id && (
              <div className="flex items-center justify-between text-sm mt-3">
                <span className="text-muted-foreground">Quiz</span>
                {chapterProgress.quiz_passed ? (
                  <Badge className="bg-accent text-accent-foreground">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Passed
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">
                    {chapterProgress.quiz_attempts || 0} attempts
                  </span>
                )}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
