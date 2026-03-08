/**
 * Unified Course Builder
 * Combines course metadata, image upload for lesson content, preview, and publish
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
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
} from "lucide-react";
import { useAuth } from "../../components/auth/AuthProvider";
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
  uploadLessonImages,
  deleteLessonImages,
  getLessonImages,
  type Lesson,
  type Slide,
  type Block,
  type LessonImage,
} from "../../lib/curriculum";
import {
  createCourse,
  updateCourse,
  type Course,
} from "../../lib/courses";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { SlideRenderer } from "../../components/curriculum/SlideRenderer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";

type ImageUploadStatus = "idle" | "uploading" | "success" | "error";

interface ModuleData {
  id?: string;
  title: string;
  description: string;
  price: string;
  durationMonths: string;
  lessonCount: number;
  lessons: Array<{
    title: string;
    imageFiles: File[];
    imageUploadStatus?: ImageUploadStatus;
    lessonId?: string;
  }>;
}

export function CourseBuilder() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState("metadata");
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

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
      lessonCount: 1,
      lessons: [{ title: "", imageFiles: [], imageUploadStatus: "idle" }],
    },
  ]);

  // Assignment
  const [assignmentType, setAssignmentType] = useState<"role" | "user">("role");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [userEmailInput, setUserEmailInput] = useState("");
  const [userEmailError, setUserEmailError] = useState<string | null>(null);
  const [validatedUserId, setValidatedUserId] = useState<string | null>(null);

  // Created course/curriculum IDs
  const [curriculumId, setCurriculumId] = useState<string | null>(null);
  const [createdCourseId, setCreatedCourseId] = useState<string | null>(null);
  const [previewLessonId, setPreviewLessonId] = useState<string | null>(null);
  const [previewModuleId, setPreviewModuleId] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Initialize curriculum structure
  useEffect(() => {
    const initializeCurriculum = async () => {
      if (!user || curriculumId) return;

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
  }, [user, courseTitle, curriculumId]);

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
          lessonCount: 1,
          lessons: [{ title: "", imageFiles: [], imageUploadStatus: "idle" }],
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
        newLessons.push({ title: "", imageFiles: [], imageUploadStatus: "idle" });
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
    updated[moduleIndex].lessons[lessonIndex].imageFiles = fileList;
    if (!updated[moduleIndex].lessons[lessonIndex].title) {
      updated[moduleIndex].lessons[lessonIndex].title = `Lesson ${lessonIndex + 1}`;
    }
    setModules(updated);
    e.target.value = "";
  };

  const handleClearImages = (moduleIndex: number, lessonIndex: number) => {
    const updated = [...modules];
    updated[moduleIndex].lessons[lessonIndex].imageFiles = [];
    setModules(updated);
  };

  const handleSaveCourse = async () => {
    if (!curriculumId || !user) return;

    setIsSaving(true);
    try {
      // Create modules, chapters, and lessons
      const courseModules = [];
      const mapping: any = {
        curriculumId,
        modules: [],
      };

      for (let moduleIndex = 0; moduleIndex < modules.length; moduleIndex++) {
        const moduleData = modules[moduleIndex];
        const updatedModules = [...modules];

        let moduleId = moduleData.id;
        if (!moduleId) {
          moduleId = await createModule(
            curriculumId,
            moduleData.title || `Module ${moduleIndex + 1}`,
            moduleIndex + 1
          );
          updatedModules[moduleIndex].id = moduleId;
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
          const hasImages = lessonData.imageFiles?.length > 0;

          if (!lessonId) {
            lessonId = await createLesson(
              curriculumId,
              moduleId,
              chapterId,
              lessonData.title || `Lesson ${lessonIndex + 1}`,
              lessonIndex + 1,
              user.uid,
              hasImages ? { content_type: "images" } : undefined
            );
            updatedModules[moduleIndex].lessons[lessonIndex].lessonId = lessonId;
          }

          if (hasImages && lessonId) {
            try {
              updatedModules[moduleIndex].lessons[lessonIndex].imageUploadStatus = "uploading";
              setModules(updatedModules);
              await updateLesson(
                curriculumId,
                moduleId,
                chapterId,
                lessonId,
                { content_type: "images" }
              );
              await deleteLessonImages(curriculumId, moduleId, chapterId, lessonId);
              await uploadLessonImages(
                curriculumId,
                moduleId,
                chapterId,
                lessonId,
                lessonData.imageFiles
              );
              updatedModules[moduleIndex].lessons[lessonIndex].imageUploadStatus = "success";
              updatedModules[moduleIndex].lessons[lessonIndex].imageFiles = [];
            } catch (imgErr) {
              console.error("Error uploading lesson images:", imgErr);
              updatedModules[moduleIndex].lessons[lessonIndex].imageUploadStatus = "error";
              setModules(updatedModules);
              throw imgErr;
            }
          }

          moduleLessons.push({
            title: lessonData.title || `Lesson ${lessonIndex + 1}`,
            order: lessonIndex + 1,
          });
        }

        setModules(updatedModules);

        const moduleObj: any = {
          title: moduleData.title || `Module ${moduleIndex + 1}`,
          order: moduleIndex + 1,
          price: parseFloat(moduleData.price || "0"),
          durationMonths: parseFloat(moduleData.durationMonths || "0"),
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
              lessonId: updatedModules[moduleIndex].lessons[i]?.lessonId || "",
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
        status: "draft",
        curriculumMapping: mapping,
      };

      // Only add description if it has a value
      if (courseDescription && courseDescription.trim()) {
        courseData.description = courseDescription.trim();
      }

      // Only add assignment fields if they have values
      if (assignmentType === "role" && selectedRoles.length > 0) {
        courseData.assignedRoles = selectedRoles;
      } else if (assignmentType === "user" && validatedUserId) {
        courseData.assignedUserIds = [validatedUserId];
      }

      // Remove any undefined values before saving
      const cleanCourseData = Object.fromEntries(
        Object.entries(courseData).filter(([_, value]) => value !== undefined)
      );

      if (createdCourseId) {
        console.log("[SAVE] Updating existing course:", createdCourseId);
        await updateCourse(createdCourseId, cleanCourseData as Partial<Course>);
        alert("Course updated!");
      } else {
        console.log("[SAVE] Creating new course with data:", cleanCourseData);
        const courseId = await createCourse(cleanCourseData as Omit<Course, "id" | "createdAt" | "updatedAt">);
        console.log("[SAVE] Course created with ID:", courseId);
        setCreatedCourseId(courseId);
        alert("Course saved as draft!");
      }
    } catch (error) {
      console.error("Error saving course:", error);
      alert("Failed to save course. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublishCourse = async () => {
    console.log("[PUBLISH] Starting publish process...");
    console.log("[PUBLISH] createdCourseId:", createdCourseId);
    console.log("[PUBLISH] curriculumId:", curriculumId);
    console.log("[PUBLISH] modules:", modules);

    if (!createdCourseId) {
      console.log("[PUBLISH] No course ID, saving course first...");
      await handleSaveCourse();
      // Wait a bit for save to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log("[PUBLISH] Course saved, createdCourseId:", createdCourseId);
    }

    if (!createdCourseId) {
      console.error("[PUBLISH] Still no course ID after save!");
      alert("Failed to save course. Cannot publish.");
      return;
    }

    // Publish all lessons
    if (curriculumId) {
      setIsPublishing(true);
      try {
        console.log("[PUBLISH] Publishing lessons...");
        let publishedCount = 0;
        let skippedCount = 0;

        for (const module of modules) {
          console.log(`[PUBLISH] Processing module: ${module.title}, id: ${module.id}`);
          if (!module.id) {
            console.warn(`[PUBLISH] Module ${module.title} has no ID, skipping`);
            skippedCount++;
            continue;
          }
          
          // Get chapters for this module
          console.log(`[PUBLISH] Getting chapters for module ${module.id}...`);
          const chapters = await getChapters(curriculumId, module.id);
          console.log(`[PUBLISH] Found ${chapters.length} chapters:`, chapters);
          const chapterId = chapters.length > 0 ? chapters[0].id || "" : "";
          
          if (!chapterId) {
            console.warn(`[PUBLISH] No chapter found for module ${module.id}`);
            skippedCount++;
            continue;
          }

          console.log(`[PUBLISH] Publishing lessons in module ${module.id}, chapter ${chapterId}...`);
          for (const lesson of module.lessons) {
            if (lesson.lessonId) {
              console.log(`[PUBLISH] Publishing lesson ${lesson.lessonId}...`);
              try {
                await publishLesson(curriculumId, module.id, chapterId, lesson.lessonId);
                publishedCount++;
                console.log(`[PUBLISH] Successfully published lesson ${lesson.lessonId}`);
              } catch (lessonError) {
                console.error(`[PUBLISH] Error publishing lesson ${lesson.lessonId}:`, lessonError);
              }
            } else {
              console.warn(`[PUBLISH] Lesson "${lesson.title}" has no lessonId, skipping`);
              skippedCount++;
            }
          }
        }

        console.log(`[PUBLISH] Published ${publishedCount} lessons, skipped ${skippedCount}`);

        // Update course status to published
        console.log(`[PUBLISH] Updating course ${createdCourseId} status to published...`);
        await updateCourse(createdCourseId, {
          status: "published",
        });
        console.log("[PUBLISH] Course status updated successfully!");

        alert(`Course published successfully! Published ${publishedCount} lessons.`);
        navigate("/admin");
      } catch (error) {
        console.error("[PUBLISH] Error publishing course:", error);
        alert(`Failed to publish course: ${error instanceof Error ? error.message : "Unknown error"}`);
      } finally {
        setIsPublishing(false);
      }
    } else {
      console.error("[PUBLISH] No curriculumId available!");
      alert("No curriculum ID available. Please save the course first.");
    }
  };

  const handlePreviewLesson = async (moduleIndex: number, lessonIndex: number) => {
    console.log("[PREVIEW] Opening preview...");
    console.log("[PREVIEW] moduleIndex:", moduleIndex, "lessonIndex:", lessonIndex);
    const lesson = modules[moduleIndex].lessons[lessonIndex];
    const module = modules[moduleIndex];
    console.log("[PREVIEW] lesson:", lesson);
    console.log("[PREVIEW] module:", module);
    console.log("[PREVIEW] lesson.lessonId:", lesson.lessonId);
    console.log("[PREVIEW] curriculumId:", curriculumId);
    console.log("[PREVIEW] module.id:", module.id);

    if (lesson.lessonId && curriculumId && module.id) {
      setPreviewLessonId(lesson.lessonId);
      setPreviewModuleId(module.id);
      setIsPreviewOpen(true);
      console.log("[PREVIEW] Preview dialog opened");
    } else {
      const missing = [];
      if (!lesson.lessonId) missing.push("lesson ID");
      if (!curriculumId) missing.push("curriculum ID");
      if (!module.id) missing.push("module ID");
      console.error("[PREVIEW] Missing required data:", missing);
      alert(`Please add images and save the course first. Missing: ${missing.join(", ")}`);
    }
  };

  const handleValidateEmail = async () => {
    if (!userEmailInput.trim()) {
      setUserEmailError("Please enter an email address");
      return;
    }

    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", userEmailInput.trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setUserEmailError("User with this email does not exist");
        setValidatedUserId(null);
        return;
      }

      const userDoc = querySnapshot.docs[0];
      setValidatedUserId(userDoc.id);
      setUserEmailError(null);
    } catch (error: any) {
      setValidatedUserId(null);
      setUserEmailError(error.message || "User does not exist");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Course Builder</h1>
        <p className="text-muted-foreground">
          Create your course by adding metadata, modules, and uploading lesson content
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
                              Lesson images *
                            </Label>
                            <p className="text-xs text-muted-foreground mb-2">
                              Upload images in order; they will be shown one per screen with Previous/Next in the lesson player.
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
                              {lesson.imageFiles.length > 0 && (
                                <>
                                  <span className="text-sm text-muted-foreground">
                                    {lesson.imageFiles.length} image{lesson.imageFiles.length !== 1 ? "s" : ""} selected
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleClearImages(moduleIndex, lessonIndex)}
                                  >
                                    Clear
                                  </Button>
                                </>
                              )}
                            </div>
                            {lesson.imageFiles.length > 0 && (
                              <ul className="text-xs text-muted-foreground list-disc list-inside">
                                {lesson.imageFiles.map((f, i) => (
                                  <li key={i}>{f.name}</li>
                                ))}
                              </ul>
                            )}
                          </div>

                          {lesson.imageUploadStatus === "uploading" && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Uploading images...</span>
                            </div>
                          )}

                          {lesson.imageUploadStatus === "success" && lesson.lessonId && (
                            <div className="flex items-center gap-2">
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
                  setValidatedUserId(null);
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
                <Label>User Email *</Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="user@example.com"
                    value={userEmailInput}
                    onChange={(e) => {
                      setUserEmailInput(e.target.value);
                      setUserEmailError(null);
                      setValidatedUserId(null);
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
                    Validate
                  </Button>
                </div>
                {userEmailError && (
                  <p className="text-sm text-destructive">{userEmailError}</p>
                )}
                {!userEmailError && validatedUserId && (
                  <p className="text-sm text-green-600">✓ Email validated</p>
                )}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Course Preview</h3>
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
                          className="text-xs pl-2 flex items-center justify-between p-2 rounded border border-border"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-foreground">• {lesson.title || `Lesson ${lessonIndex + 1}`}</span>
                            {lesson.imageUploadStatus === "uploading" && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Uploading images...</span>
                              </div>
                            )}
                            {lesson.imageUploadStatus === "success" && (
                              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Ready to Preview
                              </Badge>
                            )}
                            {lesson.imageUploadStatus === "error" && (
                              <Badge variant="destructive" className="text-xs">
                                <XCircle className="w-3 h-3 mr-1" />
                                Upload Failed
                              </Badge>
                            )}
                            {lesson.imageUploadStatus === "idle" && lesson.imageFiles?.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                <ImageIcon className="w-3 h-3 mr-1" />
                                {lesson.imageFiles.length} image(s) — Save course
                              </Badge>
                            )}
                            {lesson.imageUploadStatus === "idle" && (!lesson.imageFiles?.length) && (
                              <Badge variant="outline" className="text-xs text-muted-foreground">
                                No images
                              </Badge>
                            )}
                          </div>
                          {lesson.imageUploadStatus === "success" && lesson.lessonId && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePreviewLesson(index, lessonIndex)}
                              className="ml-2"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Preview
                            </Button>
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
        <Button onClick={() => navigate("/admin")} variant="ghost">
          Cancel
        </Button>

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
          {previewLessonId && curriculumId && previewModuleId && (
            <LessonPreview
              curriculumId={curriculumId}
              lessonId={previewLessonId}
              moduleId={previewModuleId}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LessonPreview({
  curriculumId,
  lessonId,
  moduleId,
}: {
  curriculumId: string;
  lessonId: string;
  moduleId: string;
}) {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [lessonImages, setLessonImages] = useState<LessonImage[]>([]);
  const [allBlocks, setAllBlocks] = useState<Map<string, Block[]>>(new Map());
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const isImageLesson = lesson?.content_type === "images";
  const hasImageContent = isImageLesson && lessonImages.length > 0;

  useEffect(() => {
    const loadPreview = async () => {
      try {
        setLoading(true);
        const chapters = await getChapters(curriculumId, moduleId);
        const chapterId = chapters.length > 0 ? chapters[0].id || "" : "";

        if (!chapterId) {
          throw new Error("No chapter found");
        }

        const lessonData = await getLesson(
          curriculumId,
          moduleId,
          chapterId,
          lessonId
        );

        if (lessonData) {
          setLesson(lessonData);
          if (lessonData.content_type === "images") {
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

    if (curriculumId && lessonId && moduleId) {
      loadPreview();
    }
  }, [curriculumId, lessonId, moduleId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!lesson) {
    return <p className="text-muted-foreground">Lesson not found.</p>;
  }

  if (isImageLesson && lessonImages.length === 0) {
    return <p className="text-muted-foreground">No images in this lesson yet.</p>;
  }

  // Image-based lesson: show one image per "slide" with prev/next
  if (hasImageContent) {
    const currentImage = lessonImages[currentSlideIndex];
    return (
      <div className="space-y-4">
        <div className="border border-border rounded-lg overflow-hidden bg-black min-h-[400px] flex items-center justify-center">
          {currentImage && (
            <img
              src={currentImage.image_url}
              alt={currentImage.alt_text || `Slide ${currentSlideIndex + 1}`}
              className="max-w-full max-h-[70vh] object-contain"
            />
          )}
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
            {currentSlideIndex + 1} of {lessonImages.length}
          </span>
          <Button
            variant="outline"
            onClick={() =>
              setCurrentSlideIndex(
                Math.min(lessonImages.length - 1, currentSlideIndex + 1)
              )
            }
            disabled={currentSlideIndex === lessonImages.length - 1}
          >
            Next
          </Button>
        </div>
      </div>
    );
  }

  // Slide-based lesson
  const currentSlide = slides[currentSlideIndex];
  const slideBlocks = currentSlide?.id ? allBlocks.get(currentSlide.id) || [] : [];

  console.log("[PREVIEW] Rendering preview UI");
  console.log("[PREVIEW] currentSlide:", currentSlide);
  console.log("[PREVIEW] slideBlocks:", slideBlocks);

  return (
    <div className="space-y-4">
      {currentSlide ? (
        <>
          <div className="border border-border rounded-lg p-6 bg-card min-h-[400px]">
            <SlideRenderer slide={currentSlide} blocks={slideBlocks} />
          </div>
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => {
                console.log("[PREVIEW] Previous button clicked");
                setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1));
              }}
              disabled={currentSlideIndex === 0}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Slide {currentSlideIndex + 1} of {slides.length}
            </span>
            <Button
              variant="outline"
              onClick={() => {
                console.log("[PREVIEW] Next button clicked");
                setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1));
              }}
              disabled={currentSlideIndex === slides.length - 1}
            >
              Next
            </Button>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">No slide data available</p>
        </div>
      )}
    </div>
  );
}
