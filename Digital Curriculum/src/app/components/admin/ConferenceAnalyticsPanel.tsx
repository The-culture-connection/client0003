"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../lib/firebase";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Loader2, Download, Activity, X, RefreshCw } from "lucide-react";

/**
 * Per-attendee activity for one conference, plus a raw event export.
 *
 * Everything here is scoped by the top-level `conference_id` that the Flutter
 * client stamps on every analytics event while a conference is open.
 */

interface UserActivityRow {
  user_id: string;
  email: string | null;
  display_name: string | null;
  total_events: number;
  event_counts: Record<string, number>;
  distinct_event_types: number;
  session_count: number;
  first_seen_ms: number | null;
  last_seen_ms: number | null;
  first_seen_iso: string | null;
  last_seen_iso: string | null;
}

interface ActivityResponse {
  success: boolean;
  conference_id: string;
  users: UserActivityRow[];
  scanned_events: number;
  truncated: boolean;
  max_scan: number;
}

interface EventRow {
  id: string;
  event_name: string | null;
  user_id: string | null;
  conference_id: string | null;
  session_id: string | null;
  screen: string | null;
  route: string | null;
  client_emitted_at_ms: number | null;
  ingested_at_ms: number | null;
  client_emitted_at_iso: string | null;
  ingested_at_iso: string | null;
  properties: Record<string, unknown> | null;
}

interface EventsPage {
  success: boolean;
  events: EventRow[];
  next_cursor: string | null;
}

/** Hard stop so a runaway conference cannot lock the browser during export. */
const MAX_EXPORT_EVENTS = 120_000;

function triggerJsonDownload(payload: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

export function ConferenceAnalyticsPanel({
  conferenceId,
  conferenceName,
}: {
  conferenceId: string;
  conferenceName?: string;
}) {
  const [rows, setRows] = useState<UserActivityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ scanned: number; truncated: boolean } | null>(null);
  const [search, setSearch] = useState("");

  const [activeUser, setActiveUser] = useState<UserActivityRow | null>(null);

  const [exportBusy, setExportBusy] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!conferenceId) return;
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable(functions, "getAdminConferenceUserActivity");
      const res = await fn({ conference_id: conferenceId });
      const data = res.data as ActivityResponse;
      if (!data?.success) throw new Error("Unexpected response");
      setRows(data.users ?? []);
      setMeta({ scanned: data.scanned_events ?? 0, truncated: !!data.truncated });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setRows([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [conferenceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        (r.email ?? "").toLowerCase().includes(q) ||
        (r.display_name ?? "").toLowerCase().includes(q) ||
        r.user_id.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const totalEvents = useMemo(
    () => rows.reduce((sum, r) => sum + r.total_events, 0),
    [rows]
  );

  /** Pages the whole conference through the admin query callable. */
  const exportRaw = async () => {
    setExportBusy(true);
    setExportStatus(null);
    try {
      const queryFn = httpsCallable(functions, "queryAdminExpansionAnalyticsEvents");
      const events: EventRow[] = [];
      let cursor: string | null = null;
      for (let page = 0; page < 400; page++) {
        const res = await queryFn({
          limit: 500,
          conference_id: conferenceId,
          ...(cursor ? { start_after_id: cursor } : {}),
        });
        const d = res.data as EventsPage;
        if (!d?.success || !Array.isArray(d.events)) break;
        events.push(...d.events);
        setExportStatus(`Fetched ${events.length} events…`);
        if (events.length >= MAX_EXPORT_EVENTS) break;
        if (!d.next_cursor || d.events.length === 0) break;
        cursor = d.next_cursor;
      }
      triggerJsonDownload(
        {
          export_label: "conference_raw_events",
          conference_id: conferenceId,
          conference_name: conferenceName ?? null,
          generated_at: new Date().toISOString(),
          event_count: events.length,
          capped: events.length >= MAX_EXPORT_EVENTS,
          expansion_analytics_events: events,
        },
        `conference_${conferenceId}_raw_events_${new Date().toISOString().slice(0, 10)}.json`
      );
      setExportStatus(
        `Exported ${events.length} events${events.length >= MAX_EXPORT_EVENTS ? ` (capped at ${MAX_EXPORT_EVENTS})` : ""}.`
      );
    } catch (e) {
      setExportStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setExportBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium text-foreground">Attendee activity</p>
        <span className="text-xs text-muted-foreground">
          {rows.length} {rows.length === 1 ? "attendee" : "attendees"} · {totalEvents} events
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void exportRaw()} disabled={exportBusy}>
            {exportBusy ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-1" />
            )}
            Export raw events
          </Button>
        </div>
      </div>

      <Input
        placeholder="Filter by email, name or uid…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {exportStatus ? <p className="text-xs text-muted-foreground">{exportStatus}</p> : null}
      {meta?.truncated ? (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Scan hit the {meta.scanned}-event cap — totals below are a partial count. Use the raw
          export for the complete record.
        </p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {rows.length === 0
            ? "No recorded activity for this conference yet."
            : "No attendees match that filter."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="p-2 font-medium">Attendee</th>
                <th className="p-2 font-medium">Events</th>
                <th className="p-2 font-medium">Types</th>
                <th className="p-2 font-medium">First seen</th>
                <th className="p-2 font-medium">Last seen</th>
                <th className="p-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.user_id} className="border-b border-border/70 last:border-0">
                  <td className="p-2">
                    <div className="text-foreground">{r.display_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{r.email ?? r.user_id}</div>
                  </td>
                  <td className="p-2 text-foreground">{r.total_events}</td>
                  <td className="p-2 text-muted-foreground">{r.distinct_event_types}</td>
                  <td className="p-2 text-muted-foreground">{formatWhen(r.first_seen_iso)}</td>
                  <td className="p-2 text-muted-foreground">{formatWhen(r.last_seen_iso)}</td>
                  <td className="p-2 text-right">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setActiveUser(r)}>
                      <Activity className="w-4 h-4 mr-1" />
                      View activity
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeUser ? (
        <UserActivityDrawer
          conferenceId={conferenceId}
          user={activeUser}
          onClose={() => setActiveUser(null)}
        />
      ) : null}
    </div>
  );
}

/** Full event timeline for one attendee, loaded on open. */
function UserActivityDrawer({
  conferenceId,
  user,
  onClose,
}: {
  conferenceId: string;
  user: UserActivityRow;
  onClose: () => void;
}) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const queryFn = httpsCallable(functions, "queryAdminExpansionAnalyticsEvents");
        const collected: EventRow[] = [];
        let cursor: string | null = null;
        // A single attendee's history is small; 10 pages is a generous ceiling.
        for (let page = 0; page < 10; page++) {
          const res = await queryFn({
            limit: 500,
            conference_id: conferenceId,
            user_id: user.user_id,
            ...(cursor ? { start_after_id: cursor } : {}),
          });
          const d = res.data as EventsPage;
          if (!d?.success || !Array.isArray(d.events)) break;
          collected.push(...d.events);
          if (!d.next_cursor || d.events.length === 0) break;
          cursor = d.next_cursor;
        }
        if (!cancelled) setEvents(collected);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conferenceId, user.user_id]);

  const breakdown = useMemo(
    () =>
      Object.entries(user.event_counts).sort((a, b) => b[1] - a[1]),
    [user.event_counts]
  );

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-2xl overflow-y-auto border-l border-border bg-background p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0">
            <p className="font-medium text-foreground">{user.display_name ?? "Attendee"}</p>
            <p className="text-xs text-muted-foreground break-all">{user.email ?? user.user_id}</p>
          </div>
          <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="Events" value={String(user.total_events)} />
          <Stat label="Event types" value={String(user.distinct_event_types)} />
          <Stat label="App sessions" value={String(user.session_count)} />
        </div>

        <div className="mt-5">
          <p className="text-sm font-medium text-foreground mb-2">Breakdown</p>
          <div className="flex flex-wrap gap-1.5">
            {breakdown.map(([name, count]) => (
              <span
                key={name}
                className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground"
              >
                {name} · {count}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <p className="text-sm font-medium text-foreground mb-2">Timeline (newest first)</p>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events recorded.</p>
          ) : (
            <ol className="space-y-2">
              {events.map((ev) => (
                <li key={ev.id} className="rounded-md border border-border p-2">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-mono text-xs text-foreground">{ev.event_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatWhen(ev.ingested_at_iso)}
                    </span>
                    {ev.screen ? (
                      <span className="text-xs text-muted-foreground">· {ev.screen}</span>
                    ) : null}
                  </div>
                  {ev.properties && Object.keys(ev.properties).length > 0 ? (
                    <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words text-[11px] text-muted-foreground">
                      {JSON.stringify(ev.properties)}
                    </pre>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-2">
      <div className="text-lg font-semibold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
