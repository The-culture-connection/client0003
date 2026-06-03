import {HttpsError} from "firebase-functions/v2/https";
import type {Firestore} from "firebase-admin/firestore";
import {z} from "zod";
import {
  COLLECTION_EVENTS,
  COLLECTION_EVENTS_MOBILE,
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

export async function resolveCheckoutPricing(
  db: Firestore,
  input: CreateCheckoutInput
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
