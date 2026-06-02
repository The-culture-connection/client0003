import { useEffect, useMemo, useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Loader2, Package, Truck } from "lucide-react";
import {
  FULFILLMENT_STATUS_LABELS,
  formatCents,
  formatOrderAddress,
  subscribeShopOrders,
  updateShopOrderFulfillment,
  type ShopFulfillmentStatus,
  type ShopOrder,
} from "../../lib/shopOrders";

type FilterKey = "needs_action" | "all" | "shipped" | "delivered";

const NEEDS_ACTION: ShopFulfillmentStatus[] = ["unfulfilled", "processing"];

function statusBadgeVariant(status: ShopFulfillmentStatus): "default" | "secondary" | "outline" | "destructive" {
  if (status === "unfulfilled") return "destructive";
  if (status === "processing") return "secondary";
  if (status === "shipped") return "default";
  if (status === "delivered") return "outline";
  return "outline";
}

function OrderRow({ order }: { order: ShopOrder }) {
  const [status, setStatus] = useState<ShopFulfillmentStatus>(order.fulfillment_status);
  const [tracking, setTracking] = useState(order.tracking_number ?? "");
  const [notes, setNotes] = useState(order.admin_notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStatus(order.fulfillment_status);
    setTracking(order.tracking_number ?? "");
    setNotes(order.admin_notes ?? "");
  }, [order.id, order.fulfillment_status, order.tracking_number, order.admin_notes]);

  const createdLabel = order.created_at?.toDate
    ? order.created_at.toDate().toLocaleString()
    : "—";

  const lineSummary = order.lines
    .map((l) => {
      const qty = l.quantity ?? 1;
      const label = l.name ?? l.item_id;
      const size = l.size ? ` (${l.size})` : "";
      return `${qty}× ${label}${size}`;
    })
    .join(", ");

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateShopOrderFulfillment({
        order_id: order.id,
        fulfillment_status: status,
        tracking_number: tracking.trim() || undefined,
        admin_notes: notes.trim() || undefined,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update order");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-border p-4 space-y-3 bg-muted/10">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-foreground">Order {order.id.slice(0, 8)}…</p>
          <p className="text-xs text-muted-foreground">{createdLabel}</p>
          {order.customer_email && (
            <p className="text-sm text-muted-foreground mt-1">{order.customer_email}</p>
          )}
        </div>
        <Badge variant={statusBadgeVariant(order.fulfillment_status)}>
          {FULFILLMENT_STATUS_LABELS[order.fulfillment_status]}
        </Badge>
      </div>

      <p className="text-sm text-foreground">{lineSummary || "No line items"}</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
        <div>
          <span className="text-muted-foreground">Subtotal</span>
          <p className="font-medium">{formatCents(order.subtotal_cents, order.currency)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Tax</span>
          <p className="font-medium">{formatCents(order.tax_cents, order.currency)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Shipping</span>
          <p className="font-medium">{formatCents(order.shipping_cents, order.currency)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Total</span>
          <p className="font-medium text-accent">{formatCents(order.total_cents, order.currency)}</p>
        </div>
      </div>

      <div className="text-sm">
        <p className="text-muted-foreground mb-1">Ship to</p>
        <pre className="whitespace-pre-wrap font-sans text-foreground text-xs bg-muted/30 rounded p-2">
          {formatOrderAddress(order.shipping_address)}
        </pre>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-foreground">Fulfillment status</Label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ShopFulfillmentStatus)}
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm"
          >
            {(Object.keys(FULFILLMENT_STATUS_LABELS) as ShopFulfillmentStatus[]).map((s) => (
              <option key={s} value={s}>
                {FULFILLMENT_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-foreground">Tracking number</Label>
          <Input
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            placeholder="Carrier tracking #"
            className="bg-background"
          />
        </div>
        <div className="space-y-1 md:col-span-1">
          <Label className="text-foreground">Admin notes</Label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal notes"
            className="bg-background"
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        size="sm"
        onClick={() => void handleSave()}
        disabled={saving}
        className="bg-accent hover:bg-accent/90 text-accent-foreground"
      >
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Saving…
          </>
        ) : (
          "Save fulfillment"
        )}
      </Button>
    </div>
  );
}

export function AdminShopOrdersPanel() {
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("needs_action");

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeShopOrders(
      (list) => {
        setOrders(list);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    switch (filter) {
    case "needs_action":
      return orders.filter((o) => NEEDS_ACTION.includes(o.fulfillment_status));
    case "shipped":
      return orders.filter((o) => o.fulfillment_status === "shipped");
    case "delivered":
      return orders.filter((o) => o.fulfillment_status === "delivered");
    default:
      return orders;
    }
  }, [orders, filter]);

  const unfulfilledCount = orders.filter((o) => NEEDS_ACTION.includes(o.fulfillment_status)).length;

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-accent" />
          <h2 className="text-xl font-semibold text-foreground">Shop orders & fulfillment</h2>
          {unfulfilledCount > 0 && (
            <Badge variant="destructive">{unfulfilledCount} need action</Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["needs_action", "Needs action"],
              ["all", "All orders"],
              ["shipped", "Shipped"],
              ["delivered", "Delivered"],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              size="sm"
              variant={filter === key ? "default" : "outline"}
              onClick={() => setFilter(key)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Paid shop orders include tax and shipping collected in Stripe Checkout. Mark orders as processing,
        shipped, or delivered when you fulfill them.
      </p>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Truck className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>No orders in this view.</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {filtered.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </div>
      )}
    </Card>
  );
}
