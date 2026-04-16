/**
 * Data Room: user certificates and documents.
 * Certificates are created when a user completes a course that has assigned skills.
 * Survey response PDFs are uploaded when user completes a survey with generatePdfOnComplete enabled.
 */

import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, functions, storage } from "./firebase";
import { jsPDF } from "jspdf";
import { DEFAULT_DATAROOM_FOLDER_ID } from "./dataroomFolders";

export interface SkillCertificate {
  id: string;
  userId: string;
  courseId: string;
  courseTitle: string;
  skill: string;
  type: "skill";
  createdAt: Timestamp;
}

export interface UserNotification {
  id: string;
  userId: string;
  type: "certificate_available" | "badge_earned";
  title: string;
  body: string;
  read: boolean;
  certificateId?: string;
  /** Phase 6 badge doc id when `type === "badge_earned"`. */
  badgeId?: string;
  badgeAwardDelta?: number;
  createdAt: Timestamp;
}

export interface SurveyResponseDocument {
  id: string;
  userId: string;
  courseId: string;
  lessonId: string;
  lessonTitle: string;
  /** Survey name (e.g. "Module 1 Reflection") – used as the document name in the Data Room */
  surveyTitle?: string;
  type: "survey_response";
  storagePath: string;
  downloadUrl: string;
  /** Top-level Data Room folder id where this PDF is stored */
  dataroomFolderId: string;
  createdAt: Timestamp;
}

const CERTIFICATES_SUBCOLLECTION = "certificates";
const NOTIFICATIONS_SUBCOLLECTION = "notifications";
const SURVEY_RESPONSES_SUBCOLLECTION = "surveyResponses";

function getCertificatesRef(userId: string) {
  return collection(db, "users", userId, CERTIFICATES_SUBCOLLECTION);
}

function getNotificationsRef(userId: string) {
  return collection(db, "users", userId, NOTIFICATIONS_SUBCOLLECTION);
}

function getSurveyResponsesRef(userId: string) {
  return collection(db, "users", userId, SURVEY_RESPONSES_SUBCOLLECTION);
}

/**
 * Create a skill certificate for a user (on course completion).
 * Idempotent per (userId, courseId, skill) - skips if already exists.
 */
export async function createSkillCertificate(
  userId: string,
  courseId: string,
  courseTitle: string,
  skill: string
): Promise<string | null> {
  const certsRef = getCertificatesRef(userId);
  const existing = await getDocs(
    query(
      certsRef,
      orderBy("createdAt", "desc")
    )
  );
  const alreadyExists = existing.docs.some(
    (d) => d.data().courseId === courseId && d.data().skill === skill
  );
  if (alreadyExists) return null;

  const docRef = await addDoc(certsRef, {
    userId,
    courseId,
    courseTitle,
    skill,
    type: "skill",
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Create skill certificates for all skills assigned to modules in the course.
 * Returns whether any certificates were created (so the UI can show an alert).
 */
export async function createSkillCertificatesForCompletedCourse(
  userId: string,
  course: { id?: string; title: string; modules: Array<{ skills?: string[] }> }
): Promise<{ certificatesCreated: boolean; skills: string[] }> {
  const courseId = course.id;
  const courseTitle = course.title || "Course";
  if (!courseId) return { certificatesCreated: false, skills: [] };

  const allSkills = new Set<string>();
  for (const mod of course.modules || []) {
    for (const skill of mod.skills || []) {
      if (skill?.trim()) allSkills.add(skill.trim());
    }
  }
  if (allSkills.size === 0) return { certificatesCreated: false, skills: [] };

  const createdIds: string[] = [];
  for (const skill of allSkills) {
    const id = await createSkillCertificate(userId, courseId, courseTitle, skill);
    if (id) createdIds.push(id);
  }
  if (createdIds.length === 0) return { certificatesCreated: false, skills: [] };

  const skillsList = Array.from(allSkills);
  await addNotification(userId, {
    type: "certificate_available",
    title: "New certificate(s) available",
    body: `Congratulations! You completed a course and earned certificate(s) for: ${skillsList.join(", ")}. View them in your Data Room.`,
    certificateId: createdIds[0],
  });
  return { certificatesCreated: true, skills: skillsList };
}

/**
 * List all certificates for a user (newest first).
 */
export async function listCertificates(userId: string): Promise<SkillCertificate[]> {
  const certsRef = getCertificatesRef(userId);
  const snapshot = await getDocs(query(certsRef, orderBy("createdAt", "desc")));
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: d.data().createdAt || Timestamp.now(),
  })) as SkillCertificate[];
}

/**
 * Generate a PDF of survey answers and upload to user's Data Room.
 * Returns true if upload succeeded.
 * documentName is the survey name shown in the Data Room (e.g. "Module 1 Reflection").
 */
export async function uploadSurveyResponsePdf(
  userId: string,
  courseId: string,
  lessonId: string,
  lessonTitle: string,
  documentName: string,
  questions: Array<{ question: string }>,
  answers: string[],
  dataroomFolderId: string
): Promise<boolean> {
  try {
    const displayTitle = String(documentName || lessonTitle || "Survey").trim();
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Survey Responses", 20, 20);
    doc.setFontSize(12);
    doc.text(displayTitle, 20, 28);
    doc.setFontSize(10);
    doc.text(`Course lesson · ${new Date().toLocaleDateString()}`, 20, 34);
    let y = 44;
    const maxWidth = 170;
    const lineHeight = 6;
    for (let i = 0; i < questions.length; i++) {
      doc.setFont(undefined, "bold");
      const qLines = doc.splitTextToSize(questions[i]?.question ?? `Question ${i + 1}`, maxWidth);
      qLines.forEach((line: string) => {
        doc.text(line, 20, y);
        y += lineHeight;
      });
      doc.setFont(undefined, "normal");
      const ans = answers[i] ?? "(No answer)";
      const aLines = doc.splitTextToSize(ans, maxWidth);
      aLines.forEach((line: string) => {
        doc.text(line, 25, y);
        y += lineHeight;
      });
      y += 4;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    }
    const blob = doc.output("blob");
    const safeFolderId = dataroomFolderId || DEFAULT_DATAROOM_FOLDER_ID;
    const storagePath = `users/${userId}/dataroom/${safeFolderId}/survey-responses/${courseId}_${lessonId}_${Date.now()}.pdf`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, blob, { contentType: "application/pdf" });
    const downloadUrl = await getDownloadURL(storageRef);
    const respRef = getSurveyResponsesRef(userId);
    await addDoc(respRef, {
      userId,
      courseId,
      lessonId,
      lessonTitle,
      surveyTitle: displayTitle,
      type: "survey_response",
      storagePath,
      downloadUrl,
      dataroomFolderId: safeFolderId,
      createdAt: serverTimestamp(),
    });
    return true;
  } catch (e) {
    console.error("Error uploading survey response PDF:", e);
    return false;
  }
}

/**
 * List all survey response documents for a user (newest first).
 */
export async function listSurveyResponses(userId: string): Promise<SurveyResponseDocument[]> {
  const ref = getSurveyResponsesRef(userId);
  const snapshot = await getDocs(query(ref, orderBy("createdAt", "desc")));
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: (d.data().createdAt as Timestamp) || Timestamp.now(),
    dataroomFolderId:
      (d.data().dataroomFolderId as string | undefined) ?? DEFAULT_DATAROOM_FOLDER_ID,
  })) as SurveyResponseDocument[];
}

/**
 * Add a notification for the user.
 */
export async function addNotification(
  userId: string,
  data: {
    type: "certificate_available" | "badge_earned";
    title: string;
    body: string;
    certificateId?: string;
    badgeId?: string;
    badgeAwardDelta?: number;
  }
): Promise<string> {
  const ref = getNotificationsRef(userId);
  const docRef = await addDoc(ref, {
    userId,
    type: data.type,
    title: data.title,
    body: data.body,
    read: false,
    certificateId: data.certificateId,
    badgeId: data.badgeId,
    badgeAwardDelta: data.badgeAwardDelta,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * List notifications for a user (newest first).
 */
export async function listNotifications(userId: string): Promise<UserNotification[]> {
  const ref = getNotificationsRef(userId);
  const snapshot = await getDocs(query(ref, orderBy("createdAt", "desc")));
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: (d.data().createdAt as Timestamp) || Timestamp.now(),
  })) as UserNotification[];
}

/**
 * Live updates for header notification bell (certificates, badge earned, etc.).
 */
export function subscribeUserNotifications(
  userId: string,
  onUpdate: (notifications: UserNotification[], unreadCount: number) => void
): Unsubscribe {
  const ref = query(getNotificationsRef(userId), orderBy("createdAt", "desc"));
  return onSnapshot(ref, (snapshot) => {
    const list = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: (d.data().createdAt as Timestamp) || Timestamp.now(),
    })) as UserNotification[];
    onUpdate(list, list.filter((n) => !n.read).length);
  });
}

/**
 * Mark a notification as read.
 */
export async function markNotificationRead(
  userId: string,
  notificationId: string
): Promise<void> {
  const fn = httpsCallable(functions, "markNotificationReadBackend");
  await fn({ user_id: userId, notification_id: notificationId });
}

/**
 * Count unread notifications for a user.
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const snapshot = await getDocs(getNotificationsRef(userId));
  return snapshot.docs.filter((d) => !d.data().read).length;
}
