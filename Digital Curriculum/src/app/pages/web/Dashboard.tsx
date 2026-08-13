import { useState, useEffect, useCallback, useMemo } from "react";
import { doc, getDoc } from "firebase/firestore";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import {
  Calendar,
  Award,
  CheckCircle2,
  Clock,
  PlayCircle,
  Lock,
  Users,
  FileText,
  Trophy,
  MessageCircle,
  Target,
  ShoppingBag,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router";
import { useAuth } from "../../components/auth/AuthProvider";
import { db } from "../../lib/firebase";
import { getCurrentUserWithRoles } from "../../lib/auth";
import {
  getCoursesForLearner,
  getLessonsWithQuiz,
  getLessonSurveyCounts,
  type Course,
  type Module,
} from "../../lib/courses";
import { getCourseSlideCounts } from "../../lib/curriculum";
import {
  getAllCourseProgress,
  calculateCourseProgress,
  type CourseProgress,
} from "../../lib/courseProgress";
import { listCertificates, listSurveyResponses } from "../../lib/dataroom";
import { getUpcomingEvents, type Event } from "../../lib/events";
import { getGroupsForUser, getLastGroupMessage, getMemberCount, type Group } from "../../lib/groups";
import { format, formatDistanceToNow } from "date-fns";
import { cached, TTL_SHORT, TTL_MEDIUM } from "../../lib/cache";
import { getLessonPlayerPath } from "../../lib/lessonPlayerUrl";
import { useScreenAnalytics } from "../../analytics/useScreenAnalytics";
import { useDashboardPassiveEngagement } from "../../analytics/useDashboardPassiveEngagement";
import { trackEvent } from "../../analytics/trackEvent";
import { WEB_ANALYTICS_EVENTS } from "@mortar/analytics-contract/mortarAnalyticsContract";
import { WeeklyActivityWidget } from "../../components/dashboard/WeeklyActivityWidget";
import { useFeedback } from "../../contexts/FeedbackContext";
import {
  recordNavStep,
  hasNavigationDeadEnd,
  canShowFeedback,
  recordFeedbackShown,
} from "../../analytics/feedbackTriggerEngine";

const MOCK_BORDER = "border-2 border-red-500";

// MORTAR UI overhaul — textbook colors (STYLEGUIDE_V1) drive each
// dashboard section's verse theme (progress bars, icons, accents).
import { verseThemeStyle } from "../../lib/verseTheme";
const VERSE = {
  green: "#74af38",
  yellow: "#e2bb28",
  brick: "#c1442a",
  blue: "#578ca9",
  red: "#b56154",
} as const;

interface UserProfile {
  first_name?: string;
  last_name?: string;
  city?: string;
  state?: string;
  cohort_id?: string;
}

export function WebDashboard() {
  useScreenAnalytics("dashboard");
  useDashboardPassiveEngagement();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setFeedbackContext, triggerRepulse } = useFeedback();

  // Record this nav step and check for dead-end navigation pattern
  useEffect(() => {
    recordNavStep("/dashboard");
    setFeedbackContext({ context_type: "general", trigger_event: "implicit_feedback_shown" });

    if (hasNavigationDeadEnd() && canShowFeedback("navigation_dead_end")) {
      trackEvent(WEB_ANALYTICS_EVENTS.NAVIGATION_DEAD_END_FEEDBACK_TRIGGERED, {});
      recordFeedbackShown("navigation_dead_end");
      setFeedbackContext({
        context_type: "navigation",
        trigger_event: "navigation_dead_end_feedback_triggered",
      });
      triggerRepulse();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, CourseProgress>>({});
  const [slideCountsMap, setSlideCountsMap] = useState<Record<string, Record<string, number>>>({});
  const [lessonsWithQuizMap, setLessonsWithQuizMap] = useState<Record<string, Record<string, boolean>>>({});
  const [lessonsWithSurveyMap, setLessonsWithSurveyMap] = useState<Record<string, Record<string, number>>>({});
  const [certificates, setCertificates] = useState<Awaited<ReturnType<typeof listCertificates>>>([]);
  const [surveyDocs, setSurveyDocs] = useState<Awaited<ReturnType<typeof listSurveyResponses>>>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [userGroups, setUserGroups] = useState<Array<Group & { lastMessage?: string; lastMessageTime?: { toMillis: () => number } | null; members: number }>>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const uid = user.uid;
      const [userWithRoles, progress, certs, surveys, events] = await Promise.all([
        // Don't cache empty roles: new signups get their role from a Cloud
        // Function moments after account creation (see cache.ts).
        cached(`roles:${uid}`, () => getCurrentUserWithRoles(), TTL_SHORT, {
          shouldCache: (u) => (u?.roles?.length ?? 0) > 0,
        }),
        cached(`progress:${uid}`, () => getAllCourseProgress(uid), TTL_SHORT),
        cached(`certs:${uid}`, () => listCertificates(uid), TTL_MEDIUM),
        cached(`surveys:${uid}`, () => listSurveyResponses(uid), TTL_MEDIUM),
        cached("events:upcoming", () => getUpcomingEvents(), TTL_MEDIUM),
      ]);

      setProgressMap(progress);
      setCertificates(certs);
      setSurveyDocs(surveys);
      setUpcomingEvents(events.slice(0, 3));

      const userGroupsList = await cached(`groups:${uid}`, () => getGroupsForUser(uid), TTL_MEDIUM);
      const groupsWithDetails = await Promise.all(
        userGroupsList.map(async (group) => {
          const lastMessage = await cached(`groupMsg:${group.id}`, () => getLastGroupMessage(group.id), TTL_MEDIUM);
          const members = getMemberCount(group);
          return {
            ...group,
            lastMessage: lastMessage?.Content || "No messages yet",
            lastMessageTime: lastMessage?.Sendtime || null,
            members,
          };
        })
      );
      groupsWithDetails.sort((a, b) => {
        if (!a.lastMessageTime && !b.lastMessageTime) return 0;
        if (!a.lastMessageTime) return 1;
        if (!b.lastMessageTime) return -1;
        return (b.lastMessageTime as { toMillis: () => number }).toMillis() - (a.lastMessageTime as { toMillis: () => number }).toMillis();
      });
      setUserGroups(groupsWithDetails);

      const userRef = doc(db, "users", user.uid);
      const profileData = await cached(`profile:${uid}`, async () => {
        const userSnap = await getDoc(userRef);
        return userSnap.exists() ? (userSnap.data() as UserProfile) : null;
      }, TTL_MEDIUM);
      setProfile(profileData);

      const roles = userWithRoles?.roles ?? [];
      const unique = await cached(
        `coursesForLearner:${uid}`,
        () => getCoursesForLearner(uid, roles),
        TTL_SHORT,
        { shouldCache: (list) => list.length > 0 }
      );
      setCourses(unique);

      const counts: Record<string, Record<string, number>> = {};
      const quizMap: Record<string, Record<string, boolean>> = {};
      const surveyCountMap: Record<string, Record<string, number>> = {};
      await Promise.all(
        unique.map(async (c) => {
          if (!c.id || !c.curriculumMapping) return;
          try {
            counts[c.id] = await cached(`slideCounts:${c.id}`, () => getCourseSlideCounts(c), TTL_MEDIUM);
            const lessonIds = Object.keys(counts[c.id]);
            if (lessonIds.length > 0) {
              quizMap[c.id] = await cached(`quiz:${c.id}`, () => getLessonsWithQuiz(c.id, lessonIds), TTL_MEDIUM);
              surveyCountMap[c.id] = await cached(
                `survey:${c.id}`,
                () => getLessonSurveyCounts(c.id, lessonIds),
                TTL_MEDIUM
              );
            }
          } catch {
            counts[c.id] = {};
            quizMap[c.id] = {};
            surveyCountMap[c.id] = {};
          }
        })
      );
      setSlideCountsMap(counts);
      setLessonsWithQuizMap(quizMap);
      setLessonsWithSurveyMap(surveyCountMap);
    } catch (e) {
      console.error("Dashboard load error:", e);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const courseTitles = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of courses) {
      if (c.id) map[c.id] = c.title ?? "Course";
    }
    return map;
  }, [courses]);

  const displayName =
    profile?.first_name || profile?.last_name
      ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") || user?.displayName || user?.email || "User"
      : user?.displayName || user?.email || "User";

  const primaryCourse = courses[0];
  const primaryProgress = primaryCourse?.id ? progressMap[primaryCourse.id] : null;
  const primarySlideCounts = (primaryCourse?.id ? slideCountsMap[primaryCourse.id] : undefined) ?? {};
  const primaryQuiz = (primaryCourse?.id ? lessonsWithQuizMap[primaryCourse.id] : undefined) ?? {};
  const primarySurvey = (primaryCourse?.id ? lessonsWithSurveyMap[primaryCourse.id] : undefined) ?? {};

  const nextStepCourse =
    courses.find((c) => {
      const p = c.id ? progressMap[c.id] : null;
      if (!p) return true;
      const slideCounts = (c.id ? slideCountsMap[c.id] : undefined) ?? {};
      const quiz = (c.id ? lessonsWithQuizMap[c.id] : undefined) ?? {};
      const survey = (c.id ? lessonsWithSurveyMap[c.id] : undefined) ?? {};
      const pct = calculateCourseProgress(c, p, slideCounts, quiz, undefined, undefined, survey);
      return pct < 100;
    }) ?? courses[0];
  const nextStepProgress = nextStepCourse?.id ? progressMap[nextStepCourse.id] : null;
  const nextStepSlideCounts = (nextStepCourse?.id ? slideCountsMap[nextStepCourse.id] : undefined) ?? {};
  const nextStepQuiz = (nextStepCourse?.id ? lessonsWithQuizMap[nextStepCourse.id] : undefined) ?? {};
  const nextStepSurvey = (nextStepCourse?.id ? lessonsWithSurveyMap[nextStepCourse.id] : undefined) ?? {};
  const nextStepPct =
    nextStepCourse && nextStepProgress
      ? calculateCourseProgress(
          nextStepCourse,
          nextStepProgress,
          nextStepSlideCounts,
          nextStepQuiz,
          undefined,
          undefined,
          nextStepSurvey
        )
      : 0;

  const continueUrl =
    nextStepCourse && nextStepCourse.id
      ? getLessonPlayerPath(nextStepCourse, nextStepProgress ?? undefined, Boolean(nextStepProgress?.lastViewedLessonId))
      : "/curriculum";

  const handleContinueLearningClick = () => {
    const wantsLesson =
      Boolean(nextStepProgress?.lastViewedLessonId) ||
      (Boolean(nextStepCourse) && nextStepPct > 0 && nextStepPct < 100);
    if (nextStepCourse && wantsLesson && !continueUrl.startsWith("/learn/lesson")) {
      trackEvent(WEB_ANALYTICS_EVENTS.DASHBOARD_CONTINUE_URL_INVALID, {
        continue_url: continueUrl,
        course_id: nextStepCourse.id ?? null,
      });
    }
    trackEvent(WEB_ANALYTICS_EVENTS.DASHBOARD_CONTINUE_LEARNING_CLICKED, {
      has_course: Boolean(nextStepCourse),
      target_url: nextStepCourse ? continueUrl : "/curriculum",
    });
    navigate(nextStepCourse ? continueUrl : "/curriculum");
  };

  const totalLessonsCompleted = Object.values(progressMap).reduce(
    (sum, p) => sum + Object.values(p?.lessonsCompleted ?? {}).filter(Boolean).length,
    0
  );
  const totalAssets = certificates.length + surveyDocs.length;

  const moduleJourneyRows: Array<{
    module: Module;
    moduleIndex: number;
    progress: number;
    status: "Completed" | "In Progress" | "Locked";
    locked: boolean;
  }> = [];
  if (primaryCourse?.modules) {
    const mapping = primaryCourse.curriculumMapping?.modules ?? [];
    primaryCourse.modules.forEach((module, moduleIndex) => {
      const mapMod = mapping[moduleIndex];
      const lessonIdsInModule: string[] = [];
      if (mapMod?.chapters) {
        for (const ch of mapMod.chapters) {
          for (const l of ch.lessons ?? []) {
            if (l.lessonId) lessonIdsInModule.push(l.lessonId);
          }
        }
      }
      const totalInModule = lessonIdsInModule.length;
      let done = 0;
      const quiz = (primaryCourse.id ? lessonsWithQuizMap[primaryCourse.id] : undefined) ?? {};
      const survey = (primaryCourse.id ? lessonsWithSurveyMap[primaryCourse.id] : undefined) ?? {};
      for (const lid of lessonIdsInModule) {
        const completed = primaryProgress?.lessonsCompleted?.[lid];
        const hasQuiz = quiz[lid];
        const hasSurvey = survey[lid];
        const quizOk = !hasQuiz || primaryProgress?.quizPassed?.[lid];
        const surveyOk = !hasSurvey || primaryProgress?.surveySubmitted?.[lid];
        if (completed && quizOk && surveyOk) done++;
      }
      const progressPct = totalInModule > 0 ? Math.round((done / totalInModule) * 100) : 0;
      const prevDone = moduleIndex === 0 || moduleJourneyRows[moduleIndex - 1]?.status === "Completed";
      const locked = !prevDone;
      const status: "Completed" | "In Progress" | "Locked" =
        locked ? "Locked" : progressPct === 100 ? "Completed" : "In Progress";
      moduleJourneyRows.push({
        module,
        moduleIndex,
        progress: progressPct,
        status,
        locked,
      });
    });
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  return (
    // One unified accent across the dashboard: MORTAR yellow. Set once here;
    // every bg-verse/text-verse/.verse-* below inherits it.
    <div className="relative" style={verseThemeStyle(VERSE.brick)}>
      <div className="relative z-10 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Welcome Header — wearemortar.com hero pattern: yellow uppercase
          kicker over a giant Montserrat Black uppercase headline */}
      <div className="mb-6 pt-2">
        <div className="flex items-center gap-4">
          <img src="/brand/white-trowell.png" alt="" aria-hidden className="h-12 w-auto opacity-90" />
          <div>
            <p className="font-technical uppercase tracking-[0.3em] text-verse text-xs mb-1.5">
              Welcome back //
            </p>
            <h1 className="font-headline font-black uppercase tracking-tight text-4xl leading-none text-foreground">
              {displayName}
            </h1>
          </div>
        </div>
        {/* Spec line: hairline rule + technical metadata */}
        <div className="mt-4 border-t border-white/15 pt-1.5 flex items-center gap-4 font-technical text-[11px] uppercase tracking-wider text-muted-foreground flex-wrap">
          <span className="text-verse">Site: Dashboard</span>
          {profile?.cohort_id && <span>Cohort: {profile.cohort_id}</span>}
          {profile?.city && <span>City: {profile.city}</span>}
          <span>Status: In progress</span>
        </div>
      </div>

      {/* Hero - Next step from real course + progress */}
      <Card
        className="relative overflow-hidden rounded-none glass-card p-5 mb-5 shadow-lg hover:shadow-xl transition-shadow"
      >
        {/* White paint-tear at the card bottom — the wearemortar.com
            signature section edge */}
        <div aria-hidden className="verse-texture-bottom opacity-90" style={{ ...verseThemeStyle("#f0ede6"), height: "30%" }} />
        <img
          src="/brand/white-trowell.png"
          alt=""
          aria-hidden
          className="pointer-events-none absolute -right-4 -top-6 h-40 w-auto opacity-[0.07] rotate-12"
        />
        <div className="relative z-10 flex items-start justify-between">
          <div className="flex-1">
            <Badge className="mb-2 rounded-none bg-verse text-white font-technical font-bold text-xs tracking-wider -rotate-1 origin-left">
              NEXT STEP
            </Badge>
            <h2 className="text-xl font-bold text-foreground mb-1">
              {nextStepCourse
                ? nextStepProgress?.lastViewedLessonId
                  ? "Continue learning"
                  : nextStepPct === 0
                    ? "Start your first lesson"
                    : "Finish this course"
                : "Browse curriculum"}
            </h2>
            <p className="text-sm text-muted-foreground mb-1">
              {nextStepCourse ? nextStepCourse.title : "No courses assigned yet."}
            </p>
            <div className="flex items-center gap-2 font-technical text-xs uppercase tracking-wider text-muted-foreground mb-4">
              <Clock className="w-3 h-3" />
              <span>
                {nextStepCourse ? `Progress: ${nextStepPct}%` : "Go to Curriculum to see available courses."}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {/* Single CTA — beta feedback: two "View Course" buttons were confusing */}
              <Button
                size="sm"
                className="rounded-none glow-brick bg-verse hover:bg-verse/90 text-white font-bold"
                onClick={handleContinueLearningClick}
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                {nextStepProgress?.lastViewedLessonId
                  ? "Continue Learning"
                  : nextStepCourse
                    ? "View Course"
                    : "Browse Curriculum"}
              </Button>
            </div>
          </div>
          <div className="relative w-20 h-20 rounded-full glow-brick">
            <svg className="w-20 h-20 transform -rotate-90">
              <circle cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="5" fill="none" className="text-white/10" />
              <circle
                cx="40"
                cy="40"
                r="34"
                stroke="currentColor"
                strokeWidth="5"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 34}`}
                strokeDashoffset={`${2 * Math.PI * 34 * (1 - nextStepPct / 100)}`}
                className="text-verse"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-base font-bold text-foreground">{nextStepPct}%</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 space-y-5">
          {/* Module Journey - from primary course + progress */}
          <Card
            className="rounded-none glass-card p-5 shadow-md cursor-pointer hover:border-verse/60 hover:shadow-lg transition-all"
            onClick={() => navigate("/curriculum")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate("/curriculum"); } }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-headline text-base font-black uppercase tracking-wider text-foreground"><span className="font-technical text-xs text-verse mr-2 align-middle">01 /</span>Module Journey</h2>
              {primaryCourse && moduleJourneyRows.length > 0 && (
                <Badge variant="outline" className="rounded-none border-verse text-verse font-technical text-xs">
                  {moduleJourneyRows.filter((r) => r.status === "Completed").length} of {moduleJourneyRows.length} Modules
                </Badge>
              )}
            </div>
            {moduleJourneyRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {courses.length === 0 ? "Enroll in a course to see your module journey." : "No modules in this course."}
              </p>
            ) : (
              <div className="space-y-3">
                {moduleJourneyRows.map(({ module, moduleIndex, progress, status, locked }) => {
                  const Icon = locked ? Lock : progress === 100 ? CheckCircle2 : PlayCircle;
                  return (
                    <div
                      key={moduleIndex}
                      className={`p-3 rounded-none border transition-all ${
                        locked ? "bg-white/[0.02] border-white/5" : "bg-white/[0.04] border-white/10 hover:border-verse hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-none ${
                            locked ? "bg-muted" : "bg-verse/10"
                          }`}
                        >
                          <Icon
                            className={`w-5 h-5 ${
                              locked ? "text-muted-foreground" : "text-verse"
                            }`}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h3
                              className={`text-sm font-medium ${
                                locked ? "text-muted-foreground" : "text-foreground"
                              }`}
                            >
                              Module {moduleIndex + 1} — {module.title}
                            </h3>
                            <Badge
                              variant="secondary"
                              className={`rounded-none font-technical text-xs font-bold -rotate-1 ${
                                locked
                                  ? "bg-muted text-muted-foreground"
                                  : progress === 100
                                    ? "bg-verse text-white"
                                    : "bg-verse/10 text-verse"
                              }`}
                            >
                              {status}
                            </Badge>
                          </div>
                          {!locked && <Progress value={progress} className="verse-progress h-1.5" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Data Room - real certificates + survey docs */}
          <Card
            className="rounded-none glass-card p-5 shadow-md cursor-pointer hover:border-verse/60 hover:shadow-lg transition-all"
            onClick={() => navigate("/data-room")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate("/data-room"); } }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-headline text-base font-black uppercase tracking-wider text-foreground"><span className="font-technical text-xs text-verse mr-2 align-middle">02 /</span>Data Room Progress</h2>
              <FileText className="w-5 h-5 text-verse" />
            </div>
            <div className="space-y-2.5 mb-4">
              {certificates.map((cert) => (
                <div key={cert.id} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-verse" />
                  <span className="text-sm text-muted-foreground">Certificate: {cert.skill}</span>
                </div>
              ))}
              {surveyDocs.map((d) => (
                <div key={d.id} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-verse" />
                  <span className="text-sm text-muted-foreground">Survey: {d.lessonTitle}</span>
                </div>
              ))}
              {certificates.length === 0 && surveyDocs.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Complete lessons with surveys or finish courses to earn certificates.
                </p>
              )}
            </div>
            <Progress
              value={
                certificates.length + surveyDocs.length > 0
                  ? Math.min(100, (certificates.length + surveyDocs.length) * 25)
                  : 0
              }
              className="verse-progress h-2 mb-2"
            />
            <p className="text-xs text-muted-foreground">
              Certificates and survey documents appear here when you complete courses and lessons.
            </p>
          </Card>

          {/* Community Activity - groups the user is in */}
          <Card
            className="rounded-none glass-card p-5 shadow-md cursor-pointer hover:border-verse/60 hover:shadow-lg transition-all"
            onClick={() => navigate("/community")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate("/community"); } }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-headline text-base font-black uppercase tracking-wider text-foreground"><span className="font-technical text-xs text-verse mr-2 align-middle">03 /</span>Community Activity</h2>
              <Users className="w-5 h-5 text-verse" />
            </div>
            <div className="space-y-3">
              {userGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground">You’re not in any groups yet. Join groups from the Community Hub.</p>
              ) : (
                userGroups.slice(0, 5).map((group) => (
                  <div
                    key={group.id}
                    className="p-3 rounded-none bg-white/[0.04] border border-white/10 hover:border-verse transition-colors cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); navigate(`/groups/${group.id}`); }}
                  >
                    <div className="flex items-start gap-2 mb-1">
                      <MessageCircle className="w-4 h-4 text-verse mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground font-medium">{group.Name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{group.lastMessage}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {group.members} {group.members === 1 ? "member" : "members"}
                          {group.lastMessageTime && typeof (group.lastMessageTime as { toDate?: () => Date }).toDate === "function" && (
                            <> • {formatDistanceToNow((group.lastMessageTime as { toDate: () => Date }).toDate(), { addSuffix: true })}</>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-4 rounded-none border-0 border-b-2 border-verse bg-transparent font-headline font-bold uppercase tracking-widest text-xs text-foreground hover:bg-white/5"
              onClick={(e) => { e.stopPropagation(); navigate("/community"); }}
            >
              View Community Hub
            </Button>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Card className="rounded-none glass-card p-5 shadow-md h-full">
              <h2 className="font-headline text-base font-black uppercase tracking-wider text-foreground mb-4"><span className="font-technical text-xs text-verse mr-2 align-middle">04 /</span>Progress</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-verse" />
                    <span className="text-sm text-foreground">Lessons Completed</span>
                  </div>
                  <span className="font-headline text-2xl font-black text-verse">{totalLessonsCompleted}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-verse" />
                    <span className="text-sm text-foreground">Assets Created</span>
                  </div>
                  <span className="font-headline text-2xl font-black text-verse">{totalAssets}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-verse" />
                    <span className="text-sm text-foreground">Groups</span>
                  </div>
                  <span className="font-headline text-2xl font-black text-verse">{userGroups.length}</span>
                </div>
              </div>
            </Card>

            <Card
              className="relative overflow-hidden rounded-none glass-card p-5 h-full flex flex-col shadow-md hover:shadow-lg transition-shadow cursor-pointer hover:border-verse/60"
              onClick={() => navigate("/shop")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate("/shop"); } }}
            >
              <img
                src="/brand/white-trowell.png"
                alt=""
                aria-hidden
                className="pointer-events-none absolute -right-3 -bottom-4 h-28 w-auto opacity-[0.06] -rotate-12"
              />
              <div className="flex items-center gap-2 mb-3">
                <ShoppingBag className="w-5 h-5 text-verse" />
                <h2 className="font-headline text-base font-black uppercase tracking-wider text-foreground"><span className="font-technical text-xs text-verse mr-2 align-middle">05 /</span>Shop MORTAR</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Discover resources, courses, and services to grow your business
              </p>
              <div className="space-y-2 text-sm text-foreground flex-1">
                <div className="flex items-center gap-2">
                  <span>📦</span>
                  <span>Business Toolkits & Templates</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>👥</span>
                  <span>1-on-1 Mentorship Sessions</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>📚</span>
                  <span>Advanced Courses</span>
                </div>
              </div>
              <Button
                onClick={(e) => { e.stopPropagation(); navigate("/shop"); }}
                className="w-full mt-4 rounded-none bg-verse hover:bg-verse/90 text-white font-bold"
              >
                Browse Shop
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Card>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-5">
          {/* Achievements - real certificates as badges */}
          <Card className="rounded-none glass-card p-5 shadow-md">
            <h2 className="font-headline text-base font-black uppercase tracking-wider text-foreground mb-4"><span className="font-technical text-xs text-verse mr-2 align-middle">06 /</span>Your Achievements</h2>
            <div className="space-y-3">
              {certificates.slice(0, 5).map((cert) => (
                <div key={cert.id} className="flex items-center gap-2.5">
                  <div className="p-2 rounded-none bg-verse/10">
                    <Award className="w-5 h-5 text-verse" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{cert.skill}</p>
                    <p className="text-xs text-muted-foreground">Earned • {cert.courseTitle}</p>
                  </div>
                </div>
              ))}
              {certificates.length === 0 && (
                <p className="text-sm text-muted-foreground">Complete courses to earn skill certificates.</p>
              )}
              {certificates.length > 0 && (
                <div className="border-t border-white/10 pt-3 mt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">NEXT BADGE</p>
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-none bg-verse/10">
                      <Trophy className="w-5 h-5 text-verse" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Complete more courses</p>
                      <p className="text-xs text-muted-foreground">Skills from your enrolled courses</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <WeeklyActivityWidget
            userId={user?.uid}
            certificates={certificates}
            progressMap={progressMap}
            courseTitles={courseTitles}
          />

          {/* Upcoming Events - real */}
          <Card className="rounded-none glass-card p-5 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-headline text-base font-black uppercase tracking-wider text-foreground"><span className="font-technical text-xs text-verse mr-2 align-middle">08 /</span>Upcoming Events</h2>
              <Calendar className="w-5 h-5 text-verse" />
            </div>
            <div className="space-y-3">
              {upcomingEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming events. Check back later.</p>
              ) : (
                upcomingEvents.map((event) => (
                  <div key={event.id} className="p-3 rounded-none bg-white/[0.04] border border-white/10">
                    <p className="text-sm font-medium text-foreground mb-1">{event.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <span>
                        {event.date?.toDate ? format(event.date.toDate(), "MMM d — h a") : event.time}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full rounded-none border-0 border-b-2 border-verse bg-transparent font-headline font-bold uppercase tracking-widest text-xs text-foreground hover:bg-white/5"
                      onClick={() => navigate(`/events/${event.id}`)}
                    >
                      View / RSVP
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
      </div>
    </div>
  );
}
