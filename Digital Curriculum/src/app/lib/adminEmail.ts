import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

export type SendEventRegistrantEmailResult = {
  ok: boolean;
  sent: number;
  failed: number;
  recipientCount: number;
};

export type SendCustomAnnouncementResult = {
  ok: boolean;
  sent: number;
  failed: number;
  skipped_preferences?: number;
  recipientCount: number;
};

export async function sendEventRegistrantEmail(input: {
  eventId: string;
  messageBody: string;
  collection?: "events" | "events_mobile" | "auto";
  eventLocationOverride?: string;
}): Promise<SendEventRegistrantEmailResult> {
  const fn = httpsCallable(functions, "adminSendEventRegistrantEmail");
  const res = await fn({
    event_id: input.eventId,
    message_body: input.messageBody,
    collection: input.collection ?? "auto",
    event_location_override: input.eventLocationOverride,
  });
  return res.data as SendEventRegistrantEmailResult;
}

export async function sendCustomAnnouncementEmail(input: {
  headline: string;
  messageBody: string;
  senderName: string;
  ctaUrl?: string;
  ctaLabel?: string;
  emails?: string[];
  userIds?: string[];
  role?: string;
}): Promise<SendCustomAnnouncementResult> {
  const fn = httpsCallable(functions, "adminSendCustomAnnouncementEmail");
  const payload: Record<string, unknown> = {
    headline: input.headline,
    message_body: input.messageBody,
    sender_name: input.senderName,
  };
  if (input.ctaUrl?.trim()) payload.cta_url = input.ctaUrl.trim();
  if (input.ctaLabel?.trim()) payload.cta_label = input.ctaLabel.trim();
  if (input.emails?.length) payload.emails = input.emails;
  if (input.userIds?.length) payload.user_ids = input.userIds;
  if (input.role?.trim()) payload.role = input.role.trim();

  const res = await fn(payload);
  return res.data as SendCustomAnnouncementResult;
}
