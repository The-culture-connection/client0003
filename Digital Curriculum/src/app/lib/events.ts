/**
 * Events data structures and utilities
 *
 * Collections:
 * - `events` — Digital Curriculum web hub (admin: curriculum-only or paired with mobile for "both")
 * - `events_mobile` — Expansion app feed + member submissions; admin: mobile-only or "both" (same doc id)
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  arrayUnion,
  arrayRemove,
  deleteField,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";

export const COLLECTION_EVENTS = "events";
export const COLLECTION_EVENTS_MOBILE = "events_mobile";

export type EventType = "Online" | "In-person";

export type EventApprovalStatus = "pending" | "approved" | "rejected";

/** Where an admin-created event is listed (member uploads always live in `events_mobile` only). */
export type EventDistribution = "curriculum" | "mobile" | "both";

export interface Event {
  id: string;
  title: string;
  /** Omitted for some member-submitted drafts until staff sets a date */
  date?: Timestamp;
  time: string; // e.g., "2:00 PM - 4:00 PM"
  location: string;
  /** "Online" or "In-person" */
  event_type?: EventType;
  /** Optional image URL for the event */
  image_url?: string;
  /** Optional; when absent, no spot limit */
  available_spots?: number;
  total_spots?: number;
  details: string;
  created_at?: Timestamp;
  updated_at?: Timestamp;
  registered_users?: string[]; // Array of user UIDs
  approval_status?: EventApprovalStatus;
  created_by?: string;
  rejection_reason?: string;
  /** Set on admin-created docs; member submissions behave as mobile-only */
  distribution?: EventDistribution;
}

/** Admin merged row: same logical event may exist in one or both collections */
export type AdminListedEvent = Event & {
  adminPlatforms: ("curriculum" | "mobile")[];
};

/** Published on member-facing surfaces (Feed / web Events). */
export function isEventPublished(data: {
  approval_status?: EventApprovalStatus;
}): boolean {
  const s = data.approval_status;
  if (s === undefined || s === null) return true;
  return s === "approved";
}

function eventDateMillis(e: Event): number | null {
  const d = e.date;
  if (!d) return null;
  if (typeof (d as Timestamp).toMillis === "function") {
    return (d as Timestamp).toMillis();
  }
  return null;
}

/** Ascending by calendar date; events with no date sort last. */
export function sortEventsByDateAsc(a: Event, b: Event): number {
  const ma = eventDateMillis(a);
  const mb = eventDateMillis(b);
  if (ma === null && mb === null) return 0;
  if (ma === null) return 1;
  if (mb === null) return -1;
  return ma - mb;
}

/** Admin list: pending first, then newest created first. */
export function sortEventsForAdmin(a: Event, b: Event): number {
  const pa = a.approval_status === "pending" ? 0 : 1;
  const pb = b.approval_status === "pending" ? 0 : 1;
  if (pa !== pb) return pa - pb;
  const ca = a.created_at?.toMillis?.() ?? 0;
  const cb = b.created_at?.toMillis?.() ?? 0;
  return cb - ca;
}

async function fetchAllEventsRaw(col: string): Promise<Event[]> {
  const snapshot = await getDocs(collection(db, col));
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as Event[];
}

function mergeAdminListedEvents(
  fromE: Event[],
  fromM: Event[]
): AdminListedEvent[] {
  const map = new Map<string, { e?: Event; m?: Event }>();
  for (const e of fromE) {
    const prev = map.get(e.id) ?? {};
    map.set(e.id, { ...prev, e });
  }
  for (const m of fromM) {
    const prev = map.get(m.id) ?? {};
    map.set(m.id, { ...prev, m });
  }

  const out: AdminListedEvent[] = [];
  for (const [id, pair] of map.entries()) {
    const { e, m } = pair;
    const adminPlatforms: ("curriculum" | "mobile")[] = [];
    if (e) adminPlatforms.push("curriculum");
    if (m) adminPlatforms.push("mobile");

    const display =
      m?.approval_status === "pending" ? m : e ?? m!;
    out.push({
      ...display,
      id,
      adminPlatforms,
    });
  }

  out.sort(sortEventsForAdmin);
  return out;
}

/**
 * Published events for the Digital Curriculum web Events hub (`events` only).
 */
export async function getEvents(): Promise<Event[]> {
  try {
    const all = await fetchAllEventsRaw(COLLECTION_EVENTS);
    const published = all.filter(isEventPublished);
    published.sort(sortEventsByDateAsc);
    return published;
  } catch (error) {
    console.error("Error fetching events:", error);
    return [];
  }
}

/**
 * All events for staff admin: merges `events` + `events_mobile` (deduped by id).
 */
export async function getAllEventsForAdmin(): Promise<AdminListedEvent[]> {
  try {
    const [fromE, fromM] = await Promise.all([
      fetchAllEventsRaw(COLLECTION_EVENTS),
      fetchAllEventsRaw(COLLECTION_EVENTS_MOBILE),
    ]);
    return mergeAdminListedEvents(fromE, fromM);
  } catch (error) {
    console.error("Error fetching events for admin:", error);
    return [];
  }
}

/**
 * Approve or reject a member-submitted event (Expansion app) in `events_mobile`.
 */
export async function setMemberEventApproval(
  eventId: string,
  approve: boolean,
  rejectionReason?: string
): Promise<void> {
  const eventRef = doc(db, COLLECTION_EVENTS_MOBILE, eventId);
  const payload: Record<string, unknown> = {
    approval_status: approve ? "approved" : "rejected",
    updated_at: serverTimestamp(),
  };
  if (approve) {
    payload.rejection_reason = deleteField();
  } else if (rejectionReason?.trim()) {
    payload.rejection_reason = rejectionReason.trim().slice(0, 2000);
  }
  await updateDoc(eventRef, payload);
}

/**
 * Get upcoming events (date >= today) — curriculum `events` collection only.
 */
export async function getUpcomingEvents(): Promise<Event[]> {
  try {
    const eventsRef = collection(db, COLLECTION_EVENTS);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const q = query(
      eventsRef,
      where("date", ">=", Timestamp.fromDate(today)),
      orderBy("date", "asc")
    );
    const snapshot = await getDocs(q);
    const list = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Event[];
    return list.filter(isEventPublished);
  } catch (error) {
    console.error("Error fetching upcoming events:", error);
    return [];
  }
}

/**
 * Get a single event by ID (checks `events` first, then `events_mobile`).
 */
export async function getEvent(eventId: string): Promise<Event | null> {
  try {
    const eRef = doc(db, COLLECTION_EVENTS, eventId);
    const mRef = doc(db, COLLECTION_EVENTS_MOBILE, eventId);
    const [eSnap, mSnap] = await Promise.all([getDoc(eRef), getDoc(mRef)]);
    if (!eSnap.exists() && !mSnap.exists()) return null;
    if (eSnap.exists()) {
      return { id: eSnap.id, ...eSnap.data() } as Event;
    }
    return { id: mSnap.id, ...mSnap.data() } as Event;
  } catch (error) {
    console.error("Error fetching event:", error);
    return null;
  }
}

function buildStaffEventPayload(
  title: string,
  date: Date,
  time: string,
  location: string,
  details: string,
  distribution: EventDistribution,
  options?: {
    availableSpots?: number;
    eventType?: EventType;
    imageUrl?: string;
  }
): Record<string, unknown> {
  const spots =
    options?.availableSpots != null && options.availableSpots > 0
      ? options.availableSpots
      : undefined;
  const eventData: Record<string, unknown> = {
    title: title.trim(),
    date: Timestamp.fromDate(date),
    time: time.trim(),
    location: location.trim(),
    event_type: options?.eventType ?? "In-person",
    details: details.trim(),
    registered_users: [],
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
    distribution,
  };
  if (options?.imageUrl?.trim()) {
    eventData.image_url = options.imageUrl.trim();
  }
  if (spots != null) {
    eventData.available_spots = spots;
    eventData.total_spots = spots;
  }
  return eventData;
}

/**
 * Create a new event (admin only). Writes to `events` and/or `events_mobile` from [distribution].
 */
export async function createEvent(
  title: string,
  date: Date,
  time: string,
  location: string,
  details: string,
  options?: {
    availableSpots?: number;
    eventType?: EventType;
    imageUrl?: string;
    /** Default `curriculum` */
    distribution?: EventDistribution;
  }
): Promise<Event> {
  const dist = options?.distribution ?? "curriculum";
  if (dist !== "curriculum" && dist !== "mobile" && dist !== "both") {
    throw new Error("Invalid distribution");
  }

  try {
    const id = doc(collection(db, COLLECTION_EVENTS)).id;

    const batch = writeBatch(db);

    if (dist === "curriculum" || dist === "both") {
      const payloadE = buildStaffEventPayload(
        title,
        date,
        time,
        location,
        details,
        dist === "both" ? "both" : "curriculum",
        options
      );
      batch.set(doc(db, COLLECTION_EVENTS, id), payloadE);
    }

    if (dist === "mobile" || dist === "both") {
      const payloadM = buildStaffEventPayload(
        title,
        date,
        time,
        location,
        details,
        dist === "both" ? "both" : "mobile",
        options
      );
      batch.set(doc(db, COLLECTION_EVENTS_MOBILE, id), payloadM);
    }

    await batch.commit();

    const created = await getEvent(id);
    if (!created) throw new Error("Event not found after create");
    return created;
  } catch (error) {
    console.error("Error creating event:", error);
    throw error;
  }
}

async function loadEventRefs(eventId: string) {
  const refE = doc(db, COLLECTION_EVENTS, eventId);
  const refM = doc(db, COLLECTION_EVENTS_MOBILE, eventId);
  const [eSnap, mSnap] = await Promise.all([getDoc(refE), getDoc(mSnap)]);
  return { refE, refM, eSnap, mSnap };
}

/**
 * Register user for an event (updates every existing doc with this id — keeps `both` in sync).
 */
export async function registerForEvent(
  eventId: string,
  userId: string
): Promise<void> {
  try {
    const { refE, refM, eSnap, mSnap } = await loadEventRefs(eventId);
    if (!eSnap.exists() && !mSnap.exists()) {
      throw new Error("Event not found");
    }

    const canonical = eSnap.exists() ? eSnap : mSnap;
    const event = canonical.data() as Event;
    const registeredUsers = event.registered_users || [];

    if (registeredUsers.includes(userId)) {
      throw new Error("Already registered for this event");
    }

    const totalSpots = event.total_spots ?? 0;
    if (totalSpots > 0 && registeredUsers.length >= totalSpots) {
      throw new Error("Event is full");
    }

    const updateData: Record<string, unknown> = {
      registered_users: arrayUnion(userId),
      updated_at: serverTimestamp(),
    };
    if (totalSpots > 0) {
      updateData.available_spots = totalSpots - (registeredUsers.length + 1);
    }

    const batch = writeBatch(db);
    if (eSnap.exists()) batch.update(refE, updateData);
    if (mSnap.exists()) batch.update(refM, updateData);
    await batch.commit();
  } catch (error) {
    console.error("Error registering for event:", error);
    throw error;
  }
}

/**
 * Unregister user from an event (updates every existing doc with this id).
 */
export async function unregisterFromEvent(
  eventId: string,
  userId: string
): Promise<void> {
  try {
    const { refE, refM, eSnap, mSnap } = await loadEventRefs(eventId);
    if (!eSnap.exists() && !mSnap.exists()) {
      throw new Error("Event not found");
    }

    const canonical = eSnap.exists() ? eSnap : mSnap;
    const event = canonical.data() as Event;
    const registeredUsers = event.registered_users || [];

    if (!registeredUsers.includes(userId)) {
      throw new Error("Not registered for this event");
    }

    const updateData: Record<string, unknown> = {
      registered_users: arrayRemove(userId),
      updated_at: serverTimestamp(),
    };
    const totalSpots = event.total_spots ?? 0;
    if (totalSpots > 0) {
      updateData.available_spots = totalSpots - (registeredUsers.length - 1);
    }

    const batch = writeBatch(db);
    if (eSnap.exists()) batch.update(refE, updateData);
    if (mSnap.exists()) batch.update(refM, updateData);
    await batch.commit();
  } catch (error) {
    console.error("Error unregistering from event:", error);
    throw error;
  }
}

/**
 * Check if user is registered for an event
 */
export function isUserRegistered(event: Event, userId: string): boolean {
  return event.registered_users?.includes(userId) || false;
}

/**
 * Get registered events for a user (published only; scans both collections, dedupes by id).
 */
export async function getRegisteredEvents(userId: string): Promise<Event[]> {
  try {
    const [allE, allM] = await Promise.all([
      fetchAllEventsRaw(COLLECTION_EVENTS),
      fetchAllEventsRaw(COLLECTION_EVENTS_MOBILE),
    ]);
    const curriculumMine = allE.filter(
      (event) =>
        isEventPublished(event) && event.registered_users?.includes(userId)
    );
    const mobileIds = new Set(curriculumMine.map((e) => e.id));
    const mobileOnly = allM.filter(
      (event) =>
        isEventPublished(event) &&
        event.registered_users?.includes(userId) &&
        !mobileIds.has(event.id)
    );
    const merged = [...curriculumMine, ...mobileOnly];
    merged.sort(sortEventsByDateAsc);
    return merged;
  } catch (error) {
    console.error("Error fetching registered events:", error);
    return [];
  }
}
