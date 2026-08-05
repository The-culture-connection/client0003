"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../lib/firebase";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Loader2, Download, Activity, X, RefreshCw } from "lucide-react";

/**
 * Per-attendee activity and registration surveys for one conference, plus exports.
 *
 * Two sources feed the table: analytics events (scoped by the top-level
 * `conference_id` the Flutter client stamps on everything while a conference is
 * open) and the pre-checkout registration survey. They are unioned rather than
 * joined, because each exists without the other — someone can submit the survey
 * and abandon payment, and a comped attendee can generate events without ever
 * filling one in.
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

/**
 * The registration survey an attendee completes before checkout. Written at
 * submit time, so someone who answered but abandoned payment still appears here
 * (with `has_attendee_access: false`).
 */
interface AttendeeProfile {
  user_id: string;
  display_name: string | null;
  account_email: string | null;
  answers: Record<string, string>;
  has_attendee_access: boolean;
  submission_count: number;
  submitted_at_iso: string | null;
  updated_at_iso: string | null;
}

/** Question order and labels come from the server so there is only one contract. */
interface SurveyField {
  key: string;
  label: string;
  options?: string[];
}

interface ProfilesResponse {
  success: boolean;
  conference_id: string;
  fields: SurveyField[];
  profiles: AttendeeProfile[];
  profile_count: number;
  truncated: boolean;
  max_profiles: number;
}

/** An attendee row: activity totals, survey answers, or both. */
type AttendeeRow = UserActivityRow & { profile: AttendeeProfile | null };

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

/**
 * RFC 4180 quoting. Survey answers are free text, so commas, quotes and newlines
 * all have to survive the round trip into Excel/Sheets.
 */
function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(header: string[], rows: unknown[][]): string {
  // Leading BOM so Excel reads it as UTF-8 rather than the local codepage.
  return (
    "﻿" +
    [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n")
  );
}

function triggerCsvDownload(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Identity columns the profile CSV prepends before the survey answers. */
const PROFILE_CSV_LEAD = [
  "User ID",
  "Account name",
  "Account email",
  "Entered conference",
  "Submitted at",
  "Last updated",
  "Submissions",
  "Events recorded",
];

function profileCsvRow(p: AttendeeProfile, fields: SurveyField[], totalEvents: number): unknown[] {
  return [
    p.user_id,
    p.display_name ?? "",
    p.account_email ?? "",
    p.has_attendee_access ? "yes" : "no",
    p.submitted_at_iso ?? "",
    p.updated_at_iso ?? "",
    p.submission_count,
    totalEvents,
    ...fields.map((f) => p.answers?.[f.key] ?? ""),
  ];
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
  const [activity, setActivity] = useState<UserActivityRow[]>([]);
  const [profiles, setProfiles] = useState<AttendeeProfile[]>([]);
  const [surveyFields, setSurveyFields] = useState<SurveyField[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ scanned: number; truncated: boolean } | null>(null);
  const [search, setSearch] = useState("");

  const [activeUser, setActiveUser] = useState<AttendeeRow | null>(null);

  const [exportBusy, setExportBusy] = useState(false);
  const [profileExportBusy, setProfileExportBusy] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!conferenceId) return;
    setLoading(true);
    setError(null);
    try {
      const activityFn = httpsCallable(functions, "getAdminConferenceUserActivity");
      const profilesFn = httpsCallable(functions, "getAdminConferenceAttendeeProfiles");
      const [activityRes, profilesRes] = await Promise.all([
        activityFn({ conference_id: conferenceId }),
        profilesFn({ conference_id: conferenceId }),
      ]);

      const activityData = activityRes.data as ActivityResponse;
      if (!activityData?.success) throw new Error("Unexpected response");
      setActivity(activityData.users ?? []);
      setMeta({
        scanned: activityData.scanned_events ?? 0,
        truncated: !!activityData.truncated,
      });

      const profileData = profilesRes.data as ProfilesResponse;
      setProfiles(profileData?.profiles ?? []);
      setSurveyFields(profileData?.fields ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setActivity([]);
      setProfiles([]);
      setSurveyFields([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [conferenceId]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Union of the two sources. An attendee who has just submitted the survey has
   * no analytics events yet, so they'd be invisible if this only walked activity —
   * they get a zeroed row instead, which is what makes a fresh registration show
   * up here immediately.
   */
  const rows = useMemo<AttendeeRow[]>(() => {
    const byUid = new Map<string, AttendeeRow>();
    for (const r of activity) byUid.set(r.user_id, { ...r, profile: null });

    for (const p of profiles) {
      const existing = byUid.get(p.user_id);
      if (existing) {
        existing.profile = p;
        existing.display_name = existing.display_name ?? p.display_name;
        existing.email = existing.email ?? p.account_email;
        continue;
      }
      byUid.set(p.user_id, {
        user_id: p.user_id,
        email: p.account_email,
        display_name: p.display_name,
        total_events: 0,
        event_counts: {},
        distinct_event_types: 0,
        session_count: 0,
        first_seen_ms: null,
        last_seen_ms: null,
        first_seen_iso: null,
        last_seen_iso: null,
        profile: p,
      });
    }

    return [...byUid.values()].sort((a, b) => b.total_events - a.total_events);
  }, [activity, profiles]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        (r.email ?? "").toLowerCase().includes(q) ||
        (r.display_name ?? "").toLowerCase().includes(q) ||
        r.user_id.toLowerCase().includes(q) ||
        // Survey answers are searchable too — company name is the usual lookup.
        Object.values(r.profile?.answers ?? {}).some((v) =>
          v.toLowerCase().includes(q)
        )
    );
  }, [rows, search]);

  const totalEvents = useMemo(
    () => rows.reduce((sum, r) => sum + r.total_events, 0),
    [rows]
  );

  const eventsByUid = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.user_id, r.total_events);
    return m;
  }, [rows]);

  /**
   * One CSV row per survey response, columns in the order the survey asks them.
   * Uses whatever is already loaded — the profiles arrive with the table, so
   * there is nothing to re-fetch.
   */
  const exportProfiles = () => {
    setProfileExportBusy(true);
    setExportStatus(null);
    try {
      if (profiles.length === 0) {
        setExportStatus("No survey responses to export yet.");
        return;
      }
      const header = [...PROFILE_CSV_LEAD, ...surveyFields.map((f) => f.label)];
      const csv = toCsv(
        header,
        profiles.map((p) =>
          profileCsvRow(p, surveyFields, eventsByUid.get(p.user_id) ?? 0)
        )
      );
      triggerCsvDownload(
        csv,
        `conference_${conferenceId}_attendee_profiles_${new Date().toISOString().slice(0, 10)}.csv`
      );
      setExportStatus(
        `Exported ${profiles.length} attendee ${profiles.length === 1 ? "profile" : "profiles"}.`
      );
    } catch (e) {
      setExportStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setProfileExportBusy(false);
    }
  };

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
          {rows.length} {rows.length === 1 ? "attendee" : "attendees"} · {totalEvents} events ·{" "}
          {profiles.length} {profiles.length === 1 ? "survey" : "surveys"}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={exportProfiles}
            disabled={profileExportBusy || loading || profiles.length === 0}
          >
            {profileExportBusy ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-1" />
            )}
            Export attendee profiles
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
            ? "No registrations or recorded activity for this conference yet."
            : "No attendees match that filter."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="p-2 font-medium">Attendee</th>
                <th className="p-2 font-medium">Company</th>
                <th className="p-2 font-medium">Survey</th>
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
                  <td className="p-2 text-muted-foreground">
                    {r.profile?.answers?.company_name || "—"}
                  </td>
                  <td className="p-2">
                    {r.profile ? (
                      <span
                        className="text-xs text-emerald-600 dark:text-emerald-400"
                        title={`Submitted ${formatWhen(r.profile.submitted_at_iso)}`}
                      >
                        Submitted
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-2 text-foreground">{r.total_events}</td>
                  <td className="p-2 text-muted-foreground">{r.distinct_event_types}</td>
                  <td className="p-2 text-muted-foreground">{formatWhen(r.first_seen_iso)}</td>
                  <td className="p-2 text-muted-foreground">{formatWhen(r.last_seen_iso)}</td>
                  <td className="p-2 text-right">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setActiveUser(r)}>
                      <Activity className="w-4 h-4 mr-1" />
                      View profile
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
          surveyFields={surveyFields}
          onClose={() => setActiveUser(null)}
        />
      ) : null}
    </div>
  );
}

/** Survey answers plus the full event timeline for one attendee, loaded on open. */
function UserActivityDrawer({
  conferenceId,
  user,
  surveyFields,
  onClose,
}: {
  conferenceId: string;
  user: AttendeeRow;
  surveyFields: SurveyField[];
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

  const profile = user.profile;

  /** Same columns as the bulk export, so the two files stack in a spreadsheet. */
  const exportThisProfile = () => {
    if (!profile) return;
    const csv = toCsv(
      [...PROFILE_CSV_LEAD, ...surveyFields.map((f) => f.label)],
      [profileCsvRow(profile, surveyFields, user.total_events)]
    );
    const slug = (profile.account_email ?? profile.user_id).replace(/[^a-zA-Z0-9]+/g, "_");
    triggerCsvDownload(
      csv,
      `conference_${conferenceId}_attendee_${slug}_${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

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
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-foreground">Registration survey</p>
            {profile ? (
              <span className="text-xs text-muted-foreground">
                Submitted {formatWhen(profile.submitted_at_iso)}
                {profile.submission_count > 1 ? ` · edited ${profile.submission_count - 1}×` : ""}
              </span>
            ) : null}
            {profile ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={exportThisProfile}
              >
                <Download className="w-4 h-4 mr-1" />
                Export profile
              </Button>
            ) : null}
          </div>
          {profile ? (
            <dl className="mt-2 divide-y divide-border rounded-md border border-border">
              {surveyFields.map((f) => (
                <div key={f.key} className="grid grid-cols-3 gap-2 p-2">
                  <dt className="col-span-1 text-xs text-muted-foreground">{f.label}</dt>
                  <dd className="col-span-2 break-words text-sm text-foreground">
                    {profile.answers?.[f.key] || "—"}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              This attendee has no survey on file — they were admitted without going
              through in-app registration (e.g. a bulk-added or comped ticket).
            </p>
          )}
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
