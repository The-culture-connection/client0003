/**
 * adminUpdateShopOrderFulfillment — staff updates shop order fulfillment status / tracking.
 */

import {getApps, initializeApp} from "firebase-admin/app";
import {FieldValue, getFirestore} from "firebase-admin/firestore";
import {HttpsError, onCall} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {z} from "zod";
import {callableCorsAllowlist} from "../callableCorsAllowlist";
import {assertCallerIsNetworkAdmin} from "../helpers/assertNetworkAdmin";
import {nullishUndefined} from "../helpers/callableNullishZod";
import {BREVO_API_KEY} from "../email/brevoClient";
import {sendShopFulfillmentUpdateEmail} from "../email/paymentOrderEmails";
import {SHOP_ORDERS_COLLECTION, type ShopFulfillmentStatus} from "../stripe/paymentTypes";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

const FULFILLMENT_STATUSES = [
  "unfulfilled",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const satisfies readonly ShopFulfillmentStatus[];

const requestSchema = z.object({
  order_id: z.string().min(1),
  fulfillment_status: z.enum(FULFILLMENT_STATUSES),
  tracking_number: nullishUndefined(z.string().max(128)),
  admin_notes: nullishUndefined(z.string().max(500)),
});

export const adminUpdateShopOrderFulfillment = onCall(
  {
    region: "us-central1",
    invoker: "public",
    cors: callableCorsAllowlist,
    secrets: [BREVO_API_KEY],
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Sign in required");
    }
    await assertCallerIsNetworkAdmin(uid, {authToken: request.auth?.token});

    const parsed = requestSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", parsed.error.message);
    }

    const {order_id, fulfillment_status, tracking_number, admin_notes} = parsed.data;
    const ref = db.collection(SHOP_ORDERS_COLLECTION).doc(order_id);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new HttpsError("not-found", "Shop order not found");
    }
    const before = snap.data() as Record<string, unknown>;
    const prevStatus = String(before.fulfillment_status ?? "unfulfilled");
    const prevTracking = (before.tracking_number as string | null) ?? null;

    const update: Record<string, unknown> = {
      fulfillment_status,
      updated_at: FieldValue.serverTimestamp(),
    };
    if (tracking_number !== undefined) {
      update.tracking_number = tracking_number.trim() || null;
    }
    if (admin_notes !== undefined) {
      update.admin_notes = admin_notes.trim() || null;
    }
    if (fulfillment_status === "delivered" || fulfillment_status === "shipped") {
      update.fulfilled_at = FieldValue.serverTimestamp();
    }

    await ref.update(update);

    const statusChanged = prevStatus !== fulfillment_status;
    const trackingChanged =
      tracking_number !== undefined &&
      (tracking_number.trim() || null) !== prevTracking;
    if (
      (statusChanged || trackingChanged) &&
      fulfillment_status !== "unfulfilled"
    ) {
      try {
        const uid = String(before.uid ?? "");
        const lines = Array.isArray(before.lines) ? before.lines : [];
        await sendShopFulfillmentUpdateEmail({
          db,
          orderId: order_id,
          uid,
          fulfillmentStatus: fulfillment_status,
          trackingNumber:
            tracking_number !== undefined ?
              tracking_number.trim() || null :
              (before.tracking_number as string | null),
          lines: lines as Array<{
            item_id: string;
            quantity: number;
            size?: string;
            category?: string;
            name?: string;
          }>,
          customerEmail: (before.customer_email as string | null) ?? null,
        });
      } catch (emailErr) {
        // Fulfillment save succeeded; email is best-effort.
        logger.warn("Shop fulfillment email failed", emailErr);
      }
    }

    return {ok: true, order_id, fulfillment_status};
  }
);
