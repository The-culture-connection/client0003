import type {Firestore} from "firebase-admin/firestore";
import {FieldValue} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import {
  COLLECTION_EVENTS,
  COLLECTION_EVENTS_MOBILE,
  COURSES_COLLECTION,
  PAYMENT_ORDERS_COLLECTION,
  SHOP_ORDERS_COLLECTION,
  type StripePurchaseType,
} from "../stripe/paymentTypes";
import type {CheckoutSnapshot} from "../stripe/extractCheckoutSnapshot";
import {
  paymentEventConfirmedParams,
  paymentModuleConfirmedParams,
  paymentShopConfirmedParams,
  shopFulfillmentUpdateParams,
} from "./buildEmailParams";
import {sendTransactionalEmail} from "./sendTransactionalEmail";
import type {BrevoTemplateKey} from "./brevoTemplates";

type ShopLine = {
  item_id: string;
  quantity: number;
  size?: string;
  category?: string;
  name?: string;
  unit_price_cents?: number;
};

async function resolveUserEmail(
  db: Firestore,
  uid: string,
  fallback?: string | null
): Promise<{email: string | null; userName?: string | null}> {
  const snap = await db.collection("users").doc(uid).get();
  const data = snap.data();
  const email =
    (typeof data?.email === "string" && data.email.includes("@") ? data.email : null) ??
    (typeof fallback === "string" && fallback.includes("@") ? fallback : null);
  const userName =
    typeof data?.displayName === "string" ? data.displayName :
      typeof data?.name === "string" ? data.name :
        null;
  return {email, userName};
}

function formatLinesPlain(lines: ShopLine[]): string {
  return lines
    .map((l, i) => {
      const name = l.name?.trim() || l.item_id;
      const qty = l.quantity ?? 1;
      const parts = [`${i + 1}. ${qty} × ${name}`];
      if (l.size) parts.push(`Size ${l.size}`);
      if (l.category) parts.push(l.category);
      return parts.join(" · ");
    })
    .join("\n");
}

async function loadEventTitle(
  db: Firestore,
  eventId: string,
  collection: string
): Promise<{title: string; dateLabel: string; location: string}> {
  const ref =
    collection === COLLECTION_EVENTS ?
      db.collection(COLLECTION_EVENTS).doc(eventId) :
      db.collection(COLLECTION_EVENTS_MOBILE).doc(eventId);
  const snap = await ref.get();
  const data = snap.data() ?? {};
  const title = String(data.title ?? "Event");
  const time = String(data.time ?? "");
  let dateLabel = time || "See your events page for details";
  const rawDate = data.date;
  if (rawDate && typeof (rawDate as {toDate?: () => Date}).toDate === "function") {
    const d = (rawDate as {toDate: () => Date}).toDate();
    dateLabel = `${d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "long",
      day: "numeric",
      year: "numeric",
    })}${time ? ` · ${time}` : ""}`;
  }
  return {
    title,
    dateLabel,
    location: String(data.location ?? "See event page for location"),
  };
}

async function loadModuleTitle(
  db: Firestore,
  courseId: string,
  moduleId: string,
  curriculumModuleId?: string
): Promise<{courseTitle: string; moduleTitle: string; curriculumUrl: string}> {
  const snap = await db.collection(COURSES_COLLECTION).doc(courseId).get();
  const course = snap.data() ?? {};
  const courseTitle = String(course.title ?? "Course");
  const modules = (course.modules as Array<Record<string, unknown>>) ?? [];
  const mod =
    modules.find((m) => m.id === moduleId || m.moduleId === moduleId) ??
    modules.find((m) => {
      const mapping = course.curriculumMapping as {modules?: Array<{moduleId?: string}>} | undefined;
      const idx = modules.indexOf(m);
      return mapping?.modules?.[idx]?.moduleId === curriculumModuleId;
    });
  const moduleTitle = String(mod?.title ?? "Course module");
  const base = process.env.DIGITAL_CURRICULUM_PLATFORM_URL?.trim() || "https://mortar-stage-stage.up.railway.app";
  const curriculumUrl = `${base.replace(/\/$/, "")}/curriculum/${courseId}`;
  return {courseTitle, moduleTitle, curriculumUrl};
}

async function sendOnce(
  templateKey: BrevoTemplateKey,
  input: {to: string; recipientUid: string; params: Record<string, unknown>}
): Promise<void> {
  const result = await sendTransactionalEmail(templateKey, {
    to: input.to,
    recipientUid: input.recipientUid,
    params: input.params,
  });
  if (!result.sent) {
    logger.warn("Payment email not sent", {templateKey, to: input.to, skipped: result.skipped});
  }
}

/** Order confirmation after successful Stripe fulfillment (once per payment order). */
export async function sendPurchaseConfirmationEmail(params: {
  db: Firestore;
  uid: string;
  orderId: string;
  purchaseType: StripePurchaseType;
  metadata: Record<string, string>;
  snapshot: CheckoutSnapshot;
  shopLines?: ShopLine[];
}): Promise<void> {
  const {db, uid, orderId, purchaseType, metadata, snapshot} = params;
  const orderRef = db.collection(PAYMENT_ORDERS_COLLECTION).doc(orderId);
  const orderSnap = await orderRef.get();
  if (orderSnap.data()?.brevo_email_confirmation_sent_at) {
    return;
  }

  const {email, userName} = await resolveUserEmail(db, uid, snapshot.customer_email);
  if (!email) {
    logger.warn("Purchase confirmation email skipped: no recipient email", {orderId, uid});
    return;
  }

  const currency = snapshot.currency ?? "usd";

  try {
    switch (purchaseType) {
    case "shop": {
      const lines = params.shopLines ?? [];
      await sendOnce("payment_shop_order_confirmed", {
        to: email,
        recipientUid: uid,
        params: paymentShopConfirmedParams({
          userEmail: email,
          userName: userName ?? undefined,
          order_id: orderId,
          order_lines_plain: formatLinesPlain(lines),
          amount_subtotal: snapshot.subtotal_cents,
          amount_tax: snapshot.tax_cents,
          amount_shipping: snapshot.shipping_cents,
          amount_total: snapshot.total_cents,
          currency,
          shipping_address_plain: snapshot.shipping_address,
        }),
      });
      break;
    }
    case "event": {
      const eventId = metadata.event_id;
      const coll = metadata.event_collection || COLLECTION_EVENTS;
      if (!eventId) break;
      const ev = await loadEventTitle(db, eventId, coll);
      await sendOnce("payment_event_registration_confirmed", {
        to: email,
        recipientUid: uid,
        params: paymentEventConfirmedParams({
          userEmail: email,
          userName: userName ?? undefined,
          order_id: orderId,
          event_title: ev.title,
          event_date: ev.dateLabel,
          event_location: ev.location,
          event_id: eventId,
          amount_total: snapshot.total_cents,
          currency,
        }),
      });
      break;
    }
    case "module": {
      const courseId = metadata.course_id;
      const moduleId = metadata.module_id;
      const curriculumModuleId = metadata.curriculum_module_id;
      if (!courseId || !moduleId) break;
      const mod = await loadModuleTitle(db, courseId, moduleId, curriculumModuleId);
      await sendOnce("payment_module_purchase_confirmed", {
        to: email,
        recipientUid: uid,
        params: paymentModuleConfirmedParams({
          userEmail: email,
          userName: userName ?? undefined,
          order_id: orderId,
          course_title: mod.courseTitle,
          module_title: mod.moduleTitle,
          curriculum_url: mod.curriculumUrl,
          amount_total: snapshot.total_cents,
          currency,
        }),
      });
      break;
    }
    default:
      break;
    }

    await orderRef.set(
      {brevo_email_confirmation_sent_at: FieldValue.serverTimestamp()},
      {merge: true}
    );
  } catch (err) {
    logger.warn("Purchase confirmation email failed (payment still fulfilled)", {orderId, err});
  }
}

const FULFILLMENT_LABELS: Record<string, string> = {
  unfulfilled: "Order received",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** Notify buyer when staff updates shop fulfillment status. */
export async function sendShopFulfillmentUpdateEmail(params: {
  db: Firestore;
  orderId: string;
  uid: string;
  fulfillmentStatus: string;
  trackingNumber?: string | null;
  lines: ShopLine[];
  customerEmail?: string | null;
}): Promise<void> {
  const {db, orderId, uid, fulfillmentStatus, trackingNumber, lines, customerEmail} = params;
  if (fulfillmentStatus === "unfulfilled") return;

  const {email, userName} = await resolveUserEmail(db, uid, customerEmail ?? null);
  if (!email) return;

  const statusLabel = FULFILLMENT_LABELS[fulfillmentStatus] ?? fulfillmentStatus;
  const trackingLine = trackingNumber?.trim() ?
    `Tracking number: ${trackingNumber.trim()}` :
    "Tracking will be added when your order ships.";

  await sendOnce("shop_order_fulfillment_update", {
    to: email,
    recipientUid: uid,
    params: shopFulfillmentUpdateParams({
      userEmail: email,
      userName: userName ?? undefined,
      order_id: orderId,
      fulfillment_status: statusLabel,
      tracking_line: trackingLine,
      order_lines_plain: formatLinesPlain(lines),
    }),
  });

  await db.collection(SHOP_ORDERS_COLLECTION).doc(orderId).set(
    {
      last_fulfillment_email_status: fulfillmentStatus,
      last_fulfillment_email_at: FieldValue.serverTimestamp(),
    },
    {merge: true}
  );
}
