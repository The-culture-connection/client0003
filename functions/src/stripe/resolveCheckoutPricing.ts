import {HttpsError} from "firebase-functions/v2/https";
import type {Firestore} from "firebase-admin/firestore";
import type Stripe from "stripe";
import {z} from "zod";
import {buildShirtSizeCustomField} from "./checkoutSessionExtras";
import {readConferenceTiers, selectConferenceTier} from "./conferenceTiers";
import {
  COLLECTION_EVENTS,
  COLLECTION_EVENTS_MOBILE,
  CONFERENCES_COLLECTION,
  COURSES_COLLECTION,
  SHOP_ITEMS_COLLECTION,
  type StripePurchaseType,
} from "./paymentTypes";
import {resolveShopFlatShippingCents} from "./shopShipping";

const shopLineSchema = z.object({
  item_id: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
  size: z.string().max(32).nullish(),
  category: z.string().max(64).nullish(),
});

export const createCheckoutInputSchema = z.discriminatedUnion("purchase_type", [
  z.object({
    purchase_type: z.literal("module"),
    course_id: z.string().min(1),
    module_id: z.string().min(1),
    success_url: z.string().url().optional(),
    cancel_url: z.string().url().optional(),
    client_platform: z.enum(["web", "ios", "android"]).default("web"),
  }),
  z.object({
    purchase_type: z.literal("bundle"),
    course_id: z.string().min(1),
    success_url: z.string().url().optional(),
    cancel_url: z.string().url().optional(),
    client_platform: z.enum(["web", "ios", "android"]).default("web"),
  }),
  z.object({
    purchase_type: z.literal("event"),
    event_id: z.string().min(1),
    /** Which Firestore collection hosts the canonical event doc for pricing. */
    event_collection: z.enum([COLLECTION_EVENTS, COLLECTION_EVENTS_MOBILE]).default(COLLECTION_EVENTS_MOBILE),
    success_url: z.string().url().optional(),
    cancel_url: z.string().url().optional(),
    client_platform: z.enum(["web", "ios", "android"]).default("web"),
  }),
  z.object({
    purchase_type: z.literal("shop"),
    lines: z.array(shopLineSchema).min(1).max(24),
    success_url: z.string().url().optional(),
    cancel_url: z.string().url().optional(),
    client_platform: z.enum(["web", "ios", "android"]).default("web"),
  }),
  z.object({
    purchase_type: z.literal("conference"),
    conference_id: z.string().min(1),
    /** Which ticket tier (e.g. `ga`, `vip`); optional only for single-tier conferences. */
    tier_id: z.string().min(1).max(64).optional(),
    success_url: z.string().url().optional(),
    cancel_url: z.string().url().optional(),
    client_platform: z.enum(["web", "ios", "android"]).default("web"),
  }),
]);

export type CreateCheckoutInput = z.infer<typeof createCheckoutInputSchema>;

export interface ResolvedLineItem {
  name: string;
  amount_cents: number;
  quantity: number;
  metadata: Record<string, string>;
}

export interface ResolvedCheckout {
  line_items: ResolvedLineItem[];
  currency: string;
  metadata: Record<string, string>;
  /** Extra answers Stripe Checkout should collect (e.g. a VIP tier's shirt size). */
  custom_fields?: Stripe.Checkout.SessionCreateParams.CustomField[];
}

const MIN_CHARGE_CENTS_USD = 50;

function dollarsToCents(price: number, currency = "usd"): number {
  if (!Number.isFinite(price) || price <= 0) {
    throw new HttpsError("failed-precondition", "This item is free and does not require payment");
  }
  const cents = Math.round(price * 100);
  if (currency === "usd" && cents < MIN_CHARGE_CENTS_USD) {
    throw new HttpsError(
      "failed-precondition",
      `Minimum charge is $${(MIN_CHARGE_CENTS_USD / 100).toFixed(2)} (item price is too low for Stripe)`
    );
  }
  return cents;
}

function readTicketPriceCents(data: FirebaseFirestore.DocumentData): number {
  const cents = data.ticket_price_cents;
  if (typeof cents === "number" && cents > 0) return Math.round(cents);
  const dollars = data.ticket_price;
  if (typeof dollars === "number" && dollars > 0) return dollarsToCents(dollars);
  return 0;
}

/**
 * Paid modules in a course the user does not own yet, with the curriculum
 * module id that fulfillment grants (same id rule as single-module checkout).
 */
async function unpaidCourseModules(
  db: Firestore,
  course: FirebaseFirestore.DocumentData,
  uid: string | undefined
): Promise<Array<{title: string; price: number; grantId: string; courseModuleId: string}>> {
  const modules = (course.modules as Array<Record<string, unknown>>) ?? [];
  const mappingModules =
    (course.curriculumMapping as {modules?: Array<{moduleId?: string}>} | undefined)?.modules ?? [];
  let owned = new Set<string>();
  if (uid) {
    const userSnap = await db.collection("users").doc(uid).get();
    const list = userSnap.data()?.membership?.paid_modules;
    if (Array.isArray(list)) owned = new Set(list.filter((x): x is string => typeof x === "string"));
  }
  // Modules are stored in display order; mapping rows are aligned by index after sorting.
  const sorted = modules
    .map((m, i) => ({m, i}))
    .sort((a, b) => Number(a.m.order ?? 0) - Number(b.m.order ?? 0));
  const out: Array<{title: string; price: number; grantId: string; courseModuleId: string}> = [];
  sorted.forEach(({m}, sortedIndex) => {
    const price = Number(m.price ?? 0);
    if (!(price > 0)) return;
    const courseModuleId = String(m.id ?? "");
    const grantId = mappingModules[sortedIndex]?.moduleId ?? courseModuleId;
    if (!grantId) return;
    if (owned.has(grantId) || (courseModuleId && owned.has(courseModuleId))) return;
    out.push({title: String(m.title ?? "Course module"), price, grantId, courseModuleId});
  });
  return out;
}

export async function resolveCheckoutPricing(
  db: Firestore,
  input: CreateCheckoutInput,
  uid?: string
): Promise<ResolvedCheckout> {
  switch (input.purchase_type) {
  case "module": {
    const courseSnap = await db.collection(COURSES_COLLECTION).doc(input.course_id).get();
    if (!courseSnap.exists) {
      throw new HttpsError("not-found", "Course not found");
    }
    const course = courseSnap.data()!;
    const modules = (course.modules as Array<Record<string, unknown>>) ?? [];
    const mappingModules =
      (course.curriculumMapping as {modules?: Array<{moduleId?: string}>} | undefined)?.modules ??
      [];

    let modIndex = modules.findIndex(
      (m) =>
        String(m.id ?? "") === input.module_id || String(m.moduleId ?? "") === input.module_id
    );
    if (modIndex < 0) {
      modIndex = mappingModules.findIndex((m) => m.moduleId === input.module_id);
    }
    const mod = modIndex >= 0 ? modules[modIndex] : undefined;
    if (!mod) {
      throw new HttpsError("not-found", "Module not found in course");
    }
    const price = Number(mod.price ?? 0);
    const amountCents = dollarsToCents(price, String(course.currency ?? "usd").toLowerCase());
    const title = String(mod.title ?? "Course module");
    const curriculumModuleId =
      mappingModules[modIndex]?.moduleId ?? String(mod.id ?? input.module_id);

    return {
      currency: String(course.currency ?? "usd").toLowerCase(),
      line_items: [
        {
          name: title,
          amount_cents: amountCents,
          quantity: 1,
          metadata: {
            course_id: input.course_id,
            module_id: String(mod.id ?? input.module_id),
            curriculum_module_id: curriculumModuleId,
          },
        },
      ],
      metadata: {
        purchase_type: "module",
        course_id: input.course_id,
        module_id: String(mod.id ?? input.module_id),
        curriculum_module_id: curriculumModuleId,
      },
    };
  }
  case "bundle": {
    const courseSnap = await db.collection(COURSES_COLLECTION).doc(input.course_id).get();
    if (!courseSnap.exists) {
      throw new HttpsError("not-found", "Course not found");
    }
    const course = courseSnap.data()!;
    const currency = String(course.currency ?? "usd").toLowerCase();
    const bundlePrice = Number(course.bundlePrice ?? 0);
    if (!(bundlePrice > 0)) {
      throw new HttpsError("failed-precondition", "This course is not sold as a bundle");
    }
    const unpaid = await unpaidCourseModules(db, course, uid);
    if (unpaid.length === 0) {
      throw new HttpsError("failed-precondition", "You already own every module in this course");
    }
    // Never charge more than buying the remaining modules one at a time.
    const remainingTotal = unpaid.reduce((sum, m) => sum + m.price, 0);
    const amountCents = dollarsToCents(Math.min(bundlePrice, remainingTotal), currency);
    const title = String(course.title ?? "Course");
    const moduleIds = unpaid.map((m) => m.grantId).join(",");

    return {
      currency,
      line_items: [
        {
          name: `${title} — all modules bundle`,
          amount_cents: amountCents,
          quantity: 1,
          metadata: {
            course_id: input.course_id,
            module_ids: moduleIds,
          },
        },
      ],
      metadata: {
        purchase_type: "bundle",
        course_id: input.course_id,
        module_ids: moduleIds,
      },
    };
  }
  case "event": {
    const eventSnap = await db.collection(input.event_collection).doc(input.event_id).get();
    if (!eventSnap.exists) {
      throw new HttpsError("not-found", "Event not found");
    }
    const event = eventSnap.data()!;
    const amountCents = readTicketPriceCents(event);
    if (amountCents <= 0) {
      throw new HttpsError("failed-precondition", "This event is free — register without payment");
    }
    const title = String(event.title ?? "Event ticket");
    return {
      currency: "usd",
      line_items: [
        {
          name: title,
          amount_cents: amountCents,
          quantity: 1,
          metadata: {
            event_id: input.event_id,
            event_collection: input.event_collection,
          },
        },
      ],
      metadata: {
        purchase_type: "event",
        event_id: input.event_id,
        event_collection: input.event_collection,
      },
    };
  }
  case "shop": {
    const lineItems: ResolvedLineItem[] = [];
    let currency = "usd";

    for (const line of input.lines) {
      const itemSnap = await db.collection(SHOP_ITEMS_COLLECTION).doc(line.item_id).get();
      if (!itemSnap.exists) {
        throw new HttpsError("not-found", `Shop item not found: ${line.item_id}`);
      }
      const item = itemSnap.data()!;
      const unitPrice = Number(item.price ?? 0);
      const amountCents = dollarsToCents(unitPrice, currency);
      const name = String(item.name ?? "Shop item");
      const category = String(line.category ?? item.category ?? "");
      const apparelSizes = ["Tees", "Hoodies", "Crewnecks"];
      const isApparel = apparelSizes.includes(category);

      if (isApparel) {
        if (!line.size) {
          throw new HttpsError("invalid-argument", `Size required for apparel item ${line.item_id}`);
        }
        const sizeStocks = (item.sizeStocks as Record<string, number> | undefined) ?? {};
        const available = Number(sizeStocks[line.size] ?? 0);
        if (available < line.quantity) {
          throw new HttpsError("failed-precondition", `Insufficient stock for ${name} (${line.size})`);
        }
      } else {
        const available = Number(item.stockQuantity ?? 0);
        if (available < line.quantity) {
          throw new HttpsError("failed-precondition", `Insufficient stock for ${name}`);
        }
      }

      lineItems.push({
        name: isApparel && line.size ? `${name} (${line.size})` : name,
        amount_cents: amountCents,
        quantity: line.quantity,
        metadata: {
          item_id: line.item_id,
          size: line.size ?? "",
          category,
        },
      });
    }

    const shippingCents = resolveShopFlatShippingCents();
    if (shippingCents > 0) {
      lineItems.push({
        name: "Standard shipping",
        amount_cents: shippingCents,
        quantity: 1,
        metadata: {line_type: "shipping"},
      });
    }

    return {
      currency,
      line_items: lineItems,
      metadata: {
        purchase_type: "shop",
        line_count: String(lineItems.length),
        flat_shipping_cents: String(shippingCents),
      },
    };
  }
  case "conference": {
    const confSnap = await db.collection(CONFERENCES_COLLECTION).doc(input.conference_id).get();
    if (!confSnap.exists) {
      throw new HttpsError("not-found", "Conference not found");
    }
    const conf = confSnap.data()!;
    if (conf.status === "closed") {
      throw new HttpsError("failed-precondition", "This conference is closed.");
    }
    const currency = String(conf.currency ?? "usd").toLowerCase();
    const tier = selectConferenceTier(readConferenceTiers(conf), input.tier_id);
    const cents = tier.priceCents;
    if (!Number.isFinite(cents) || cents <= 0) {
      throw new HttpsError("failed-precondition", "This conference is free — no payment required.");
    }
    if (currency === "usd" && cents < MIN_CHARGE_CENTS_USD) {
      throw new HttpsError(
        "failed-precondition",
        `Minimum charge is $${(MIN_CHARGE_CENTS_USD / 100).toFixed(2)} (ticket price is too low for Stripe)`
      );
    }
    const title = String(conf.name ?? "Conference ticket");
    return {
      currency,
      line_items: [
        {
          name: `${title} — ${tier.name}`,
          amount_cents: Math.round(cents),
          quantity: 1,
          metadata: {
            conference_id: input.conference_id,
            conference_tier_id: tier.id,
          },
        },
      ],
      // Only VIP-style tiers ask for a size, so a GA buyer sees no extra field.
      ...(tier.collectsShirtSize ? {custom_fields: [buildShirtSizeCustomField()]} : {}),
      metadata: {
        purchase_type: "conference",
        conference_id: input.conference_id,
        conference_tier_id: tier.id,
        conference_tier_name: tier.name,
      },
    };
  }
  default: {
    const _exhaustive: never = input;
    throw new HttpsError("invalid-argument", `Unknown purchase type: ${(_exhaustive as CreateCheckoutInput).purchase_type}`);
  }
  }
}

export function totalAmountCents(resolved: ResolvedCheckout): number {
  return resolved.line_items.reduce((sum, li) => sum + li.amount_cents * li.quantity, 0);
}

export function purchaseTypeFromInput(input: CreateCheckoutInput): StripePurchaseType {
  return input.purchase_type;
}
