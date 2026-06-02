/**
 * Shop orders (paid) — staff fulfillment panel + read own orders.
 */

import {
  collection,
  onSnapshot,
  orderBy,
  query,
  limit,
  type Timestamp,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "./firebase";

export const SHOP_ORDERS_COLLECTION = "shop_orders";

export type ShopFulfillmentStatus =
  | "unfulfilled"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface ShopOrderAddress {
  name?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
}

export interface ShopOrderLine {
  item_id: string;
  quantity: number;
  size?: string;
  category?: string;
  name?: string;
  unit_price_cents?: number;
}

export interface ShopOrder {
  id: string;
  uid: string;
  payment_order_id: string;
  lines: ShopOrderLine[];
  status: string;
  fulfillment_status: ShopFulfillmentStatus;
  subtotal_cents?: number | null;
  tax_cents?: number;
  shipping_cents?: number;
  total_cents?: number;
  currency?: string;
  customer_email?: string | null;
  shipping_address?: ShopOrderAddress | null;
  billing_address?: ShopOrderAddress | null;
  tracking_number?: string | null;
  admin_notes?: string | null;
  created_at?: Timestamp | null;
  updated_at?: Timestamp | null;
  fulfilled_at?: Timestamp | null;
}

function mapDoc(id: string, data: Record<string, unknown>): ShopOrder {
  return {
    id,
    uid: String(data.uid ?? ""),
    payment_order_id: String(data.payment_order_id ?? id),
    lines: Array.isArray(data.lines) ? (data.lines as ShopOrderLine[]) : [],
    status: String(data.status ?? "paid"),
    fulfillment_status: (data.fulfillment_status as ShopFulfillmentStatus) ?? "unfulfilled",
    subtotal_cents: data.subtotal_cents as number | null | undefined,
    tax_cents: Number(data.tax_cents ?? 0),
    shipping_cents: Number(data.shipping_cents ?? 0),
    total_cents: Number(data.total_cents ?? 0),
    currency: String(data.currency ?? "usd"),
    customer_email: (data.customer_email as string | null) ?? null,
    shipping_address: (data.shipping_address as ShopOrderAddress | null) ?? null,
    billing_address: (data.billing_address as ShopOrderAddress | null) ?? null,
    tracking_number: (data.tracking_number as string | null) ?? null,
    admin_notes: (data.admin_notes as string | null) ?? null,
    created_at: (data.created_at as Timestamp | undefined) ?? null,
    updated_at: (data.updated_at as Timestamp | undefined) ?? null,
    fulfilled_at: (data.fulfilled_at as Timestamp | undefined) ?? null,
  };
}

export function subscribeShopOrders(
  onData: (orders: ShopOrder[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(
    collection(db, SHOP_ORDERS_COLLECTION),
    orderBy("created_at", "desc"),
    limit(200)
  );
  return onSnapshot(
    q,
    (snap) => {
      const orders = snap.docs.map((d) => mapDoc(d.id, d.data() as Record<string, unknown>));
      onData(orders);
    },
    (err) => onError?.(err)
  );
}

export async function updateShopOrderFulfillment(params: {
  order_id: string;
  fulfillment_status: ShopFulfillmentStatus;
  tracking_number?: string;
  admin_notes?: string;
}): Promise<void> {
  const fn = httpsCallable(functions, "adminUpdateShopOrderFulfillment");
  await fn(params);
}

export function formatCents(cents: number | null | undefined, currency = "usd"): string {
  const n = Number(cents ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(n / 100);
}

export function formatOrderAddress(addr: ShopOrderAddress | null | undefined): string {
  if (!addr) return "—";
  const parts = [
    addr.name,
    addr.line1,
    addr.line2,
    [addr.city, addr.state, addr.postal_code].filter(Boolean).join(", "),
    addr.country,
  ].filter(Boolean);
  return parts.join("\n") || "—";
}

export const FULFILLMENT_STATUS_LABELS: Record<ShopFulfillmentStatus, string> = {
  unfulfilled: "Unfulfilled",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
