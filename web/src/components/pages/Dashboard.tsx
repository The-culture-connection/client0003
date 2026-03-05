"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import {
  BookOpen,
  Calendar,
  Award,
  CheckCircle2,
  Clock,
  PlayCircle,
  Lock,
  Users,
  FileText,
  Trophy,
  Zap,
  MessageSquare,
  Target,
  Download,
  Edit,
  LogOut,
  Star,
  Flame,
  TrendingUp,
  User as UserIcon,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { db, auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { getModules } from "@/lib/curriculum";

interface ModuleProgress {
  id: string;
  name: string;
  status: "Completed" | "In Progress" | "Locked";
  progress: number;
  locked: boolean;
}

interface AssetProgress {
  name: string;
  completed: boolean;
}

interface Achievement {
  id: string;
  name: string;
  earned: boolean;
  color: string;
}

interface LeaderboardEntry {
  name: string;
  points: number;
  isYou: boolean;
  rank: number;
}

export function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [nextStep, setNextStep] = useState<any>(null);
  const [moduleProgress, setModuleProgress] = useState<ModuleProgress[]>([]);
  const [assetProgress, setAssetProgress] = useState<AssetProgress[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [nextBadge, setNextBadge] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [communityActivity, setCommunityActivity] = useState<any[]>([]);
  const [weeklyStats, setWeeklyStats] = useState({
    lessonsCompleted: 0,
    assetsCreated: 0,
    forumPosts: 0,
  });
  const [currentModuleProgress, setCurrentModuleProgress] = useState(0);
  
  // Edit profile state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editCohort, setEditCohort] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user?.uid) return;

    try {
      // Load user profile
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();
      setUserProfile(userData);

      // Calculate weekly lesson completion (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const lessonProgressRef = collection(
        db,
        "user_progress",
        user.uid,
        "lesson_progress"
      );
      const lessonProgressSnapshot = await getDocs(lessonProgressRef);
      let weeklyLessons = 0;
      lessonProgressSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.completed && data.completed_at) {
          const completedAt = data.completed_at.toDate();
          if (completedAt >= weekAgo) {
            weeklyLessons++;
          }
        }
      });
      setWeeklyStats((prev) => ({ ...prev, lessonsCompleted: weeklyLessons }));

      // Load module progress
      const modules = await getModules();
      const moduleResultsRef = collection(
        db,
        "user_progress",
        user.uid,
        "module_results"
      );
      const moduleResultsSnapshot = await getDocs(moduleResultsRef);
      const moduleResultsMap = new Map();
      moduleResultsSnapshot.forEach((doc) => {
        moduleResultsMap.set(doc.id, doc.data());
      });

      let progressData: ModuleProgress[] = modules.map((module, idx) => {
        const result = moduleResultsMap.get(module.id);
        const completed = result?.completed || false;
        const progress = result?.progress_percent || 0;
        
        // Check if previous module is completed (for locking)
        const prevModule = idx > 0 ? modules[idx - 1] : null;
        const prevResult = prevModule ? moduleResultsMap.get(prevModule.id) : null;
        const prevCompleted = prevResult?.completed || false;
        const locked = idx > 0 && !prevCompleted;

        return {
          id: module.id,
          name: module.title,
          status: locked
            ? "Locked"
            : completed
            ? "Completed"
            : progress > 0
            ? "In Progress"
            : "Locked",
          progress: completed ? 100 : progress,
          locked,
        };
      });
      
      // If no modules found, use mock data
      if (progressData.length === 0) {
        progressData = [
          { id: "1", name: "Idea Validation", status: "Completed", progress: 100, locked: false },
          { id: "2", name: "Customer Discovery", status: "Completed", progress: 100, locked: false },
          { id: "3", name: "Financial Modeling", status: "In Progress", progress: 65, locked: false },
          { id: "4", name: "Pitch & Launch", status: "Locked", progress: 0, locked: true },
        ];
      }
      
      setModuleProgress(progressData);

      // Calculate current module progress (for the progress ring)
      const currentModule = progressData.find((m) => m.status === "In Progress");
      setCurrentModuleProgress(currentModule?.progress || 0);

      // Find next step (quiz or lesson)
      const nextStepData = await findNextStep(user.uid, modules);
      setNextStep(nextStepData);

      // Load data room assets
      const dataRoomRef = doc(db, "data_rooms", user.uid);
      const dataRoomDoc = await getDoc(dataRoomRef);
      const documents = dataRoomDoc.data()?.documents || [];
      
      // Get required assets for current module
      const currentModuleId = currentModule?.id;
      if (currentModuleId) {
        const assetReqsRef = collection(
          db,
          "module_asset_requirements",
          currentModuleId,
          "requirements"
        );
        const assetReqsSnapshot = await getDocs(assetReqsRef);
        const assetReqs = assetReqsSnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || doc.data().title,
        }));

        const assets: AssetProgress[] = assetReqs.map((req) => {
          const doc = documents.find(
            (d: any) => d.asset_requirement_id === req.id && d.final
          );
          return {
            name: req.name,
            completed: !!doc,
          };
        });
        setAssetProgress(assets);
      }

      // Load achievements/badges
      const earnedBadges = userData?.badges?.earned || [];
      const allBadges = [
        { id: "idea_validator", name: "Idea Validator", color: "yellow", icon: Star, description: "Complete Module 1: Idea Validation", progress: moduleProgress.find((m) => m.id === "1")?.progress || 0 },
        { id: "customer_explorer", name: "Customer Explorer", color: "blue", icon: Users, description: "Complete Module 2: Customer Discovery", progress: moduleProgress.find((m) => m.id === "2")?.progress || 0 },
        { id: "financial_strategist", name: "Financial Strategist", color: "accent", icon: TrendingUp, description: "Complete Module 3: Financial Modeling", progress: moduleProgress.find((m) => m.id === "3")?.progress || 0 },
        { id: "launch_master", name: "Launch Master", color: "muted", icon: Flame, description: "Complete Module 4: Pitch & Launch", progress: moduleProgress.find((m) => m.id === "4")?.progress || 0 },
      ];
      const achievementsData: Achievement[] = allBadges.map((badge) => ({
        ...badge,
        earned: earnedBadges.includes(badge.id),
      }));
      setAchievements(achievementsData.filter((a) => a.earned));
      setNextBadge(achievementsData.find((a) => !a.earned));
      
      // Set edit profile initial values
      setEditFirstName(userData?.first_name || "");
      setEditLastName(userData?.last_name || "");
      setEditCity(userData?.business_profile?.city || "");
      setEditCohort(userData?.business_profile?.cohort_name || "");

      // Load leaderboard (mock data for now - would need points system)
      const userPoints = userData?.points?.balance || 3980;
      const leaderboardData: LeaderboardEntry[] = [
        { name: "Alex R", points: 4120, isYou: false, rank: 1 },
        { name: userData?.display_name || user?.displayName || "You", points: userPoints, isYou: true, rank: 2 },
        { name: "Marcus L", points: 3750, isYou: false, rank: 3 },
        { name: "Sarah K", points: 3620, isYou: false, rank: 4 },
        { name: "Jordan P", points: 3450, isYou: false, rank: 5 },
      ];
      setLeaderboard(leaderboardData);

      // Load upcoming events (with mock fallback)
      try {
        const eventsRef = collection(db, "events");
        const now = Timestamp.now();
        const eventsQuery = query(
          eventsRef,
          where("status", "==", "scheduled"),
          where("event_date", ">", now)
        );
        const eventsSnapshot = await getDocs(eventsQuery);
        const events = eventsSnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .sort((a, b) => {
            const dateA = a.event_date?.toDate?.() || new Date(a.event_date);
            const dateB = b.event_date?.toDate?.() || new Date(b.event_date);
            return dateA.getTime() - dateB.getTime();
          })
          .slice(0, 2);
        
        if (events.length > 0) {
          setUpcomingEvents(events);
        } else {
          // Mock events
          setUpcomingEvents([
            {
              id: "mock-1",
              title: "Networking Workshop",
              event_date: Timestamp.fromDate(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)),
            },
            {
              id: "mock-2",
              title: "Guest Speaker Series",
              event_date: Timestamp.fromDate(new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)),
            },
          ]);
        }
      } catch (error) {
        // Mock events on error
        setUpcomingEvents([
          {
            id: "mock-1",
            title: "Networking Workshop",
            event_date: Timestamp.fromDate(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)),
          },
          {
            id: "mock-2",
            title: "Guest Speaker Series",
            event_date: Timestamp.fromDate(new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)),
          },
        ]);
      }

      // Load community activity (discussion threads and meeting proposals)
      // Use mock data if Firestore is empty
      try {
        const threadsRef = collection(db, "discussion_threads");
        const threadsQuery = query(
          threadsRef,
          where("status", "==", "active")
        );
        const threadsSnapshot = await getDocs(threadsQuery);
        const threads = threadsSnapshot.docs
          .map((doc) => ({
            id: doc.id,
            type: "discussion",
            ...doc.data(),
          }))
          .slice(0, 2);

        const proposalsRef = collection(db, "meeting_proposals");
        const proposalsQuery = query(
          proposalsRef,
          where("status", "==", "pending")
        );
        const proposalsSnapshot = await getDocs(proposalsQuery);
        const proposals = proposalsSnapshot.docs
          .map((doc) => ({
            id: doc.id,
            type: "meeting",
            ...doc.data(),
          }))
          .slice(0, 1);

        if (threads.length > 0 || proposals.length > 0) {
          setCommunityActivity([...threads, ...proposals].slice(0, 3));
        } else {
          // Mock data if no real data
          setCommunityActivity([
            {
              id: "1",
              type: "discussion",
              title: "Funding Strategy Discussion",
              topic: "Funding Strategy Discussion",
            },
            {
              id: "2",
              type: "meeting",
              title: "Coffee Chat — Cincinnati Cohort",
              topic: "Coffee Chat — Cincinnati Cohort",
            },
            {
              id: "3",
              type: "discussion",
              title: "Marketing Workshop Recap",
              topic: "Marketing Workshop Recap",
            },
          ]);
        }
      } catch (error) {
        // Fallback to mock data
        setCommunityActivity([
          {
            id: "1",
            type: "discussion",
            title: "Funding Strategy Discussion",
            topic: "Funding Strategy Discussion",
          },
          {
            id: "2",
            type: "meeting",
            title: "Coffee Chat — Cincinnati Cohort",
            topic: "Coffee Chat — Cincinnati Cohort",
          },
          {
            id: "3",
            type: "discussion",
            title: "Marketing Workshop Recap",
            topic: "Marketing Workshop Recap",
          },
        ]);
      }

      // Load weekly stats (assets and forum posts)
      const dataRoomDocs = documents.filter((d: any) => {
        if (!d.created_at) return false;
        const createdAt = d.created_at.toDate?.() || new Date(d.created_at);
        return createdAt >= weekAgo;
      });
      setWeeklyStats((prev) => ({
        ...prev,
        assetsCreated: dataRoomDocs.length,
      }));

      // Forum posts (placeholder - would need to track user posts)
      setWeeklyStats((prev) => ({ ...prev, forumPosts: 5 }));
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const findNextStep = async (userId: string, modules: any[]) => {
    try {
      for (const module of modules) {
        const moduleResultRef = doc(
          db,
          "user_progress",
          userId,
          "module_results",
          module.id
        );
        const moduleResultDoc = await getDoc(moduleResultRef);
        const moduleCompleted = moduleResultDoc.data()?.completed;

        if (moduleCompleted) continue;

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
          const chapterResultRef = doc(
            db,
            "user_progress",
            userId,
            "chapter_results",
            chapterDoc.id
          );
          const chapterResultDoc = await getDoc(chapterResultRef);

          if (!chapterResultDoc.exists()) {
            // Chapter not started - return first lesson
            const lessonsRef = collection(chapterDoc.ref, "lessons");
            const lessonsSnapshot = await getDocs(lessonsRef);
            if (lessonsSnapshot.size > 0) {
              const firstLesson = lessonsSnapshot.docs[0];
              return {
                type: "lesson",
                module_id: module.id,
                module_title: module.title,
                chapter_id: chapterDoc.id,
                chapter_title: chapterDoc.data().title,
                lesson_id: firstLesson.id,
                lesson_title: firstLesson.data().title,
                estimated_time: firstLesson.data().estimated_time || 12,
              };
            }
          } else {
            const chapterResult = chapterResultDoc.data();
            const allLessonsComplete =
              chapterResult.lessons_completed >= chapterResult.total_lessons;
            const quizPassed = chapterResult.quiz_passed;

            if (!allLessonsComplete) {
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
                    type: "lesson",
                    module_id: module.id,
                    module_title: module.title,
                    chapter_id: chapterDoc.id,
                    chapter_title: chapterDoc.data().title,
                    lesson_id: lessonDoc.id,
                    lesson_title: lessonDoc.data().title,
                    estimated_time: lessonDoc.data().estimated_time || 12,
                  };
                }
              }
            } else if (!quizPassed) {
              // All lessons complete but quiz not passed
              const quizId = chapterDoc.data().quiz_id;
              if (quizId) {
                return {
                  type: "quiz",
                  module_id: module.id,
                  module_title: module.title,
                  chapter_id: chapterDoc.id,
                  chapter_title: chapterDoc.data().title,
                  quiz_id: quizId,
                  estimated_time: 12,
                };
              }
            }
          }
        }
      }

      return null; // All complete
    } catch (error) {
      console.error("Error finding next step:", error);
      return null;
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.uid) return;
    
    setSavingProfile(true);
    try {
      const { functions } = await import("@/lib/firebase");
      const { httpsCallable } = await import("firebase/functions");
      const setBusinessProfileFn = httpsCallable(functions, "setUserBusinessProfile");
      
      await setBusinessProfileFn({
        first_name: editFirstName,
        last_name: editLastName,
        cohort_name: editCohort,
        city: editCity,
        state: userProfile?.business_profile?.state || "",
      });
      
      // Also update first_name and last_name in user document
      const { doc, updateDoc } = await import("firebase/firestore");
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        first_name: editFirstName,
        last_name: editLastName,
        updated_at: new Date(),
      });
      
      // Reload dashboard data
      await loadDashboardData();
      setIsEditingProfile(false);
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  const displayName = userProfile?.display_name || user?.displayName || "there";
  const cohort = userProfile?.business_profile?.cohort_name || "Not in cohort";
  const city = userProfile?.business_profile?.city || "Unknown";

  // Check if user has partial onboarding status
  const hasPartialOnboarding = userProfile?.onboarding_status === "partial";

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Nudge Banner for Partial Onboarding */}
      {hasPartialOnboarding && (
        <Card className="mb-6 p-4 bg-gradient-to-r from-accent/20 to-accent/10 border-accent/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="w-5 h-5 text-accent" />
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Complete your profile to get better matches
                </h3>
                <p className="text-xs text-muted-foreground">
                  Finish your onboarding to unlock personalized connections and opportunities
                </p>
              </div>
            </div>
            <Link href="/onboarding">
              <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                Complete Profile
              </Button>
            </Link>
          </div>
        </Card>
      )}
      {/* Top Bar - Welcome Header & Profile Widget */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex-1">
          <h1 className="text-2xl text-foreground mb-1">
            Welcome back, <span className="text-accent">{displayName}</span>
          </h1>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>Cohort: {cohort}</span>
            <span>•</span>
            <span>City: {city}</span>
            <span>•</span>
            <span className="text-accent">
              You completed {weeklyStats.lessonsCompleted} lesson{weeklyStats.lessonsCompleted !== 1 ? "s" : ""} this week 🔥
            </span>
          </div>
        </div>
        
        {/* Profile Widget - Compact */}
        <Card className="p-3 bg-card border-border shadow-md min-w-[280px]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-foreground">Profile</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="h-6 px-2 text-accent hover:text-accent/90"
            >
              <Edit className="w-3 h-3" />
            </Button>
          </div>
          
          {isEditingProfile ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="First Name"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  className="h-7 text-xs"
                />
                <Input
                  placeholder="Last Name"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  className="h-7 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="City"
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  className="h-7 text-xs"
                />
                <Input
                  placeholder="Cohort"
                  value={editCohort}
                  onChange={(e) => setEditCohort(e.target.value)}
                  className="h-7 text-xs"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="flex-1 h-7 text-xs bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  {savingProfile ? "Saving..." : "Save"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditingProfile(false)}
                  className="h-7 text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-accent" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">
                    {userProfile?.display_name || user?.displayName || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {userProfile?.business_profile?.cohort_name || "Not in cohort"}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div className="flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-accent" />
                  <span className="text-xs text-foreground">
                    <span className="font-bold text-accent">{userProfile?.points?.balance?.toLocaleString() || 0}</span> pts
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="h-6 px-2 text-xs text-destructive border-destructive hover:bg-destructive/10"
                >
                  <LogOut className="w-3 h-3 mr-1" />
                  Sign Out
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Hero Action Panel - Compact */}
      {nextStep && (
        <Card className="p-5 mb-5 bg-gradient-to-br from-accent/20 via-card to-card border-accent/30 shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <Badge className="mb-2 bg-accent text-accent-foreground text-xs">
                NEXT STEP
              </Badge>
              <h2 className="text-xl font-bold text-foreground mb-1">
                {nextStep.type === "quiz"
                  ? `Finish ${nextStep.chapter_title} Quiz`
                  : nextStep.lesson_title}
              </h2>
              <p className="text-sm text-muted-foreground mb-1">
                {nextStep.module_title}
                {nextStep.chapter_title && ` — ${nextStep.chapter_title}`}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                <Clock className="w-3 h-3" />
                <span>Estimated time: {nextStep.estimated_time} minutes</span>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={
                    nextStep.type === "quiz"
                      ? `/curriculum/modules/${nextStep.module_id}/chapters/${nextStep.chapter_id}/quiz`
                      : `/curriculum/modules/${nextStep.module_id}/chapters/${nextStep.chapter_id}/lessons/${nextStep.lesson_id}`
                  }
                >
                  <Button
                    size="sm"
                    className="bg-accent hover:bg-accent/90 text-accent-foreground"
                  >
                    <PlayCircle className="w-4 h-4 mr-2" />
                    Continue Learning
                  </Button>
                </Link>
                <Link
                  href={`/curriculum/modules/${nextStep.module_id}`}
                >
                  <Button variant="outline" size="sm" className="border-border">
                    View Module
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative w-20 h-20">
              {/* Progress Ring */}
              <svg className="w-20 h-20 transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="currentColor"
                  strokeWidth="5"
                  fill="none"
                  className="text-muted"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="currentColor"
                  strokeWidth="5"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - currentModuleProgress / 100)}`}
                  className="text-accent"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-base font-bold text-foreground">
                  {Math.round(currentModuleProgress)}%
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column - Learning Journey, Data Room, Community */}
        <div className="lg:col-span-9 space-y-4">
          {/* Learning Journey - Module Path */}
          <Card className="p-4 bg-card border-border shadow-md">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-foreground">
                Module Journey
              </h2>
              <Badge variant="outline" className="border-accent text-accent text-xs">
                {moduleProgress.filter((m) => !m.locked && m.status !== "Locked").length} of {moduleProgress.length} Modules
              </Badge>
            </div>
            <div className="space-y-2.5">
              {moduleProgress.map((module, idx) => {
                const Icon =
                  module.status === "Completed"
                    ? CheckCircle2
                    : module.locked
                    ? Lock
                    : PlayCircle;
                return (
                  <div
                    key={module.id}
                    className={`p-2.5 rounded-lg border transition-all ${
                      module.locked
                        ? "bg-muted/30 border-border/50"
                        : "bg-card border-border hover:border-accent hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`p-1.5 rounded ${
                          module.locked
                            ? "bg-muted"
                            : module.progress === 100
                            ? "bg-green-500/10"
                            : "bg-accent/10"
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 ${
                            module.locked
                              ? "text-muted-foreground"
                              : module.progress === 100
                              ? "text-green-500"
                              : "text-accent"
                          }`}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3
                            className={`text-xs font-medium ${
                              module.locked
                                ? "text-muted-foreground"
                                : "text-foreground"
                            }`}
                          >
                            Module {idx + 1} — {module.name}
                          </h3>
                          <Badge
                            variant={
                              module.progress === 100 ? "default" : "secondary"
                            }
                            className={`text-[10px] ${
                              module.locked
                                ? "bg-muted text-muted-foreground"
                                : module.progress === 100
                                ? "bg-green-500/10 text-green-500"
                                : "bg-accent/10 text-accent"
                            }`}
                          >
                            {module.status}
                          </Badge>
                        </div>
                        {!module.locked && (
                          <Progress value={module.progress} className="h-1" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Data Room Asset Progress */}
          {assetProgress.length > 0 && (
            <Card className="p-4 bg-card border-border shadow-md">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-foreground">
                  Data Room Progress
                </h2>
                <FileText className="w-5 h-5 text-accent" />
              </div>
              <div className="space-y-2.5 mb-4">
                {assetProgress.map((asset, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    {asset.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <div className="w-4 h-4 border-2 border-muted rounded" />
                    )}
                    <span
                      className={`text-sm ${
                        asset.completed
                          ? "text-muted-foreground line-through"
                          : "text-foreground"
                      }`}
                    >
                      {asset.name}
                    </span>
                  </div>
                ))}
              </div>
              <Progress
                value={
                  (assetProgress.filter((a) => a.completed).length /
                    assetProgress.length) *
                  100
                }
                className="h-2 mb-2"
              />
              <p className="text-xs text-muted-foreground">
                Complete remaining assets to unlock Module Graduation
              </p>
            </Card>
          )}

          {/* Community Activity */}
          <Card className="p-4 bg-card border-border shadow-md">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-foreground">
                Community Activity
              </h2>
              <Users className="w-4 h-4 text-accent" />
            </div>
            <div className="space-y-2">
              {communityActivity.length > 0 ? (
                communityActivity.map((activity, idx) => (
                  <Link
                    key={idx}
                    href={
                      activity.type === "discussion"
                        ? `/community/threads/${activity.id}`
                        : `/community/meetings/${activity.id}`
                    }
                  >
                    <div className="p-2 rounded-lg bg-muted/50 border border-border hover:border-accent transition-colors cursor-pointer">
                      <div className="flex items-start gap-2">
                        {activity.type === "discussion" ? (
                          <MessageSquare className="w-3.5 h-3.5 text-accent mt-0.5 flex-shrink-0" />
                        ) : (
                          <Calendar className="w-3.5 h-3.5 text-accent mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground font-medium truncate">
                            {activity.title || activity.topic}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {activity.type === "discussion"
                              ? "Discussion • Active"
                              : "Meeting • 8 interested"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">
                  No recent community activity
                </p>
              )}
            </div>
            <Link href="/community">
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3 h-7 text-xs text-accent border-accent"
              >
                View Community Hub
              </Button>
            </Link>
          </Card>

        </div>

        {/* Right Column - Leaderboard Square, Events and Weekly Progress */}
        <div className="lg:col-span-3 space-y-4">
          {/* Leaderboard Square Widget */}
          <Card className="p-4 bg-card border-border shadow-md">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground">
                Leaderboard
              </h2>
              <Trophy className="w-4 h-4 text-accent" />
            </div>
            <div className="space-y-1.5">
              {leaderboard.slice(0, 6).map((user, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-1.5 rounded text-xs ${
                    user.isYou ? "bg-accent/10 border border-accent/30" : ""
                  }`}
                >
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <span
                      className={`font-bold w-4 flex-shrink-0 text-[10px] ${
                        user.rank === 1
                          ? "text-yellow-500"
                          : user.rank === 2
                          ? "text-gray-400"
                          : user.rank === 3
                          ? "text-orange-600"
                          : "text-muted-foreground"
                      }`}
                    >
                      #{user.rank}
                    </span>
                    <span
                      className={`truncate text-[11px] ${
                        user.isYou
                          ? "font-bold text-accent"
                          : "text-foreground"
                      }`}
                    >
                      {user.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-foreground flex-shrink-0 ml-1">
                    {user.points.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              Points from modules & assets
            </p>
          </Card>

          {/* Upcoming Events */}
          <Card className="p-4 bg-card border-border shadow-md">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground">
                Upcoming Events
              </h2>
              <Calendar className="w-4 h-4 text-accent" />
            </div>
            <div className="space-y-2">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((event) => {
                  const eventDate = event.event_date?.toDate?.() || new Date(event.event_date);
                  return (
                    <div
                      key={event.id}
                      className="p-2.5 rounded-lg bg-muted/50 border border-border"
                    >
                      <p className="text-xs font-medium text-foreground mb-1">
                        {event.title}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-2">
                        <span>
                          {eventDate.toLocaleDateString()} — {eventDate.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <Link href={`/events/${event.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-7 text-xs text-accent border-accent hover:bg-accent/10"
                        >
                          RSVP
                        </Button>
                      </Link>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-muted-foreground">
                  No upcoming events
                </p>
              )}
            </div>
          </Card>

          {/* Weekly Progress */}
          <Card className="p-4 bg-card border-border shadow-md">
            <h2 className="text-sm font-bold text-foreground mb-3">
              Weekly Progress
            </h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-accent" />
                  <span className="text-xs text-foreground">Lessons</span>
                </div>
                <span className="text-xs font-bold text-accent">
                  {weeklyStats.lessonsCompleted}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-accent" />
                  <span className="text-xs text-foreground">Assets</span>
                </div>
                <span className="text-xs font-bold text-accent">
                  {weeklyStats.assetsCreated}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-accent" />
                  <span className="text-xs text-foreground">Posts</span>
                </div>
                <span className="text-xs font-bold text-accent">
                  {weeklyStats.forumPosts}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
