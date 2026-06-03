/**
 * stripeWebhook — Stripe → Mortar (verify signature, fulfill Firestore access).
 *
 * Dashboard endpoint (after deploy):
 *   https://us-central1-<project>.cloudfunctions.net/stripeWebhook
 *
 * Subscribe at minimum to:
 *   checkout.session.completed
 *   checkout.session.expired
 *   checkout.session.async_payment_failed
 */

import {getApps, initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import Stripe from "stripe";
import {extractCheckoutSnapshot} from "../stripe/extractCheckoutSnapshot";
import {fulfillStripePayment, markPaymentOrderFailed} from "../stripe/fulfillStripePayment";
import {PAYMENT_ORDERS_COLLECTION, type StripePurchaseType} from "../stripe/paymentTypes";
import {getStripeClient, resolveStripeSecretKey} from "../stripe/stripeClient";
import {BREVO_API_KEY} from "../email/brevoClient";
import {STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET} from "../stripe/stripeSecrets";
import type {PaymentClientPlatform} from "../stripe/paymentTypes";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

function readMetadata(session: Stripe.Checkout.Session): Record<string, string> {
  const raw = session.metadata ?? {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

export const stripeWebhook = onRequest(
  {
    region: "us-central1",
    secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, BREVO_API_KEY],
    invoker: "public", // Stripe servers must POST without Firebase Auth
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const sig = req.headers["stripe-signature"];
    if (!sig || typeof sig !== "string") {
      res.status(400).send("Missing stripe-signature");
      return;
    }

    const webhookSecret =
      STRIPE_WEBHOOK_SECRET.value()?.trim() || process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!webhookSecret) {
      logger.error("STRIPE_WEBHOOK_SECRET not configured");
      res.status(500).send("Webhook not configured");
      return;
    }

    const stripe = getStripeClient(resolveStripeSecretKey());
    let event: Stripe.Event;
    try {
      const rawBody = (req as {rawBody?: Buffer}).rawBody;
      if (!rawBody) {
        res.status(400).send("Missing raw body");
        return;
      }
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err) {
      logger.warn("Stripe webhook signature verification failed", err);
      res.status(400).send("Invalid signature");
      return;
    }

    try {
      switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
          res.json({received: true, skipped: "payment_status"});
          return;
        }
        const metadata = readMetadata(session);
        const orderId = session.client_reference_id ?? metadata.order_id;
        const uid = metadata.uid;
        const purchaseType = metadata.purchase_type as StripePurchaseType | undefined;
        const clientPlatform = (metadata.client_platform ?? "web") as PaymentClientPlatform;

        if (!orderId || !uid || !purchaseType) {
          logger.error("checkout.session.completed missing metadata", {orderId, uid, purchaseType});
          res.status(400).send("Missing metadata");
          return;
        }

        const amountCents = session.amount_total ?? Number(metadata.amount_cents ?? 0);
        const checkoutSnapshot = extractCheckoutSnapshot(session);
        await fulfillStripePayment({
          db,
          orderId,
          uid,
          purchaseType,
          metadata,
          amountCents,
          currency: session.currency ?? "usd",
          clientPlatform,
          stripeSessionId: session.id,
          stripePaymentIntentId:
            typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
          checkoutSnapshot,
        });
        break;
      }
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = readMetadata(session);
        const orderId = session.client_reference_id ?? metadata.order_id;
        const uid = metadata.uid;
        const purchaseType = (metadata.purchase_type ?? "shop") as StripePurchaseType;
        const clientPlatform = (metadata.client_platform ?? "web") as PaymentClientPlatform;
        if (orderId && uid) {
          await markPaymentOrderFailed({
            db,
            orderId,
            uid,
            purchaseType,
            reason: event.type,
            clientPlatform,
            amountCents: session.amount_total ?? undefined,
            currency: session.currency ?? undefined,
          });
          if (event.type === "checkout.session.expired") {
            await db.collection(PAYMENT_ORDERS_COLLECTION).doc(orderId).set(
              {status: "expired", updated_at: new Date()},
              {merge: true}
            );
          }
        }
        break;
      }
      default:
        logger.debug(`Unhandled Stripe event type: ${event.type}`);
      }

      res.json({received: true});
    } catch (err) {
      logger.error("Stripe webhook handler error", err);
      res.status(500).send("Webhook handler failed");
    }
  }
);
