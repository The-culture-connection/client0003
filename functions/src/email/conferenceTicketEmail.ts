import type {Firestore} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import {CONFERENCES_COLLECTION} from "../stripe/paymentTypes";
import {conferenceTicketConfirmedParams, formatEventDate} from "./buildEmailParams";
import {sendTransactionalEmail} from "./sendTransactionalEmail";

function toDateOrUndefined(value: unknown): Date | undefined {
  if (value && typeof (value as {toDate?: () => Date}).toDate === "function") {
    return (value as {toDate: () => Date}).toDate();
  }
  return value instanceof Date ? value : undefined;
}

/**
 * Send the `conference_ticket_confirmed` email (code + active window + details).
 * Shared by paid Stripe fulfillment and free registration so both stay in sync.
 */
export async function sendConferenceTicketConfirmationEmail(input: {
  db: Firestore;
  to: string;
  recipientUid?: string;
  userName?: string | null;
  conferenceId: string;
  ticketCode: string;
  orderId?: string;
  amountCents?: number;
  currency?: string;
}): Promise<void> {
  const snap = await input.db.collection(CONFERENCES_COLLECTION).doc(input.conferenceId).get();
  const data = snap.data() ?? {};
  const start = toDateOrUndefined(data.startDate);
  const activeFrom = toDateOrUndefined(data.activeFrom);
  const codeActiveLabel =
    !activeFrom || activeFrom.getTime() <= Date.now() ?
      "now" :
      activeFrom.toLocaleString("en-US", {dateStyle: "medium", timeStyle: "short"});

  const result = await sendTransactionalEmail("conference_ticket_confirmed", {
    to: input.to,
    recipientUid: input.recipientUid,
    params: conferenceTicketConfirmedParams({
      userEmail: input.to,
      userName: input.userName ?? undefined,
      conference_name: String(data.name ?? "the conference"),
      ticket_code: input.ticketCode,
      conference_date: formatEventDate(start),
      conference_location: String(data.location ?? "See the conference details in the app"),
      code_active_label: codeActiveLabel,
      order_id: input.orderId ?? "—",
      amount_total: input.amountCents,
      currency: input.currency,
    }),
  });

  if (!result.sent) {
    logger.warn("Conference ticket email not sent", {
      conferenceId: input.conferenceId,
      to: input.to,
      skipped: result.skipped,
    });
  }
}
