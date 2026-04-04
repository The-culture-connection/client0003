/**
 * Groups data structures and utilities
 */

import { collection, doc, getDoc, getDocs, addDoc, updateDoc, query, where, orderBy, limit, serverTimestamp, Timestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "./firebase";

export interface Group {
  id: string;
  Name: string;
  Status: "Open" | "Closed";
  Created: Timestamp;
  GroupMembers?: string[]; // Array of user UIDs
  PendingMembers?: string[]; // Array of user UIDs waiting for approval
}

export interface GroupMessage {
  id: string;
  Content: string;
  Senderid: string;
  Sendtime: Timestamp;
  IsAnonymous?: boolean;
  SenderName?: string;
}

/**
 * Get all groups
 */
export async function getGroups(): Promise<Group[]> {
  try {
    const groupsRef = collection(db, "Groups");
    const snapshot = await getDocs(groupsRef);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Group[];
  } catch (error) {
    console.error("Error fetching groups:", error);
    return [];
  }
}

/**
 * Get groups the user is a member of
 */
export async function getGroupsForUser(userId: string): Promise<Group[]> {
  try {
    const groupsRef = collection(db, "Groups");
    const q = query(groupsRef, where("GroupMembers", "array-contains", userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Group[];
  } catch (error) {
    console.error("Error fetching groups for user:", error);
    return [];
  }
}

/**
 * Get a single group by ID
 */
export async function getGroup(groupId: string): Promise<Group | null> {
  try {
    const groupRef = doc(db, "Groups", groupId);
    const groupDoc = await getDoc(groupRef);
    if (!groupDoc.exists()) return null;
    return {
      id: groupDoc.id,
      ...groupDoc.data(),
    } as Group;
  } catch (error) {
    console.error("Error fetching group:", error);
    return null;
  }
}

/**
 * Get messages for a group
 */
export async function getGroupMessages(groupId: string, limitCount: number = 50): Promise<GroupMessage[]> {
  try {
    const messagesRef = collection(db, "Groups", groupId, "Messages");
    const q = query(messagesRef, orderBy("Sendtime", "desc"), limit(limitCount));
    const snapshot = await getDocs(q);
    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as GroupMessage[];
    return messages.reverse(); // Reverse to show oldest first
  } catch (error) {
    console.error("Error fetching messages:", error);
    return [];
  }
}

/**
 * Send a message to a group
 */
export async function sendGroupMessage(
  groupId: string,
  senderId: string,
  content: string,
  options?: { isAnonymous?: boolean; senderName?: string }
): Promise<void> {
  try {
    const messagesRef = collection(db, "Groups", groupId, "Messages");
    const isAnonymous = Boolean(options?.isAnonymous);
    const docData: Record<string, any> = {
      Content: content.trim(),
      Senderid: senderId,
      Sendtime: serverTimestamp(),
      IsAnonymous: isAnonymous,
    };
    if (!isAnonymous) {
      docData.SenderName = (options?.senderName || "").trim();
    }
    await addDoc(messagesRef, docData);
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
}

/**
 * Check if user is a member of a group
 */
export function isUserMember(group: Group, userId: string): boolean {
  return group.GroupMembers?.includes(userId) || false;
}

/**
 * Check if user is pending approval
 */
export function isUserPending(group: Group, userId: string): boolean {
  return group.PendingMembers?.includes(userId) || false;
}

/**
 * Join a group (Open → member; Closed → pending). Uses Cloud Function `joinGroup` (auth uid).
 * @param _userId Ignored; kept for call-site compatibility. Must match signed-in user.
 */
export async function joinGroup(groupId: string, _userId: string): Promise<{ success: boolean; pending: boolean }> {
  try {
    const callable = httpsCallable(functions, "joinGroup");
    const res = await callable({ groupId });
    return res.data as { success: boolean; pending: boolean };
  } catch (error) {
    console.error("Error joining group:", error);
    throw error;
  }
}

/**
 * Get the last message from a group
 */
export async function getLastGroupMessage(groupId: string): Promise<GroupMessage | null> {
  try {
    const messagesRef = collection(db, "Groups", groupId, "Messages");
    const q = query(messagesRef, orderBy("Sendtime", "desc"), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data(),
    } as GroupMessage;
  } catch (error) {
    console.error("Error fetching last message:", error);
    return null;
  }
}

/**
 * Get member count for a group
 */
export function getMemberCount(group: Group): number {
  return group.GroupMembers?.length || 0;
}
