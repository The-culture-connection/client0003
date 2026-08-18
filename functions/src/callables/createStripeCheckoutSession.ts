/**
 * createStripeCheckoutSession — authenticated Checkout Session for module, event, or shop purchases.
 */

import {getApps, initializeApp} from "firebase-admin/app";
import {FieldValue, getFirestore} from "firebase-admin/firestore";
import {HttpsError, onCall} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {callableCorsAllowlist} from "../callableCorsAllowlist";
import {DEFAULT_PLATFORM_URL} from "../email/emailConfig";
import {
  createCheckoutInputSchema,
  purchaseTypeFromInput,
  resolveCheckoutPricing,
  totalAmountCents,
} from "../stripe/resolveCheckoutPricing";
import {
  PAYMENT_ORDERS_COLLECTION,
  type PaymentOrderDoc,
} from "../stripe/paymentTypes";
import {getStripeClient, resolveStripeSecretKey} from "../stripe/stripeClient";
import {STRIPE_SECRET_KEY} from "../stripe/stripeSecrets";
import {toStripeSessionMetadata} from "../stripe/stripeMetadata";
import {buildCheckoutSessionExtras} from "../stripe/checkoutSessionExtras";
import {taxCodeForCheckoutLine} from "../stripe/stripeTaxCodes";
import Stripe from "stripe";
import {logPaymentAnalytics} from "../stripe/logPaymentAnalytics";
import {WEB_ANALYTICS_EVENTS} from "../analytics/mortarAnalyticsContract";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

const MOBILE_RETURN_BASE =
  process.env.MOBILE_PAYMENT_RETURN_URL?.trim() ||
  "https://us-central1-mortar-stage.cloudfunctions.net/mobilePaymentReturn";

function defaultSuccessUrl(platform: string): string {
  if (platform === "ios" || platform === "android") {
    return `${MOBILE_RETURN_BASE}?platform=${platform}`;
  }
  const base = process.env.DIGITAL_CURRICULUM_PLATFORM_URL?.trim() || DEFAULT_PLATFORM_URL;
  return `${base.replace(/\/$/, "")}/payment/success?platform=${platform}`;
}

function defaultCancelUrl(platform: string): string {
  const base = process.env.DIGITAL_CURRICULUM_PLATFORM_URL?.trim() || DEFAULT_PLATFORM_URL;
  return `${base.replace(/\/$/, "")}/payment/cancel?platform=${platform}`;
}

export const createStripeCheckoutSession = onCall(
  {
    region: "us-central1",
    // Match other browser callables (e.g. adminSendTestTransactionalEmail). Cloud Run must allow unauthenticated OPTIONS.
    invoker: "public",
    cors: callableCorsAllowlist,
    secrets: [STRIPE_SECRET_KEY],
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Sign in to continue to checkout");
    }

    const parsed = createCheckoutInputSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", parsed.error.message);
    }
    const input = parsed.data;
    const purchaseType = purchaseTypeFromInput(input);
    const clientPlatform = input.client_platform;

    const resolved = await resolveCheckoutPricing(db, input);
    const amountCents = totalAmountCents(resolved);

    const orderRef = db.collection(PAYMENT_ORDERS_COLLECTION).doc();
    const orderId = orderRef.id;

    const orderMetadata: Record<string, string> = {
      ...resolved.metadata,
      order_id: orderId,
      uid,
      client_platform: clientPlatform,
      amount_cents: String(amountCents),
      currency: resolved.currency,
    };

    if (input.purchase_type === "shop") {
      const productLines = resolved.line_items.filter(
        (li) => li.metadata?.line_type !== "shipping"
      );
      orderMetadata.shop_lines_json = JSON.stringify(
        productLines.map((li) => ({
          item_id: li.metadata.item_id ?? "",
          quantity: li.quantity,
          name: li.name,
          unit_price_cents: li.amount_cents,
          ...(li.metadata.size ? {size: li.metadata.size} : {}),
          ...(li.metadata.category ? {category: li.metadata.category} : {}),
        }))
      );
    }

    // Stripe rejects metadata values > 500 chars — keep cart JSON in Firestore only.
    const stripeMetadata = toStripeSessionMetadata({
      ...resolved.metadata,
      order_id: orderId,
      uid,
      client_platform: clientPlatform,
      purchase_type: purchaseType,
      amount_cents: String(amountCents),
      currency: resolved.currency,
    });

    const orderDoc: Omit<PaymentOrderDoc, "created_at" | "updated_at"> & {
      created_at: FirebaseFirestore.FieldValue;
      updated_at: FirebaseFirestore.FieldValue;
    } = {
      uid,
      purchase_type: purchaseType,
      status: "pending",
      amount_cents: amountCents,
      currency: resolved.currency,
      stripe_checkout_session_id: null,
      stripe_payment_intent_id: null,
      client_platform: clientPlatform,
      metadata: orderMetadata,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    };
    await orderRef.set(orderDoc);

    let stripeSecret: string;
    try {
      stripeSecret = resolveStripeSecretKey();
    } catch (keyErr) {
      const msg = keyErr instanceof Error ? keyErr.message : "Invalid STRIPE_SECRET_KEY";
      throw new HttpsError("failed-precondition", msg);
    }
    const stripe = getStripeClient(stripeSecret);
    const successUrl = input.success_url ?? defaultSuccessUrl(clientPlatform);
    const cancelUrl = input.cancel_url ?? defaultCancelUrl(clientPlatform);

    const tokenEmail = request.auth?.token?.email;
    const customerEmail =
      typeof tokenEmail === "string" && tokenEmail.includes("@") ? tokenEmail : undefined;

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        client_reference_id: orderId,
        customer_email: customerEmail,
        ...buildCheckoutSessionExtras(purchaseType),
        ...(resolved.custom_fields?.length ? {custom_fields: resolved.custom_fields} : {}),
        line_items: resolved.line_items.map((li) => ({
          quantity: li.quantity,
          price_data: {
            currency: resolved.currency,
            unit_amount: li.amount_cents,
            product_data: {
              name: li.name.slice(0, 250),
              tax_code: taxCodeForCheckoutLine(purchaseType, li.metadata),
            },
          },
        })),
        success_url: `${successUrl}${successUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}&type=${purchaseType}${resolved.metadata.event_id ? `&event_id=${resolved.metadata.event_id}` : ""}`,
        cancel_url: `${cancelUrl}${cancelUrl.includes("?") ? "&" : "?"}order_id=${orderId}&type=${purchaseType}`,
        metadata: stripeMetadata,
      });
    } catch (err) {
      logger.error("Stripe checkout.sessions.create failed", {
        orderId,
        uid,
        purchaseType,
        err,
      });
      const message =
        err instanceof Stripe.errors.StripeError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Stripe checkout failed";
      throw new HttpsError("failed-precondition", message);
    }

    await orderRef.update({
      stripe_checkout_session_id: session.id,
      updated_at: FieldValue.serverTimestamp(),
    });

    try {
      await logPaymentAnalytics(db, {
        user_id: uid,
        event_name: WEB_ANALYTICS_EVENTS.PAYMENT_CHECKOUT_STARTED,
        purchase_type: purchaseType,
        order_id: orderId,
        amount_cents: amountCents,
        currency: resolved.currency,
        client_platform: clientPlatform,
        extra: {stripe_checkout_session_id: session.id},
      });
    } catch (analyticsErr) {
      logger.warn("Payment analytics log failed (checkout still ok)", analyticsErr);
    }

    if (!session.url) {
      logger.error("Stripe session missing url", {sessionId: session.id});
      throw new HttpsError("internal", "Checkout session could not be created");
    }

    logger.info(`Checkout session created order=${orderId} type=${purchaseType} uid=${uid}`);

    return {
      checkout_url: session.url,
      session_id: session.id,
      order_id: orderId,
      amount_cents: amountCents,
      currency: resolved.currency,
    };
  }
);
