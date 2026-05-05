/**
 * Step-by-step Course Creation Wizard
 * Guides admins through course creation with clear steps
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Separator } from "../../components/ui/separator";
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Plus,
  X,
  Loader2,
  Upload,
  FileText,
} from "lucide-react";
import { useAuth } from "../../components/auth/AuthProvider";
import {
  createCourse,
  type Course,
  uploadSkillCertificatePdf,
} from "../../lib/courses";
import {
  createCurriculum,
  createModule,
  createChapter,
  createLesson,
} from "../../lib/curriculum";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../../lib/firebase";
import { SKILL_CATEGORIES, ALL_SKILLS } from "../../lib/onboardingData";
import { Checkbox } from "../../components/ui/checkbox";

type Step = "metadata" | "modules" | "lessons" | "assignment" | "review";

interface ModuleData {
  id?: string; // Will be set after creation
  title: string;
  description: string;
  price: string;
  durationMonths: string;
  skills?: string[];
  completionBadgeIds?: string[];
  skillCertificateFiles?: Record<string, File | null>;
  lessonCount: number;
  lessons: Array<{ title: string }>;
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

export function CourseCreationWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [currentStep, setCurrentStep] = useState<Step>("metadata");
  const [isCreating, setIsCreating] = useState(false);
  
  // Step 1: Course Metadata
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  
  // Step 2: Modules
  const [moduleCount, setModuleCount] = useState(1);
  const [modules, setModules] = useState<ModuleData[]>([
    { title: "", description: "", price: "", durationMonths: "", skills: [], completionBadgeIds: [], skillCertificateFiles: {}, lessonCount: 1, lessons: [{ title: "" }] },
  ]);
  const [newBadgeNamesByModule, setNewBadgeNamesByModule] = useState<Record<number, string>>({});
  const [newBadgeDescriptionsByModule, setNewBadgeDescriptionsByModule] = useState<Record<number, string>>({});
  const [newBadgeImageUrlsByModule, setNewBadgeImageUrlsByModule] = useState<Record<number, string>>({});
  const [newBadgeImageFilesByModule, setNewBadgeImageFilesByModule] = useState<Record<number, File | null>>({});
  const [creatingBadgeByModule, setCreatingBadgeByModule] = useState<Record<number, boolean>>({});
  
  // Step 3: Lessons (will be populated based on modules)
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  
  // Step 4: Assignment
  const [assignmentType, setAssignmentType] = useState<"role" | "user">("role");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [userEmailInput, setUserEmailInput] = useState("");
  const [userEmailError, setUserEmailError] = useState<string | null>(null);
  /** For "Specific User": list of validated { email, userId } so admin can assign multiple users */
  const [assignedUsers, setAssignedUsers] = useState<Array<{ email: string; userId: string }>>([]);
  
  // Stored IDs for curriculum structure
  const [curriculumMapping, setCurriculumMapping] = useState<{
    curriculumId: string;
    modules: Array<{
      moduleId: string;
      chapters: Array<{
        chapterId: string;
        lessons: Array<{ lessonId: string; title: string }>;
      }>;
    }>;
  } | null>(null);

  const steps: Array<{ id: Step; label: string; description: string }> = [
    { id: "metadata", label: "Course Info", description: "Basic course details" },
    { id: "modules", label: "Modules", description: "Number and metadata" },
    { id: "lessons", label: "Lessons", description: "Lesson titles" },
    { id: "assignment", label: "Assignment", description: "Who can access" },
    { id: "review", label: "Review", description: "Confirm and create" },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);
  const canProceed = () => {
    switch (currentStep) {
      case "metadata":
        return courseTitle.trim().length > 0;
      case "modules":
        return modules.every(
          (m) =>
            m.title.trim().length > 0 &&
            m.price.trim().length > 0 &&
            m.durationMonths.trim().length > 0 &&
            (m.skills ?? []).every((skill) => !!m.skillCertificateFiles?.[skill])
        );
      case "lessons":
        return modules.every((m) =>
          m.lessons.every((l) => l.title.trim().length > 0)
        );
      case "assignment":
        return (
          assignmentType === "role"
            ? selectedRoles.length > 0
            : assignedUsers.length > 0
        );
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!canProceed()) return;

    if (currentStep === "modules") {
      // Move to lessons step
      setCurrentStep("lessons");
      setCurrentModuleIndex(0);
    } else if (currentStepIndex < steps.length - 1) {
      const nextStep = steps[currentStepIndex + 1];
      setCurrentStep(nextStep.id);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      const prevStep = steps[currentStepIndex - 1];
      setCurrentStep(prevStep.id);
    }
  };

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
          skillCertificateFiles: {},
          lessonCount: 1,
          lessons: [{ title: "" }],
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
    const newLessons: Array<{ title: string }> = [];
    
    for (let i = 0; i < count; i++) {
      if (currentLessons[i]) {
        newLessons.push(currentLessons[i]);
      } else {
        newLessons.push({ title: "" });
      }
    }
    
    updated[moduleIndex].lessons = newLessons;
    updated[moduleIndex].lessonCount = count;
    setModules(updated);
  };

  const handleCreateCourse = async () => {
    if (!user || !canProceed()) return;

    setIsCreating(true);
    try {
      // Step 1: Create curriculum structure
      const curriculumId = await createCurriculum(
        courseTitle,
        courseDescription || "",
        user.uid
      );

      const mapping: {
        curriculumId: string;
        modules: Array<{
          moduleId: string;
          chapters: Array<{
            chapterId: string;
            lessons: Array<{ lessonId: string; title: string }>;
          }>;
        }>;
      } = {
        curriculumId,
        modules: [],
      };

      // Step 2: Create modules, chapters, and lessons
      for (let moduleIndex = 0; moduleIndex < modules.length; moduleIndex++) {
        const moduleData = modules[moduleIndex];

        const moduleId = await createModule(
          curriculumId,
          moduleData.title,
          moduleIndex + 1
        );

        const chapterId = await createChapter(
          curriculumId,
          moduleId,
          "Main Chapter",
          1
        );

        const lessons: Array<{ lessonId: string; title: string }> = [];

        for (let lessonIndex = 0; lessonIndex < moduleData.lessons.length; lessonIndex++) {
          const lessonData = moduleData.lessons[lessonIndex];

          const lessonId = await createLesson(
            curriculumId,
            moduleId,
            chapterId,
            lessonData.title,
            lessonIndex + 1,
            user.uid
          );

          lessons.push({ lessonId, title: lessonData.title });
        }

        mapping.modules.push({
          moduleId,
          chapters: [{ chapterId, lessons }],
        });
      }

      setCurriculumMapping(mapping);

      // Step 3: Upload certificate PDFs + create course in old system (for backward compatibility)
      const courseModules: Course["modules"] = [];
      for (let index = 0; index < modules.length; index++) {
        const moduleData = modules[index];
        const skills = moduleData.skills ?? [];
        const skillCertificates: NonNullable<Course["modules"][number]["skillCertificates"]> = [];
        for (const skill of skills) {
          const certFile = moduleData.skillCertificateFiles?.[skill];
          if (!certFile) {
            throw new Error(
              `Please upload a PDF certificate for "${skill}" in module "${moduleData.title || `Module ${index + 1}`}".`
            );
          }
          const uploaded = await uploadSkillCertificatePdf(certFile, {
            courseTitle: courseTitle || "course",
            moduleTitle: moduleData.title || `module_${index + 1}`,
            skill,
            uploadedByUid: user.uid,
          });
          skillCertificates.push({
            skill,
            pdfUrl: uploaded.pdfUrl,
            storagePath: uploaded.storagePath,
          });
        }
        courseModules.push({
          title: moduleData.title,
          order: index + 1,
          price: parseFloat(moduleData.price),
          durationMonths: parseFloat(moduleData.durationMonths),
          description: moduleData.description || undefined,
          skills,
          completionBadgeIds: moduleData.completionBadgeIds ?? [],
          skillCertificates,
          lessons: moduleData.lessons.map((lesson, lessonIndex) => ({
            title: lesson.title,
            order: lessonIndex + 1,
          })),
        });
      }

      const courseData: any = {
        title: courseTitle,
        currency: "USD",
        modules: courseModules,
        createdBy: user.uid,
        status: "published",
        curriculumMapping: mapping,
      };

      if (courseDescription && courseDescription.trim()) {
        courseData.description = courseDescription.trim();
      }

      if (assignmentType === "role" && selectedRoles.length > 0) {
        courseData.assignedRoles = selectedRoles;
      } else if (assignmentType === "user" && assignedUsers.length > 0) {
        courseData.assignedUserIds = assignedUsers.map((u) => u.userId);
      }

      const courseId = await createCourse(courseData);

      // Navigate to course detail page
      navigate(`/courses/${courseId}`);
    } catch (error) {
      console.error("Error creating course:", error);
      alert("Failed to create course. Please try again.");
    } finally {
      setIsCreating(false);
    }
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
          created_by_uid: user.uid,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
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

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - Steps Navigation */}
      <div className="w-64 border-r border-border bg-muted/30 p-6">
        <h2 className="text-lg font-bold mb-6">Create Course</h2>
        <div className="space-y-2">
          {steps.map((step, index) => {
            const isActive = step.id === currentStep;
            const isCompleted = currentStepIndex > index;
            const isAccessible = index === 0 || currentStepIndex >= index - 1;

            return (
              <div
                key={step.id}
                className={`
                  p-3 rounded-lg cursor-pointer transition-colors
                  ${isActive ? "bg-accent text-accent-foreground" : ""}
                  ${isCompleted ? "bg-green-500/10 text-green-600" : ""}
                  ${!isAccessible ? "opacity-50 cursor-not-allowed" : "hover:bg-muted"}
                `}
                onClick={() => {
                  if (isAccessible) {
                    setCurrentStep(step.id);
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <div
                      className={`
                        w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                        ${isActive ? "bg-accent-foreground text-accent" : "bg-muted"}
                      `}
                    >
                      {index + 1}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="font-medium text-sm">{step.label}</div>
                    <div className="text-xs opacity-70">{step.description}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8">
          {/* Step 1: Course Metadata */}
          {currentStep === "metadata" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Course Information</h2>
                <p className="text-muted-foreground">
                  Enter the basic details for your course
                </p>
              </div>

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
            </div>
          )}

          {/* Step 2: Modules */}
          {currentStep === "modules" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Course Modules</h2>
                <p className="text-muted-foreground">
                  How many modules will this course have?
                </p>
              </div>

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

                <Separator />

                <div className="space-y-4">
                  {modules.map((module, index) => (
                    <Card key={index} className="p-4 border-border">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">Module {index + 1}</h3>
                        </div>

                        <div className="space-y-2">
                          <Label>Module Title *</Label>
                          <Input
                            placeholder="e.g., Business Fundamentals"
                            value={module.title}
                            onChange={(e) => {
                              const updated = [...modules];
                              updated[index].title = e.target.value;
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
                              updated[index].description = e.target.value;
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
                                updated[index].price = e.target.value;
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
                                updated[index].durationMonths = e.target.value;
                                setModules(updated);
                              }}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-muted-foreground">Skills (optional)</Label>
                          <p className="text-xs text-muted-foreground">
                            Select skills this module helps develop. None required.
                          </p>
                          <div className="rounded border border-border bg-muted/20 p-3 space-y-2 max-h-48 overflow-y-auto">
                            {Object.entries(SKILL_CATEGORIES).map(([category]) => {
                              const categorySkills = ALL_SKILLS.filter((s) => s.category === category);
                              const selected = module.skills ?? [];
                              return (
                                <div key={category}>
                                  <p className="text-xs font-medium text-foreground mb-1">{category}</p>
                                  <div className="flex flex-wrap gap-x-3 gap-y-1 pl-2">
                                    {categorySkills.map(({ skill }) => (
                                      <div key={skill} className="flex items-center gap-2">
                                        <Checkbox
                                          id={`wizard-mod-${index}-${skill.replace(/\s+/g, "-")}`}
                                          checked={selected.includes(skill)}
                                          onCheckedChange={() => {
                                            const updated = [...modules];
                                            const current = updated[index].skills ?? [];
                                            const files = { ...(updated[index].skillCertificateFiles ?? {}) };
                                            if (current.includes(skill)) {
                                              updated[index].skills = current.filter((s) => s !== skill);
                                              delete files[skill];
                                            } else {
                                              updated[index].skills = [...current, skill];
                                            }
                                            updated[index].skillCertificateFiles = files;
                                            setModules(updated);
                                          }}
                                        />
                                        <label
                                          htmlFor={`wizard-mod-${index}-${skill.replace(/\s+/g, "-")}`}
                                          className="text-xs cursor-pointer"
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
                        </div>
                        {(module.skills ?? []).length > 0 && (
                          <div className="space-y-2">
                            <Label>Certificate PDF per selected skill *</Label>
                            <p className="text-xs text-muted-foreground">
                              Upload one PDF for each selected skill. These certificates are used in the course flow, not the badge flow.
                            </p>
                            <div className="rounded border border-border bg-muted/10 p-3 space-y-2">
                              {(module.skills ?? []).map((skill) => (
                                <div
                                  key={skill}
                                  className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
                                >
                                  <p className="text-sm text-foreground">{skill}</p>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="file"
                                      accept="application/pdf,.pdf"
                                      className="max-w-xs"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0] ?? null;
                                        if (file && !file.type.includes("pdf")) {
                                          alert("Please upload a PDF file.");
                                          return;
                                        }
                                        const updated = [...modules];
                                        updated[index].skillCertificateFiles = {
                                          ...(updated[index].skillCertificateFiles ?? {}),
                                          [skill]: file,
                                        };
                                        setModules(updated);
                                      }}
                                    />
                                    {module.skillCertificateFiles?.[skill] ? (
                                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                                        <FileText className="w-3 h-3" />
                                        {module.skillCertificateFiles[skill]?.name}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">Required</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label className="text-muted-foreground">Module completion badges (optional)</Label>
                          <p className="text-xs text-muted-foreground">
                            Create badges only for this module. These badges are only awarded when this module is completed.
                          </p>
                          <div className="rounded border border-border bg-muted/10 p-3 space-y-2">
                            <Label className="text-xs text-muted-foreground">Create new badge for this module</Label>
                            <Input
                              placeholder="Badge name (required)"
                              value={newBadgeNamesByModule[index] ?? ""}
                              onChange={(e) =>
                                setNewBadgeNamesByModule((prev) => ({ ...prev, [index]: e.target.value }))
                              }
                            />
                            <Input
                              placeholder="Badge description (optional)"
                              value={newBadgeDescriptionsByModule[index] ?? ""}
                              onChange={(e) =>
                                setNewBadgeDescriptionsByModule((prev) => ({ ...prev, [index]: e.target.value }))
                              }
                            />
                            <Input
                              placeholder="Badge image URL (optional)"
                              value={newBadgeImageUrlsByModule[index] ?? ""}
                              onChange={(e) =>
                                setNewBadgeImageUrlsByModule((prev) => ({ ...prev, [index]: e.target.value }))
                              }
                            />
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) =>
                                setNewBadgeImageFilesByModule((prev) => ({
                                  ...prev,
                                  [index]: e.target.files?.[0] ?? null,
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
                              onClick={() => void handleCreateModuleBadge(index)}
                              disabled={creatingBadgeByModule[index] === true}
                            >
                              {creatingBadgeByModule[index] ? (
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
                                        updated[index].completionBadgeIds = (updated[index].completionBadgeIds ?? []).filter(
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
                      </div>
                    </Card>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* Step 3: Lessons */}
          {currentStep === "lessons" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Lesson Titles</h2>
                <p className="text-muted-foreground">
                  Set the number of lessons for each module and name them, or import from PPTX
                </p>
              </div>

              {/* PPTX Import Option */}
              <Card className="p-4 bg-muted/50 border-dashed">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold mb-1">Import from PPTX</h3>
                    <p className="text-sm text-muted-foreground">
                      Upload a PowerPoint file to automatically create lesson content
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Navigate to import page - we'll need chapterId
                      // For now, create a chapter first or use a default
                      const chapterId = "default"; // This should be created or passed
                      navigate(
                        `/admin/curriculum/${curriculumMapping?.curriculumId || "new"}/module/${modules[0]?.id || "new"}/chapter/${chapterId}/import-pptx`
                      );
                    }}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Import PPTX
                  </Button>
                </div>
              </Card>

              <div className="space-y-6">
                {modules.map((module, moduleIndex) => (
                  <Card key={moduleIndex} className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">
                          {module.title || `Module ${moduleIndex + 1}`}
                        </h3>
                        <Badge variant="outline">
                          {module.lessons.length} lesson{module.lessons.length !== 1 ? "s" : ""}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <Label>Number of Lessons</Label>
                        <div className="flex items-center gap-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleSetLessonCount(moduleIndex, module.lessonCount - 1)
                            }
                            disabled={module.lessonCount <= 1}
                          >
                            <X className="w-4 h-4" />
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
                            className="w-24 text-center"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleSetLessonCount(moduleIndex, module.lessonCount + 1)
                            }
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        {module.lessons.map((lesson, lessonIndex) => (
                          <div key={lessonIndex} className="space-y-2">
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
                        ))}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Assignment */}
          {currentStep === "assignment" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Course Assignment</h2>
                <p className="text-muted-foreground">
                  Who should have access to this course?
                </p>
              </div>

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
                                setSelectedRoles(
                                  selectedRoles.filter((r) => r !== role)
                                );
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
            </div>
          )}

          {/* Step 5: Review */}
          {currentStep === "review" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Review & Create</h2>
                <p className="text-muted-foreground">
                  Review your course details before creating
                </p>
              </div>

              <Card className="p-6 space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Course Information</h3>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="font-medium">Title:</span> {courseTitle}
                    </p>
                    {courseDescription && (
                      <p>
                        <span className="font-medium">Description:</span>{" "}
                        {courseDescription}
                      </p>
                    )}
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2">Modules ({modules.length})</h3>
                  <div className="space-y-3">
                    {modules.map((module, index) => (
                      <div key={index} className="p-3 bg-muted/50 rounded">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">
                            Module {index + 1}: {module.title}
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
                          <p className="text-xs text-muted-foreground">
                            {module.description}
                          </p>
                        )}
                        <div className="mt-2 space-y-1">
                          {module.lessons.map((lesson, lessonIndex) => (
                            <div
                              key={lessonIndex}
                              className="text-xs text-muted-foreground pl-2"
                            >
                              • {lesson.title || `Lesson ${lessonIndex + 1}`}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2">Assignment</h3>
                  <p className="text-sm text-muted-foreground">
                    {assignmentType === "role"
                      ? `Roles: ${selectedRoles.join(", ")}`
                      : `Users: ${assignedUsers.map((u) => u.email).join(", ") || "—"}`}
                  </p>
                </div>
              </Card>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStepIndex === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            {currentStep === "review" ? (
              <Button
                onClick={handleCreateCourse}
                disabled={!canProceed() || isCreating}
                className="bg-accent hover:bg-accent/90"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Course...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Create Course
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="bg-accent hover:bg-accent/90"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
