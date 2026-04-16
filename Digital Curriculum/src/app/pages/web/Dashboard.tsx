import { useState, useEffect, useCallback } from "react";
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
  getCoursesByUserId,
  getCoursesByRole,
  getLessonsWithQuiz,
  getLessonsWithSurvey,
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
import { trackEvent } from "../../analytics/trackEvent";
import { WEB_ANALYTICS_EVENTS } from "@mortar/analytics-contract/mortarAnalyticsContract";

const MOCK_BORDER = "border-2 border-red-500";

interface UserProfile {
  first_name?: string;
  last_name?: string;
  city?: string;
  state?: string;
  cohort_id?: string;
}

export function WebDashboard() {
  useScreenAnalytics("dashboard");
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, CourseProgress>>({});
  const [slideCountsMap, setSlideCountsMap] = useState<Record<string, Record<string, number>>>({});
  const [lessonsWithQuizMap, setLessonsWithQuizMap] = useState<Record<string, Record<string, boolean>>>({});
  const [lessonsWithSurveyMap, setLessonsWithSurveyMap] = useState<Record<string, Record<string, boolean>>>({});
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
        cached(`roles:${uid}`, () => getCurrentUserWithRoles(), TTL_SHORT),
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
      const [byId, byRole] = await Promise.all([
        cached(`coursesByUser:${uid}`, () => getCoursesByUserId(uid), TTL_SHORT),
        Promise.all(roles.map((r: string) => cached(`coursesByRole:${r}`, () => getCoursesByRole(r), TTL_SHORT))).then((arr) => arr.flat()),
      ]);
      const allCourses = [...byId, ...byRole];
      const unique = allCourses.filter((c, i, self) => self.findIndex((x) => x.id === c.id) === i);
      setCourses(unique);

      const counts: Record<string, Record<string, number>> = {};
      const quizMap: Record<string, Record<string, boolean>> = {};
      const surveyMap: Record<string, Record<string, boolean>> = {};
      await Promise.all(
        unique.map(async (c) => {
          if (!c.id || !c.curriculumMapping) return;
          try {
            counts[c.id] = await cached(`slideCounts:${c.id}`, () => getCourseSlideCounts(c), TTL_MEDIUM);
            const lessonIds = Object.keys(counts[c.id]);
            if (lessonIds.length > 0) {
              quizMap[c.id] = await cached(`quiz:${c.id}`, () => getLessonsWithQuiz(c.id, lessonIds), TTL_MEDIUM);
              surveyMap[c.id] = await cached(`survey:${c.id}`, () => getLessonsWithSurvey(c.id, lessonIds), TTL_MEDIUM);
            }
          } catch {
            counts[c.id] = {};
            quizMap[c.id] = {};
            surveyMap[c.id] = {};
          }
        })
      );
      setSlideCountsMap(counts);
      setLessonsWithQuizMap(quizMap);
      setLessonsWithSurveyMap(surveyMap);
    } catch (e) {
      console.error("Dashboard load error:", e);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      const pct = calculateCourseProgress(c, p, slideCounts, quiz, survey);
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
      <div className="p-6 max-w-7xl mx-auto">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Welcome Header - Real name/profile; mock "lessons this week" */}
      <div className="mb-5">
        <h1 className="text-2xl text-foreground mb-1">
          Welcome back, <span className="text-accent">{displayName}</span>
        </h1>
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          {profile?.cohort_id && <span>Cohort: {profile.cohort_id}</span>}
          {profile?.city && (
            <>
              {profile?.cohort_id && <span>•</span>}
              <span>City: {profile.city}</span>
            </>
          )}
        </div>
      </div>

      {/* Hero - Next step from real course + progress */}
      <Card className="p-5 mb-5 bg-gradient-to-br from-accent/20 via-card to-card border-accent/30 shadow-lg hover:shadow-xl transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Badge className="mb-2 bg-accent text-accent-foreground text-xs">
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
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
              <Clock className="w-3 h-3" />
              <span>
                {nextStepCourse ? `Progress: ${nextStepPct}%` : "Go to Curriculum to see available courses."}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
                onClick={handleContinueLearningClick}
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                {nextStepProgress?.lastViewedLessonId
                  ? "Continue Learning"
                  : nextStepCourse
                    ? "View Course"
                    : "Browse Curriculum"}
              </Button>
              {nextStepCourse?.id && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border"
                  onClick={() => navigate(`/courses/${nextStepCourse.id}`)}
                >
                  View Course
                </Button>
              )}
            </div>
          </div>
          <div className="relative w-20 h-20">
            <svg className="w-20 h-20 transform -rotate-90">
              <circle cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="5" fill="none" className="text-muted" />
              <circle
                cx="40"
                cy="40"
                r="34"
                stroke="currentColor"
                strokeWidth="5"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 34}`}
                strokeDashoffset={`${2 * Math.PI * 34 * (1 - nextStepPct / 100)}`}
                className="text-accent"
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
            className="p-5 bg-card border-border shadow-md cursor-pointer hover:border-accent/50 hover:shadow-lg transition-all"
            onClick={() => navigate("/curriculum")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate("/curriculum"); } }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Module Journey</h2>
              {primaryCourse && moduleJourneyRows.length > 0 && (
                <Badge variant="outline" className="border-accent text-accent text-xs">
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
                      className={`p-3 rounded-lg border transition-all ${
                        locked ? "bg-muted/30 border-border/50" : "bg-card border-border hover:border-accent hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            locked ? "bg-muted" : progress === 100 ? "bg-green-500/10" : "bg-accent/10"
                          }`}
                        >
                          <Icon
                            className={`w-5 h-5 ${
                              locked ? "text-muted-foreground" : progress === 100 ? "text-green-500" : "text-accent"
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
                              className={`text-xs ${
                                locked
                                  ? "bg-muted text-muted-foreground"
                                  : progress === 100
                                    ? "bg-green-500/10 text-green-500"
                                    : "bg-accent/10 text-accent"
                              }`}
                            >
                              {status}
                            </Badge>
                          </div>
                          {!locked && <Progress value={progress} className="h-1.5" />}
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
            className="p-5 bg-card border-border shadow-md cursor-pointer hover:border-accent/50 hover:shadow-lg transition-all"
            onClick={() => navigate("/data-room")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate("/data-room"); } }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Data Room Progress</h2>
              <FileText className="w-5 h-5 text-accent" />
            </div>
            <div className="space-y-2.5 mb-4">
              {certificates.map((cert) => (
                <div key={cert.id} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">Certificate: {cert.skill}</span>
                </div>
              ))}
              {surveyDocs.map((d) => (
                <div key={d.id} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
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
              className="h-2 mb-2"
            />
            <p className="text-xs text-muted-foreground">
              Certificates and survey documents appear here when you complete courses and lessons.
            </p>
          </Card>

          {/* Community Activity - groups the user is in */}
          <Card
            className="p-5 bg-card border-border shadow-md cursor-pointer hover:border-accent/50 hover:shadow-lg transition-all"
            onClick={() => navigate("/community")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate("/community"); } }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Community Activity</h2>
              <Users className="w-5 h-5 text-accent" />
            </div>
            <div className="space-y-3">
              {userGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground">You’re not in any groups yet. Join groups from the Community Hub.</p>
              ) : (
                userGroups.slice(0, 5).map((group) => (
                  <div
                    key={group.id}
                    className="p-3 rounded-lg bg-muted/50 border border-border hover:border-accent transition-colors cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); navigate(`/groups/${group.id}`); }}
                  >
                    <div className="flex items-start gap-2 mb-1">
                      <MessageCircle className="w-4 h-4 text-accent mt-0.5 shrink-0" />
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
              className="w-full mt-4 text-accent border-accent"
              onClick={(e) => { e.stopPropagation(); navigate("/community"); }}
            >
              View Community Hub
            </Button>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-5">
          {/* Achievements - real certificates as badges */}
          <Card className="p-5 bg-card border-border shadow-md">
            <h2 className="text-lg font-bold text-foreground mb-4">Your Achievements</h2>
            <div className="space-y-3">
              {certificates.slice(0, 5).map((cert) => (
                <div key={cert.id} className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-yellow-500/10">
                    <Award className="w-5 h-5 text-yellow-500" />
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
                <div className="border-t border-border pt-3 mt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">NEXT BADGE</p>
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-accent/10">
                      <Trophy className="w-5 h-5 text-accent" />
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

          {/* Leaderboard - mock */}
          <Card className={`p-5 bg-card border-border shadow-md ${MOCK_BORDER}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Cohort Leaderboard</h2>
              <Trophy className="w-5 h-5 text-accent" />
            </div>
            <div className="space-y-2">
              {[
                { name: "Alex R", points: 4120, isYou: false, rank: 1 },
                { name: "Grace S", points: 3980, isYou: true, rank: 2 },
                { name: "Marcus L", points: 3750, isYou: false, rank: 3 },
                { name: "Sarah K", points: 3620, isYou: false, rank: 4 },
                { name: "Jordan P", points: 3450, isYou: false, rank: 5 },
              ].map((u, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-2 rounded ${u.isYou ? "bg-accent/10 border border-accent/30" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold w-6 ${
                        u.rank === 1 ? "text-yellow-500" : u.rank === 2 ? "text-gray-400" : u.rank === 3 ? "text-orange-600" : "text-muted-foreground"
                      }`}
                    >
                      #{u.rank}
                    </span>
                    <span className={`text-sm ${u.isYou ? "font-bold text-accent" : "text-foreground"}`}>
                      {u.name}
                      {u.isYou && " (You)"}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-foreground">{u.points.toLocaleString()}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">Points from modules, assets & community</p>
          </Card>

          {/* Upcoming Events - real */}
          <Card className="p-5 bg-card border-border shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Upcoming Events</h2>
              <Calendar className="w-5 h-5 text-accent" />
            </div>
            <div className="space-y-3">
              {upcomingEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming events. Check back later.</p>
              ) : (
                upcomingEvents.map((event) => (
                  <div key={event.id} className="p-3 rounded-lg bg-muted/50 border border-border">
                    <p className="text-sm font-medium text-foreground mb-1">{event.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <span>
                        {event.date?.toDate ? format(event.date.toDate(), "MMM d — h a") : event.time}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-accent border-accent hover:bg-accent/10"
                      onClick={() => navigate(`/events/${event.id}`)}
                    >
                      View / RSVP
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Progress - lessons, assets, groups */}
          <Card className="p-5 bg-card border-border shadow-md">
            <h2 className="text-lg font-bold text-foreground mb-4">Progress</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-accent" />
                  <span className="text-sm text-foreground">Lessons Completed</span>
                </div>
                <span className="text-sm font-bold text-accent">{totalLessonsCompleted}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-accent" />
                  <span className="text-sm text-foreground">Assets Created</span>
                </div>
                <span className="text-sm font-bold text-accent">{totalAssets}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-accent" />
                  <span className="text-sm text-foreground">Groups</span>
                </div>
                <span className="text-sm font-bold text-accent">{userGroups.length}</span>
              </div>
            </div>
          </Card>

          {/* Shop - real link */}
          <Card
            className="p-5 bg-gradient-to-br from-accent/10 via-card to-card border-accent/30 shadow-md hover:shadow-lg transition-shadow cursor-pointer hover:border-accent/50"
            onClick={() => navigate("/shop")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate("/shop"); } }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-accent" />
                <h2 className="text-lg font-bold text-foreground">Shop Mortar</h2>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Discover resources, courses, and services to grow your business
            </p>
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <span>📦</span>
                <span>Business Toolkits & Templates</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground">
                <span>👥</span>
                <span>1-on-1 Mentorship Sessions</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground">
                <span>📚</span>
                <span>Advanced Courses</span>
              </div>
            </div>
            <Button
              onClick={(e) => { e.stopPropagation(); navigate("/shop"); }}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              Browse Shop
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
