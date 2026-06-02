import {FieldValue, type Firestore} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import {
  COLLECTION_EVENTS,
  COLLECTION_EVENTS_MOBILE,
  PAYMENT_ORDERS_COLLECTION,
  SHOP_ITEMS_COLLECTION,
  SHOP_ORDERS_COLLECTION,
  type PaymentClientPlatform,
  type PaymentOrderStatus,
  type StripePurchaseType,
} from "./paymentTypes";
import {logPaymentAnalytics, PAYMENT_ANALYTICS} from "./logPaymentAnalytics";

const APPAREL_CATEGORIES = new Set(["Tees", "Hoodies", "Crewnecks"]);

async function registerUserForEvent(
  db: Firestore,
  eventId: string,
  uid: string,
  eventCollection: string
): Promise<void> {
  const refE = db.collection(COLLECTION_EVENTS).doc(eventId);
  const refM = db.collection(COLLECTION_EVENTS_MOBILE).doc(eventId);
  const [eSnap, mSnap] = await Promise.all([refE.get(), refM.get()]);

  const primary =
    eventCollection === COLLECTION_EVENTS && eSnap.exists ? eSnap :
      mSnap.exists ? mSnap :
        eSnap.exists ? eSnap : null;

  if (!primary?.exists) {
    throw new Error("Event not found for registration");
  }

  const event = primary.data()!;
  const registered = (event.registered_users as string[] | undefined) ?? [];
  if (registered.includes(uid)) {
    return;
  }

  const totalSpots = Number(event.total_spots ?? 0);
  if (totalSpots > 0 && registered.length >= totalSpots) {
    throw new Error("Event is full");
  }

  const updateData: Record<string, unknown> = {
    registered_users: FieldValue.arrayUnion(uid),
    updated_at: FieldValue.serverTimestamp(),
  };
  if (totalSpots > 0) {
    updateData.available_spots = totalSpots - (registered.length + 1);
  }

  const batch = db.batch();
  if (eSnap.exists) batch.update(refE, updateData);
  if (mSnap.exists) batch.update(refM, updateData);
  await batch.commit();
}

async function grantModuleAccess(
  db: Firestore,
  uid: string,
  moduleIds: string[]
): Promise<void> {
  const userRef = db.collection("users").doc(uid);
  await userRef.set(
    {
      membership: {
        paid_modules: FieldValue.arrayUnion(...moduleIds),
      },
      updated_at: FieldValue.serverTimestamp(),
    },
    {merge: true}
  );
}

async function fulfillShopOrder(
  db: Firestore,
  uid: string,
  orderId: string,
  linesJson: string
): Promise<void> {
  const lines = JSON.parse(linesJson) as Array<{
    item_id: string;
    quantity: number;
    size?: string;
    category?: string;
    name?: string;
    unit_price_cents?: number;
  }>;

  await db.collection(SHOP_ORDERS_COLLECTION).doc(orderId).set({
    uid,
    payment_order_id: orderId,
    lines,
    status: "paid",
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  });

  // Stock was reserved at add-to-cart; payment confirms the sale (no release).
  for (const line of lines) {
    const ref = db.collection(SHOP_ITEMS_COLLECTION).doc(line.item_id);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return;
      const data = snap.data()!;
      const category = line.category ?? String(data.category ?? "");
      if (APPAREL_CATEGORIES.has(category) && line.size) {
        const sizeStocks = {...((data.sizeStocks as Record<string, number>) ?? {})};
        // Stock already decremented at cart reserve — only record sold qty on order doc.
        void sizeStocks;
      }
      tx.update(ref, {updated_at: FieldValue.serverTimestamp()});
    });
  }
}

export async function fulfillStripePayment(params: {
  db: Firestore;
  orderId: string;
  uid: string;
  purchaseType: StripePurchaseType;
  metadata: Record<string, string>;
  amountCents: number;
  currency: string;
  clientPlatform: PaymentClientPlatform;
  stripeSessionId: string;
  stripePaymentIntentId?: string | null;
}): Promise<void> {
  const {db, orderId, uid, purchaseType, metadata} = params;
  const orderRef = db.collection(PAYMENT_ORDERS_COLLECTION).doc(orderId);

  const existing = await orderRef.get();
  if (!existing.exists) {
    throw new Error(`Payment order ${orderId} not found`);
  }
  if (existing.data()?.status === "completed") {
    logger.info(`Payment order already completed order=${orderId}`);
    return;
  }

  switch (purchaseType) {
  case "module": {
    const moduleId = metadata.curriculum_module_id || metadata.module_id;
    if (!moduleId) throw new Error("Missing module_id in payment metadata");
    await grantModuleAccess(db, uid, [moduleId]);
    break;
  }
  case "event": {
    const eventId = metadata.event_id;
    const eventCollection = metadata.event_collection || COLLECTION_EVENTS_MOBILE;
    if (!eventId) throw new Error("Missing event_id in payment metadata");
    await registerUserForEvent(db, eventId, uid, eventCollection);
    break;
  }
  case "shop": {
    const linesJson = metadata.shop_lines_json;
    if (!linesJson) throw new Error("Missing shop_lines_json in payment metadata");
    await fulfillShopOrder(db, uid, orderId, linesJson);
    break;
  }
  default:
    throw new Error(`Unknown purchase type: ${purchaseType}`);
  }

  await orderRef.update({
    status: "completed" satisfies PaymentOrderStatus,
    stripe_checkout_session_id: params.stripeSessionId,
    stripe_payment_intent_id: params.stripePaymentIntentId ?? null,
    completed_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  });

  await logPaymentAnalytics(db, {
    user_id: uid,
    event_name: PAYMENT_ANALYTICS.WEBHOOK_SUCCEEDED,
    purchase_type: purchaseType,
    order_id: orderId,
    amount_cents: params.amountCents,
    currency: params.currency,
    client_platform: params.clientPlatform,
    extra: {
      stripe_checkout_session_id: params.stripeSessionId,
    },
  });

  logger.info(`Payment fulfilled order=${orderId} type=${purchaseType} uid=${uid}`);
}

export async function markPaymentOrderFailed(params: {
  db: Firestore;
  orderId: string;
  uid: string;
  purchaseType: StripePurchaseType;
  reason: string;
  clientPlatform: PaymentClientPlatform;
  amountCents?: number;
  currency?: string;
}): Promise<void> {
  const {db, orderId} = params;
  const orderRef = db.collection(PAYMENT_ORDERS_COLLECTION).doc(orderId);
  await orderRef.set(
    {
      status: "failed" satisfies PaymentOrderStatus,
      failure_reason: params.reason.slice(0, 500),
      updated_at: FieldValue.serverTimestamp(),
    },
    {merge: true}
  );

  await logPaymentAnalytics(db, {
    user_id: params.uid,
    event_name: PAYMENT_ANALYTICS.WEBHOOK_FAILED,
    purchase_type: params.purchaseType,
    order_id: orderId,
    amount_cents: params.amountCents,
    currency: params.currency ?? "usd",
    client_platform: params.clientPlatform,
    extra: {failure_reason: params.reason},
  });
}
