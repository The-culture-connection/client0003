import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
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
  const [streamsReady, setStreamsReady] = useState({
    eventsE: false,
    eventsM: false,
    graduation: false,
    reports: false,
    dms: false,
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
    const { eventsE, eventsM, graduation, reports, dms } = streamsReady;
    if (eventsE && eventsM && graduation && reports && dms) setLoading(false);
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

  const total = pendingEvents + pendingGraduation + openReports + unreadDms;

  return {
    pendingEvents,
    pendingGraduation,
    openReports,
    unreadDms,
    loading,
    total,
  };
}
