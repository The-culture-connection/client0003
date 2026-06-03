import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query, where, limit } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  SHOP_ORDERS_COLLECTION,
  type ShopOrder,
} from "../lib/shopOrders";
import { shopOrderNeedsFulfillment } from "../lib/shopOrderDisplay";
import {
  COLLECTION_EVENTS,
  COLLECTION_EVENTS_MOBILE,
  countMergedPendingApprovalEvents,
  type Event,
} from "../lib/events";

function reportNeedsAction(data: Record<string, unknown>): boolean {
  const s = String(data.status ?? "").toLowerCase();
  return s === "open" || s === "investigating";
}

function dmNeedsAttention(data: Record<string, unknown>): boolean {
  return data.read !== true;
}

export type AdminHubActionCounts = {
  pendingEvents: number;
  pendingGraduation: number;
  openReports: number;
  unreadDms: number;
  /** Paid shop orders awaiting fulfillment (unfulfilled + processing). */
  shopOrdersNeedingFulfillment: number;
  /** Recent orders needing action (for hub preview text). */
  shopOrdersNeedingFulfillmentPreview: ShopOrder[];
  loading: boolean;
  total: number;
};

/**
 * Live counts for the admin command center action strip (Firestore snapshots).
 */
export function useAdminHubActionCounts(): AdminHubActionCounts {
  const [loading, setLoading] = useState(true);
  const [eventsCurriculum, setEventsCurriculum] = useState<Event[]>([]);
  const [eventsMobile, setEventsMobile] = useState<Event[]>([]);
  const [pendingGraduation, setPendingGraduation] = useState(0);
  const [reportDocs, setReportDocs] = useState<Record<string, unknown>[]>([]);
  const [dmDocs, setDmDocs] = useState<Record<string, unknown>[]>([]);
  const [shopOrders, setShopOrders] = useState<ShopOrder[]>([]);
  const [streamsReady, setStreamsReady] = useState({
    eventsE: false,
    eventsM: false,
    graduation: false,
    reports: false,
    dms: false,
    shopOrders: false,
  });

  useEffect(() => {
    const unsubE = onSnapshot(
      collection(db, COLLECTION_EVENTS),
      (snap) => {
        setEventsCurriculum(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Event));
        setStreamsReady((s) => ({ ...s, eventsE: true }));
      },
      () => setStreamsReady((s) => ({ ...s, eventsE: true }))
    );
    const unsubM = onSnapshot(
      collection(db, COLLECTION_EVENTS_MOBILE),
      (snap) => {
        setEventsMobile(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Event));
        setStreamsReady((s) => ({ ...s, eventsM: true }));
      },
      () => setStreamsReady((s) => ({ ...s, eventsM: true }))
    );
    return () => {
      unsubE();
      unsubM();
    };
  }, []);

  useEffect(() => {
    const q = query(collection(db, "GraduationApplications"), where("status", "==", "pending"));
    return onSnapshot(
      q,
      (snap) => {
        setPendingGraduation(snap.size);
        setStreamsReady((s) => ({ ...s, graduation: true }));
      },
      () => {
        setPendingGraduation(0);
        setStreamsReady((s) => ({ ...s, graduation: true }));
      }
    );
  }, []);

  useEffect(() => {
    return onSnapshot(
      collection(db, "user_reports"),
      (snap) => {
        setReportDocs(snap.docs.map((d) => d.data() as Record<string, unknown>));
        setStreamsReady((s) => ({ ...s, reports: true }));
      },
      () => {
        setReportDocs([]);
        setStreamsReady((s) => ({ ...s, reports: true }));
      }
    );
  }, []);

  useEffect(() => {
    return onSnapshot(
      collection(db, "Digital Student DMs"),
      (snap) => {
        setDmDocs(snap.docs.map((d) => d.data() as Record<string, unknown>));
        setStreamsReady((s) => ({ ...s, dms: true }));
      },
      () => {
        setDmDocs([]);
        setStreamsReady((s) => ({ ...s, dms: true }));
      }
    );
  }, []);

  useEffect(() => {
    return onSnapshot(
      query(collection(db, SHOP_ORDERS_COLLECTION), orderBy("created_at", "desc"), limit(100)),
      (snap) => {
        setShopOrders(
          snap.docs.map((d) => {
            const data = d.data() as Record<string, unknown>;
            return {
              id: d.id,
              uid: String(data.uid ?? ""),
              payment_order_id: String(data.payment_order_id ?? d.id),
              lines: Array.isArray(data.lines) ? (data.lines as ShopOrder["lines"]) : [],
              status: String(data.status ?? "paid"),
              fulfillment_status:
                (data.fulfillment_status as ShopOrder["fulfillment_status"]) ?? "unfulfilled",
              subtotal_cents: data.subtotal_cents as number | null | undefined,
              tax_cents: Number(data.tax_cents ?? 0),
              shipping_cents: Number(data.shipping_cents ?? 0),
              total_cents: Number(data.total_cents ?? 0),
              currency: String(data.currency ?? "usd"),
              customer_email: (data.customer_email as string | null) ?? null,
              shipping_address: (data.shipping_address as ShopOrder["shipping_address"]) ?? null,
              billing_address: (data.billing_address as ShopOrder["billing_address"]) ?? null,
              tracking_number: (data.tracking_number as string | null) ?? null,
              admin_notes: (data.admin_notes as string | null) ?? null,
              created_at: data.created_at as ShopOrder["created_at"],
              updated_at: data.updated_at as ShopOrder["updated_at"],
              fulfilled_at: data.fulfilled_at as ShopOrder["fulfilled_at"],
            };
          })
        );
        setStreamsReady((s) => ({ ...s, shopOrders: true }));
      },
      () => {
        setShopOrders([]);
        setStreamsReady((s) => ({ ...s, shopOrders: true }));
      }
    );
  }, []);

  useEffect(() => {
    const { eventsE, eventsM, graduation, reports, dms, shopOrders: shopReady } = streamsReady;
    if (eventsE && eventsM && graduation && reports && dms && shopReady) setLoading(false);
  }, [streamsReady]);

  const pendingEvents = useMemo(
    () => countMergedPendingApprovalEvents(eventsCurriculum, eventsMobile),
    [eventsCurriculum, eventsMobile]
  );

  const openReports = useMemo(
    () => reportDocs.filter(reportNeedsAction).length,
    [reportDocs]
  );

  const unreadDms = useMemo(() => dmDocs.filter(dmNeedsAttention).length, [dmDocs]);

  const shopOrdersNeedingFulfillmentList = useMemo(
    () => shopOrders.filter(shopOrderNeedsFulfillment),
    [shopOrders]
  );

  const shopOrdersNeedingFulfillment = shopOrdersNeedingFulfillmentList.length;

  const shopOrdersNeedingFulfillmentPreview = useMemo(
    () => shopOrdersNeedingFulfillmentList.slice(0, 3),
    [shopOrdersNeedingFulfillmentList]
  );

  const total =
    pendingEvents +
    pendingGraduation +
    openReports +
    unreadDms +
    shopOrdersNeedingFulfillment;

  return {
    pendingEvents,
    pendingGraduation,
    openReports,
    unreadDms,
    shopOrdersNeedingFulfillment,
    shopOrdersNeedingFulfillmentPreview,
    loading,
    total,
  };
}
