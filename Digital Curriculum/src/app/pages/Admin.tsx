import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Users,
  MessageSquare,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  UserPlus,
  Loader2,
  Calendar,
  MapPin,
  GraduationCap,
  Check,
  X,
  BookOpen,
  Upload,
  Trash2,
} from "lucide-react";
import { useAuth } from "../components/auth/AuthProvider";
import {
  getGroups,
  getGroup,
  joinGroup,
  type Group,
} from "../lib/groups";
import {
  collection,
  query,
  getDocs,
  getDoc,
  orderBy,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { createEvent, getEvents, type Event } from "../lib/events";
import {
  getGraduationApplications,
  acceptGraduationApplication,
  rejectGraduationApplication,
  admitUserToAlumni,
  type GraduationApplication,
} from "../lib/graduation";
import {
  createCourse,
  getAllCourses,
  updateCourse,
  getCourse,
  type Course,
  type Module,
  type Lesson,
} from "../lib/courses";
import {
  createCurriculum,
  createModule,
  createChapter,
  createLesson,
  type Curriculum,
} from "../lib/curriculum";

interface DirectMessage {
  id: string;
  uid: string;
  message: string;
  created_at: Timestamp;
  read: boolean;
}

interface DMReply {
  id: string;
  message: string;
  sender: "user" | "mortar";
  created_at: Timestamp;
}

export function AdminPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [dms, setDms] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("groups");
  const [selectedDM, setSelectedDM] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [replying, setReplying] = useState(false);
  const [dmReplies, setDmReplies] = useState<DMReply[]>([]);

  // Event creation state
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  const [newEventStartTime, setNewEventStartTime] = useState("");
  const [newEventEndTime, setNewEventEndTime] = useState("");
  const [newEventLocation, setNewEventLocation] = useState("");
  const [newEventSpots, setNewEventSpots] = useState("");
  const [newEventDetails, setNewEventDetails] = useState("");
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [graduationApplications, setGraduationApplications] = useState<GraduationApplication[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [admissionStatus, setAdmissionStatus] = useState<Record<string, boolean>>({});
  const [selectedTimes, setSelectedTimes] = useState<Record<string, string>>({});

  // Group creation state
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupStatus, setNewGroupStatus] = useState<"Open" | "Closed">("Open");
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Course creation state
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [creatingCourse, setCreatingCourse] = useState(false);
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [courseModules, setCourseModules] = useState<Array<{ title: string; description: string; price: string; durationMonths: string; lessons: Array<{ title: string }> }>>([]);
  const [assignmentType, setAssignmentType] = useState<"role" | "user">("role");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [userEmailInput, setUserEmailInput] = useState("");
  const [userEmailError, setUserEmailError] = useState<string | null>(null);
  const [validatedUserId, setValidatedUserId] = useState<string | null>(null);
  const [availableUsers, setAvailableUsers] = useState<Array<{ uid: string; email: string | null; displayName: string | null }>>([]);

  useEffect(() => {
    loadData();
    loadCourses();
  }, []);

  const loadCourses = async () => {
    setLoadingCourses(true);
    try {
      const coursesData = await getAllCourses();
      setCourses(coursesData);
    } catch (error) {
      console.error("Error loading courses:", error);
    } finally {
      setLoadingCourses(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [groupsData, dmsData, eventsData, applicationsData] = await Promise.all([
        getGroups(),
        loadDirectMessages(),
        getEvents(),
        getGraduationApplications(),
      ]);
      setGroups(groupsData);
      setDms(dmsData);
      setEvents(eventsData);
      setGraduationApplications(applicationsData);
      
      // Check admission status for all applications
      const statusMap: Record<string, boolean> = {};
      await Promise.all(
        applicationsData.map(async (app) => {
          if (app.userId) {
            const userInfo = await getUserInfo(app.userId);
            statusMap[app.userId] = userInfo.isAdmitted || false;
          }
        })
      );
      setAdmissionStatus(statusMap);
    } catch (error) {
      console.error("Error loading admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    setLoadingEvents(true);
    try {
      const eventsData = await getEvents();
      setEvents(eventsData);
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setLoadingEvents(false);
    }
  };

  const getUserInfo = async (userId: string) => {
    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const roles = userData.roles || [];
        const isAdmitted = roles.includes("Digital Curriculum Alumni");
        return {
          name: `${userData.first_name || ""} ${userData.last_name || ""}`.trim() || userData.display_name || "Unknown",
          email: userData.email || "No email",
          isAdmitted,
        };
      }
      return { name: "Unknown User", email: "No email", isAdmitted: false };
    } catch (error) {
      console.error("Error fetching user info:", error);
      return { name: "Unknown User", email: "No email", isAdmitted: false };
    }
  };

  const loadDirectMessages = async (): Promise<DirectMessage[]> => {
    try {
      const dmsRef = collection(db, "Digital Student DMs");
      const q = query(dmsRef, orderBy("created_at", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as DirectMessage[];
    } catch (error) {
      console.error("Error loading DMs:", error);
      return [];
    }
  };

  const loadDMReplies = async (dmId: string) => {
    try {
      const repliesRef = collection(db, "Digital Student DMs", dmId, "replies");
      const q = query(repliesRef, orderBy("created_at", "asc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as DMReply[];
    } catch (error) {
      console.error("Error loading replies:", error);
      return [];
    }
  };

  const handleReply = async (dmId: string) => {
    if (!replyMessage.trim()) return;

    setReplying(true);
    try {
      await addDoc(collection(db, "Digital Student DMs", dmId, "replies"), {
        message: replyMessage.trim(),
        sender: "mortar",
        created_at: serverTimestamp(),
      });

      // Mark DM as read
      await updateDoc(doc(db, "Digital Student DMs", dmId), {
        read: true,
      });

      setReplyMessage("");
      const updatedReplies = await loadDMReplies(dmId);
      setDmReplies(updatedReplies);
      await loadData();
    } catch (error) {
      console.error("Error sending reply:", error);
      alert("Failed to send reply. Please try again.");
    } finally {
      setReplying(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;

    setCreatingGroup(true);
    try {
      await addDoc(collection(db, "Groups"), {
        Name: newGroupName.trim(),
        Status: newGroupStatus,
        Created: serverTimestamp(),
        GroupMembers: [],
        PendingMembers: [],
      });

      setNewGroupName("");
      setNewGroupStatus("Open");
      await loadData();
    } catch (error) {
      console.error("Error creating group:", error);
      alert("Failed to create group. Please try again.");
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleApproveMember = async (groupId: string, userId: string) => {
    try {
      const groupRef = doc(db, "Groups", groupId);
      const groupDoc = await getDoc(groupRef);
      
      if (!groupDoc.exists()) return;

      const group = { id: groupDoc.id, ...groupDoc.data() } as Group;
      const currentMembers = group.GroupMembers || [];
      const currentPending = group.PendingMembers || [];

      // Remove from pending, add to members
      const updatedPending = currentPending.filter((id) => id !== userId);
      const updatedMembers = [...currentMembers, userId];

      await updateDoc(groupRef, {
        GroupMembers: updatedMembers,
        PendingMembers: updatedPending,
      });

      await loadData();
    } catch (error) {
      console.error("Error approving member:", error);
      alert("Failed to approve member. Please try again.");
    }
  };

  const validateAndGetUserId = async (email: string): Promise<string> => {
    // Search for user by email
    const usersRef = collection(db, "users");
    const usersSnapshot = await getDocs(usersRef);
    
    const userDoc = usersSnapshot.docs.find((doc) => {
      const data = doc.data();
      const userEmail = data.email || data.email_address || null;
      return userEmail && userEmail.toLowerCase() === email.toLowerCase();
    });

    if (!userDoc) {
      throw new Error("User does not exist");
    }

    return userDoc.id;
  };

  const handleValidateEmail = async () => {
    if (!userEmailInput.trim()) {
      setUserEmailError("Please enter a user email");
      return;
    }

    try {
      const userId = await validateAndGetUserId(userEmailInput.trim());
      setValidatedUserId(userId);
      setUserEmailError(null);
    } catch (error: any) {
      setValidatedUserId(null);
      setUserEmailError(error.message || "User does not exist");
    }
  };

  const handleCreateCourse = async () => {
    if (!courseTitle || courseModules.length === 0 || !user) {
      alert("Please fill in all required fields");
      return;
    }

    // Validate all modules and lessons
    for (const module of courseModules) {
      if (!module.title || !module.price || !module.durationMonths || module.lessons.length === 0) {
        alert("All modules must have a title, price, duration (months), and at least one lesson");
        return;
      }
      for (const lesson of module.lessons) {
        if (!lesson.title) {
          alert("All lessons must have a title");
          return;
        }
      }
    }

    // Validate user email if assignment type is "user"
    let assignedUserIds: string[] = [];
    if (assignmentType === "user") {
      if (!userEmailInput.trim()) {
        setUserEmailError("Please enter a user email");
        return;
      }
      if (!validatedUserId) {
        setUserEmailError("Please validate the email address first");
        return;
      }
      assignedUserIds = [validatedUserId];
    }

    setCreatingCourse(true);
    setUserEmailError(null);
    try {
      // Create course structure
      const modules: Module[] = courseModules.map((moduleData, moduleIndex) => {
        const module: any = {
          title: moduleData.title,
          order: moduleIndex + 1,
          price: parseFloat(moduleData.price),
          durationMonths: parseFloat(moduleData.durationMonths) || 0,
          lessons: moduleData.lessons.map((lessonData, lessonIndex) => ({
            title: lessonData.title,
            order: lessonIndex + 1,
          })),
        };
        
        // Only add description if it has a value
        if (moduleData.description && moduleData.description.trim()) {
          module.description = moduleData.description.trim();
        }
        
        return module;
      });

      // Prepare course data, only include fields with actual values (no undefined)
      const courseData: any = {
        title: courseTitle,
        currency: "USD",
        modules,
        createdBy: user.uid,
        status: "published",
      };

      // Only add description if it has a value
      if (courseDescription && courseDescription.trim()) {
        courseData.description = courseDescription.trim();
      }

      // Only add assignment fields if they have values (avoid undefined)
      if (assignmentType === "role" && selectedRoles.length > 0) {
        courseData.assignedRoles = selectedRoles;
      } else if (assignmentType === "user" && assignedUserIds.length > 0) {
        courseData.assignedUserIds = assignedUserIds;
      }

      const courseId = await createCourse(courseData);

      // Create curriculum structure in the new system
      // First, create a curriculum (one curriculum per course for now)
      const curriculumId = await createCurriculum(
        courseTitle,
        courseDescription || "",
        user.uid
      );

      // Store curriculum structure mapping in course document
      const curriculumMapping: {
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

      // Create modules, chapters, and lessons in the new curriculum system
      for (let moduleIndex = 0; moduleIndex < courseModules.length; moduleIndex++) {
        const moduleData = courseModules[moduleIndex];
        
        // Create module in curriculum
        const moduleId = await createModule(
          curriculumId,
          moduleData.title,
          moduleIndex + 1
        );

        // Create a default chapter for each module (you can expand this later)
        const chapterId = await createChapter(
          curriculumId,
          moduleId,
          "Main Chapter",
          1
        );

        const lessons: Array<{ lessonId: string; title: string }> = [];

        // Create lessons in the new system
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

        curriculumMapping.modules.push({
          moduleId,
          chapters: [{ chapterId, lessons }],
        });
      }

      // Store curriculum mapping in course document
      await updateCourse(courseId, {
        curriculumMapping: curriculumMapping as any,
      });

      // Reset form
      setCourseTitle("");
      setCourseDescription("");
      setCourseModules([]);
      setSelectedRoles([]);
      setUserEmailInput("");
      setUserEmailError(null);
      setValidatedUserId(null);
      setAssignmentType("role");

      // Reload courses
      await loadCourses();
      
      // Navigate to course detail page
      navigate(`/courses/${courseId}`);
    } catch (error) {
      console.error("Error creating course:", error);
      alert("Failed to create course. Please try again.");
    } finally {
      setCreatingCourse(false);
    }
  };

  const handleRejectMember = async (groupId: string, userId: string) => {
    try {
      const groupRef = doc(db, "Groups", groupId);
      const groupDoc = await getDoc(groupRef);
      
      if (!groupDoc.exists()) return;

      const group = { id: groupDoc.id, ...groupDoc.data() } as Group;
      const currentPending = group.PendingMembers || [];
      const updatedPending = currentPending.filter((id) => id !== userId);

      await updateDoc(groupRef, {
        PendingMembers: updatedPending,
      });

      await loadData();
    } catch (error) {
      console.error("Error rejecting member:", error);
      alert("Failed to reject member. Please try again.");
    }
  };

  const formatTime = (timestamp: any): string => {
    if (!timestamp) return "Unknown";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  const getPendingMembers = (group: Group): string[] => {
    return group.PendingMembers || [];
  };

  // Component to display registered users
  function RegisteredUsersList({ userIds }: { userIds: string[] }) {
    const [userInfos, setUserInfos] = useState<Record<string, { name: string; email: string }>>({});
    const [loadingUsers, setLoadingUsers] = useState(true);

    useEffect(() => {
      const loadUserInfos = async () => {
        setLoadingUsers(true);
        const infos: Record<string, { name: string; email: string }> = {};
        await Promise.all(
          userIds.map(async (userId) => {
            const info = await getUserInfo(userId);
            infos[userId] = info;
          })
        );
        setUserInfos(infos);
        setLoadingUsers(false);
      };
      if (userIds.length > 0) {
        loadUserInfos();
      } else {
        setLoadingUsers(false);
      }
    }, [userIds]);

    if (loadingUsers) {
      return (
        <div className="text-center py-4">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      );
    }

    return (
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {userIds.map((userId) => {
          const userInfo = userInfos[userId] || { name: "Loading...", email: "" };
          return (
            <div
              key={userId}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-accent">
                    {userInfo.name.substring(0, 2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {userInfo.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {userInfo.email}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    UID: {userId.substring(0, 12)}...
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const formatTimeForDisplay = (time24: string): string => {
    if (!time24) return "";
    const [hours, minutes] = time24.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const handleCreateEvent = async () => {
    if (!newEventTitle.trim() || !newEventDate || !newEventStartTime || !newEventLocation || !newEventSpots) {
      alert("Please fill in all required fields.");
      return;
    }

    const spots = parseInt(newEventSpots);
    if (isNaN(spots) || spots <= 0) {
      alert("Available spots must be a positive number.");
      return;
    }

    setCreatingEvent(true);
    try {
      const eventDate = new Date(newEventDate);
      
      // Format time string
      const startTimeFormatted = formatTimeForDisplay(newEventStartTime);
      const endTimeFormatted = newEventEndTime ? formatTimeForDisplay(newEventEndTime) : "";
      const timeString = newEventEndTime 
        ? `${startTimeFormatted} - ${endTimeFormatted}`
        : startTimeFormatted;

      await createEvent(
        newEventTitle,
        eventDate,
        timeString,
        newEventLocation,
        spots,
        newEventDetails
      );

      // Reset form
      setNewEventTitle("");
      setNewEventDate("");
      setNewEventStartTime("");
      setNewEventEndTime("");
      setNewEventLocation("");
      setNewEventSpots("");
      setNewEventDetails("");
      alert("Event created successfully!");
      await loadEvents(); // Reload events list
    } catch (error) {
      console.error("Error creating event:", error);
      alert("Failed to create event. Please try again.");
    } finally {
      setCreatingEvent(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Admin Panel</h1>
        <p className="text-muted-foreground">Manage groups, approve members, and view messages</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="groups">
            <Users className="w-4 h-4 mr-2" />
            Groups
          </TabsTrigger>
          <TabsTrigger value="events">
            <Calendar className="w-4 h-4 mr-2" />
            Events
          </TabsTrigger>
          <TabsTrigger value="graduation">
            <GraduationCap className="w-4 h-4 mr-2" />
            Graduation Applications
          </TabsTrigger>
          <TabsTrigger value="messages">
            <MessageSquare className="w-4 h-4 mr-2" />
            Direct Messages
          </TabsTrigger>
          <TabsTrigger value="courses">
            <BookOpen className="w-4 h-4 mr-2" />
            Courses
          </TabsTrigger>
        </TabsList>

        {/* Groups Tab */}
        <TabsContent value="groups" className="space-y-6">
          {/* Create Group */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Create New Group</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="group-name" className="text-foreground">
                  Group Name *
                </Label>
                <Input
                  id="group-name"
                  placeholder="Enter group name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="group-status" className="text-foreground">
                  Status *
                </Label>
                <select
                  id="group-status"
                  value={newGroupStatus}
                  onChange={(e) => setNewGroupStatus(e.target.value as "Open" | "Closed")}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground"
                >
                  <option value="Open">Open (Auto-join)</option>
                  <option value="Closed">Closed (Requires Approval)</option>
                </select>
              </div>
              <Button
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim() || creatingGroup}
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                {creatingGroup ? (
                  <>
                    <div className="w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Group
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Groups List */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">All Groups</h2>
            {groups.length === 0 ? (
              <Card className="p-8 text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No groups yet. Create your first group!</p>
              </Card>
            ) : (
              groups.map((group) => {
                const pendingMembers = getPendingMembers(group);
                return (
                  <Card key={group.id} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground mb-1">
                          {group.Name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={group.Status === "Open" ? "default" : "secondary"}
                          >
                            {group.Status}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {group.GroupMembers?.length || 0} members
                          </span>
                          {pendingMembers.length > 0 && (
                            <Badge variant="outline" className="text-accent border-accent">
                              {pendingMembers.length} pending
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Pending Members */}
                    {pendingMembers.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <h4 className="text-sm font-medium text-foreground mb-3">
                          Pending Members ({pendingMembers.length})
                        </h4>
                        <div className="space-y-2">
                          {pendingMembers.map((userId) => (
                            <div
                              key={userId}
                              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center">
                                  <span className="text-xs font-bold text-accent">
                                    {userId.substring(0, 2).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-foreground">
                                    User: {userId.substring(0, 8)}...
                                  </p>
                                  <p className="text-xs text-muted-foreground">UID: {userId}</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleApproveMember(group.id, userId)}
                                  className="bg-accent hover:bg-accent/90 text-accent-foreground"
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRejectMember(group.id, userId)}
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events" className="space-y-6">
          {/* Create Event */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Create New Event</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="event-title" className="text-foreground">
                    Event Title *
                  </Label>
                  <Input
                    id="event-title"
                    placeholder="Enter event title"
                    value={newEventTitle}
                    onChange={(e) => setNewEventTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-date" className="text-foreground">
                    Date *
                  </Label>
                  <Input
                    id="event-date"
                    type="date"
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-start-time" className="text-foreground">
                    Start Time *
                  </Label>
                  <Input
                    id="event-start-time"
                    type="time"
                    value={newEventStartTime}
                    onChange={(e) => setNewEventStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-end-time" className="text-foreground">
                    End Time (Optional)
                  </Label>
                  <Input
                    id="event-end-time"
                    type="time"
                    value={newEventEndTime}
                    onChange={(e) => setNewEventEndTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-location" className="text-foreground">
                    Location *
                  </Label>
                  <Input
                    id="event-location"
                    placeholder="Enter location"
                    value={newEventLocation}
                    onChange={(e) => setNewEventLocation(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-spots" className="text-foreground">
                    Available Spots *
                  </Label>
                  <Input
                    id="event-spots"
                    type="number"
                    min="1"
                    placeholder="Enter number of spots"
                    value={newEventSpots}
                    onChange={(e) => setNewEventSpots(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-details" className="text-foreground">
                  Details
                </Label>
                <Textarea
                  id="event-details"
                  placeholder="Enter event details..."
                  value={newEventDetails}
                  onChange={(e) => setNewEventDetails(e.target.value)}
                  rows={4}
                />
              </div>
              <Button
                onClick={handleCreateEvent}
                disabled={!newEventTitle.trim() || !newEventDate || !newEventStartTime || !newEventLocation || !newEventSpots || creatingEvent}
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                {creatingEvent ? (
                  <>
                    <div className="w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Event
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Events List */}
          <div className="space-y-4 mt-6">
            <h2 className="text-xl font-semibold text-foreground">All Events</h2>
            {loadingEvents ? (
              <Card className="p-8 text-center">
                <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading events...</p>
              </Card>
            ) : events.length === 0 ? (
              <Card className="p-8 text-center">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No events created yet.</p>
              </Card>
            ) : (
              events.map((event) => {
                const registeredCount = event.registered_users?.length || 0;
                const spotsLeft = event.total_spots - registeredCount;
                const eventDate = event.date.toDate ? event.date.toDate() : new Date(event.date);
                
                return (
                  <Card key={event.id} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                          {event.title}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{eventDate.toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>{event.time}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span>{event.location}</span>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-4">
                          <Badge variant="outline">
                            {registeredCount}/{event.total_spots} registered
                          </Badge>
                          {spotsLeft > 0 ? (
                            <Badge className="bg-green-500/10 text-green-600">
                              {spotsLeft} spots left
                            </Badge>
                          ) : (
                            <Badge className="bg-red-500/10 text-red-600">
                              Full
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Registered Users */}
                    {registeredCount > 0 && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <h4 className="text-sm font-medium text-foreground mb-3">
                          Registered Users ({registeredCount})
                        </h4>
                        <RegisteredUsersList userIds={event.registered_users || []} />
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Graduation Applications Tab */}
        <TabsContent value="graduation" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Graduation Applications
            </h2>
            {loadingApplications ? (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-accent" />
                <p className="text-sm text-muted-foreground">Loading applications...</p>
              </div>
            ) : graduationApplications.length === 0 ? (
              <Card className="p-8 text-center">
                <GraduationCap className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No graduation applications yet.</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {graduationApplications.map((application) => {
                  const isAdmitted = admissionStatus[application.userId] || false;
                  
                  return (
                  <Card key={application.id} className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-foreground">
                            {application.userName}
                          </h3>
                          {isAdmitted ? (
                            <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                              <GraduationCap className="w-3 h-3 mr-1" />
                              Admitted
                            </Badge>
                          ) : (
                            <Badge
                              variant={
                                application.status === "accepted"
                                  ? "default"
                                  : application.status === "rejected"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {application.status === "pending"
                                ? "Pending"
                                : application.status === "accepted"
                                ? "Accepted"
                                : "Rejected"}
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground mb-3">
                          <p>
                            <strong className="text-foreground">Email:</strong> {application.userEmail}
                          </p>
                          <div className="mt-2">
                            <strong className="text-foreground">Availability Windows:</strong>
                            <div className="mt-1 space-y-2">
                              {application.availabilitySlots && application.availabilitySlots.length > 0 ? (
                                application.availabilitySlots.map((slot, slotIndex) => (
                                  <div key={slotIndex} className="pl-4 border-l-2 border-accent/20">
                                    <p>
                                      <strong>Slot {slotIndex + 1}:</strong> {slot.date.toLocaleDateString()} from {slot.startTime} to {slot.endTime}
                                    </p>
                                  </div>
                                ))
                              ) : (
                                <p className="text-muted-foreground italic">No availability slots provided</p>
                              )}
                            </div>
                          </div>
                          {application.selectedTime && (
                            <p className="mt-2">
                              <strong className="text-foreground">Selected Time:</strong>{" "}
                              <span className="text-green-600 font-semibold">{application.selectedTime}</span>
                            </p>
                          )}
                          <p className="mt-2">
                            <strong className="text-foreground">Applied:</strong>{" "}
                            {application.createdAt.toDate().toLocaleString()}
                          </p>
                          {application.notes && (
                            <p>
                              <strong className="text-foreground">Notes:</strong> {application.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      {!isAdmitted && application.status === "pending" && (
                        <div className="flex flex-col items-end gap-3 ml-4">
                          {/* Time Selection */}
                          {application.availabilitySlots && application.availabilitySlots.length > 0 && (
                            <div className="w-full min-w-[200px] space-y-2">
                              <Label className="text-xs text-muted-foreground">Select Time from Availability:</Label>
                              <select
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={selectedTimes[application.id || ""] || ""}
                                onChange={(e) => {
                                  setSelectedTimes((prev) => ({
                                    ...prev,
                                    [application.id || ""]: e.target.value,
                                  }));
                                }}
                              >
                                <option value="">Choose a time...</option>
                                {application.availabilitySlots.map((slot, slotIndex) => {
                                  // Generate time options in 30-minute intervals
                                  const options: string[] = [];
                                  const [startHour, startMin] = slot.startTime.split(":").map(Number);
                                  const [endHour, endMin] = slot.endTime.split(":").map(Number);
                                  const startMinutes = startHour * 60 + startMin;
                                  const endMinutes = endHour * 60 + endMin;
                                  
                                  for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
                                    const hours = Math.floor(minutes / 60);
                                    const mins = minutes % 60;
                                    const timeStr = `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
                                    const dateStr = slot.date.toLocaleDateString();
                                    options.push(`${dateStr} at ${timeStr}`);
                                  }
                                  
                                  return options.map((option, optIndex) => (
                                    <option key={`${slotIndex}-${optIndex}`} value={option}>
                                      {option}
                                    </option>
                                  ));
                                })}
                              </select>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={async () => {
                                if (!user || !application.id) return;
                                const selectedTime = selectedTimes[application.id] || undefined;
                                try {
                                  await acceptGraduationApplication(application.id, user.uid, selectedTime);
                                  alert(selectedTime 
                                    ? `Application accepted with selected time: ${selectedTime}! You can now admit the user to upgrade their role.`
                                    : "Application accepted! You can now admit the user to upgrade their role.");
                                  // Reload applications
                                  const updated = await getGraduationApplications();
                                  setGraduationApplications(updated);
                                  // Clear selected time
                                  setSelectedTimes((prev) => {
                                    const newState = { ...prev };
                                    delete newState[application.id || ""];
                                    return newState;
                                  });
                                } catch (error) {
                                  console.error("Error accepting application:", error);
                                  alert("Failed to accept application. Please try again.");
                                }
                              }}
                              className="bg-blue-500 hover:bg-blue-600 text-white"
                              disabled={!selectedTimes[application.id || ""] && application.availabilitySlots && application.availabilitySlots.length > 0}
                            >
                              <Check className="w-4 h-4 mr-2" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={async () => {
                                if (!user || !application.id) return;
                                const notes = prompt("Enter rejection reason (optional):");
                                try {
                                  await rejectGraduationApplication(application.id, user.uid, notes || undefined);
                                  alert("Application rejected.");
                                  // Reload applications
                                  const updated = await getGraduationApplications();
                                  setGraduationApplications(updated);
                                } catch (error) {
                                  console.error("Error rejecting application:", error);
                                  alert("Failed to reject application. Please try again.");
                                }
                              }}
                            >
                              <X className="w-4 h-4 mr-2" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      )}
                      {!isAdmitted && application.status === "accepted" && (
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            size="sm"
                            onClick={async () => {
                              if (!application.userId) return;
                              try {
                                await admitUserToAlumni(application.userId);
                                alert("User has been admitted and upgraded to Digital Curriculum Alumni!");
                                // Reload applications and check admission status
                                const updated = await getGraduationApplications();
                                setGraduationApplications(updated);
                                // Refresh admission status
                                const userInfo = await getUserInfo(application.userId);
                                setAdmissionStatus((prev) => ({
                                  ...prev,
                                  [application.userId]: userInfo.isAdmitted || false,
                                }));
                              } catch (error) {
                                console.error("Error admitting user:", error);
                                alert("Failed to admit user. Please try again.");
                              }
                            }}
                            className="bg-green-500 hover:bg-green-600 text-white"
                          >
                            <GraduationCap className="w-4 h-4 mr-2" />
                            Admit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={async () => {
                              if (!user || !application.id) return;
                              const notes = prompt("Enter rejection reason (optional):");
                              try {
                                await rejectGraduationApplication(application.id, user.uid, notes || undefined);
                                alert("Application rejected.");
                                // Reload applications
                                const updated = await getGraduationApplications();
                                setGraduationApplications(updated);
                              } catch (error) {
                                console.error("Error rejecting application:", error);
                                alert("Failed to reject application. Please try again.");
                              }
                            }}
                          >
                            <X className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Direct Messages Tab */}
        <TabsContent value="messages" className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Direct Messages from Students</h2>
          {dms.length === 0 ? (
            <Card className="p-8 text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No messages yet</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Messages List */}
              <div className="space-y-4">
                {dms.map((dm) => (
                  <Card
                    key={dm.id}
                    className={`p-4 cursor-pointer transition-all ${
                      selectedDM === dm.id ? "border-accent border-2" : ""
                    }`}
                    onClick={async () => {
                      setSelectedDM(dm.id);
                      const replies = await loadDMReplies(dm.id);
                      setDmReplies(replies);
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-accent">
                            {dm.uid.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {dm.uid.substring(0, 8)}...
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatTime(dm.created_at)}
                          </p>
                        </div>
                      </div>
                      {!dm.read && (
                        <Badge className="bg-accent text-accent-foreground text-xs">
                          New
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-foreground line-clamp-2">{dm.message}</p>
                  </Card>
                ))}
              </div>

              {/* Conversation View */}
              {selectedDM && (
                <Card className="p-6 h-[600px] flex flex-col">
                  {(() => {
                    const currentDM = dms.find((d) => d.id === selectedDM);
                    if (!currentDM) return null;

                    return (
                      <>
                        <div className="mb-4 pb-4 border-b border-border">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
                              <span className="text-sm font-bold text-accent">
                                {currentDM.uid.substring(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                User: {currentDM.uid.substring(0, 8)}...
                              </p>
                              <p className="text-xs text-muted-foreground">
                                UID: {currentDM.uid}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                          {/* Original Message */}
                          <div className="flex gap-3">
                            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold">User</span>
                            </div>
                            <div className="flex-1">
                              <div className="bg-muted rounded-lg px-4 py-2">
                                <p className="text-sm text-foreground whitespace-pre-wrap">
                                  {currentDM.message}
                                </p>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 px-1">
                                {formatTime(currentDM.created_at)}
                              </p>
                            </div>
                          </div>

                          {/* Replies */}
                          {dmReplies.map((reply) => (
                            <div
                              key={reply.id}
                              className={`flex gap-3 ${
                                reply.sender === "mortar" ? "" : "flex-row-reverse"
                              }`}
                            >
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                  reply.sender === "mortar"
                                    ? "bg-accent text-accent-foreground"
                                    : "bg-muted text-foreground"
                                }`}
                              >
                                <span className="text-xs font-bold">
                                  {reply.sender === "mortar" ? "M" : "User"}
                                </span>
                              </div>
                              <div
                                className={`flex-1 ${
                                  reply.sender === "mortar" ? "" : "flex flex-col items-end"
                                }`}
                              >
                                <div
                                  className={`rounded-lg px-4 py-2 ${
                                    reply.sender === "mortar"
                                      ? "bg-accent text-accent-foreground"
                                      : "bg-muted text-foreground"
                                  }`}
                                >
                                  <p className="text-sm whitespace-pre-wrap">
                                    {reply.message}
                                  </p>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 px-1">
                                  {formatTime(reply.created_at)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Reply Input */}
                        <div className="border-t border-border pt-4">
                          <div className="space-y-2">
                            <Textarea
                              placeholder="Type your reply..."
                              value={replyMessage}
                              onChange={(e) => setReplyMessage(e.target.value)}
                              rows={3}
                              className="resize-none"
                            />
                            <Button
                              onClick={() => handleReply(selectedDM)}
                              disabled={!replyMessage.trim() || replying}
                              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                            >
                              {replying ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                  Sending...
                                </>
                              ) : (
                                <>
                                  <Send className="w-4 h-4 mr-2" />
                                  Send Reply
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Courses Tab */}
        <TabsContent value="courses" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">Create New Course</h2>
              <Button
                onClick={() => navigate("/admin/courses/create")}
                className="bg-accent hover:bg-accent/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Start Course Wizard
              </Button>
            </div>
            <p className="text-muted-foreground mb-4">
              Use the step-by-step wizard to create your course, or use the form below for quick creation.
            </p>
            
            <div className="mb-6">
              <Separator />
            </div>
            
            <h3 className="text-lg font-semibold text-foreground mb-4">Quick Create (Legacy)</h3>
            
            <div className="space-y-6">
              {/* Basic Course Info */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="course-title" className="text-foreground">
                    Course Title *
                  </Label>
                  <Input
                    id="course-title"
                    placeholder="Enter course title"
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="course-description" className="text-foreground">
                    Description
                  </Label>
                  <Textarea
                    id="course-description"
                    placeholder="Enter course description"
                    value={courseDescription}
                    onChange={(e) => setCourseDescription(e.target.value)}
                    rows={3}
                  />
                </div>

              </div>

              {/* Modules */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-foreground text-lg font-semibold">Modules</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCourseModules([
                        ...courseModules,
                        {
                          title: "",
                          description: "",
                          price: "",
                          durationMonths: "",
                          lessons: [{ title: "" }],
                        },
                      ]);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Module
                  </Button>
                </div>

                {courseModules.map((module, moduleIndex) => (
                  <Card key={moduleIndex} className="p-4 border-border">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-foreground">Module {moduleIndex + 1}</h3>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCourseModules(courseModules.filter((_, i) => i !== moduleIndex));
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-foreground">Module Title *</Label>
                        <Input
                          placeholder="Enter module title"
                          value={module.title}
                          onChange={(e) => {
                            const updated = [...courseModules];
                            updated[moduleIndex].title = e.target.value;
                            setCourseModules(updated);
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-foreground">Module Description</Label>
                        <Textarea
                          placeholder="Enter module description"
                          value={module.description}
                          onChange={(e) => {
                            const updated = [...courseModules];
                            updated[moduleIndex].description = e.target.value;
                            setCourseModules(updated);
                          }}
                          rows={2}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-foreground">Module Price ($) *</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={module.price}
                            onChange={(e) => {
                              const updated = [...courseModules];
                              updated[moduleIndex].price = e.target.value;
                              setCourseModules(updated);
                            }}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-foreground">Duration (months) *</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.1"
                            placeholder="0"
                            value={module.durationMonths}
                            onChange={(e) => {
                              const updated = [...courseModules];
                              updated[moduleIndex].durationMonths = e.target.value;
                              setCourseModules(updated);
                            }}
                          />
                        </div>
                      </div>

                      {/* Lessons */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-foreground font-medium">Lessons</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const updated = [...courseModules];
                              updated[moduleIndex].lessons.push({ title: "" });
                              setCourseModules(updated);
                            }}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Lesson
                          </Button>
                        </div>

                        {module.lessons.map((lesson, lessonIndex) => (
                          <Card key={lessonIndex} className="p-3 border-border bg-muted/30">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">Lesson {lessonIndex + 1}</Label>
                                {module.lessons.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      const updated = [...courseModules];
                                      updated[moduleIndex].lessons = updated[moduleIndex].lessons.filter(
                                        (_, i) => i !== lessonIndex
                                      );
                                      setCourseModules(updated);
                                    }}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>

                              <div className="space-y-2">
                                <Label className="text-sm">Lesson Title *</Label>
                                <Input
                                  placeholder="Enter lesson title"
                                  value={lesson.title}
                                  onChange={(e) => {
                                    const updated = [...courseModules];
                                    updated[moduleIndex].lessons[lessonIndex].title = e.target.value;
                                    setCourseModules(updated);
                                  }}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label className="text-sm">Lesson Content</Label>
                                <div className="flex items-center gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      // Navigate to lesson deck builder
                                      // First, we need to ensure the curriculum/module/chapter/lesson structure exists
                                      // This will be handled when the course is created
                                      alert("Please create the course first, then click 'Build Lesson Content' from the course list to create lesson slides.");
                                    }}
                                    className="text-sm"
                                  >
                                    <BookOpen className="w-4 h-4 mr-2" />
                                    Build Lesson Content
                                  </Button>
                                  <p className="text-xs text-muted-foreground">
                                    Create slides after course is created
                                  </p>
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Assignment */}
              <div className="space-y-4">
                <Label className="text-foreground text-lg font-semibold">Assignment</Label>
                
                <div className="space-y-2">
                  <Label className="text-foreground">Assign To</Label>
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
                    <option value="user">Specific Users</option>
                  </select>
                </div>

                {assignmentType === "role" ? (
                  <div className="space-y-2">
                    <Label className="text-foreground">Select Roles</Label>
                    <div className="space-y-2">
                      {["Digital Curriculum Students", "Digital Curriculum Alumni", "superAdmin"].map((role) => (
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
                    <Label htmlFor="user-email" className="text-foreground">User Email *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="user-email"
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
                        type="button"
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
                    <p className="text-xs text-muted-foreground">
                      Enter the email address and click "Validate" to verify the user exists. You can also press Enter.
                    </p>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleCreateCourse}
                disabled={creatingCourse || !courseTitle || courseModules.length === 0 || courseModules.some(m => !m.title || !m.price || !m.durationMonths)}
                className="w-full"
              >
                {creatingCourse ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Course...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Create Course
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Courses List */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">All Courses</h2>
            {loadingCourses ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : courses.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No courses created yet</p>
            ) : (
              <div className="space-y-4">
                {courses.map((course) => (
                  <Card key={course.id} className="p-4 border-border">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground">{course.title}</h3>
                          <Badge variant={course.status === "published" ? "default" : "secondary"}>
                            {course.status || "draft"}
                          </Badge>
                        </div>
                        {course.description && (
                          <p className="text-sm text-muted-foreground mb-2">{course.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{course.modules.length} modules</span>
                          <span>Total: ${course.totalPrice?.toFixed(2) || course.modules.reduce((sum, m) => sum + (m.price || 0), 0).toFixed(2)}</span>
                          {course.assignedRoles && course.assignedRoles.length > 0 && (
                            <span>Roles: {course.assignedRoles.join(", ")}</span>
                          )}
                          {course.assignedUserIds && course.assignedUserIds.length > 0 && (
                            <span>{course.assignedUserIds.length} users</span>
                          )}
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          Module prices: {course.modules.map((m, i) => `$${m.price?.toFixed(2) || "0.00"}`).join(", ")}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.location.href = `/courses/${course.id}`}
                      >
                        View Details
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
