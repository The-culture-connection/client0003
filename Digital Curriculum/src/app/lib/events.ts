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

export interface Event {
  id: string;
  title: string;
  date: Timestamp;
  time: string; // e.g., "2:00 PM - 4:00 PM"
  location: string;
  available_spots: number;
  total_spots: number;
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
 */
export async function createEvent(
  title: string,
  date: Date,
  time: string,
  location: string,
  availableSpots: number,
  details: string
): Promise<Event> {
  try {
    const eventsRef = collection(db, "events");
    const eventData = {
      title: title.trim(),
      date: Timestamp.fromDate(date),
      time: time.trim(),
      location: location.trim(),
      available_spots: availableSpots,
      total_spots: availableSpots,
      details: details.trim(),
      registered_users: [],
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    };

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

    // Check if event is full
    if (registeredUsers.length >= event.total_spots) {
      throw new Error("Event is full");
    }

    // Register user
    await updateDoc(eventRef, {
      registered_users: arrayUnion(userId),
      available_spots: event.total_spots - (registeredUsers.length + 1),
      updated_at: serverTimestamp(),
    });
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

    // Unregister user
    await updateDoc(eventRef, {
      registered_users: arrayRemove(userId),
      available_spots: event.total_spots - (registeredUsers.length - 1),
      updated_at: serverTimestamp(),
    });
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
