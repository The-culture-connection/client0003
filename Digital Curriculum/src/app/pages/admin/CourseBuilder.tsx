/**
 * Unified Course Builder
 * Combines course metadata, image upload for lesson content, preview, and publish
 */

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import { Separator } from "../../components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  Upload,
  ImageIcon,
  Loader2,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Eye,
  Save,
  Send,
  AlertCircle,
  X,
  Video,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
} from "lucide-react";
import { useAuth } from "../../components/auth/AuthProvider";
import { trackEvent } from "../../analytics/trackEvent";
import { WEB_ANALYTICS_EVENTS } from "@mortar/analytics-contract/mortarAnalyticsContract";
import {
  createCurriculum,
  createModule,
  createChapter,
  createLesson,
  getLesson,
  getSlides,
  getBlocks,
  getChapters,
  publishLesson,
  updateLesson,
  getLessonImages,
  getLessonContent,
  setLessonContentSlides,
  uploadSingleImageForLesson,
  extractYouTubeVideoId,
  type Lesson,
  type Slide,
  type Block,
  type LessonImage,
  type LessonContentSlide,
  type QuizQuestion,
} from "../../lib/curriculum";
import {
  createCourse,
  updateCourse,
  setCourseLessonQuiz,
  setCourseLessonSurvey,
  getCourse,
  getCourseLessonQuiz,
  getCourseLessonSurvey,
  deleteCourse,
  type Course,
} from "../../lib/courses";
import { DATAROOM_FOLDER_OPTIONS } from "../../lib/dataroomFolders";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../../lib/firebase";
import { SlideRenderer } from "../../components/curriculum/SlideRenderer";
import { YouTubeBlock } from "../../components/curriculum/YouTubeBlock";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { SKILL_CATEGORIES, ALL_SKILLS, type SkillCategory } from "../../lib/onboardingData";
import { Checkbox } from "../../components/ui/checkbox";

type ImageUploadStatus = "idle" | "uploading" | "success" | "error";

/** One slide in the builder (before save). Image = file + preview URL; Video = YouTube id + caption. Existing = from Firestore (no file). */
export interface DraftSlide {
  type: "image" | "video";
  file?: File;
  imagePreviewUrl?: string;
  /** When loading from existing content, keep so we don't re-upload */
  existingImageUrl?: string;
  existingStoragePath?: string;
  videoId?: string;
  videoUrl?: string;
  caption?: string;
}

/** One multiple-choice question in the builder (before save) */
export interface DraftQuizQuestion {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: "A" | "B" | "C" | "D";
}

interface ModuleData {
  id?: string;
  title: string;
  description: string;
  price: string;
  durationMonths: string;
  skills?: string[];
  completionBadgeIds?: string[];
  lessonCount: number;
  lessons: Array<{
    title: string;
    /** Legacy: kept for backward compat; new flow uses slides */
    imageFiles?: File[];
    /** Ordered slides: image (upload) or video (YouTube link) */
    slides: DraftSlide[];
    imageUploadStatus?: ImageUploadStatus;
    lessonId?: string;
    /** Quiz at end of lesson */
    quizEnabled?: boolean;
    quizQuestions?: DraftQuizQuestion[];
    quizMaxAttempts?: number;
    quizPassPercentage?: number;
    /** Survey at end of lesson (open-ended) */
    surveyEnabled?: boolean;
    surveyTitle?: string;
    surveyQuestions?: Array<{ question: string }>;
    generatePdfOnComplete?: boolean;
    /** Required when generatePdfOnComplete is enabled */
    dataroomFolderId?: string;
  }>;
}

function slugifyBadgeId(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

export function CourseBuilder() {
  const navigate = useNavigate();
  const { courseId: editingCourseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState("metadata");
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isLoadingEdit, setIsLoadingEdit] = useState(!!editingCourseId);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Course Metadata
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");

  // Modules
  const [moduleCount, setModuleCount] = useState(1);
  const [modules, setModules] = useState<ModuleData[]>([
    {
      title: "",
      description: "",
      price: "",
      durationMonths: "",
      skills: [],
      completionBadgeIds: [],
      lessonCount: 1,
      lessons: [
        {
          title: "",
          imageFiles: [],
          slides: [],
          imageUploadStatus: "idle",
          quizEnabled: false,
          quizQuestions: [],
          quizMaxAttempts: 3,
          quizPassPercentage: 70,
          surveyEnabled: false,
          surveyTitle: "",
          surveyQuestions: [],
          generatePdfOnComplete: false,
          dataroomFolderId: undefined,
        },
      ],
    },
  ]);

  // Assignment
  const [assignmentType, setAssignmentType] = useState<"role" | "user">("role");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [userEmailInput, setUserEmailInput] = useState("");
  const [userEmailError, setUserEmailError] = useState<string | null>(null);
  /** For "Specific User": list of validated { email, userId } so admin can assign multiple users */
  const [assignedUsers, setAssignedUsers] = useState<Array<{ email: string; userId: string }>>([]);

  // Created course/curriculum IDs
  const [curriculumId, setCurriculumId] = useState<string | null>(null);
  const [createdCourseId, setCreatedCourseId] = useState<string | null>(null);
  const [previewLessonId, setPreviewLessonId] = useState<string | null>(null);
  const [previewModuleId, setPreviewModuleId] = useState<string | null>(null);
  const [previewLessonSlides, setPreviewLessonSlides] = useState<DraftSlide[] | null>(null);
  const [previewLessonTitle, setPreviewLessonTitle] = useState<string>("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [expandedSkillsModuleIndex, setExpandedSkillsModuleIndex] = useState<number | null>(null);
  const [newBadgeNamesByModule, setNewBadgeNamesByModule] = useState<Record<number, string>>({});
  const [newBadgeDescriptionsByModule, setNewBadgeDescriptionsByModule] = useState<Record<number, string>>({});
  const [newBadgeImageUrlsByModule, setNewBadgeImageUrlsByModule] = useState<Record<number, string>>({});
  const [newBadgeImageFilesByModule, setNewBadgeImageFilesByModule] = useState<Record<number, File | null>>({});
  const [creatingBadgeByModule, setCreatingBadgeByModule] = useState<Record<number, boolean>>({});

  // Initialize curriculum structure (create new only when not editing)
  useEffect(() => {
    const initializeCurriculum = async () => {
      if (!user || curriculumId || editingCourseId) return;

      try {
        const newCurriculumId = await createCurriculum(
          courseTitle || "New Course",
          courseDescription || "",
          user.uid
        );
        setCurriculumId(newCurriculumId);
      } catch (error) {
        console.error("Error initializing curriculum:", error);
      }
    };

    initializeCurriculum();
  }, [user, courseTitle, curriculumId, editingCourseId]);

  // Load existing course when editing
  useEffect(() => {
    if (!editingCourseId || !user) {
      setIsLoadingEdit(false);
      return;
    }

    const loadCourseForEdit = async () => {
      setIsLoadingEdit(true);
      try {
        const course = await getCourse(editingCourseId);
        if (!course || !course.curriculumMapping) {
          alert("Course not found or has no curriculum mapping.");
          navigate("/admin");
          return;
        }

        const cid = course.curriculumMapping.curriculumId;
        setCourseTitle(course.title || "");
        setCourseDescription(course.description || "");
        setCreatedCourseId(editingCourseId);
        setCurriculumId(cid);

        if (course.assignedRoles?.length) {
          setAssignmentType("role");
          setSelectedRoles(course.assignedRoles);
        } else if (course.assignedUserIds?.length) {
          setAssignmentType("user");
          const usersWithEmails: Array<{ email: string; userId: string }> = [];
          for (const uid of course.assignedUserIds) {
            const userSnap = await getDoc(doc(db, "users", uid));
            const email = userSnap.exists() ? (userSnap.data()?.email as string) || "" : "";
            usersWithEmails.push({ email: email || uid, userId: uid });
          }
          setAssignedUsers(usersWithEmails);
        }

        const loadedModules: ModuleData[] = [];
        for (let mi = 0; mi < course.modules.length; mi++) {
          const mod = course.modules[mi];
          const mapMod = course.curriculumMapping!.modules[mi];
          const moduleId = mapMod?.moduleId;
          const chapterId = mapMod?.chapters?.[0]?.chapterId;
          const mapLessons = mapMod?.chapters?.[0]?.lessons ?? [];

          const lessons: ModuleData["lessons"] = [];
          for (let li = 0; li < mod.lessons.length; li++) {
            const lesson = mod.lessons[li];
            const lessonId = mapLessons[li]?.lessonId;
            const title = mapLessons[li]?.title ?? lesson.title ?? `Lesson ${li + 1}`;

            let slides: DraftSlide[] = [];
            let quizEnabled = false;
            let quizQuestions: DraftQuizQuestion[] = [];
            let quizMaxAttempts = 3;
            let quizPassPercentage = 70;
            let surveyEnabled = false;
            let surveyTitle = "";
            let surveyQuestions: Array<{ question: string }> = [];
            let generatePdfOnComplete = false;
            let dataroomFolderId: string | undefined = undefined;

            if (lessonId && cid && moduleId && chapterId) {
              try {
                const [content, quiz, survey] = await Promise.all([
                  getLessonContent(cid, moduleId, chapterId, lessonId),
                  getCourseLessonQuiz(editingCourseId, lessonId),
                  getCourseLessonSurvey(editingCourseId, lessonId),
                ]);
                slides = content.map((s) => {
                  if (s.type === "image") {
                    return {
                      type: "image" as const,
                      imagePreviewUrl: s.image_url,
                      existingImageUrl: s.image_url,
                      existingStoragePath: s.storage_path,
                    };
                  }
                  return {
                    type: "video" as const,
                    videoId: s.video_id,
                    videoUrl: s.video_url,
                    caption: s.caption,
                  };
                });
                if (quiz?.enabled && quiz.questions?.length) {
                  quizEnabled = true;
                  quizMaxAttempts = quiz.maxAttempts ?? 3;
                  quizPassPercentage = quiz.passPercentage ?? 70;
                  quizQuestions = (quiz.questions ?? [])
                    .sort((a, b) => a.order - b.order)
                    .map((q) => ({
                      question: q.question,
                      optionA: q.optionA,
                      optionB: q.optionB,
                      optionC: q.optionC,
                      optionD: q.optionD,
                      correctAnswer: q.correctAnswer,
                    }));
                }
                if (survey?.enabled && survey.questions?.length) {
                  surveyEnabled = true;
                  surveyTitle = survey.title ?? "";
                  surveyQuestions = (survey.questions ?? []).sort((a, b) => a.order - b.order).map((q) => ({ question: q.question }));
                  generatePdfOnComplete = survey.generatePdfOnComplete ?? false;
                  dataroomFolderId = survey.dataroomFolderId ?? undefined;
                }
              } catch (e) {
                console.warn("Load lesson content/quiz failed:", e);
              }
            }

            lessons.push({
              title,
              slides,
              imageUploadStatus: slides.length > 0 ? "success" : "idle",
              lessonId,
              quizEnabled,
              quizQuestions,
              quizMaxAttempts,
              quizPassPercentage,
              surveyEnabled,
              surveyTitle,
              surveyQuestions,
              generatePdfOnComplete,
              dataroomFolderId,
            });
          }

          loadedModules.push({
            id: moduleId,
            title: mod.title || `Module ${mi + 1}`,
            description: mod.description ?? "",
            price: String(mod.price ?? 0),
            durationMonths: String(mod.durationMonths ?? 0),
            skills: mod.skills ?? [],
            completionBadgeIds: mod.completionBadgeIds ?? [],
            lessonCount: lessons.length,
            lessons,
          });
        }

        setModules(loadedModules);
        setModuleCount(loadedModules.length);
      } catch (err) {
        console.error("Error loading course for edit:", err);
        alert("Failed to load course.");
        navigate("/admin");
      } finally {
        setIsLoadingEdit(false);
      }
    };

    loadCourseForEdit();
  }, [editingCourseId, user, navigate]);

  const handleSetModuleCount = (count: number) => {
    if (count < 1) return;

    const newModules: ModuleData[] = [];
    for (let i = 0; i < count; i++) {
      if (modules[i]) {
        newModules.push(modules[i]);
      } else {
        newModules.push({
          title: "",
          description: "",
          price: "",
          durationMonths: "",
          skills: [],
          completionBadgeIds: [],
          lessonCount: 1,
          lessons: [
            {
              title: "",
              imageFiles: [],
              slides: [],
              imageUploadStatus: "idle",
              quizEnabled: false,
              quizQuestions: [],
              quizMaxAttempts: 3,
              quizPassPercentage: 70,
          surveyEnabled: false,
          surveyTitle: "",
          surveyQuestions: [],
          generatePdfOnComplete: false,
            },
          ],
        });
      }
    }
    setModules(newModules);
    setModuleCount(count);
  };

  const handleSetLessonCount = (moduleIndex: number, count: number) => {
    if (count < 1) return;

    const updated = [...modules];
    const currentLessons = updated[moduleIndex].lessons;
    const newLessons: ModuleData["lessons"] = [];

    for (let i = 0; i < count; i++) {
      if (currentLessons[i]) {
        newLessons.push(currentLessons[i]);
      } else {
        newLessons.push({
        title: "",
        imageFiles: [],
        slides: [],
        imageUploadStatus: "idle",
        quizEnabled: false,
        quizQuestions: [],
        quizMaxAttempts: 3,
        quizPassPercentage: 70,
      });
      }
    }

    updated[moduleIndex].lessons = newLessons;
    updated[moduleIndex].lessonCount = count;
    setModules(updated);
  };

  const handleImageSelect = (
    moduleIndex: number,
    lessonIndex: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files?.length) return;
    const fileList = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (fileList.length === 0) {
      alert("Please select image files (e.g. JPG, PNG)");
      return;
    }
    const updated = [...modules];
    const lesson = updated[moduleIndex].lessons[lessonIndex];
    if (!lesson.slides) lesson.slides = [];
    for (const file of fileList) {
      lesson.slides.push({
        type: "image",
        file,
        imagePreviewUrl: URL.createObjectURL(file),
      });
    }
    if (!lesson.title) lesson.title = `Lesson ${lessonIndex + 1}`;
    setModules(updated);
    e.target.value = "";
  };

  const handleAddSlideVideo = (
    moduleIndex: number,
    lessonIndex: number,
    url: string,
    caption: string
  ) => {
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) {
      alert("Invalid YouTube link. Use https://www.youtube.com/watch?v=... or https://youtu.be/...");
      return;
    }
    const updated = [...modules];
    const lesson = updated[moduleIndex].lessons[lessonIndex];
    if (!lesson.slides) lesson.slides = [];
    lesson.slides.push({
      type: "video",
      videoId,
      videoUrl: url.trim(),
      caption: caption.trim() || undefined,
    });
    setModules(updated);
  };

  const handleRemoveSlide = (moduleIndex: number, lessonIndex: number, slideIndex: number) => {
    const updated = [...modules];
    const lesson = updated[moduleIndex].lessons[lessonIndex];
    if (lesson.slides?.[slideIndex]?.imagePreviewUrl) {
      URL.revokeObjectURL(lesson.slides[slideIndex].imagePreviewUrl!);
    }
    lesson.slides = lesson.slides?.filter((_, i) => i !== slideIndex) ?? [];
    setModules(updated);
  };

  const handleMoveSlide = (
    moduleIndex: number,
    lessonIndex: number,
    slideIndex: number,
    direction: -1 | 1
  ) => {
    const updated = [...modules];
    const lesson = updated[moduleIndex].lessons[lessonIndex];
    const slides = lesson.slides ?? [];
    const newIndex = slideIndex + direction;
    if (newIndex < 0 || newIndex >= slides.length) return;
    [slides[slideIndex], slides[newIndex]] = [slides[newIndex], slides[slideIndex]];
    lesson.slides = [...slides];
    setModules(updated);
  };

  const setQuizEnabled = (moduleIndex: number, lessonIndex: number, enabled: boolean) => {
    const updated = [...modules];
    const lesson = updated[moduleIndex].lessons[lessonIndex];
    lesson.quizEnabled = enabled;
    if (enabled && !lesson.quizQuestions?.length) lesson.quizQuestions = [];
    if (enabled && lesson.quizMaxAttempts == null) lesson.quizMaxAttempts = 3;
    if (enabled && lesson.quizPassPercentage == null) lesson.quizPassPercentage = 70;
    setModules(updated);
  };

  const addQuizQuestion = (moduleIndex: number, lessonIndex: number) => {
    const updated = [...modules];
    const lesson = updated[moduleIndex].lessons[lessonIndex];
    if (!lesson.quizQuestions) lesson.quizQuestions = [];
    lesson.quizQuestions.push({
      question: "",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      correctAnswer: "A",
    });
    setModules(updated);
  };

  const removeQuizQuestion = (moduleIndex: number, lessonIndex: number, qIndex: number) => {
    const updated = [...modules];
    const lesson = updated[moduleIndex].lessons[lessonIndex];
    lesson.quizQuestions = lesson.quizQuestions?.filter((_, i) => i !== qIndex) ?? [];
    setModules(updated);
  };

  const updateQuizQuestion = (
    moduleIndex: number,
    lessonIndex: number,
    qIndex: number,
    field: keyof DraftQuizQuestion,
    value: string | number
  ) => {
    const updated = [...modules];
    const lesson = updated[moduleIndex].lessons[lessonIndex];
    const q = lesson.quizQuestions?.[qIndex];
    if (!q) return;
    (q as Record<string, unknown>)[field] = value;
    setModules(updated);
  };

  const setSurveyEnabled = (moduleIndex: number, lessonIndex: number, enabled: boolean) => {
    const updated = [...modules];
    const lesson = updated[moduleIndex].lessons[lessonIndex];
    lesson.surveyEnabled = enabled;
    if (!enabled) {
      // If the survey is disabled, PDF export becomes irrelevant as well.
      lesson.generatePdfOnComplete = false;
      lesson.dataroomFolderId = undefined;
    }
    if (enabled && !lesson.surveyQuestions?.length) lesson.surveyQuestions = [];
    setModules(updated);
  };

  const addSurveyQuestion = (moduleIndex: number, lessonIndex: number) => {
    const updated = [...modules];
    const lesson = updated[moduleIndex].lessons[lessonIndex];
    if (!lesson.surveyQuestions) lesson.surveyQuestions = [];
    lesson.surveyQuestions.push({ question: "" });
    setModules(updated);
  };

  const removeSurveyQuestion = (moduleIndex: number, lessonIndex: number, qIndex: number) => {
    const updated = [...modules];
    const lesson = updated[moduleIndex].lessons[lessonIndex];
    lesson.surveyQuestions = lesson.surveyQuestions?.filter((_, i) => i !== qIndex) ?? [];
    setModules(updated);
  };

  const updateSurveyQuestion = (moduleIndex: number, lessonIndex: number, qIndex: number, value: string) => {
    const updated = [...modules];
    const lesson = updated[moduleIndex].lessons[lessonIndex];
    const q = lesson.surveyQuestions?.[qIndex];
    if (!q) return;
    q.question = value;
    setModules(updated);
  };

  const handleSaveCourse = async (): Promise<string | null> => {
    if (!curriculumId || !user) return null;

    setIsSaving(true);
    try {
      // Create modules, chapters, and lessons
      const courseModules = [];
      const mapping: any = {
        curriculumId,
        modules: [],
      };
      let accumulatedModules = [...modules];

      for (let moduleIndex = 0; moduleIndex < modules.length; moduleIndex++) {
        const moduleData = accumulatedModules[moduleIndex];

        let moduleId = moduleData.id;
        if (!moduleId) {
          moduleId = await createModule(
            curriculumId,
            moduleData.title || `Module ${moduleIndex + 1}`,
            moduleIndex + 1
          );
          accumulatedModules[moduleIndex].id = moduleId;
        }

        let chapterId: string;
        const chapters = await getChapters(curriculumId, moduleId);
        if (chapters.length > 0 && chapters[0].id) {
          chapterId = chapters[0].id;
        } else {
          chapterId = await createChapter(
            curriculumId,
            moduleId,
            "Main Chapter",
            1
          );
        }

        const moduleLessons = [];

        for (let lessonIndex = 0; lessonIndex < moduleData.lessons.length; lessonIndex++) {
          const lessonData = moduleData.lessons[lessonIndex];

          let lessonId = lessonData.lessonId;
          const slides = lessonData.slides ?? [];
          const hasContent = slides.length > 0;

          if (!lessonId) {
            lessonId = await createLesson(
              curriculumId,
              moduleId,
              chapterId,
              lessonData.title || `Lesson ${lessonIndex + 1}`,
              lessonIndex + 1,
              user.uid,
              hasContent ? { content_type: "media" } : undefined
            );
            accumulatedModules[moduleIndex].lessons[lessonIndex].lessonId = lessonId;
          }

          if (hasContent && lessonId) {
            try {
              accumulatedModules[moduleIndex].lessons[lessonIndex].imageUploadStatus = "uploading";
              setModules(accumulatedModules);
              await updateLesson(
                curriculumId,
                moduleId,
                chapterId,
                lessonId,
                { content_type: "media" }
              );
              const contentSlides: Omit<LessonContentSlide, "id" | "created_at" | "updated_at">[] = [];
              for (let i = 0; i < slides.length; i++) {
                const s = slides[i];
                if (s.type === "image") {
                  if (s.file) {
                    const { storage_path, image_url } = await uploadSingleImageForLesson(
                      s.file,
                      curriculumId,
                      moduleId,
                      lessonId
                    );
                    contentSlides.push({
                      order: i,
                      type: "image",
                      image_url,
                      storage_path,
                      alt_text: s.file.name,
                    });
                  } else if (s.existingImageUrl) {
                    contentSlides.push({
                      order: i,
                      type: "image",
                      image_url: s.existingImageUrl,
                      storage_path: s.existingStoragePath ?? "",
                      alt_text: "Slide",
                    });
                  }
                } else {
                  contentSlides.push({
                    order: i,
                    type: "video",
                    video_provider: "youtube",
                    video_id: s.videoId,
                    video_url: s.videoUrl,
                    caption: s.caption,
                    background_color: "#000000",
                  });
                }
              }
              await setLessonContentSlides(
                curriculumId,
                moduleId,
                chapterId,
                lessonId,
                contentSlides
              );
              accumulatedModules[moduleIndex].lessons[lessonIndex].imageUploadStatus = "success";
            } catch (imgErr) {
              console.error("Error saving lesson content:", imgErr);
              accumulatedModules[moduleIndex].lessons[lessonIndex].imageUploadStatus = "error";
              setModules(accumulatedModules);
              throw imgErr;
            }
          }

          moduleLessons.push({
            title: lessonData.title || `Lesson ${lessonIndex + 1}`,
            order: lessonIndex + 1,
          });
        }

        setModules(accumulatedModules);

        const moduleObj: any = {
          title: moduleData.title || `Module ${moduleIndex + 1}`,
          order: moduleIndex + 1,
          price: parseFloat(moduleData.price || "0"),
          durationMonths: parseFloat(moduleData.durationMonths || "0"),
          skills: moduleData.skills ?? [],
          completionBadgeIds: moduleData.completionBadgeIds ?? [],
          lessons: moduleLessons,
        };
        
        // Only add description if it has a value
        if (moduleData.description && moduleData.description.trim()) {
          moduleObj.description = moduleData.description.trim();
        }
        
        courseModules.push(moduleObj);

        mapping.modules.push({
          moduleId,
          chapters: [{
            chapterId,
            lessons: moduleLessons.map((l, i) => ({
              lessonId: accumulatedModules[moduleIndex].lessons[i]?.lessonId || "",
              title: l.title || `Lesson ${i + 1}`,
            })),
          }],
        });
      }

      // Create course document - filter out undefined values
      const courseData: any = {
        title: courseTitle || "Untitled Course",
        currency: "USD",
        modules: courseModules,
        createdBy: user.uid,
        status: createdCourseId ? undefined : "draft",
        curriculumMapping: mapping,
      };

      // Only add description if it has a value
      if (courseDescription && courseDescription.trim()) {
        courseData.description = courseDescription.trim();
      }

      // Only add assignment fields if they have values
      if (assignmentType === "role" && selectedRoles.length > 0) {
        courseData.assignedRoles = selectedRoles;
      } else if (assignmentType === "user" && assignedUsers.length > 0) {
        courseData.assignedUserIds = assignedUsers.map((u) => u.userId);
      }

      // Remove any undefined values before saving
      const cleanCourseData = Object.fromEntries(
        Object.entries(courseData).filter(([_, value]) => value !== undefined)
      );

      if (createdCourseId) {
        console.log("[SAVE] Updating existing course:", createdCourseId);
        await updateCourse(createdCourseId, cleanCourseData as Partial<Course>);
        const courseIdToUse = createdCourseId;
        for (const mod of accumulatedModules) {
          for (const lesson of mod.lessons) {
            if (!lesson.lessonId) continue;
            const quizEnabled = lesson.quizEnabled ?? false;
            const questions = lesson.quizQuestions ?? [];
            const validQuestions: QuizQuestion[] = quizEnabled
              ? questions
                  .filter(
                    (q) =>
                      (q.question?.trim() ?? "") !== "" &&
                      [q.optionA, q.optionB, q.optionC, q.optionD].every(
                        (o) => (o?.trim() ?? "") !== ""
                      )
                  )
                  .map((q, i) => ({
                    order: i,
                    question: q.question.trim(),
                    optionA: q.optionA.trim(),
                    optionB: q.optionB.trim(),
                    optionC: q.optionC.trim(),
                    optionD: q.optionD.trim(),
                    correctAnswer: q.correctAnswer,
                  }))
              : [];
            await setCourseLessonQuiz(courseIdToUse, lesson.lessonId, {
              enabled: quizEnabled && validQuestions.length > 0,
              maxAttempts: Math.max(1, lesson.quizMaxAttempts ?? 3),
              passPercentage: Math.min(100, Math.max(0, lesson.quizPassPercentage ?? 70)),
              questions: validQuestions,
            });
            const surveyEnabled = lesson.surveyEnabled ?? false;
            const surveyQuestions = (lesson.surveyQuestions ?? []).filter((q) => (q.question?.trim() ?? "") !== "").map((q, i) => ({ order: i, question: q.question.trim() }));
            const generatePdfOnComplete = lesson.generatePdfOnComplete ?? false;
            const dataroomFolderId = lesson.dataroomFolderId;
            if (generatePdfOnComplete && !dataroomFolderId) {
              alert("Select a Data Room folder for this lesson's survey PDF export.");
              return null;
            }
            await setCourseLessonSurvey(courseIdToUse, lesson.lessonId, {
              enabled: surveyEnabled && surveyQuestions.length > 0,
              title: (lesson.surveyTitle ?? "").trim() || "Survey",
              questions: surveyQuestions,
              generatePdfOnComplete,
              dataroomFolderId: dataroomFolderId || undefined,
            });
          }
        }
        alert("Course updated!");
        trackEvent(WEB_ANALYTICS_EVENTS.ADMIN_COURSE_BUILDER_SAVE_CLICKED, {
          course_id: createdCourseId,
          is_update: true,
        });
        return createdCourseId;
      } else {
        console.log("[SAVE] Creating new course with data:", cleanCourseData);
        const courseId = await createCourse(cleanCourseData as Omit<Course, "id" | "createdAt" | "updatedAt">);
        console.log("[SAVE] Course created with ID:", courseId);
        setCreatedCourseId(courseId);
        for (const mod of accumulatedModules) {
          for (const lesson of mod.lessons) {
            if (!lesson.lessonId) continue;
            const quizEnabled = lesson.quizEnabled ?? false;
            const questions = lesson.quizQuestions ?? [];
            const validQuestions: QuizQuestion[] = quizEnabled
              ? questions
                  .filter(
                    (q) =>
                      (q.question?.trim() ?? "") !== "" &&
                      [q.optionA, q.optionB, q.optionC, q.optionD].every(
                        (o) => (o?.trim() ?? "") !== ""
                      )
                  )
                  .map((q, i) => ({
                    order: i,
                    question: q.question.trim(),
                    optionA: q.optionA.trim(),
                    optionB: q.optionB.trim(),
                    optionC: q.optionC.trim(),
                    optionD: q.optionD.trim(),
                    correctAnswer: q.correctAnswer,
                  }))
              : [];
            await setCourseLessonQuiz(courseId, lesson.lessonId, {
              enabled: quizEnabled && validQuestions.length > 0,
              maxAttempts: Math.max(1, lesson.quizMaxAttempts ?? 3),
              passPercentage: Math.min(100, Math.max(0, lesson.quizPassPercentage ?? 70)),
              questions: validQuestions,
            });
            const surveyEnabled = lesson.surveyEnabled ?? false;
            const surveyQuestions = (lesson.surveyQuestions ?? []).filter((q) => (q.question?.trim() ?? "") !== "").map((q, i) => ({ order: i, question: q.question.trim() }));
            const generatePdfOnComplete = lesson.generatePdfOnComplete ?? false;
            const dataroomFolderId = lesson.dataroomFolderId;
            if (generatePdfOnComplete && !dataroomFolderId) {
              alert("Select a Data Room folder for this lesson's survey PDF export.");
              return null;
            }
            await setCourseLessonSurvey(courseId, lesson.lessonId, {
              enabled: surveyEnabled && surveyQuestions.length > 0,
              title: (lesson.surveyTitle ?? "").trim() || "Survey",
              questions: surveyQuestions,
              generatePdfOnComplete,
              dataroomFolderId: dataroomFolderId || undefined,
            });
          }
        }
        alert("Course saved as draft!");
        trackEvent(WEB_ANALYTICS_EVENTS.ADMIN_COURSE_BUILDER_SAVE_CLICKED, {
          course_id: courseId,
          is_update: false,
        });
        return courseId;
      }
    } catch (error) {
      console.error("Error saving course:", error);
      alert("Failed to save course. Please try again.");
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublishCourse = async () => {
    console.log("[PUBLISH] Starting publish process...");

    // Always save first, then publish (save returns the course id to use)
    const courseIdToPublish = await handleSaveCourse();
    if (!courseIdToPublish) {
      alert("Failed to save course. Cannot publish.");
      return;
    }

    if (!curriculumId) {
      alert("No curriculum ID available. Please save the course first.");
      return;
    }

    setIsPublishing(true);
    try {
      console.log("[PUBLISH] Publishing lessons for course:", courseIdToPublish);
      let publishedCount = 0;
      let skippedCount = 0;

      for (const module of modules) {
        if (!module.id) {
          skippedCount++;
          continue;
        }

        const chapters = await getChapters(curriculumId, module.id);
        const chapterId = chapters.length > 0 ? chapters[0].id || "" : "";
        if (!chapterId) {
          skippedCount++;
          continue;
        }

        for (const lesson of module.lessons) {
          if (lesson.lessonId) {
            try {
              await publishLesson(curriculumId, module.id, chapterId, lesson.lessonId);
              publishedCount++;
            } catch (lessonError) {
              console.error("[PUBLISH] Error publishing lesson:", lessonError);
            }
          } else {
            skippedCount++;
          }
        }
      }

      await updateCourse(courseIdToPublish, { status: "published" });

      trackEvent(WEB_ANALYTICS_EVENTS.ADMIN_LESSON_DECK_PUBLISH_CLICKED, {
        course_id: courseIdToPublish,
        lessons_published: publishedCount,
        lessons_skipped: skippedCount,
      });
      alert(`Course published successfully! Published ${publishedCount} lessons.`);
      navigate("/admin");
    } catch (error) {
      console.error("[PUBLISH] Error publishing course:", error);
      alert(`Failed to publish course: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePreviewLesson = async (moduleIndex: number, lessonIndex: number) => {
    const lesson = modules[moduleIndex].lessons[lessonIndex];
    const module = modules[moduleIndex];
    const slides = lesson.slides ?? [];

    if (slides.length === 0 && !lesson.lessonId) {
      alert("Add at least one slide (image or video) to this lesson, then try preview.");
      return;
    }

    setPreviewLessonId(lesson.lessonId || null);
    setPreviewModuleId(module.id || null);
    setPreviewLessonSlides(slides.length > 0 ? slides : null);
    setPreviewLessonTitle(lesson.title || `Lesson ${lessonIndex + 1}`);
    setIsPreviewOpen(true);
  };

  const handleValidateEmail = async () => {
    const email = userEmailInput.trim();
    if (!email) {
      setUserEmailError("Please enter an email address");
      return;
    }
    if (assignedUsers.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      setUserEmailError("This user is already in the list");
      return;
    }

    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setUserEmailError("User with this email does not exist");
        return;
      }

      const userDoc = querySnapshot.docs[0];
      setAssignedUsers((prev) => [...prev, { email, userId: userDoc.id }]);
      setUserEmailInput("");
      setUserEmailError(null);
    } catch (error: any) {
      setUserEmailError(error.message || "User does not exist");
    }
  };

  const removeAssignedUser = (userId: string) => {
    setAssignedUsers((prev) => prev.filter((u) => u.userId !== userId));
  };

  const handleCreateModuleBadge = async (moduleIndex: number) => {
    if (!user) return;
    const name = (newBadgeNamesByModule[moduleIndex] ?? "").trim();
    const description = (newBadgeDescriptionsByModule[moduleIndex] ?? "").trim();
    const imageUrlInput = (newBadgeImageUrlsByModule[moduleIndex] ?? "").trim();
    const imageFile = newBadgeImageFilesByModule[moduleIndex] ?? null;
    if (!name) {
      alert("Enter a badge name first.");
      return;
    }

    const baseId = slugifyBadgeId(name);
    if (!baseId) {
      alert("Badge name must include letters or numbers.");
      return;
    }

    setCreatingBadgeByModule((prev) => ({ ...prev, [moduleIndex]: true }));
    try {
      let badgeId = baseId;
      let suffix = 2;
      while (true) {
        const snap = await getDoc(doc(db, "badge_definitions", badgeId));
        if (!snap.exists()) break;
        badgeId = `${baseId}_${suffix}`;
        suffix += 1;
      }

      let imageUrl = imageUrlInput || "";
      if (imageFile) {
        if (!imageFile.type.startsWith("image/")) {
          alert("Please upload a valid image file for the badge.");
          return;
        }
        const safe = imageFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const storagePath = `badge_bank/${Date.now()}_${safe}`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, imageFile, {
          contentType: imageFile.type || "image/jpeg",
        });
        imageUrl = await getDownloadURL(storageRef);
      }

      await setDoc(
        doc(db, "badge_definitions", badgeId),
        {
          name,
          description: description || "",
          platform: "digital_curriculum",
          active: true,
          award_mode: "one_time",
          tier: "module_completion",
          updated_at: serverTimestamp(),
          created_at: serverTimestamp(),
          created_by_uid: user.uid,
          image_url: imageUrl || undefined,
        },
        { merge: true }
      );
      setModules((prev) => {
        const updated = [...prev];
        const current = updated[moduleIndex].completionBadgeIds ?? [];
        if (!current.includes(badgeId)) {
          updated[moduleIndex].completionBadgeIds = [...current, badgeId];
        }
        return updated;
      });
      setNewBadgeNamesByModule((prev) => ({ ...prev, [moduleIndex]: "" }));
      setNewBadgeDescriptionsByModule((prev) => ({ ...prev, [moduleIndex]: "" }));
      setNewBadgeImageUrlsByModule((prev) => ({ ...prev, [moduleIndex]: "" }));
      setNewBadgeImageFilesByModule((prev) => ({ ...prev, [moduleIndex]: null }));
    } catch (e) {
      console.error("Failed to create module badge:", e);
      alert("Could not create badge. Please try again.");
    } finally {
      setCreatingBadgeByModule((prev) => ({ ...prev, [moduleIndex]: false }));
    }
  };

  const handleDeleteCourse = async () => {
    if (!editingCourseId) return;
    setIsDeleting(true);
    try {
      await deleteCourse(editingCourseId);
      setDeleteConfirmOpen(false);
      navigate("/admin");
    } catch (err) {
      console.error("Error deleting course:", err);
      alert("Failed to delete course.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoadingEdit) {
    return (
      <div className="p-6 max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-accent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading course...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">
          {editingCourseId ? "Edit course" : "Course Builder"}
        </h1>
        <p className="text-muted-foreground">
          {editingCourseId
            ? "Update course info, content, quizzes, assignments, and publish changes."
            : "Create your course by adding metadata, modules, and uploading lesson content"}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="metadata">Course Info</TabsTrigger>
          <TabsTrigger value="modules">Modules & Lessons</TabsTrigger>
          <TabsTrigger value="assignment">Assignment</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        {/* Course Metadata Tab */}
        <TabsContent value="metadata" className="space-y-6">
          <Card className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>Course Title *</Label>
              <Input
                placeholder="e.g., Introduction to Business"
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe what students will learn..."
                value={courseDescription}
                onChange={(e) => setCourseDescription(e.target.value)}
                rows={4}
              />
            </div>
          </Card>
        </TabsContent>

        {/* Modules & Lessons Tab */}
        <TabsContent value="modules" className="space-y-6">
          <Card className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>Number of Modules *</Label>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSetModuleCount(moduleCount - 1)}
                  disabled={moduleCount <= 1}
                >
                  <X className="w-4 h-4" />
                </Button>
                <Input
                  type="number"
                  min="1"
                  value={moduleCount}
                  onChange={(e) =>
                    handleSetModuleCount(parseInt(e.target.value) || 1)
                  }
                  className="w-24 text-center"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSetModuleCount(moduleCount + 1)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>

          <div className="space-y-6">
            {modules.map((module, moduleIndex) => (
              <Card key={moduleIndex} className="p-6 space-y-4">
                <h3 className="text-lg font-semibold">Module {moduleIndex + 1}</h3>

                <div className="space-y-2">
                  <Label>Module Title *</Label>
                  <Input
                    placeholder="e.g., Business Fundamentals"
                    value={module.title}
                    onChange={(e) => {
                      const updated = [...modules];
                      updated[moduleIndex].title = e.target.value;
                      setModules(updated);
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="What will students learn in this module?"
                    value={module.description}
                    onChange={(e) => {
                      const updated = [...modules];
                      updated[moduleIndex].description = e.target.value;
                      setModules(updated);
                    }}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Price ($) *</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={module.price}
                      onChange={(e) => {
                        const updated = [...modules];
                        updated[moduleIndex].price = e.target.value;
                        setModules(updated);
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Duration (months) *</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="0"
                      value={module.durationMonths}
                      onChange={(e) => {
                        const updated = [...modules];
                        updated[moduleIndex].durationMonths = e.target.value;
                        setModules(updated);
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedSkillsModuleIndex(
                        expandedSkillsModuleIndex === moduleIndex ? null : moduleIndex
                      )
                    }
                    className="flex items-center justify-between w-full text-left rounded border border-border px-3 py-2 hover:bg-muted/50"
                  >
                    <Label className="cursor-pointer font-normal">
                      Skills (optional)
                    </Label>
                    <span className="text-sm text-muted-foreground">
                      {(module.skills?.length ?? 0) > 0
                        ? `${module.skills!.length} selected`
                        : "None required"}
                    </span>
                  </button>
                  {expandedSkillsModuleIndex === moduleIndex && (
                    <div className="rounded border border-border bg-muted/20 p-4 space-y-3 max-h-64 overflow-y-auto">
                      <p className="text-xs text-muted-foreground">
                        Select skills this module helps develop. None required.
                      </p>
                      {Object.entries(SKILL_CATEGORIES).map(([category]) => {
                        const categorySkills = ALL_SKILLS.filter((s) => s.category === category);
                        const selected = module.skills ?? [];
                        return (
                          <div key={category}>
                            <p className="text-sm font-medium text-foreground mb-1">{category}</p>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 pl-2">
                              {categorySkills.map(({ skill }) => (
                                <div key={skill} className="flex items-center gap-2">
                                  <Checkbox
                                    id={`module-${moduleIndex}-skill-${skill.replace(/\s+/g, "-")}`}
                                    checked={selected.includes(skill)}
                                    onCheckedChange={() => {
                                      const updated = [...modules];
                                      const current = updated[moduleIndex].skills ?? [];
                                      updated[moduleIndex].skills = current.includes(skill)
                                        ? current.filter((s) => s !== skill)
                                        : [...current, skill];
                                      setModules(updated);
                                    }}
                                  />
                                  <label
                                    htmlFor={`module-${moduleIndex}-skill-${skill.replace(/\s+/g, "-")}`}
                                    className="text-sm cursor-pointer"
                                  >
                                    {skill}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Module completion badges (optional)</Label>
                  <p className="text-xs text-muted-foreground">
                    Create badges only for this module. These badges are only awarded when this module is completed.
                  </p>
                  <div className="rounded border border-border bg-muted/10 p-3 space-y-2">
                    <Label className="text-xs text-muted-foreground">Create new badge for this module</Label>
                    <Input
                      placeholder="Badge name (required)"
                      value={newBadgeNamesByModule[moduleIndex] ?? ""}
                      onChange={(e) =>
                        setNewBadgeNamesByModule((prev) => ({ ...prev, [moduleIndex]: e.target.value }))
                      }
                    />
                    <Input
                      placeholder="Badge description (optional)"
                      value={newBadgeDescriptionsByModule[moduleIndex] ?? ""}
                      onChange={(e) =>
                        setNewBadgeDescriptionsByModule((prev) => ({ ...prev, [moduleIndex]: e.target.value }))
                      }
                    />
                    <Input
                      placeholder="Badge image URL (optional)"
                      value={newBadgeImageUrlsByModule[moduleIndex] ?? ""}
                      onChange={(e) =>
                        setNewBadgeImageUrlsByModule((prev) => ({ ...prev, [moduleIndex]: e.target.value }))
                      }
                    />
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setNewBadgeImageFilesByModule((prev) => ({
                          ...prev,
                          [moduleIndex]: e.target.files?.[0] ?? null,
                        }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional image: upload a file or paste a URL (upload takes priority if both are provided).
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleCreateModuleBadge(moduleIndex)}
                      disabled={creatingBadgeByModule[moduleIndex] === true}
                    >
                      {creatingBadgeByModule[moduleIndex] ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create and attach badge"
                      )}
                    </Button>
                  </div>
                  <div className="rounded border border-border bg-muted/20 p-3 space-y-2">
                    <Label className="text-xs text-muted-foreground">Badges attached to this module</Label>
                    {(module.completionBadgeIds ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground">No badges attached yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {(module.completionBadgeIds ?? []).map((badgeId) => (
                          <Badge key={badgeId} variant="outline" className="flex items-center gap-1">
                            {badgeId}
                            <button
                              type="button"
                              className="ml-1"
                              onClick={() => {
                                const updated = [...modules];
                                updated[moduleIndex].completionBadgeIds = (updated[moduleIndex].completionBadgeIds ?? []).filter(
                                  (id) => id !== badgeId
                                );
                                setModules(updated);
                              }}
                              aria-label={`Remove ${badgeId}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Lessons</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleSetLessonCount(moduleIndex, module.lessonCount - 1)
                        }
                        disabled={module.lessonCount <= 1}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                      <Input
                        type="number"
                        min="1"
                        value={module.lessonCount}
                        onChange={(e) =>
                          handleSetLessonCount(
                            moduleIndex,
                            parseInt(e.target.value) || 1
                          )
                        }
                        className="w-20 text-center"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleSetLessonCount(moduleIndex, module.lessonCount + 1)
                        }
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {module.lessons.map((lesson, lessonIndex) => (
                      <Card key={lessonIndex} className="p-4 border-border">
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label>Lesson {lessonIndex + 1} Title *</Label>
                            <Input
                              placeholder={`e.g., Introduction to ${module.title || "Module"}`}
                              value={lesson.title}
                              onChange={(e) => {
                                const updated = [...modules];
                                updated[moduleIndex].lessons[lessonIndex].title =
                                  e.target.value;
                                setModules(updated);
                              }}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                              <ImageIcon className="w-4 h-4 text-accent" />
                              Slides
                            </Label>
                            <p className="text-xs text-muted-foreground mb-2">
                              Add slides in order. Choose Image (upload) or Video (YouTube link). Reorder in the Preview tab.
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                              <Input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(e) =>
                                  handleImageSelect(moduleIndex, lessonIndex, e)
                                }
                                disabled={lesson.imageUploadStatus === "uploading"}
                                className="max-w-xs"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const url = window.prompt("Paste YouTube link (youtube.com/watch?v=... or youtu.be/...)");
                                  if (!url) return;
                                  const caption = window.prompt("Optional caption for this video:");
                                  handleAddSlideVideo(moduleIndex, lessonIndex, url, caption ?? "");
                                }}
                                disabled={lesson.imageUploadStatus === "uploading"}
                              >
                                <Video className="w-4 h-4 mr-1" />
                                Add video
                              </Button>
                            </div>
                            {(lesson.slides?.length ?? 0) > 0 && (
                              <ul className="space-y-1 mt-2">
                                {lesson.slides!.map((slide, slideIdx) => (
                                  <li
                                    key={slideIdx}
                                    className="flex items-center gap-2 text-sm p-2 rounded border border-border bg-muted/30"
                                  >
                                    <Badge variant="outline" className="text-xs">
                                      {slide.type === "image"
                                        ? "Image"
                                        : "Video"}
                                    </Badge>
                                    {slide.type === "image" && (
                                      <span className="truncate flex-1">
                                        {slide.file?.name ?? "Image"}
                                      </span>
                                    )}
                                    {slide.type === "video" && (
                                      <span className="truncate flex-1">
                                        {slide.videoId ?? slide.videoUrl}
                                      </span>
                                    )}
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={() =>
                                        handleRemoveSlide(moduleIndex, lessonIndex, slideIdx)
                                      }
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          {lesson.imageUploadStatus === "uploading" && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Uploading...</span>
                            </div>
                          )}

                          {/* Quiz at end of lesson */}
                          <div className="space-y-3 pt-2 border-t border-border">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`quiz-${moduleIndex}-${lessonIndex}`}
                                checked={lesson.quizEnabled ?? false}
                                onChange={(e) =>
                                  setQuizEnabled(moduleIndex, lessonIndex, e.target.checked)
                                }
                                className="rounded border-border"
                              />
                              <Label
                                htmlFor={`quiz-${moduleIndex}-${lessonIndex}`}
                                className="flex items-center gap-1.5 cursor-pointer"
                              >
                                <ClipboardList className="w-4 h-4 text-accent" />
                                Quiz at end of lesson (must pass to complete)
                              </Label>
                            </div>
                            {lesson.quizEnabled && (
                              <>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <Label className="text-xs">Max attempts</Label>
                                    <Input
                                      type="number"
                                      min={1}
                                      value={lesson.quizMaxAttempts ?? 3}
                                      onChange={(e) => {
                                        const updated = [...modules];
                                        updated[moduleIndex].lessons[lessonIndex].quizMaxAttempts =
                                          parseInt(e.target.value, 10) || 1;
                                        setModules(updated);
                                      }}
                                      className="h-8"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">Pass % (0–100)</Label>
                                    <Input
                                      type="number"
                                      min={0}
                                      max={100}
                                      value={lesson.quizPassPercentage ?? 70}
                                      onChange={(e) => {
                                        const updated = [...modules];
                                        updated[moduleIndex].lessons[lessonIndex].quizPassPercentage =
                                          parseInt(e.target.value, 10) || 0;
                                        setModules(updated);
                                      }}
                                      className="h-8"
                                    />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs">Questions (multiple choice A–D)</Label>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addQuizQuestion(moduleIndex, lessonIndex)}
                                  >
                                    <Plus className="w-3 h-3 mr-1" />
                                    Add question
                                  </Button>
                                  {(lesson.quizQuestions?.length ?? 0) > 0 && (
                                    <ul className="space-y-3">
                                      {lesson.quizQuestions!.map((q, qIdx) => (
                                        <li
                                          key={qIdx}
                                          className="p-3 rounded border border-border bg-muted/20 space-y-2"
                                        >
                                          <div className="flex justify-between items-start gap-2">
                                            <span className="text-xs font-medium text-muted-foreground">
                                              Q{qIdx + 1}
                                            </span>
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 w-6 p-0"
                                              onClick={() =>
                                                removeQuizQuestion(moduleIndex, lessonIndex, qIdx)
                                              }
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </Button>
                                          </div>
                                          <Input
                                            placeholder="Question text"
                                            value={q.question}
                                            onChange={(e) =>
                                              updateQuizQuestion(
                                                moduleIndex,
                                                lessonIndex,
                                                qIdx,
                                                "question",
                                                e.target.value
                                              )
                                            }
                                            className="text-sm"
                                          />
                                          <div className="grid grid-cols-2 gap-2">
                                            {(["A", "B", "C", "D"] as const).map((opt) => (
                                              <div key={opt} className="flex items-center gap-1">
                                                <span className="text-xs w-5">{opt}.</span>
                                                <Input
                                                  placeholder={`Option ${opt}`}
                                                  value={
                                                    q[`option${opt}` as keyof DraftQuizQuestion] as string
                                                  }
                                                  onChange={(e) =>
                                                    updateQuizQuestion(
                                                      moduleIndex,
                                                      lessonIndex,
                                                      qIdx,
                                                      `option${opt}` as keyof DraftQuizQuestion,
                                                      e.target.value
                                                    )
                                                  }
                                                  className="text-sm h-8"
                                                />
                                              </div>
                                            ))}
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <Label className="text-xs">Correct:</Label>
                                            <select
                                              value={q.correctAnswer}
                                              onChange={(e) =>
                                                updateQuizQuestion(
                                                  moduleIndex,
                                                  lessonIndex,
                                                  qIdx,
                                                  "correctAnswer",
                                                  e.target.value as "A" | "B" | "C" | "D"
                                                )
                                              }
                                              className="text-sm border border-border rounded px-2 py-1 bg-background"
                                            >
                                              <option value="A">A</option>
                                              <option value="B">B</option>
                                              <option value="C">C</option>
                                              <option value="D">D</option>
                                            </select>
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              </>
                            )}
                          </div>

                          {/* Survey at end of lesson (open-ended) */}
                          <div className="space-y-3 pt-2 border-t border-border">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`survey-${moduleIndex}-${lessonIndex}`}
                                checked={lesson.surveyEnabled ?? false}
                                onChange={(e) =>
                                  setSurveyEnabled(moduleIndex, lessonIndex, e.target.checked)
                                }
                                className="rounded border-border"
                              />
                              <Label
                                htmlFor={`survey-${moduleIndex}-${lessonIndex}`}
                                className="cursor-pointer"
                              >
                                Survey at end of lesson (open-ended; submit to complete)
                              </Label>
                            </div>
                            {lesson.surveyEnabled && (
                              <>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    id={`survey-pdf-${moduleIndex}-${lessonIndex}`}
                                    checked={lesson.generatePdfOnComplete ?? false}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      const updated = [...modules];
                                      updated[moduleIndex].lessons[lessonIndex].generatePdfOnComplete = checked;
                                      if (!checked) {
                                        updated[moduleIndex].lessons[lessonIndex].dataroomFolderId = undefined;
                                      }
                                      setModules(updated);
                                    }}
                                    className="rounded border-border"
                                  />
                                  <Label htmlFor={`survey-pdf-${moduleIndex}-${lessonIndex}`} className="cursor-pointer text-xs">
                                    Generate PDF of answers when user completes (upload to Data Room)
                                  </Label>
                                </div>
                                {lesson.generatePdfOnComplete && (
                                  <div className="space-y-1">
                                    <Label className="text-xs">Data Room folder for this PDF (required)</Label>
                                    <select
                                      value={lesson.dataroomFolderId ?? ""}
                                      onChange={(e) => {
                                        const updated = [...modules];
                                        updated[moduleIndex].lessons[lessonIndex].dataroomFolderId = e.target.value;
                                        setModules(updated);
                                      }}
                                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                                    >
                                      <option value="" disabled>
                                        Select a folder
                                      </option>
                                      {DATAROOM_FOLDER_OPTIONS.map((f) => (
                                        <option key={f.id} value={f.id}>
                                          {f.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                                <div className="space-y-1">
                                  <Label className="text-xs">Survey name (shown to learners)</Label>
                                  <Input
                                    placeholder="e.g. Module 1 Reflection"
                                    value={lesson.surveyTitle ?? ""}
                                    onChange={(e) => {
                                      const updated = [...modules];
                                      updated[moduleIndex].lessons[lessonIndex].surveyTitle = e.target.value;
                                      setModules(updated);
                                    }}
                                    className="text-sm"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs">Survey questions (open-ended)</Label>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addSurveyQuestion(moduleIndex, lessonIndex)}
                                  >
                                    <Plus className="w-3 h-3 mr-1" />
                                    Add question
                                  </Button>
                                  {(lesson.surveyQuestions?.length ?? 0) > 0 && (
                                    <ul className="space-y-2">
                                      {lesson.surveyQuestions!.map((q, qIdx) => (
                                        <li key={qIdx} className="flex items-center gap-2 p-2 rounded border border-border bg-muted/20">
                                          <span className="text-xs font-medium text-muted-foreground shrink-0">Q{qIdx + 1}</span>
                                          <Input
                                            placeholder="Question text"
                                            value={q.question}
                                            onChange={(e) => updateSurveyQuestion(moduleIndex, lessonIndex, qIdx, e.target.value)}
                                            className="text-sm flex-1"
                                          />
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 shrink-0"
                                            onClick={() => removeSurveyQuestion(moduleIndex, lessonIndex, qIdx)}
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </Button>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              </>
                            )}
                          </div>

                          {(lesson.slides?.length ?? 0) > 0 && lesson.imageUploadStatus === "idle" && (
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {lesson.slides!.length} slide(s) — Save course to upload
                              </Badge>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePreviewLesson(moduleIndex, lessonIndex)}
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  Preview
                                </Button>
                                <span className="text-xs text-muted-foreground">Save the course to preview.</span>
                              </div>
                            </div>
                          )}

                          {lesson.imageUploadStatus === "success" && lesson.lessonId && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Ready to preview
                              </Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handlePreviewLesson(moduleIndex, lessonIndex)
                                }
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                Preview
                              </Button>
                              <span className="text-xs text-muted-foreground">Save the course to preview.</span>
                            </div>
                          )}

                          {lesson.imageUploadStatus === "error" && (
                            <Badge variant="destructive">
                              <XCircle className="w-3 h-3 mr-1" />
                              Upload failed
                            </Badge>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Assignment Tab */}
        <TabsContent value="assignment" className="space-y-6">
          <Card className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>Assign To</Label>
              <select
                value={assignmentType}
                onChange={(e) => {
                  setAssignmentType(e.target.value as "role" | "user");
                  setSelectedRoles([]);
                  setUserEmailInput("");
                  setUserEmailError(null);
                  setAssignedUsers([]);
                }}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              >
                <option value="role">Role</option>
                <option value="user">Specific User</option>
              </select>
            </div>

            {assignmentType === "role" ? (
              <div className="space-y-2">
                <Label>Select Roles</Label>
                <div className="space-y-2">
                  {[
                    "Digital Curriculum Students",
                    "Digital Curriculum Alumni",
                    "superAdmin",
                  ].map((role) => (
                    <div key={role} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`role-${role}`}
                        checked={selectedRoles.includes(role)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRoles([...selectedRoles, role]);
                          } else {
                            setSelectedRoles(selectedRoles.filter((r) => r !== role));
                          }
                        }}
                        className="rounded border-border"
                      />
                      <Label htmlFor={`role-${role}`} className="text-sm cursor-pointer">
                        {role}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>User emails (add one or more) *</Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="user@example.com"
                    value={userEmailInput}
                    onChange={(e) => {
                      setUserEmailInput(e.target.value);
                      setUserEmailError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleValidateEmail();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={handleValidateEmail}
                    disabled={!userEmailInput.trim()}
                  >
                    Add
                  </Button>
                </div>
                {userEmailError && (
                  <p className="text-sm text-destructive">{userEmailError}</p>
                )}
                {assignedUsers.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Assigned users ({assignedUsers.length}):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {assignedUsers.map((u) => (
                        <Badge
                          key={u.userId}
                          variant="secondary"
                          className="flex items-center gap-1 pr-1"
                        >
                          {u.email}
                          <button
                            type="button"
                            onClick={() => removeAssignedUser(u.userId)}
                            className="ml-1 rounded hover:bg-muted-foreground/20 p-0.5"
                            aria-label={`Remove ${u.email}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-1">Course Preview</h3>
            <p className="text-sm text-muted-foreground mb-4">Save the course to preview.</p>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Course: {courseTitle || "Untitled"}</h4>
                {courseDescription && (
                  <p className="text-sm text-muted-foreground">{courseDescription}</p>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                {modules.map((module, index) => (
                  <div key={index} className="p-3 bg-muted/50 rounded">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">
                        Module {index + 1}: {module.title || "Untitled"}
                      </span>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span>${parseFloat(module.price || "0").toFixed(2)}</span>
                        <span>•</span>
                        <span>{module.durationMonths} months</span>
                        <span>•</span>
                        <span>{module.lessons.length} lessons</span>
                      </div>
                    </div>
                    {module.description && (
                      <p className="text-xs text-muted-foreground mb-2">
                        {module.description}
                      </p>
                    )}
                    <div className="space-y-2">
                      {module.lessons.map((lesson, lessonIndex) => (
                        <div
                          key={lessonIndex}
                          className="p-3 rounded border border-border space-y-2"
                        >
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="font-medium text-sm">
                              {lesson.title || `Lesson ${lessonIndex + 1}`}
                            </span>
                            {(lesson.slides?.length ?? 0) > 0 && (
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePreviewLesson(index, lessonIndex)}
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  Preview
                                </Button>
                                <span className="text-xs text-muted-foreground">Save the course to preview.</span>
                              </div>
                            )}
                          </div>
                          {(lesson.slides?.length ?? 0) > 0 ? (
                            <p className="text-xs text-muted-foreground mb-1">
                              Drag order: use arrows to reorder slides before preview.
                            </p>
                          ) : null}
                          <ul className="space-y-1">
                            {lesson.slides?.map((slide, slideIdx) => (
                              <li
                                key={slideIdx}
                                className="flex items-center gap-2 text-sm p-2 rounded bg-muted/50 border border-border"
                              >
                                <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <Badge variant="outline" className="text-xs flex-shrink-0">
                                  {slide.type === "image" ? "Image" : "Video"}
                                </Badge>
                                <span className="truncate flex-1">
                                  {slide.type === "image"
                                    ? slide.file?.name ?? "Image"
                                    : slide.videoId ?? slide.videoUrl ?? "Video"}
                                </span>
                                <div className="flex items-center gap-0">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() =>
                                      handleMoveSlide(index, lessonIndex, slideIdx, -1)
                                    }
                                    disabled={slideIdx === 0}
                                  >
                                    <ChevronLeft className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() =>
                                      handleMoveSlide(index, lessonIndex, slideIdx, 1)
                                    }
                                    disabled={slideIdx === (lesson.slides?.length ?? 0) - 1}
                                  >
                                    <ChevronRight className="w-3 h-3" />
                                  </Button>
                                </div>
                              </li>
                            ))}
                          </ul>
                          {(!lesson.slides?.length) && (
                            <p className="text-xs text-muted-foreground">
                              No slides. Add slides in Modules & Lessons tab.
                            </p>
                          )}
                          {lesson.imageUploadStatus === "uploading" && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Uploading...
                            </div>
                          )}
                          {lesson.imageUploadStatus === "success" && lesson.lessonId && (
                            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Saved
                            </Badge>
                          )}
                          {lesson.imageUploadStatus === "error" && (
                            <Badge variant="destructive" className="text-xs">
                              <XCircle className="w-3 h-3 mr-1" />
                              Upload Failed
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate("/admin")} variant="ghost">
            Cancel
          </Button>
          {editingCourseId && (
            <Button
              type="button"
              variant="outline"
              className="text-destructive border-destructive hover:bg-destructive/10"
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={isSaving || isPublishing}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete course
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleSaveCourse}
            disabled={!courseTitle.trim() || isSaving || isPublishing}
            variant="outline"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </>
            )}
          </Button>

          <Button
            onClick={handlePublishCourse}
            disabled={!courseTitle.trim() || isSaving || isPublishing}
            className="bg-accent hover:bg-accent/90"
          >
            {isPublishing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Publish Course
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lesson Preview</DialogTitle>
          </DialogHeader>
          {(curriculumId && previewModuleId && (previewLessonId || (previewLessonSlides?.length ?? 0) > 0)) && (
            <LessonPreview
              curriculumId={curriculumId}
              lessonId={previewLessonId}
              moduleId={previewModuleId}
              lessonTitle={previewLessonTitle}
              localSlides={previewLessonSlides ?? undefined}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete course confirmation */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete course?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            This will permanently delete the course. Progress and assignments will be lost. This cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteCourse}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LessonPreview({
  curriculumId,
  lessonId,
  moduleId,
  lessonTitle,
  localSlides,
}: {
  curriculumId: string;
  lessonId: string | null;
  moduleId: string;
  lessonTitle: string;
  localSlides?: DraftSlide[] | null;
}) {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [lessonImages, setLessonImages] = useState<LessonImage[]>([]);
  const [lessonContent, setLessonContent] = useState<LessonContentSlide[]>([]);
  const [allBlocks, setAllBlocks] = useState<Map<string, Block[]>>(new Map());
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [loading, setLoading] = useState(!!lessonId);

  const useLocalSlides = !lessonId && (localSlides?.length ?? 0) > 0;
  const isMediaLesson = lesson?.content_type === "media";
  const isImageLesson = lesson?.content_type === "images";

  const itemCount = useLocalSlides
    ? localSlides!.length
    : isMediaLesson
      ? lessonContent.length
      : isImageLesson
        ? lessonImages.length
        : slides.length;

  useEffect(() => {
    if (!lessonId || !curriculumId || !moduleId) {
      setLoading(false);
      return;
    }
    const loadPreview = async () => {
      try {
        setLoading(true);
        const chapters = await getChapters(curriculumId, moduleId);
        const chapterId = chapters.length > 0 ? chapters[0].id || "" : "";
        if (!chapterId) throw new Error("No chapter found");

        const lessonData = await getLesson(
          curriculumId,
          moduleId,
          chapterId,
          lessonId
        );
        if (lessonData) {
          setLesson(lessonData);
          if (lessonData.content_type === "media") {
            const content = await getLessonContent(
              curriculumId,
              moduleId,
              chapterId,
              lessonId
            );
            setLessonContent(content);
          } else if (lessonData.content_type === "images") {
            const images = await getLessonImages(
              curriculumId,
              moduleId,
              chapterId,
              lessonId
            );
            setLessonImages(images);
          } else {
            const slidesData = await getSlides(
              curriculumId,
              moduleId,
              chapterId,
              lessonId
            );
            setSlides(slidesData);
            const blocksMap = new Map<string, Block[]>();
            for (const slide of slidesData) {
              if (slide.id) {
                const slideBlocks = await getBlocks(
                  curriculumId,
                  moduleId,
                  chapterId,
                  lessonId,
                  slide.id
                );
                blocksMap.set(slide.id, slideBlocks);
              }
            }
            setAllBlocks(blocksMap);
          }
        }
      } catch (error) {
        console.error("Error loading preview:", error);
      } finally {
        setLoading(false);
      }
    };
    loadPreview();
  }, [curriculumId, lessonId, moduleId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!useLocalSlides && !lesson) {
    return <p className="text-muted-foreground">Lesson not found.</p>;
  }

  if (itemCount === 0) {
    return (
      <p className="text-muted-foreground">
        {useLocalSlides ? "No slides added yet." : "No content in this lesson yet."}
      </p>
    );
  }

  const displayTitle = useLocalSlides ? lessonTitle : (lesson?.title ?? lessonTitle);

  // Render current slide: local (draft), media (saved), or image/slides (saved)
  const renderCurrentSlide = () => {
    if (useLocalSlides && localSlides) {
      const s = localSlides[currentSlideIndex];
      if (!s) return null;
      if (s.type === "image") {
        const src = s.imagePreviewUrl;
        return (
          <div className="w-full min-h-[400px] bg-black flex items-center justify-center p-6">
            {src ? (
              <img
                src={src}
                alt={s.file?.name ?? "Slide"}
                className="max-w-full max-h-[70vh] object-contain"
              />
            ) : (
              <span className="text-gray-500">Image (preview after save)</span>
            )}
          </div>
        );
      }
      return (
        <YouTubeBlock
          videoId={s.videoId!}
          caption={s.caption}
        />
      );
    }
    if (isMediaLesson && lessonContent[currentSlideIndex]) {
      const c = lessonContent[currentSlideIndex];
      if (c.type === "image") {
        return (
          <div className="w-full min-h-[400px] bg-black flex items-center justify-center p-6">
            <img
              src={c.image_url}
              alt={c.alt_text ?? "Slide"}
              className="max-w-full max-h-[70vh] object-contain"
            />
          </div>
        );
      }
      return (
        <YouTubeBlock
          videoId={c.video_id!}
          caption={c.caption}
        />
      );
    }
    if (isImageLesson && lessonImages[currentSlideIndex]) {
      const img = lessonImages[currentSlideIndex];
      return (
        <div className="w-full min-h-[400px] bg-black flex items-center justify-center p-6">
          <img
            src={img.image_url}
            alt={img.alt_text ?? "Slide"}
            className="max-w-full max-h-[70vh] object-contain"
          />
        </div>
      );
    }
    const currentSlide = slides[currentSlideIndex];
    const slideBlocks = currentSlide?.id ? allBlocks.get(currentSlide.id) || [] : [];
    if (currentSlide) {
      return (
        <div className="border border-border rounded-lg p-6 bg-card min-h-[400px]">
          <SlideRenderer slide={currentSlide} blocks={slideBlocks} />
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-foreground">{displayTitle}</p>
      <div className="border border-border rounded-lg overflow-hidden bg-black min-h-[400px]">
        {renderCurrentSlide()}
      </div>
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
          disabled={currentSlideIndex === 0}
        >
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          {currentSlideIndex + 1} of {itemCount}
        </span>
        <Button
          variant="outline"
          onClick={() =>
            setCurrentSlideIndex(Math.min(itemCount - 1, currentSlideIndex + 1))
          }
          disabled={currentSlideIndex >= itemCount - 1}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
