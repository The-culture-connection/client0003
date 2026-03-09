import { db } from "./firebase";
import { collection, addDoc, getDocs, query, where, updateDoc, doc, getDoc, Timestamp } from "firebase/firestore";
import { updateProfile } from "firebase/auth";

export interface AvailabilitySlot {
  date: Date;
  startTime: string; // Format: "HH:MM"
  endTime: string; // Format: "HH:MM"
}

export interface GraduationApplication {
  id?: string;
  userId: string;
  userEmail: string;
  userName: string;
  availabilitySlots: AvailabilitySlot[]; // Up to 3 slots
  selectedTime?: string; // Selected by admin from availability windows
  status: "pending" | "accepted" | "rejected";
  createdAt: Timestamp;
  reviewedAt?: Timestamp;
  reviewedBy?: string;
  notes?: string;
}

/**
 * Submit a graduation application
 */
export async function submitGraduationApplication(
  userId: string,
  userEmail: string,
  userName: string,
  availabilitySlots: AvailabilitySlot[]
): Promise<string> {
  try {
    if (availabilitySlots.length === 0 || availabilitySlots.length > 3) {
      throw new Error("You must provide between 1 and 3 availability slots.");
    }

    const applicationData = {
      userId,
      userEmail,
      userName,
      availabilitySlots: availabilitySlots.map(slot => ({
        date: Timestamp.fromDate(slot.date),
        startTime: slot.startTime,
        endTime: slot.endTime,
      })),
      status: "pending" as const,
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, "GraduationApplications"), applicationData);
    return docRef.id;
  } catch (error) {
    console.error("Error submitting graduation application:", error);
    throw error;
  }
}

/**
 * Get all graduation applications
 */
export async function getGraduationApplications(): Promise<GraduationApplication[]> {
  try {
    const q = query(collection(db, "GraduationApplications"));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      // Handle both old format (proposedDate/proposedTime) and new format (availabilitySlots)
      let availabilitySlots: AvailabilitySlot[] = [];
      if (data.availabilitySlots) {
        availabilitySlots = data.availabilitySlots.map((slot: any) => ({
          date: slot.date?.toDate() || new Date(),
          startTime: slot.startTime || "",
          endTime: slot.endTime || "",
        }));
      } else if (data.proposedDate) {
        // Legacy format - convert to availability slot
        availabilitySlots = [{
          date: data.proposedDate.toDate(),
          startTime: data.proposedTime || "",
          endTime: data.proposedTime || "",
        }];
      }
      
      // Handle selectedTime - check both selectedTime field and notes field (for backward compatibility)
      let selectedTime = data.selectedTime;
      if (!selectedTime && data.notes && data.status === "accepted") {
        // If notes contains a date/time pattern like "3/16/2026 at 09:00" or "3/16/2026 at 9:00", use it as selectedTime
        const notesMatch = data.notes.match(/\d+\/\d+\/\d+\s+at\s+\d+:\d+/);
        if (notesMatch) {
          selectedTime = data.notes;
        } else if (data.notes.trim().length > 0 && !data.notes.includes("rejection") && !data.notes.includes("reject")) {
          // If notes doesn't match pattern but looks like a time selection (not a rejection note), use it
          // This handles cases where the format might be slightly different
          selectedTime = data.notes;
        }
      }
      
      return {
        id: doc.id,
        ...data,
        availabilitySlots,
        selectedTime: selectedTime || undefined,
        createdAt: data.createdAt || Timestamp.now(),
        reviewedAt: data.reviewedAt,
      } as GraduationApplication;
    });
  } catch (error) {
    console.error("Error fetching graduation applications:", error);
    throw error;
  }
}

/**
 * Get pending graduation applications
 */
export async function getPendingGraduationApplications(): Promise<GraduationApplication[]> {
  try {
    const q = query(
      collection(db, "GraduationApplications"),
      where("status", "==", "pending")
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      // Handle both old format (proposedDate/proposedTime) and new format (availabilitySlots)
      let availabilitySlots: AvailabilitySlot[] = [];
      if (data.availabilitySlots) {
        availabilitySlots = data.availabilitySlots.map((slot: any) => ({
          date: slot.date?.toDate() || new Date(),
          startTime: slot.startTime || "",
          endTime: slot.endTime || "",
        }));
      } else if (data.proposedDate) {
        // Legacy format - convert to availability slot
        availabilitySlots = [{
          date: data.proposedDate.toDate(),
          startTime: data.proposedTime || "",
          endTime: data.proposedTime || "",
        }];
      }
      
      // Handle selectedTime - check both selectedTime field and notes field (for backward compatibility)
      let selectedTime = data.selectedTime;
      if (!selectedTime && data.notes && data.status === "accepted") {
        // If notes contains a date/time pattern like "3/16/2026 at 09:00" or "3/16/2026 at 9:00", use it as selectedTime
        const notesMatch = data.notes.match(/\d+\/\d+\/\d+\s+at\s+\d+:\d+/);
        if (notesMatch) {
          selectedTime = data.notes;
        } else if (data.notes.trim().length > 0 && !data.notes.includes("rejection") && !data.notes.includes("reject")) {
          // If notes doesn't match pattern but looks like a time selection (not a rejection note), use it
          // This handles cases where the format might be slightly different
          selectedTime = data.notes;
        }
      }
      
      return {
        id: doc.id,
        ...data,
        availabilitySlots,
        selectedTime: selectedTime || undefined,
        createdAt: data.createdAt || Timestamp.now(),
        reviewedAt: data.reviewedAt,
      } as GraduationApplication;
    });
  } catch (error) {
    console.error("Error fetching pending graduation applications:", error);
    throw error;
  }
}

/**
 * Accept a graduation application (sets status to accepted, but doesn't upgrade role)
 * Optionally sets the selectedTime if admin has chosen a time from availability windows
 */
export async function acceptGraduationApplication(
  applicationId: string,
  reviewerId: string,
  selectedTime?: string,
  notes?: string
): Promise<void> {
  try {
    const applicationRef = doc(db, "GraduationApplications", applicationId);
    
    const updateData: any = {
      status: "accepted",
      reviewedAt: Timestamp.now(),
      reviewedBy: reviewerId,
    };
    
    if (selectedTime) {
      updateData.selectedTime = selectedTime;
      // If notes is not provided separately, don't overwrite it with empty string
      updateData.notes = notes !== undefined ? notes : "";
    } else {
      updateData.notes = notes || "";
    }
    
    // Update application status
    await updateDoc(applicationRef, updateData);
  } catch (error) {
    console.error("Error accepting graduation application:", error);
    throw error;
  }
}

/**
 * Admit a user (upgrade their role to Digital Curriculum Alumni)
 */
export async function admitUserToAlumni(
  userId: string
): Promise<void> {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      throw new Error("User not found");
    }

    const userData = userSnap.data();
    const currentRoles = userData.roles || [];
    
    // Remove "Digital Curriculum Students" role and add "Digital Curriculum Alumni"
    const updatedRoles = currentRoles.filter(
      (role: string) => role !== "Digital Curriculum Students"
    );
    
    if (!updatedRoles.includes("Digital Curriculum Alumni")) {
      updatedRoles.push("Digital Curriculum Alumni");
    }

    await updateDoc(userRef, {
      roles: updatedRoles,
      graduation_date: Timestamp.now(),
      updated_at: Timestamp.now(),
    });
  } catch (error) {
    console.error("Error admitting user to alumni:", error);
    throw error;
  }
}

/**
 * Reject a graduation application
 */
export async function rejectGraduationApplication(
  applicationId: string,
  reviewerId: string,
  notes?: string
): Promise<void> {
  try {
    const applicationRef = doc(db, "GraduationApplications", applicationId);
    
    await updateDoc(applicationRef, {
      status: "rejected",
      reviewedAt: Timestamp.now(),
      reviewedBy: reviewerId,
      notes: notes || "",
    });
  } catch (error) {
    console.error("Error rejecting graduation application:", error);
    throw error;
  }
}

/**
 * Get graduation application for a specific user
 */
export async function getUserGraduationApplication(
  userId: string
): Promise<GraduationApplication | null> {
  try {
    const q = query(
      collection(db, "GraduationApplications"),
      where("userId", "==", userId)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    // Get the most recent application
    const applications = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      // Handle both old format (proposedDate/proposedTime) and new format (availabilitySlots)
      let availabilitySlots: AvailabilitySlot[] = [];
      if (data.availabilitySlots) {
        availabilitySlots = data.availabilitySlots.map((slot: any) => ({
          date: slot.date?.toDate() || new Date(),
          startTime: slot.startTime || "",
          endTime: slot.endTime || "",
        }));
      } else if (data.proposedDate) {
        // Legacy format - convert to availability slot
        availabilitySlots = [{
          date: data.proposedDate.toDate(),
          startTime: data.proposedTime || "",
          endTime: data.proposedTime || "",
        }];
      }
      
      // Handle selectedTime - check both selectedTime field and notes field (for backward compatibility)
      let selectedTime = data.selectedTime;
      if (!selectedTime && data.notes && data.status === "accepted") {
        // If notes contains a date/time pattern like "3/16/2026 at 09:00" or "3/16/2026 at 9:00", use it as selectedTime
        const notesMatch = data.notes.match(/\d+\/\d+\/\d+\s+at\s+\d+:\d+/);
        if (notesMatch) {
          selectedTime = data.notes;
        } else if (data.notes.trim().length > 0 && !data.notes.includes("rejection") && !data.notes.includes("reject")) {
          // If notes doesn't match pattern but looks like a time selection (not a rejection note), use it
          // This handles cases where the format might be slightly different
          selectedTime = data.notes;
        }
      }
      
      return {
        id: doc.id,
        ...data,
        availabilitySlots,
        selectedTime: selectedTime || undefined,
        createdAt: data.createdAt || Timestamp.now(),
        reviewedAt: data.reviewedAt,
      } as GraduationApplication;
    });
    
    // Sort by createdAt descending and return the most recent
    applications.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    return applications[0];
  } catch (error) {
    console.error("Error fetching user graduation application:", error);
    return null;
  }
}
