/**
 * Events data structures and utilities
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "./firebase";

export type EventType = "Online" | "In-person";

export interface Event {
  id: string;
  title: string;
  date: Timestamp;
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
  created_at: Timestamp;
  updated_at: Timestamp;
  registered_users?: string[]; // Array of user UIDs
}

/**
 * Get all events
 */
export async function getEvents(): Promise<Event[]> {
  try {
    const eventsRef = collection(db, "events");
    const q = query(eventsRef, orderBy("date", "asc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Event[];
  } catch (error) {
    console.error("Error fetching events:", error);
    return [];
  }
}

/**
 * Get upcoming events (date >= today)
 */
export async function getUpcomingEvents(): Promise<Event[]> {
  try {
    const eventsRef = collection(db, "events");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const q = query(
      eventsRef,
      where("date", ">=", Timestamp.fromDate(today)),
      orderBy("date", "asc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Event[];
  } catch (error) {
    console.error("Error fetching upcoming events:", error);
    return [];
  }
}

/**
 * Get a single event by ID
 */
export async function getEvent(eventId: string): Promise<Event | null> {
  try {
    const eventRef = doc(db, "events", eventId);
    const eventDoc = await getDoc(eventRef);
    if (!eventDoc.exists()) return null;
    return {
      id: eventDoc.id,
      ...eventDoc.data(),
    } as Event;
  } catch (error) {
    console.error("Error fetching event:", error);
    return null;
  }
}

/**
 * Create a new event (admin only)
 * @param availableSpots - Optional; when omitted or 0, event has no spot limit
 * @param eventType - "Online" or "In-person"
 * @param imageUrl - Optional image URL for the event
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
  }
): Promise<Event> {
  try {
    const eventsRef = collection(db, "events");
    const spots = options?.availableSpots != null && options.availableSpots > 0
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
    };
    if (options?.imageUrl?.trim()) {
      eventData.image_url = options.imageUrl.trim();
    }
    if (spots != null) {
      eventData.available_spots = spots;
      eventData.total_spots = spots;
    }

    const docRef = await addDoc(eventsRef, eventData);
    return {
      id: docRef.id,
      ...eventData,
      date: Timestamp.fromDate(date),
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
    } as Event;
  } catch (error) {
    console.error("Error creating event:", error);
    throw error;
  }
}

/**
 * Register user for an event
 */
export async function registerForEvent(
  eventId: string,
  userId: string
): Promise<void> {
  try {
    const eventRef = doc(db, "events", eventId);
    const eventDoc = await getDoc(eventRef);

    if (!eventDoc.exists()) {
      throw new Error("Event not found");
    }

    const event = eventDoc.data() as Event;
    const registeredUsers = event.registered_users || [];

    // Check if already registered
    if (registeredUsers.includes(userId)) {
      throw new Error("Already registered for this event");
    }

    const totalSpots = event.total_spots ?? 0;
    // Check if event is full (only when spots are limited)
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
    await updateDoc(eventRef, updateData);
  } catch (error) {
    console.error("Error registering for event:", error);
    throw error;
  }
}

/**
 * Unregister user from an event
 */
export async function unregisterFromEvent(
  eventId: string,
  userId: string
): Promise<void> {
  try {
    const eventRef = doc(db, "events", eventId);
    const eventDoc = await getDoc(eventRef);

    if (!eventDoc.exists()) {
      throw new Error("Event not found");
    }

    const event = eventDoc.data() as Event;
    const registeredUsers = event.registered_users || [];

    // Check if registered
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
    await updateDoc(eventRef, updateData);
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
 * Get registered events for a user
 */
export async function getRegisteredEvents(userId: string): Promise<Event[]> {
  try {
    const eventsRef = collection(db, "events");
    const q = query(eventsRef, orderBy("date", "asc"));
    const snapshot = await getDocs(q);
    const allEvents = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Event[];

    return allEvents.filter((event) =>
      event.registered_users?.includes(userId)
    );
  } catch (error) {
    console.error("Error fetching registered events:", error);
    return [];
  }
}
