"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  BookOpen,
  Calendar,
  Award,
  TrendingUp,
  CheckCircle2,
  Clock,
  ArrowRight,
  FileText,
  Lock,
  Play,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { getModules } from "@/lib/curriculum";

export function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalModules: 4,
    completedModules: 0,
    totalChapters: 0,
    completedChapters: 0,
    certificates: 0,
    badges: 0,
    progress: 0,
  });
  const [nextLesson, setNextLesson] = useState<any>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);

  useEffect(() => {
    if (user?.uid) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user?.uid) return;

    try {
      // Load module progress
      const moduleResultsRef = collection(
        db,
        "user_progress",
        user.uid,
        "module_results"
      );
      const moduleResultsSnapshot = await getDocs(moduleResultsRef);
      
      let completedModules = 0;
      moduleResultsSnapshot.forEach((doc) => {
        if (doc.data().completed) {
          completedModules++;
        }
      });

      // Load chapter progress
      const chapterResultsRef = collection(
        db,
        "user_progress",
        user.uid,
        "chapter_results"
      );
      const chapterResultsSnapshot = await getDocs(chapterResultsRef);
      
      let completedChapters = 0;
      let totalChapters = chapterResultsSnapshot.size;
      chapterResultsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.lessons_completed >= data.total_lessons && data.quiz_passed) {
          completedChapters++;
        }
      });

      // Load certificates
      const certificatesRef = collection(db, "certificates");
      const certificatesQuery = query(
        certificatesRef,
        where("user_id", "==", user.uid)
      );
      const certificatesSnapshot = await getDocs(certificatesQuery);

      // Load badges
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      const badges = userDoc.data()?.badges?.earned || [];

      // Calculate overall progress
      const progress = totalChapters > 0 
        ? Math.round((completedChapters / totalChapters) * 100)
        : 0;

      // Find next lesson (first incomplete lesson)
      const nextLessonData = await findNextLesson(user.uid);

      // Load upcoming events
      const eventsRef = collection(db, "events");
      const eventsQuery = query(
        eventsRef,
        where("status", "==", "scheduled"),
        where("event_date", ">", new Date().toISOString())
      );
      const eventsSnapshot = await getDocs(eventsQuery);
      const events = eventsSnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .slice(0, 3);

      setStats({
        totalModules: 4,
        completedModules,
        totalChapters,
        completedChapters,
        certificates: certificatesSnapshot.size,
        badges: badges.length,
        progress,
      });
      setNextLesson(nextLessonData);
      setUpcomingEvents(events);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const findNextLesson = async (userId: string) => {
    try {
      const modules = await getModules();
      
      for (const module of modules) {
        const chaptersRef = collection(
          db,
          "curricula",
          "mortar_masters_online",
          "modules",
          module.id,
          "chapters"
        );
        const chaptersSnapshot = await getDocs(chaptersRef);
        
        for (const chapterDoc of chaptersSnapshot.docs) {
          // Check if chapter is accessible
          const chapterResultRef = doc(
            db,
            "user_progress",
            userId,
            "chapter_results",
            chapterDoc.id
          );
          const chapterResultDoc = await getDoc(chapterResultRef);
          
          if (!chapterResultDoc.exists()) {
            // Chapter not started, return first lesson
            const lessonsRef = collection(chapterDoc.ref, "lessons");
            const lessonsSnapshot = await getDocs(lessonsRef);
            if (lessonsSnapshot.size > 0) {
              const firstLesson = lessonsSnapshot.docs[0];
              return {
                module_id: module.id,
                module_title: module.title,
                chapter_id: chapterDoc.id,
                chapter_title: chapterDoc.data().title,
                lesson_id: firstLesson.id,
                lesson_title: firstLesson.data().title,
              };
            }
          } else {
            const chapterResult = chapterResultDoc.data();
            // Check if all lessons complete and quiz passed
            if (
              chapterResult.lessons_completed >= chapterResult.total_lessons &&
              chapterResult.quiz_passed
            ) {
              continue; // Chapter complete, move to next
            }
            
            // Find first incomplete lesson
            const lessonsRef = collection(chapterDoc.ref, "lessons");
            const lessonsSnapshot = await getDocs(lessonsRef);
            
            for (const lessonDoc of lessonsSnapshot.docs) {
              const lessonProgressRef = doc(
                db,
                "user_progress",
                userId,
                "lesson_progress",
                lessonDoc.id
              );
              const lessonProgressDoc = await getDoc(lessonProgressRef);
              
              if (!lessonProgressDoc.exists() || !lessonProgressDoc.data()?.completed) {
                return {
                  module_id: module.id,
                  module_title: module.title,
                  chapter_id: chapterDoc.id,
                  chapter_title: chapterDoc.data().title,
                  lesson_id: lessonDoc.id,
                  lesson_title: lessonDoc.data().title,
                };
              }
            }
          }
        }
      }
      
      return null; // All lessons complete
    } catch (error) {
      console.error("Error finding next lesson:", error);
      return null;
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's your learning overview
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-accent/10">
              <BookOpen className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Modules</p>
              <p className="text-2xl font-bold text-foreground">
                {stats.completedModules}/{stats.totalModules}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-accent/10">
              <CheckCircle2 className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Chapters</p>
              <p className="text-2xl font-bold text-foreground">
                {stats.completedChapters}/{stats.totalChapters}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-accent/10">
              <Award className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Certificates</p>
              <p className="text-2xl font-bold text-foreground">
                {stats.certificates}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-accent/10">
              <TrendingUp className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Progress</p>
              <p className="text-2xl font-bold text-foreground">
                {stats.progress}%
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl text-foreground">Continue Learning</h2>
            <Link href="/curriculum">
              <Button
                variant="ghost"
                size="sm"
                className="text-accent hover:text-accent/90"
              >
                View All
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
          {nextLesson ? (
            <div className="p-4 border border-border rounded-lg hover:border-accent transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-foreground font-medium mb-1">
                    {nextLesson.lesson_title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {nextLesson.module_title} • {nextLesson.chapter_title}
                  </p>
                </div>
              </div>
              <Link
                href={`/curriculum/modules/${nextLesson.module_id}/chapters/${nextLesson.chapter_id}/lessons/${nextLesson.lesson_id}`}
              >
                <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                  <Play className="w-4 h-4 mr-2" />
                  Continue Learning
                </Button>
              </Link>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>All lessons complete! 🎉</p>
            </div>
          )}
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl text-foreground">Upcoming Events</h2>
            <Link href="/events">
              <Button
                variant="ghost"
                size="sm"
                className="text-accent hover:text-accent/90"
              >
                View All
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
          {upcomingEvents.length > 0 ? (
            <div className="space-y-4">
              {upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="p-4 border border-border rounded-lg hover:border-accent transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-accent/10">
                      <Calendar className="w-5 h-5 text-accent" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-foreground font-medium mb-1">
                        {event.title}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>
                          {new Date(event.event_date).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {new Date(event.event_date).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No upcoming events</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
