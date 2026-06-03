import {
  FULFILLMENT_STATUS_LABELS,
  formatCents,
  formatOrderAddress,
  type ShopFulfillmentStatus,
  type ShopOrder,
  type ShopOrderLine,
} from "./shopOrders";

/** Orders that still need packing / shipping. */
export const SHOP_FULFILLMENT_NEEDS_ACTION: ShopFulfillmentStatus[] = ["unfulfilled", "processing"];

export function shopOrderNeedsFulfillment(order: ShopOrder): boolean {
  return SHOP_FULFILLMENT_NEEDS_ACTION.includes(order.fulfillment_status);
}

/** One cart line in plain language for staff. */
export function formatShopOrderLinePlain(line: ShopOrderLine): string {
  const name = line.name?.trim() || `Item ${line.item_id}`;
  const qty = line.quantity ?? 1;
  const parts: string[] = [`${qty} × ${name}`];
  if (line.size) parts.push(`Size: ${line.size}`);
  if (line.category) parts.push(`Category: ${line.category}`);
  if (line.unit_price_cents != null && line.unit_price_cents > 0) {
    parts.push(`Unit price: ${formatCents(line.unit_price_cents)}`);
    parts.push(`Line total: ${formatCents(line.unit_price_cents * qty)}`);
  }
  parts.push(`Product ID: ${line.item_id}`);
  return parts.join(" · ");
}

/** Short summary for action-item cards (first line + count). */
export function formatShopOrderActionPreview(order: ShopOrder): string {
  const lines = order.lines ?? [];
  if (lines.length === 0) return "Paid shop order (no line details)";
  const first = formatShopOrderLinePlain(lines[0]);
  if (lines.length === 1) return first;
  return `${first} (+${lines.length - 1} more item${lines.length > 2 ? "s" : ""})`;
}

export function formatShopOrderPlainSummary(order: ShopOrder): {
  headline: string;
  sections: Array<{ title: string; lines: string[] }>;
} {
  const placed = order.created_at?.toDate
    ? order.created_at.toDate().toLocaleString()
    : "Unknown date";
  const statusLabel = FULFILLMENT_STATUS_LABELS[order.fulfillment_status] ?? order.fulfillment_status;

  const sections: Array<{ title: string; lines: string[] }> = [
    {
      title: "Order",
      lines: [
        `Order ID: ${order.id}`,
        `Payment order: ${order.payment_order_id}`,
        `Placed: ${placed}`,
        `Payment status: ${order.status}`,
        `Fulfillment: ${statusLabel}`,
        order.customer_email ? `Customer email: ${order.customer_email}` : "Customer email: —",
        `Buyer user ID: ${order.uid}`,
      ],
    },
    {
      title: "Items purchased",
      lines:
        order.lines.length > 0
          ? order.lines.map((l, i) => `${i + 1}. ${formatShopOrderLinePlain(l)}`)
          : ["No line items recorded"],
    },
    {
      title: "Amounts",
      lines: [
        `Subtotal: ${formatCents(order.subtotal_cents, order.currency)}`,
        `Sales tax: ${formatCents(order.tax_cents, order.currency)}`,
        `Shipping: ${formatCents(order.shipping_cents, order.currency)}`,
        `Total paid: ${formatCents(order.total_cents, order.currency)}`,
      ],
    },
    {
      title: "Ship to",
      lines: formatOrderAddress(order.shipping_address).split("\n").filter(Boolean),
    },
  ];

  if (order.tracking_number) {
    sections.push({
      title: "Fulfillment notes",
      lines: [
        `Tracking: ${order.tracking_number}`,
        order.admin_notes ? `Admin notes: ${order.admin_notes}` : "Admin notes: —",
      ],
    });
  } else if (order.admin_notes) {
    sections.push({
      title: "Fulfillment notes",
      lines: [`Admin notes: ${order.admin_notes}`],
    });
  }

  return {
    headline: `${statusLabel} · ${formatCents(order.total_cents, order.currency)} · ${placed}`,
    sections,
  };
}
