/**
 * Data Room: user certificates and documents.
 * Certificates are created when a user completes a course that has assigned skills.
 * Survey response PDFs are uploaded when user completes a survey with generatePdfOnComplete enabled.
 */

import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  type Unsubscribe,
  updateDoc,
  setDoc,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, functions, storage } from "./firebase";
import { jsPDF } from "jspdf";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { DEFAULT_DATAROOM_FOLDER_ID } from "./dataroomFolders";

export interface SkillCertificate {
  id: string;
  userId: string;
  courseId: string;
  courseTitle: string;
  skill: string;
  recipientName?: string;
  certificatePdfUrl?: string;
  certificateStoragePath?: string;
  publicShareId?: string;
  publicShareUrl?: string;
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
const CERTIFICATE_PUBLIC_LINKS_COLLECTION = "certificate_public_links";
const CERTIFICATE_TEMPLATE_URLS = [
  // dataroom.ts is in src/app/lib, so project-root assets are ../../../../
  new URL("../../../../Certificate Template.pdf", import.meta.url).href,
  new URL("../../../../Certificate template.pdf", import.meta.url).href,
];

function getCertificatesRef(userId: string) {
  return collection(db, "users", userId, CERTIFICATES_SUBCOLLECTION);
}

function getNotificationsRef(userId: string) {
  return collection(db, "users", userId, NOTIFICATIONS_SUBCOLLECTION);
}

function getSurveyResponsesRef(userId: string) {
  return collection(db, "users", userId, SURVEY_RESPONSES_SUBCOLLECTION);
}

async function generateTemplateCertificatePdfUpload(
  userId: string,
  courseId: string,
  recipientName: string,
  skill: string
): Promise<{ pdfUrl: string; storagePath: string }> {
  const cleanName = (recipientName || "Learner").trim();
  const cleanSkill = (skill || "Skill").trim();
  const makeFallbackCertificateBlob = (): Blob => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "letter",
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFillColor(0, 0, 0);
    doc.rect(0, 0, pageWidth, pageHeight, "F");
    doc.setDrawColor(232, 221, 176);
    doc.setLineWidth(3);
    doc.rect(24, 24, pageWidth - 48, pageHeight - 48, "S");

    doc.setTextColor(232, 221, 176);
    doc.setFont("times", "normal");
    doc.setFontSize(20);
    doc.text("This certificate is proudly presented to", pageWidth / 2, 175, {
      align: "center",
    });
    doc.setFont("times", "italic");
    doc.setFontSize(62);
    doc.text(cleanName, pageWidth / 2, 245, { align: "center" });
    doc.setFont("times", "bold");
    doc.setFontSize(28);
    doc.text("FOR LEARNING THE", pageWidth / 2, 305, { align: "center" });
    doc.text("FOLLOW ESSENTIAL SKILL", pageWidth / 2, 345, { align: "center" });
    doc.setFontSize(30);
    const fallbackSkillText = cleanSkill.toUpperCase();
    const maxFallbackSkillWidth = pageWidth - 120;
    const measuredFallbackSkillWidth = doc.getTextWidth(fallbackSkillText);
    if (measuredFallbackSkillWidth > maxFallbackSkillWidth) {
      doc.setFontSize(Math.max(20, (30 * maxFallbackSkillWidth) / measuredFallbackSkillWidth));
    }
    doc.text(fallbackSkillText, pageWidth / 2, 392, { align: "center" });
    return doc.output("blob");
  };

  let templateBytes: ArrayBuffer | null = null;
  for (const url of CERTIFICATE_TEMPLATE_URLS) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      templateBytes = await res.arrayBuffer();
      break;
    } catch {
      // Try next template candidate.
    }
  }
  let pdfBlob: Blob;
  if (templateBytes) {
    try {
      const pdfDoc = await PDFDocument.load(templateBytes);
      const pages = pdfDoc.getPages();
      const page = pages[0];
      if (!page) throw new Error("Certificate template PDF has no pages.");

      const { width, height } = page.getSize();
      const nameFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
      const skillFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
      const color = rgb(0.91, 0.86, 0.69);

      const maxNameWidth = width * 0.72;
      let nameSize = 62;
      while (nameSize > 32 && nameFont.widthOfTextAtSize(cleanName, nameSize) > maxNameWidth) {
        nameSize -= 2;
      }
      const nameWidth = nameFont.widthOfTextAtSize(cleanName, nameSize);
      page.drawText(cleanName, {
        x: (width - nameWidth) / 2,
        y: height * 0.50,
        size: nameSize,
        font: nameFont,
        color,
      });

      const maxSkillWidth = width * 0.78;
      let skillSize = 34;
      while (skillSize > 20 && skillFont.widthOfTextAtSize(cleanSkill.toUpperCase(), skillSize) > maxSkillWidth) {
        skillSize -= 2;
      }
      const skillText = cleanSkill.toUpperCase();
      const skillWidth = skillFont.widthOfTextAtSize(skillText, skillSize);
      page.drawText(skillText, {
        x: (width - skillWidth) / 2,
        y: height * 0.16,
        size: skillSize,
        font: skillFont,
        color,
      });
      const bytes = await pdfDoc.save();
      pdfBlob = new Blob([bytes], { type: "application/pdf" });
    } catch {
      // Template path resolved to non-PDF in some deploy contexts; use generated fallback.
      pdfBlob = makeFallbackCertificateBlob();
    }
  } else {
    pdfBlob = makeFallbackCertificateBlob();
  }
  const safe = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80) || "certificate";
  // Must stay under /users/{uid}/dataroom/... to satisfy Storage rules.
  const storagePath = `users/${userId}/dataroom/certificates/${safe(courseId)}_${safe(cleanSkill)}_${Date.now()}.pdf`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, pdfBlob, {
    contentType: "application/pdf",
    contentDisposition: `inline; filename="${safe(cleanName)}_${safe(cleanSkill)}_certificate.pdf"`,
  });
  const pdfUrl = await getDownloadURL(storageRef);
  return { pdfUrl, storagePath };
}

/**
 * Create a skill certificate for a user (on course completion).
 * Idempotent per (userId, courseId, skill) - skips if already exists.
 */
export async function createSkillCertificate(
  userId: string,
  courseId: string,
  courseTitle: string,
  skill: string,
  certTemplate?: { pdfUrl?: string; storagePath?: string },
  recipientName?: string
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

  let resolvedCertTemplate = certTemplate;
  if (!resolvedCertTemplate?.pdfUrl) {
    try {
      resolvedCertTemplate = await generateTemplateCertificatePdfUpload(
        userId,
        courseId,
        recipientName || "Learner",
        skill
      );
    } catch (e) {
      console.error("Failed to generate template certificate PDF:", e);
    }
  }

  const docRef = await addDoc(certsRef, {
    userId,
    courseId,
    courseTitle,
    skill,
    recipientName: recipientName?.trim() || null,
    certificatePdfUrl: resolvedCertTemplate?.pdfUrl ?? null,
    certificateStoragePath: resolvedCertTemplate?.storagePath ?? null,
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
  course: {
    id?: string;
    title: string;
    modules: Array<{
      skills?: string[];
      skillCertificates?: Array<{ skill: string; pdfUrl: string; storagePath?: string }>;
    }>;
  }
): Promise<{ certificatesCreated: boolean; skills: string[] }> {
  const courseId = course.id;
  const courseTitle = course.title || "Course";
  if (!courseId) return { certificatesCreated: false, skills: [] };
  let recipientName = "Learner";
  try {
    const userSnap = await getDoc(doc(db, "users", userId));
    if (userSnap.exists()) {
      const userData = userSnap.data() as Record<string, unknown>;
      const firstName =
        typeof userData.first_name === "string" ? userData.first_name.trim() : "";
      const lastName =
        typeof userData.last_name === "string" ? userData.last_name.trim() : "";
      const fullNameFromParts = [firstName, lastName].filter(Boolean).join(" ").trim();
      recipientName =
        fullNameFromParts ||
        (typeof userData.display_name === "string" && userData.display_name.trim()) ||
        (typeof userData.name === "string" && userData.name.trim()) ||
        recipientName;
    }
  } catch {
    // Keep fallback when user profile cannot be read.
  }

  const allSkills = new Set<string>();
  const certBySkill = new Map<string, { pdfUrl?: string; storagePath?: string }>();
  for (const mod of course.modules || []) {
    for (const skill of mod.skills || []) {
      if (skill?.trim()) allSkills.add(skill.trim());
    }
    for (const cert of mod.skillCertificates || []) {
      const skill = cert.skill?.trim();
      if (!skill) continue;
      certBySkill.set(skill, { pdfUrl: cert.pdfUrl, storagePath: cert.storagePath });
    }
  }
  if (allSkills.size === 0) return { certificatesCreated: false, skills: [] };

  const createdIds: string[] = [];
  for (const skill of allSkills) {
    const id = await createSkillCertificate(
      userId,
      courseId,
      courseTitle,
      skill,
      certBySkill.get(skill),
      recipientName
    );
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
 * Ensure a certificate has a public PDF URL by generating one from the template when missing.
 */
export async function ensureCertificatePublicPdfUrl(
  userId: string,
  cert: Pick<SkillCertificate, "id" | "courseId" | "skill" | "recipientName" | "certificatePdfUrl">
): Promise<{ pdfUrl: string | null; storagePath?: string }> {
  if (cert.certificatePdfUrl) return { pdfUrl: cert.certificatePdfUrl };
  const generated = await generateTemplateCertificatePdfUpload(
    userId,
    cert.courseId,
    cert.recipientName?.trim() || "Learner",
    cert.skill
  );
  try {
    await updateDoc(doc(db, "users", userId, CERTIFICATES_SUBCOLLECTION, cert.id), {
      certificatePdfUrl: generated.pdfUrl,
      certificateStoragePath: generated.storagePath,
    });
  } catch (e) {
    // Return working link even if backfill write fails in this environment.
    console.warn("Could not persist generated certificate link:", e);
  }
  return generated;
}

/**
 * Ensure a branded website share URL exists for a certificate.
 */
export async function ensureCertificatePublicShareUrl(
  userId: string,
  cert: Pick<
    SkillCertificate,
    "id" | "courseId" | "courseTitle" | "skill" | "recipientName" | "certificatePdfUrl" | "publicShareId" | "publicShareUrl"
  >
): Promise<{ shareUrl: string | null; shareId?: string; pdfUrl?: string | null }> {
  const ensuredPdf = await ensureCertificatePublicPdfUrl(userId, cert);
  const pdfUrl = ensuredPdf.pdfUrl;
  if (!pdfUrl) return {shareUrl: null, pdfUrl: null};

  const shareId = cert.publicShareId?.trim() || `${userId}_${cert.id}`;
  const shareUrl = `${window.location.origin}/certificate/${encodeURIComponent(shareId)}`;
  const shareRef = doc(db, CERTIFICATE_PUBLIC_LINKS_COLLECTION, shareId);

  await setDoc(
    shareRef,
    {
      shareId,
      ownerUid: userId,
      certificateId: cert.id,
      courseId: cert.courseId,
      courseTitle: cert.courseTitle ?? "",
      skill: cert.skill,
      recipientName: cert.recipientName?.trim() || "Learner",
      certificatePdfUrl: pdfUrl,
      issuedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      active: true,
    },
    {merge: true}
  );

  try {
    await updateDoc(doc(db, "users", userId, CERTIFICATES_SUBCOLLECTION, cert.id), {
      publicShareId: shareId,
      publicShareUrl: shareUrl,
      certificatePdfUrl: pdfUrl,
      certificateStoragePath: ensuredPdf.storagePath,
    });
  } catch (e) {
    console.warn("Could not persist certificate share metadata:", e);
  }

  return {shareUrl, shareId, pdfUrl};
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
  const payload = {
    userId,
    type: data.type,
    title: data.title,
    body: data.body,
    read: false,
    certificateId: data.certificateId,
    badgeId: data.badgeId,
    badgeAwardDelta: data.badgeAwardDelta,
    createdAt: serverTimestamp(),
  };
  const cleaned = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  ) as Record<string, unknown>;
  const docRef = await addDoc(ref, cleaned);
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
