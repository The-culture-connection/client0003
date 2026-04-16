import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Separator } from "../components/ui/separator";
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
  Monitor,
  GraduationCap,
  Image as ImageIcon,
  Check,
  X,
  BookOpen,
  Upload,
  Trash2,
  UserCog,
  Eye,
  FileText,
  Award,
  Download,
  ShoppingBag,
  BarChart3,
  Pencil,
  KeyRound,
  Smartphone,
  ShieldAlert,
  Megaphone,
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
  where,
  getDocs,
  getDoc,
  orderBy,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db, storage } from "../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  createEvent,
  getAllEventsForAdmin,
  setMemberEventApproval,
  type AdminListedEvent,
  type Event,
  type EventDistribution,
  type EventType,
} from "../lib/events";
import {
  subscribeShopItems,
  createShopItem,
  updateShopItem,
  deleteShopItem,
  SHOP_CATEGORIES,
  SHOP_SIZES,
  isApparelCategory,
  type ShopSize,
  type ShopItem,
  type ShopCategory,
} from "../lib/shop";
import {
  getGraduationApplications,
  acceptGraduationApplication,
  rejectGraduationApplication,
  admitUserToAlumni,
  setUserAdminRole,
  type GraduationApplication,
} from "../lib/graduation";
import { listCertificates, listSurveyResponses, type SkillCertificate, type SurveyResponseDocument } from "../lib/dataroom";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { format } from "date-fns";
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
import { AppAccessHubPanel } from "../components/admin/AppAccessHubPanel";
import { MobileModerationPanel } from "../components/admin/MobileModerationPanel";
import { MortarInfoAdminPanel } from "../components/admin/MortarInfoAdminPanel";
import { AnalyticsDashboardPanel } from "../components/admin/AnalyticsDashboardPanel";
import { registerDigitalCurriculumAlumniEligible } from "../lib/expansionEligible";

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
  const navigate = useNavigate();
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
  const [newEventType, setNewEventType] = useState<EventType>("In-person");
  const [newEventDistribution, setNewEventDistribution] =
    useState<EventDistribution>("curriculum");
  const [newEventSpots, setNewEventSpots] = useState("");
  const [newEventImageUrl, setNewEventImageUrl] = useState("");
  const [newEventImageFile, setNewEventImageFile] = useState<File | null>(null);
  const [newEventDetails, setNewEventDetails] = useState("");
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [events, setEvents] = useState<AdminListedEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [rejectDialogEvent, setRejectDialogEvent] = useState<Event | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [eventApprovalBusyId, setEventApprovalBusyId] = useState<string | null>(null);
  const [graduationApplications, setGraduationApplications] = useState<GraduationApplication[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [admissionStatus, setAdmissionStatus] = useState<Record<string, boolean>>({});
  const [selectedTimes, setSelectedTimes] = useState<Record<string, string>>({});
  /** Plain invite code after Admit → Expansion eligible user (copy from banner). */
  const [alumniExpansionInvite, setAlumniExpansionInvite] = useState<{
    email: string;
    code: string;
  } | null>(null);

  // Add Admin state
  const [adminEmail, setAdminEmail] = useState("");
  const [adminRole, setAdminRole] = useState<"Admin" | "superAdmin">("Admin");
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [addAdminError, setAddAdminError] = useState<string | null>(null);
  const [currentAdmins, setCurrentAdmins] = useState<Array<{ userId: string; email: string; name: string; roles: string[] }>>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);

  // View User Profile (Data Room) state
  const [viewProfileUserId, setViewProfileUserId] = useState<string | null>(null);
  const [viewProfileUser, setViewProfileUser] = useState<{ name: string; email: string; roles: string[] } | null>(null);
  const [viewProfileCerts, setViewProfileCerts] = useState<SkillCertificate[]>([]);
  const [viewProfileSurveys, setViewProfileSurveys] = useState<SurveyResponseDocument[]>([]);
  const [viewProfileLoading, setViewProfileLoading] = useState(false);

  // Group creation state
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupStatus, setNewGroupStatus] = useState<"Open" | "Closed">("Open");
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Course state
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);

  // Shop state
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [loadingShop, setLoadingShop] = useState(false);
  const [shopItemName, setShopItemName] = useState("");
  const [shopItemPrice, setShopItemPrice] = useState("");
  const [shopItemPictureFile, setShopItemPictureFile] = useState<File | null>(null);
  const [shopItemPictureUrl, setShopItemPictureUrl] = useState("");
  const [shopItemCategory, setShopItemCategory] = useState<ShopCategory>("Tees");
  const [shopItemStockQuantity, setShopItemStockQuantity] = useState("0");
  const [shopItemLowStockThreshold, setShopItemLowStockThreshold] = useState("5");
  const [shopItemSizeStocks, setShopItemSizeStocks] = useState<Record<ShopSize, string>>({
    Small: "0",
    Medium: "0",
    Large: "0",
    XL: "0",
    "2XL": "0",
  });
  const [creatingShopItem, setCreatingShopItem] = useState(false);
  // Edit shop item state
  const [editShopItemId, setEditShopItemId] = useState<string | null>(null);
  const [editShopItemName, setEditShopItemName] = useState("");
  const [editShopItemPrice, setEditShopItemPrice] = useState("");
  const [editShopItemCategory, setEditShopItemCategory] = useState<ShopCategory>("Tees");
  const [editShopItemPictureFile, setEditShopItemPictureFile] = useState<File | null>(null);
  const [editShopItemPictureUrl, setEditShopItemPictureUrl] = useState("");
  const [editShopItemStockQuantity, setEditShopItemStockQuantity] = useState("0");
  const [editShopItemLowStockThreshold, setEditShopItemLowStockThreshold] = useState("5");
  const [editShopItemSizeStocks, setEditShopItemSizeStocks] = useState<Record<ShopSize, string>>({
    Small: "0",
    Medium: "0",
    Large: "0",
    XL: "0",
    "2XL": "0",
  });
  const [savingShopItem, setSavingShopItem] = useState(false);

  useEffect(() => {
    loadData();
    loadCourses();
  }, []);

  useEffect(() => {
    if (!viewProfileUserId) {
      setViewProfileUser(null);
      setViewProfileCerts([]);
      setViewProfileSurveys([]);
      return;
    }
    let cancelled = false;
    setViewProfileLoading(true);
    (async () => {
      try {
        const [userSnap, certs, surveys] = await Promise.all([
          getDoc(doc(db, "users", viewProfileUserId)),
          listCertificates(viewProfileUserId),
          listSurveyResponses(viewProfileUserId),
        ]);
        if (cancelled) return;
        const userData = userSnap.exists() ? userSnap.data() : {};
        setViewProfileUser({
          name: `${userData.first_name || ""} ${userData.last_name || ""}`.trim() || userData.display_name || userData.email || "Unknown",
          email: userData.email || "No email",
          roles: Array.isArray(userData.roles) ? userData.roles : [],
        });
        setViewProfileCerts(certs);
        setViewProfileSurveys(surveys);
      } catch (e) {
        if (!cancelled) {
          setViewProfileUser(null);
          setViewProfileCerts([]);
          setViewProfileSurveys([]);
        }
      } finally {
        if (!cancelled) setViewProfileLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [viewProfileUserId]);

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
        getAllEventsForAdmin(),
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
      const eventsData = await getAllEventsForAdmin();
      setEvents(eventsData);
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleApproveMemberEvent = async (eventId: string) => {
    setEventApprovalBusyId(eventId);
    try {
      await setMemberEventApproval(eventId, true);
      await loadEvents();
    } catch (e) {
      console.error(e);
      alert("Could not approve this event. Check Firestore rules and your admin role.");
    } finally {
      setEventApprovalBusyId(null);
    }
  };

  const handleConfirmRejectMemberEvent = async () => {
    if (!rejectDialogEvent) return;
    setEventApprovalBusyId(rejectDialogEvent.id);
    try {
      await setMemberEventApproval(rejectDialogEvent.id, false, rejectReason);
      setRejectDialogEvent(null);
      setRejectReason("");
      await loadEvents();
    } catch (e) {
      console.error(e);
      alert("Could not decline this event. Check Firestore rules and your admin role.");
    } finally {
      setEventApprovalBusyId(null);
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
    
    const userDoc = usersSnapshot.docs.find((d) => {
      const data = d.data();
      const userEmail = data.email || data.email_address || null;
      return userEmail && userEmail.toLowerCase() === email.toLowerCase();
    });

    if (!userDoc) {
      throw new Error("User does not exist");
    }

    return userDoc.id;
  };

  const loadCurrentAdmins = async () => {
    setLoadingAdmins(true);
    try {
      const usersRef = collection(db, "users");
      const [adminSnap, superSnap] = await Promise.all([
        getDocs(query(usersRef, where("roles", "array-contains", "Admin"))),
        getDocs(query(usersRef, where("roles", "array-contains", "superAdmin"))),
      ]);
      const byId = new Map<string, { userId: string; email: string; name: string; roles: Set<string> }>();
      const addFromDoc = (docId: string, data: Record<string, unknown> | undefined) => {
        const safeData = data ?? {};
        const roles = (safeData.roles as string[] | undefined) ?? [];
        const adminRoles = roles.filter((r) => r === "Admin" || r === "superAdmin");
        if (adminRoles.length === 0) return;
        const name = `${(safeData.first_name || "")} ${(safeData.last_name || "")}`.trim() || (safeData.display_name as string) || (safeData.email as string) || "Unknown";
        if (!byId.has(docId)) {
          byId.set(docId, {
            userId: docId,
            email: (safeData.email as string) || "No email",
            name,
            roles: new Set(adminRoles),
          });
        } else {
          adminRoles.forEach((r) => byId.get(docId)!.roles.add(r));
        }
      };
      adminSnap.docs.forEach((d) => addFromDoc(d.id, d.data()));
      superSnap.docs.forEach((d) => addFromDoc(d.id, d.data()));
      setCurrentAdmins(
        Array.from(byId.values()).map((a) => ({
          userId: a.userId,
          email: a.email,
          name: a.name,
          roles: Array.from(a.roles).sort(),
        }))
      );
    } catch (e) {
      console.error("Error loading admins:", e);
      setCurrentAdmins([]);
    } finally {
      setLoadingAdmins(false);
    }
  };

  useEffect(() => {
    if (activeTab === "admins") loadCurrentAdmins();
  }, [activeTab]);

  // Real-time shop items so admin sees stockQuantity updates from all users (add-to-cart, 24h release)
  useEffect(() => {
    if (activeTab !== "shop") return;
    setLoadingShop(true);
    const unsubscribe = subscribeShopItems((items) => {
      setShopItems(items);
      setLoadingShop(false);
    });
    return () => unsubscribe();
  }, [activeTab]);

  const handleAddShopItem = async () => {
    const name = shopItemName.trim();
    if (!name) {
      alert("Enter an item name.");
      return;
    }
    const price = parseFloat(shopItemPrice);
    if (isNaN(price) || price < 0) {
      alert("Enter a valid price.");
      return;
    }
    const lowStockThreshold = parseInt(shopItemLowStockThreshold, 10);
    if (isNaN(lowStockThreshold) || lowStockThreshold < 0) {
      alert("Enter a valid low stock threshold (0 or greater).");
      return;
    }

    const apparel = isApparelCategory(shopItemCategory);
    let stockQuantity = 0;
    let sizeStocks: Partial<Record<ShopSize, number>> | undefined = undefined;

    if (apparel) {
      const parsed: Partial<Record<ShopSize, number>> = {};
      for (const size of SHOP_SIZES) {
        const v = parseInt(shopItemSizeStocks[size] ?? "0", 10);
        if (isNaN(v) || v < 0) {
          alert(`Enter a valid stock quantity for ${size} (0 or greater).`);
          return;
        }
        parsed[size] = v;
        stockQuantity += v;
      }
      sizeStocks = parsed;
    } else {
      stockQuantity = parseInt(shopItemStockQuantity, 10);
      if (isNaN(stockQuantity) || stockQuantity < 0) {
        alert("Enter a valid stock quantity (0 or greater).");
        return;
      }
    }
    let pictureUrl = shopItemPictureUrl.trim();
    if (!pictureUrl && !shopItemPictureFile) {
      alert("Add a picture (upload or paste an image URL).");
      return;
    }

    // Show loading spinner immediately (before any await)
    setCreatingShopItem(true);
    try {
      if (shopItemPictureFile) {
        const path = `shop/${Date.now()}_${shopItemPictureFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, shopItemPictureFile, {
          contentType: shopItemPictureFile.type || "image/jpeg",
        });
        pictureUrl = await getDownloadURL(storageRef);
      }
      if (!pictureUrl) {
        alert("Add a picture (upload or paste an image URL).");
        return;
      }
      await createShopItem({
        name,
        price,
        picture: pictureUrl,
        category: shopItemCategory,
        stockQuantity,
        lowStockThreshold,
        sizeStocks,
      });
      setShopItemName("");
      setShopItemPrice("");
      setShopItemPictureFile(null);
      setShopItemPictureUrl("");
      setShopItemCategory("Tees");
      setShopItemStockQuantity("0");
      setShopItemLowStockThreshold("5");
      setShopItemSizeStocks({
        Small: "0",
        Medium: "0",
        Large: "0",
        XL: "0",
        "2XL": "0",
      });
    } catch (e) {
      console.error("Error creating shop item:", e);
      alert("Failed to add item. Please try again.");
    } finally {
      setCreatingShopItem(false);
    }
  };

  const openEditShopItem = (item: ShopItem) => {
    setEditShopItemId(item.id);
    setEditShopItemName(item.name ?? "");
    setEditShopItemPrice(String(item.price ?? 0));
    setEditShopItemCategory(item.category ?? "Tees");
    setEditShopItemPictureFile(null);
    setEditShopItemPictureUrl(item.picture ?? "");
    setEditShopItemStockQuantity(String(item.stockQuantity ?? 0));
    setEditShopItemLowStockThreshold(String(item.lowStockThreshold ?? 5));
    if (isApparelCategory(item.category)) {
      const ss = item.sizeStocks ?? {};
      setEditShopItemSizeStocks({
        Small: String(ss.Small ?? 0),
        Medium: String(ss.Medium ?? 0),
        Large: String(ss.Large ?? 0),
        XL: String(ss.XL ?? 0),
        "2XL": String(ss["2XL"] ?? 0),
      });
    } else {
      setEditShopItemSizeStocks({
        Small: "0",
        Medium: "0",
        Large: "0",
        XL: "0",
        "2XL": "0",
      });
    }
    setSavingShopItem(false);
  };

  const handleSaveEditedShopItem = async () => {
    if (!editShopItemId) return;
    const name = editShopItemName.trim();
    if (!name) {
      alert("Enter an item name.");
      return;
    }
    const price = parseFloat(editShopItemPrice);
    if (isNaN(price) || price < 0) {
      alert("Enter a valid price.");
      return;
    }
    const apparel = isApparelCategory(editShopItemCategory);
    let stockQuantity = 0;
    let sizeStocks: Partial<Record<ShopSize, number>> | undefined = undefined;

    if (apparel) {
      const parsed: Partial<Record<ShopSize, number>> = {};
      for (const size of SHOP_SIZES) {
        const v = parseInt(editShopItemSizeStocks[size] ?? "0", 10);
        if (isNaN(v) || v < 0) {
          alert(`Enter a valid stock quantity for ${size} (0 or greater).`);
          return;
        }
        parsed[size] = v;
        stockQuantity += v;
      }
      sizeStocks = parsed;
    } else {
      stockQuantity = parseInt(editShopItemStockQuantity, 10);
      if (isNaN(stockQuantity) || stockQuantity < 0) {
        alert("Enter a valid stock quantity (0 or greater).");
        return;
      }
    }
    const lowStockThreshold = parseInt(editShopItemLowStockThreshold, 10);
    if (isNaN(lowStockThreshold) || lowStockThreshold < 0) {
      alert("Enter a valid low stock threshold (0 or greater).");
      return;
    }

    let pictureUrl = editShopItemPictureUrl.trim();
    if (editShopItemPictureFile) {
      try {
        const path = `shop/${Date.now()}_${editShopItemPictureFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, editShopItemPictureFile, {
          contentType: editShopItemPictureFile.type || "image/jpeg",
        });
        pictureUrl = await getDownloadURL(storageRef);
      } catch (e) {
        console.error("Error uploading edited shop image:", e);
        alert("Failed to upload image. Try again or use an image URL.");
        return;
      }
    }

    if (!pictureUrl) {
      alert("Provide a picture URL or upload an image.");
      return;
    }

    setSavingShopItem(true);
    try {
      await updateShopItem(editShopItemId, {
        name,
        price,
        picture: pictureUrl,
        category: editShopItemCategory,
        stockQuantity,
        lowStockThreshold,
        sizeStocks,
      });
      // List updates via real-time subscribeShopItems
      setEditShopItemId(null);
      setEditShopItemName("");
      setEditShopItemPrice("");
      setEditShopItemPictureFile(null);
      setEditShopItemPictureUrl("");
      setEditShopItemCategory("Tees");
      setEditShopItemStockQuantity("0");
      setEditShopItemLowStockThreshold("5");
      setEditShopItemSizeStocks({
        Small: "0",
        Medium: "0",
        Large: "0",
        XL: "0",
        "2XL": "0",
      });
    } catch (e) {
      console.error("Error saving shop item:", e);
      alert("Failed to save changes. Please try again.");
    } finally {
      setSavingShopItem(false);
    }
  };

  const handleAddAdmin = async () => {
    const email = adminEmail.trim();
    if (!email) {
      setAddAdminError("Enter an email address.");
      return;
    }
    setAddAdminError(null);
    setAddingAdmin(true);
    try {
      const userId = await validateAndGetUserId(email);
      await setUserAdminRole(userId, adminRole);
      alert(`${email} has been granted the ${adminRole} role.`);
      setAdminEmail("");
      loadCurrentAdmins();
    } catch (err) {
      setAddAdminError(err instanceof Error ? err.message : "Failed to add admin.");
    } finally {
      setAddingAdmin(false);
    }
  };

  // Course creation is now handled in CourseBuilder component

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
    if (!newEventTitle.trim() || !newEventDate || !newEventStartTime || !newEventLocation) {
      alert("Please fill in all required fields (Title, Date, Start Time, Location).");
      return;
    }

    const spotsRaw = newEventSpots.trim();
    const spots = spotsRaw ? parseInt(spotsRaw, 10) : undefined;
    if (spotsRaw && (isNaN(spots!) || spots! <= 0)) {
      alert("Available spots must be a positive number when provided.");
      return;
    }

    setCreatingEvent(true);
    try {
      const eventDate = new Date(newEventDate);
      const startTimeFormatted = formatTimeForDisplay(newEventStartTime);
      const endTimeFormatted = newEventEndTime ? formatTimeForDisplay(newEventEndTime) : "";
      const timeString = newEventEndTime
        ? `${startTimeFormatted} - ${endTimeFormatted}`
        : startTimeFormatted;

      let imageUrl = newEventImageUrl.trim() || undefined;
      if (newEventImageFile) {
        const path = `events/images/${Date.now()}_${newEventImageFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, newEventImageFile, {
          contentType: newEventImageFile.type || "image/jpeg",
        });
        imageUrl = await getDownloadURL(storageRef);
      }

      await createEvent(
        newEventTitle,
        eventDate,
        timeString,
        newEventLocation,
        newEventDetails,
        {
          availableSpots: spots,
          eventType: newEventType,
          imageUrl,
          distribution: newEventDistribution,
        }
      );

      setNewEventTitle("");
      setNewEventDate("");
      setNewEventStartTime("");
      setNewEventEndTime("");
      setNewEventLocation("");
      setNewEventType("In-person");
      setNewEventDistribution("curriculum");
      setNewEventSpots("");
      setNewEventImageUrl("");
      setNewEventImageFile(null);
      setNewEventDetails("");
      alert("Event created successfully!");
      await loadEvents();
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
        <TabsList className="flex flex-wrap h-auto gap-1">
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
            Alumni Applications
          </TabsTrigger>
          <TabsTrigger value="admins">
            <UserCog className="w-4 h-4 mr-2" />
            Admins
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="app-access-hub">
            <KeyRound className="w-4 h-4 mr-2" />
            App Access Hub
          </TabsTrigger>
          <TabsTrigger value="expansion-mobile">
            <ShieldAlert className="w-4 h-4 mr-2" />
            Expansion mobile
          </TabsTrigger>
          <TabsTrigger value="mortar-info">
            <Megaphone className="w-4 h-4 mr-2" />
            Mortar Info
          </TabsTrigger>
          <TabsTrigger value="messages">
            <MessageSquare className="w-4 h-4 mr-2" />
            Direct Messages
          </TabsTrigger>
          <TabsTrigger value="courses">
            <BookOpen className="w-4 h-4 mr-2" />
            Courses
          </TabsTrigger>
          <TabsTrigger value="shop">
            <ShoppingBag className="w-4 h-4 mr-2" />
            Shop
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
                    placeholder="e.g. Virtual, Cincinnati Hub, or full address"
                    value={newEventLocation}
                    onChange={(e) => setNewEventLocation(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Event type</Label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setNewEventType("In-person")}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        newEventType === "In-person"
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border bg-card text-muted-foreground hover:border-accent/50"
                      }`}
                    >
                      <MapPin className="w-4 h-4" />
                      In-person
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewEventType("Online")}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        newEventType === "Online"
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border bg-card text-muted-foreground hover:border-accent/50"
                      }`}
                    >
                      <Monitor className="w-4 h-4" />
                      Online
                    </button>
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-foreground">Where to publish</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Curriculum = web Events hub only. Mobile = Expansion app only. Both = same event id in both Firestore collections (RSVPs stay in sync).
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setNewEventDistribution("curriculum")}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        newEventDistribution === "curriculum"
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border bg-card text-muted-foreground hover:border-accent/50"
                      }`}
                    >
                      <BookOpen className="w-4 h-4" />
                      Digital Curriculum only
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewEventDistribution("mobile")}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        newEventDistribution === "mobile"
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border bg-card text-muted-foreground hover:border-accent/50"
                      }`}
                    >
                      <Smartphone className="w-4 h-4" />
                      Expansion (mobile) only
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewEventDistribution("both")}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        newEventDistribution === "both"
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border bg-card text-muted-foreground hover:border-accent/50"
                      }`}
                    >
                      <Calendar className="w-4 h-4" />
                      Both
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-spots" className="text-foreground">
                    Available Spots (Optional)
                  </Label>
                  <Input
                    id="event-spots"
                    type="number"
                    min="1"
                    placeholder="Leave empty for no limit"
                    value={newEventSpots}
                    onChange={(e) => setNewEventSpots(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-image" className="text-foreground flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Event image (optional)
                </Label>
                <div className="space-y-2">
                  <Input
                    id="event-image"
                    type="url"
                    placeholder="Image URL (e.g. https://...)"
                    value={newEventImageUrl}
                    onChange={(e) => {
                      setNewEventImageUrl(e.target.value);
                      setNewEventImageFile(null);
                    }}
                  />
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>or</span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Upload className="w-4 h-4" />
                      <span>Upload image</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setNewEventImageFile(file);
                            setNewEventImageUrl("");
                          }
                        }}
                      />
                    </label>
                    {newEventImageFile && (
                      <span className="text-accent text-xs">
                        {newEventImageFile.name}
                      </span>
                    )}
                  </div>
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
                disabled={!newEventTitle.trim() || !newEventDate || !newEventStartTime || !newEventLocation || creatingEvent}
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
            <p className="text-sm text-muted-foreground">
              Lists <strong>events</strong> (curriculum web) and <strong>events_mobile</strong> (Expansion app), merged by id. Member submissions from the app are <strong>Pending approval</strong> in <code className="text-xs bg-muted px-1 rounded">events_mobile</code>. Approve to publish on the mobile feed; use <strong>Where to publish</strong> above when creating from admin.
            </p>
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
                const totalSpots = event.total_spots ?? 0;
                const spotsLeft = totalSpots > 0 ? totalSpots - registeredCount : null;
                const eventDate =
                  event.date != null
                    ? event.date.toDate
                      ? event.date.toDate()
                      : new Date(event.date as unknown as string)
                    : null;
                const eventType = event.event_type || "In-person";
                const approval = event.approval_status;
                const isPending = approval === "pending";
                const isRejected = approval === "rejected";
                const busy = eventApprovalBusyId === event.id;
                const platformLabel =
                  event.adminPlatforms.length === 2
                    ? "Curriculum + Mobile"
                    : event.adminPlatforms.includes("mobile")
                      ? "Mobile app"
                      : "Curriculum web";

                return (
                  <Card key={event.id} className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      {event.image_url && (
                        <img
                          src={event.image_url}
                          alt=""
                          className="w-24 h-24 object-cover rounded-lg shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-foreground">
                            {event.title}
                          </h3>
                          <Badge variant="outline" className="text-xs font-normal">
                            {platformLabel}
                          </Badge>
                          {isPending && (
                            <Badge className="bg-amber-500/15 text-amber-800 border-amber-500/30">
                              Pending approval
                            </Badge>
                          )}
                          {isRejected && (
                            <Badge variant="destructive">Declined</Badge>
                          )}
                          {!isPending && !isRejected && event.created_by && (
                            <Badge variant="outline" className="text-xs">
                              Published
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge variant="secondary" className="text-xs">
                            {eventType}
                          </Badge>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>
                                {eventDate ? eventDate.toLocaleDateString() : "Date TBD"}
                              </span>
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
                        </div>
                        {event.created_by && (
                          <p className="text-xs text-muted-foreground mb-2">
                            Submitted by UID:{" "}
                            <span className="font-mono break-all">{event.created_by}</span>
                          </p>
                        )}
                        {event.details ? (
                          <p className="text-sm text-foreground/90 whitespace-pre-wrap mb-3 border-l-2 border-border pl-3">
                            {event.details}
                          </p>
                        ) : null}
                        {isRejected && event.rejection_reason ? (
                          <p className="text-sm text-destructive mb-3">
                            Reason: {event.rejection_reason}
                          </p>
                        ) : null}
                        {isPending && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            <Button
                              type="button"
                              size="sm"
                              className="bg-green-600 hover:bg-green-600/90 text-white"
                              disabled={busy}
                              onClick={() => handleApproveMemberEvent(event.id)}
                            >
                              {busy ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Check className="w-4 h-4 mr-1" />
                                  Approve
                                </>
                              )}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() => {
                                setRejectReason("");
                                setRejectDialogEvent(event);
                              }}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Decline
                            </Button>
                          </div>
                        )}
                        <div className="mt-3 flex items-center gap-4">
                          <Badge variant="outline">
                            {registeredCount}
                            {totalSpots > 0 ? `/${totalSpots}` : ""} registered
                          </Badge>
                          {totalSpots > 0 ? (
                            spotsLeft !== null && spotsLeft > 0 ? (
                              <Badge className="bg-green-500/10 text-green-600">
                                {spotsLeft} spots left
                              </Badge>
                            ) : (
                              <Badge className="bg-red-500/10 text-red-600">
                                Full
                              </Badge>
                            )
                          ) : (
                            <Badge className="bg-muted text-muted-foreground">
                              Unlimited spots
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

            <Dialog
              open={rejectDialogEvent != null}
              onOpenChange={(open) => {
                if (!open) {
                  setRejectDialogEvent(null);
                  setRejectReason("");
                }
              }}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Decline event</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  Optional note for your records (submitter may not see this in-app).
                </p>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Reason (optional)"
                  rows={3}
                />
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setRejectDialogEvent(null);
                      setRejectReason("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={eventApprovalBusyId != null}
                    onClick={handleConfirmRejectMemberEvent}
                  >
                    {eventApprovalBusyId ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Decline event"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </TabsContent>

        {/* Alumni Applications Tab */}
        <TabsContent value="graduation" className="space-y-6">
          {alumniExpansionInvite && (
            <Card className="p-4 border-amber-500/40 bg-amber-500/5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Expansion Network invite for {alumniExpansionInvite.email}
                  </p>
                  <p className="text-lg font-mono tracking-widest mt-1 break-all">
                    {alumniExpansionInvite.code}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Copy now — the code is also stored in Firestore. Dismiss when done.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAlumniExpansionInvite(null)}
                >
                  Dismiss
                </Button>
              </div>
            </Card>
          )}
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Alumni Applications
            </h2>
            {loadingApplications ? (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-accent" />
                <p className="text-sm text-muted-foreground">Loading applications...</p>
              </div>
            ) : graduationApplications.length === 0 ? (
              <Card className="p-8 text-center">
                <GraduationCap className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No alumni applications yet.</p>
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
                      <div className="flex flex-col items-end gap-3 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => application.userId && setViewProfileUserId(application.userId)}
                          className="border-border text-foreground"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View User Profile
                        </Button>
                      {!isAdmitted && application.status === "pending" && (
                        <>
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
                        </>
                      )}
                      {!isAdmitted && application.status === "accepted" && (
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            size="sm"
                            onClick={async () => {
                              if (!application.userId || !application.userEmail?.trim()) return;
                              try {
                                await admitUserToAlumni(application.userId);
                                const eligible = await registerDigitalCurriculumAlumniEligible(
                                  application.userEmail.trim(),
                                  { source: "alumni_application_admit", expirationDays: 14 },
                                );
                                if (eligible.ok && eligible.code) {
                                  setAlumniExpansionInvite({
                                    email: application.userEmail.trim(),
                                    code: eligible.code,
                                  });
                                } else if (!eligible.ok) {
                                  alert(
                                    `User upgraded to alumni in the curriculum, but Expansion roster failed: ${eligible.errorMessage ?? "Unknown error"}. Add them in App Access Hub if needed.`,
                                  );
                                }
                                const updated = await getGraduationApplications();
                                setGraduationApplications(updated);
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
                    </div>
                  </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Admins Tab */}
        <TabsContent value="admins" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Add Admin</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Grant a user the Admin or superAdmin role. Enter their account email and choose the role.
            </p>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2 min-w-[200px]">
                <Label htmlFor="admin-email" className="text-foreground">Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="user@example.com"
                  value={adminEmail}
                  onChange={(e) => {
                    setAdminEmail(e.target.value);
                    setAddAdminError(null);
                  }}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2 min-w-[160px]">
                <Label htmlFor="admin-role" className="text-foreground">Role</Label>
                <select
                  id="admin-role"
                  value={adminRole}
                  onChange={(e) => setAdminRole(e.target.value as "Admin" | "superAdmin")}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground"
                >
                  <option value="Admin">Admin</option>
                  <option value="superAdmin">superAdmin</option>
                </select>
              </div>
              <Button
                onClick={handleAddAdmin}
                disabled={addingAdmin || !adminEmail.trim()}
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                {addingAdmin ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Admin
                  </>
                )}
              </Button>
            </div>
            {addAdminError && (
              <p className="text-sm text-destructive mt-2">{addAdminError}</p>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Current Admins</h2>
            {loadingAdmins ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : currentAdmins.length === 0 ? (
              <p className="text-muted-foreground py-4">No admins or superAdmins found.</p>
            ) : (
              <div className="space-y-2">
                {currentAdmins.map((admin) => (
                  <div
                    key={admin.userId}
                    className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border bg-muted/20"
                  >
                    <div>
                      <p className="font-medium text-foreground">{admin.name || admin.email}</p>
                      <p className="text-sm text-muted-foreground">{admin.email}</p>
                    </div>
                    <div className="flex flex-wrap gap-1 shrink-0">
                      {admin.roles.map((role) => (
                        <Badge key={role} variant={role === "superAdmin" ? "default" : "secondary"}>
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <AnalyticsDashboardPanel />
        </TabsContent>

        {/* Expansion Network — eligible users & invite codes */}
        <TabsContent value="app-access-hub" className="space-y-6">
          <AppAccessHubPanel />
        </TabsContent>

        {/* Expansion Network mobile — groups_mobile + user_reports moderation */}
        <TabsContent value="expansion-mobile" className="space-y-6">
          <p className="text-sm text-muted-foreground max-w-4xl">
            Create public/private mobile communities and triage member safety reports. Uses the same
            Firebase project as this admin (see build env <code className="text-xs bg-muted px-1">VITE_FIREBASE_ENV</code>
            ). Deploy Cloud Functions <code className="text-xs bg-muted px-1">adminCreateMobileGroup</code>,{" "}
            <code className="text-xs bg-muted px-1">getUserModerationSnapshot</code>,{" "}
            <code className="text-xs bg-muted px-1">moderateUserAccount</code> to this project.
          </p>
          <MobileModerationPanel />
        </TabsContent>

        <TabsContent value="mortar-info" className="space-y-6">
          <MortarInfoAdminPanel />
        </TabsContent>

        {/* Shop Tab */}
        <TabsContent value="shop" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Add Shop Item</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Label htmlFor="shop-item-name" className="text-foreground">Item Name *</Label>
                <Input
                  id="shop-item-name"
                  placeholder="e.g. Mortar Logo Tee"
                  value={shopItemName}
                  onChange={(e) => setShopItemName(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shop-item-price" className="text-foreground">Price ($) *</Label>
                <Input
                  id="shop-item-price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={shopItemPrice}
                  onChange={(e) => setShopItemPrice(e.target.value)}
                  className="bg-background"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Label htmlFor="shop-item-category" className="text-foreground">Category *</Label>
                <select
                  id="shop-item-category"
                  value={shopItemCategory}
                  onChange={(e) => setShopItemCategory(e.target.value as ShopCategory)}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground"
                >
                  {SHOP_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Picture *</Label>
                <div className="flex flex-col gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      setShopItemPictureFile(file || null);
                      if (!file) setShopItemPictureUrl("");
                      e.target.value = "";
                    }}
                    className="bg-background"
                  />
                  <p className="text-xs text-muted-foreground">Or paste image URL:</p>
                  <Input
                    placeholder="https://..."
                    value={shopItemPictureUrl}
                    onChange={(e) => {
                      setShopItemPictureUrl(e.target.value);
                      if (e.target.value.trim()) setShopItemPictureFile(null);
                    }}
                    className="bg-background"
                  />
                  {shopItemPictureFile && (
                    <span className="text-xs text-accent">{shopItemPictureFile.name}</span>
                  )}
                </div>
              </div>
            </div>

            {isApparelCategory(shopItemCategory) ? (
              <div className="space-y-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="shop-item-low-threshold" className="text-foreground">
                    Low Stock Threshold *
                  </Label>
                  <Input
                    id="shop-item-low-threshold"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="5"
                    value={shopItemLowStockThreshold}
                    onChange={(e) => setShopItemLowStockThreshold(e.target.value)}
                    className="bg-background"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {SHOP_SIZES.map((size) => (
                    <div key={size} className="space-y-2">
                      <Label className="text-foreground">{size} Stock *</Label>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        value={shopItemSizeStocks[size]}
                        onChange={(e) =>
                          setShopItemSizeStocks((prev) => ({
                            ...prev,
                            [size]: e.target.value,
                          }))
                        }
                        className="bg-background"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="shop-item-stock" className="text-foreground">
                    Stock Quantity *
                  </Label>
                  <Input
                    id="shop-item-stock"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={shopItemStockQuantity}
                    onChange={(e) => setShopItemStockQuantity(e.target.value)}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shop-item-low-threshold" className="text-foreground">
                    Low Stock Threshold *
                  </Label>
                  <Input
                    id="shop-item-low-threshold"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="5"
                    value={shopItemLowStockThreshold}
                    onChange={(e) => setShopItemLowStockThreshold(e.target.value)}
                    className="bg-background"
                  />
                </div>
              </div>
            )}

            <Button
              onClick={handleAddShopItem}
              disabled={
                creatingShopItem ||
                !shopItemName.trim() ||
                shopItemPrice === "" ||
                shopItemLowStockThreshold === "" ||
                (!isApparelCategory(shopItemCategory) && shopItemStockQuantity === "")
              }
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {creatingShopItem ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </>
              )}
            </Button>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Shop Items</h2>
            {loadingShop ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : shopItems.length === 0 ? (
              <p className="text-muted-foreground py-4">No shop items yet. Add your first item above.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {shopItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-border p-4 bg-muted/20 flex flex-col"
                  >
                    <div className="aspect-square rounded-md bg-muted overflow-hidden mb-3">
                      {item.picture ? (
                        <img
                          src={item.picture}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-12 h-12 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <h3 className="font-semibold text-foreground truncate">{item.name}</h3>
                    <p className="text-lg font-bold text-accent mt-1">${Number(item.price).toFixed(2)}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-xs">{item.category}</Badge>
                      {(() => {
                        if (isApparelCategory(item.category)) {
                          const sizeStocks = item.sizeStocks ?? {};
                          const stocks = SHOP_SIZES.map((s) => Number((sizeStocks as any)[s] ?? 0));
                          const out = stocks.every((q) => q <= 0);
                          const low = !out && stocks.some((q) => q <= item.lowStockThreshold);
                          const lowSizes = SHOP_SIZES.filter((s, idx) => {
                            const q = stocks[idx];
                            return q > 0 && q <= item.lowStockThreshold;
                          });
                          return (
                            <Badge
                              variant={out ? "destructive" : low ? "secondary" : "outline"}
                              className="text-xs"
                            >
                              {out
                                ? "Out of stock"
                                : low
                                  ? `Low stock (${lowSizes.join(", ") || "sizes"})`
                                  : "In stock"}
                            </Badge>
                          );
                        }
                        const out = item.stockQuantity <= 0;
                        const low = !out && item.stockQuantity <= item.lowStockThreshold;
                        return (
                          <Badge
                            variant={out ? "destructive" : low ? "secondary" : "outline"}
                            className="text-xs"
                          >
                            {out
                              ? "Out of stock"
                              : low
                                ? `Low stock (${item.stockQuantity})`
                                : `Stock: ${item.stockQuantity}`}
                          </Badge>
                        );
                      })()}
                    </div>
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditShopItem(item)}
                      >
                        <Pencil className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={async () => {
                          if (!confirm(`Delete "${item.name}"?`)) return;
                          try {
                            await deleteShopItem(item.id);
                            // List updates via real-time subscribeShopItems
                          } catch (e) {
                            console.error("Error deleting shop item:", e);
                            alert("Failed to delete item.");
                          }
                        }}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        <Dialog
          open={!!editShopItemId}
          onOpenChange={(open) => {
            if (!open) {
              setEditShopItemId(null);
            }
          }}
        >
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Shop Item</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-shop-item-name" className="text-foreground">Item Name *</Label>
                  <Input
                    id="edit-shop-item-name"
                    value={editShopItemName}
                    onChange={(e) => setEditShopItemName(e.target.value)}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-shop-item-price" className="text-foreground">Price ($) *</Label>
                  <Input
                    id="edit-shop-item-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editShopItemPrice}
                    onChange={(e) => setEditShopItemPrice(e.target.value)}
                    className="bg-background"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-shop-item-category" className="text-foreground">Category *</Label>
                  <select
                    id="edit-shop-item-category"
                    value={editShopItemCategory}
                    onChange={(e) => setEditShopItemCategory(e.target.value as ShopCategory)}
                    className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground"
                  >
                    {SHOP_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Picture *</Label>
                  <div className="flex flex-col gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        setEditShopItemPictureFile(file || null);
                        if (!file) {
                          // keep existing URL
                        }
                        e.target.value = "";
                      }}
                      className="bg-background"
                    />
                    <p className="text-xs text-muted-foreground">Or paste image URL:</p>
                    <Input
                      placeholder="https://..."
                      value={editShopItemPictureUrl}
                      onChange={(e) => {
                        setEditShopItemPictureUrl(e.target.value);
                        if (e.target.value.trim()) setEditShopItemPictureFile(null);
                      }}
                      className="bg-background"
                    />
                    {editShopItemPictureFile && (
                      <span className="text-xs text-accent">{editShopItemPictureFile.name}</span>
                    )}
                  </div>
                </div>
              </div>

              {isApparelCategory(editShopItemCategory) ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-shop-item-low-threshold" className="text-foreground">
                      Low Stock Threshold *
                    </Label>
                    <Input
                      id="edit-shop-item-low-threshold"
                      type="number"
                      min="0"
                      step="1"
                      value={editShopItemLowStockThreshold}
                      onChange={(e) => setEditShopItemLowStockThreshold(e.target.value)}
                      className="bg-background"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {SHOP_SIZES.map((size) => (
                      <div key={size} className="space-y-2">
                        <Label className="text-foreground">{size} Stock *</Label>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={editShopItemSizeStocks[size]}
                          onChange={(e) =>
                            setEditShopItemSizeStocks((prev) => ({
                              ...prev,
                              [size]: e.target.value,
                            }))
                          }
                          className="bg-background"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-shop-item-stock" className="text-foreground">
                      Stock Quantity *
                    </Label>
                    <Input
                      id="edit-shop-item-stock"
                      type="number"
                      min="0"
                      step="1"
                      value={editShopItemStockQuantity}
                      onChange={(e) => setEditShopItemStockQuantity(e.target.value)}
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-shop-item-low-threshold" className="text-foreground">
                      Low Stock Threshold *
                    </Label>
                    <Input
                      id="edit-shop-item-low-threshold"
                      type="number"
                      min="0"
                      step="1"
                      value={editShopItemLowStockThreshold}
                      onChange={(e) => setEditShopItemLowStockThreshold(e.target.value)}
                      className="bg-background"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setEditShopItemId(null)}
                disabled={savingShopItem}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEditedShopItem}
                disabled={savingShopItem}
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                {savingShopItem ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
          <Card className="p-8 bg-gradient-to-br from-accent/10 via-card to-card border-accent/30">
            <div className="text-center space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">Course Management</h2>
                <p className="text-muted-foreground">
                  Create and manage courses with modules, lessons, and content
                </p>
              </div>
              
              <Button
                onClick={() => navigate("/admin/courses/builder")}
                size="lg"
                className="bg-accent hover:bg-accent/90 text-accent-foreground text-lg px-8 py-6"
              >
                <Upload className="w-5 h-5 mr-2" />
                Upload a Course
              </Button>
              
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Click above to create a new course. You'll be able to add course metadata, 
                create modules with pricing, add lessons, and upload PowerPoint files to automatically 
                generate lesson content.
              </p>
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
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/admin/courses/${course.id}`)}
                        >
                          Edit course
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.location.href = `/courses/${course.id}`}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* View User Profile / Data Room Dialog */}
      <Dialog open={!!viewProfileUserId} onOpenChange={(open) => !open && setViewProfileUserId(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Profile & Data Room</DialogTitle>
          </DialogHeader>
          {viewProfileLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : viewProfileUser ? (
            <div className="space-y-6">
              <div className="rounded-lg border border-border p-4 bg-muted/30">
                <h4 className="font-semibold text-foreground mb-2">Profile</h4>
                <p className="text-sm text-muted-foreground"><strong className="text-foreground">Name:</strong> {viewProfileUser.name}</p>
                <p className="text-sm text-muted-foreground"><strong className="text-foreground">Email:</strong> {viewProfileUser.email}</p>
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Roles:</strong>{" "}
                  {viewProfileUser.roles.length > 0 ? viewProfileUser.roles.join(", ") : "None"}
                </p>
              </div>

              <div className="rounded-lg border border-border p-4 bg-muted/30">
                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Award className="w-4 h-4 text-accent" />
                  Skill Certificates
                </h4>
                {viewProfileCerts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No certificates yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {viewProfileCerts.map((cert) => {
                      const createdAt = cert.createdAt && typeof (cert.createdAt as { toDate?: () => Date }).toDate === "function"
                        ? (cert.createdAt as { toDate: () => Date }).toDate()
                        : cert.createdAt && typeof (cert.createdAt as { seconds?: number }).seconds === "number"
                          ? new Date((cert.createdAt as { seconds: number }).seconds * 1000)
                          : new Date();
                      return (
                        <li key={cert.id} className="flex items-center justify-between text-sm p-2 rounded border border-border bg-background">
                          <span className="text-foreground">{cert.skill} · {cert.courseTitle}</span>
                          <span className="text-muted-foreground text-xs">{format(createdAt, "MMM d, yyyy")}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="rounded-lg border border-border p-4 bg-muted/30">
                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-accent" />
                  Survey Response PDFs (Data Room)
                </h4>
                {viewProfileSurveys.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No survey response documents yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {viewProfileSurveys.map((sr) => {
                      const createdAt = sr.createdAt && typeof (sr.createdAt as { toDate?: () => Date }).toDate === "function"
                        ? (sr.createdAt as { toDate: () => Date }).toDate()
                        : sr.createdAt && typeof (sr.createdAt as { seconds?: number }).seconds === "number"
                          ? new Date((sr.createdAt as { seconds: number }).seconds * 1000)
                          : new Date();
                      const name = (sr.surveyTitle || sr.lessonTitle || "Survey").trim();
                      return (
                        <li key={sr.id} className="flex items-center justify-between gap-2 text-sm p-2 rounded border border-border bg-background">
                          <span className="text-foreground truncate">{name}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => window.open(sr.downloadUrl, "_blank")}
                              title="Preview"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => window.open(sr.downloadUrl, "_blank", "noopener")}
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                          <span className="text-muted-foreground text-xs shrink-0">{format(createdAt, "MMM d, yyyy")}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4">Could not load user data.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
