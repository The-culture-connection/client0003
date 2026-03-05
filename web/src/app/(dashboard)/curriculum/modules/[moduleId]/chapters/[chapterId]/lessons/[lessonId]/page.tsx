"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Play,
  BookOpen,
} from "lucide-react";
import { getLesson, getLessons } from "@/lib/curriculum";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, query, orderBy } from "firebase/firestore";
import { useAuth } from "@/components/auth/AuthProvider";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export default function LessonViewerPage() {
  const params = useParams();
  const router = useRouter();
  const moduleId = params.moduleId as string;
  const chapterId = params.chapterId as string;
  const lessonId = params.lessonId as string;
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [lesson, setLesson] = useState<any>(null);
  const [allLessons, setAllLessons] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);
  const [timeTrackingInterval, setTimeTrackingInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (moduleId && chapterId && lessonId && user?.uid) {
      loadLesson();
    }
  }, [moduleId, chapterId, lessonId, user]);

  useEffect(() => {
    // Start time tracking
    if (lesson && user?.uid && !completed) {
      const interval = setInterval(() => {
        trackTime(30); // Track every 30 seconds
      }, 30000);
      setTimeTrackingInterval(interval);

      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [lesson, completed]);

  const loadLesson = async () => {
    if (!user?.uid) return;

    try {
      const lessonData = await getLesson(moduleId, chapterId, lessonId);
      if (!lessonData) {
        router.push("/curriculum");
        return;
      }

      setLesson(lessonData);

      // Get all lessons in chapter to find current index
      const allLessonsData = await getLessons(moduleId, chapterId);
      setAllLessons(allLessonsData);
      const index = allLessonsData.findIndex((l) => l.id === lessonId);
      setCurrentIndex(index >= 0 ? index : 0);

      // Check if lesson is completed
      const lessonProgressRef = doc(
        db,
        "user_progress",
        user.uid,
        "lesson_progress",
        lessonId
      );
      const lessonProgressDoc = await getDoc(lessonProgressRef);
      
      if (lessonProgressDoc.exists()) {
        const progress = lessonProgressDoc.data();
        setCompleted(progress.completed || false);
        setTimeSpent(progress.time_spent_seconds || 0);
      }

      // Log lesson viewed
      const logEvent = httpsCallable(functions, "logAnalyticsEvent");
      logEvent({
        event_type: "lesson_viewed",
        metadata: {
          lesson_id: lessonId,
          chapter_id: chapterId,
          module_id: moduleId,
        },
      }).catch(console.error);
    } catch (error) {
      console.error("Error loading lesson:", error);
    } finally {
      setLoading(false);
    }
  };

  const trackTime = async (deltaSeconds: number) => {
    if (!user?.uid || !lessonId) return;

    try {
      const trackTimeFn = httpsCallable(functions, "trackLessonTime");
      await trackTimeFn({
        lesson_id: lessonId,
        delta_seconds: deltaSeconds,
      });
      setTimeSpent((prev) => prev + deltaSeconds);
    } catch (error) {
      console.error("Error tracking time:", error);
    }
  };

  const handleComplete = async () => {
    if (!user?.uid || !lessonId) return;

    try {
      const markComplete = httpsCallable(functions, "markLessonComplete");
      await markComplete({
        lesson_id: lessonId,
      });

      setCompleted(true);
      
      // Log completion
      const logEvent = httpsCallable(functions, "logAnalyticsEvent");
      logEvent({
        event_type: "lesson_completed",
        metadata: {
          lesson_id: lessonId,
          chapter_id: chapterId,
          module_id: moduleId,
        },
      }).catch(console.error);
    } catch (error) {
      console.error("Error marking lesson complete:", error);
    }
  };

  const goToNextLesson = () => {
    if (currentIndex < allLessons.length - 1) {
      const nextLesson = allLessons[currentIndex + 1];
      router.push(
        `/curriculum/modules/${moduleId}/chapters/${chapterId}/lessons/${nextLesson.id}`
      );
    }
  };

  const goToPreviousLesson = () => {
    if (currentIndex > 0) {
      const prevLesson = allLessons[currentIndex - 1];
      router.push(
        `/curriculum/modules/${moduleId}/chapters/${chapterId}/lessons/${prevLesson.id}`
      );
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading lesson...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Lesson not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/curriculum/modules/${moduleId}/chapters/${chapterId}`}
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Chapter
        </Link>
        <h1 className="text-3xl text-foreground mb-2">{lesson.title}</h1>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {lesson.duration_minutes} minutes
          </span>
          {timeSpent > 0 && (
            <span>Time spent: {Math.floor(timeSpent / 60)}m {timeSpent % 60}s</span>
          )}
        </div>
      </div>

      <Card className="p-8 bg-card border-border mb-6">
        {lesson.video_url ? (
          <div className="mb-6">
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
              <Play className="w-16 h-16 text-muted-foreground" />
              <p className="ml-4 text-muted-foreground">Video: {lesson.video_url}</p>
            </div>
          </div>
        ) : lesson.external_url ? (
          <div className="mb-6">
            <a
              href={lesson.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:text-accent/90 inline-flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              Open External Content
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        ) : null}

        {lesson.content && (
          <div
            className="prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: lesson.content }}
          />
        )}

        {!lesson.content && !lesson.video_url && !lesson.external_url && (
          <div className="text-center py-12 text-muted-foreground">
            <p>Lesson content coming soon...</p>
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between">
        <div>
          {currentIndex > 0 && (
            <Button
              variant="outline"
              onClick={goToPreviousLesson}
              className="border-border text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous Lesson
            </Button>
          )}
        </div>

        <div className="flex items-center gap-4">
          {completed ? (
            <Badge className="bg-accent text-accent-foreground">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Completed
            </Badge>
          ) : (
            <Button
              onClick={handleComplete}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Mark Complete
            </Button>
          )}
        </div>

        <div>
          {currentIndex < allLessons.length - 1 && (
            <Button
              onClick={goToNextLesson}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              Next Lesson
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
