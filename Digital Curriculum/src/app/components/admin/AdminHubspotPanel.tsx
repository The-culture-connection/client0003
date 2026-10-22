import { useCallback, useEffect, useMemo, useState } from "react";
import { FirebaseError } from "firebase/app";
import { Loader2, PauseCircle, PlayCircle, RefreshCw } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import {
  getHubspotSyncStatus,
  pauseHubspotSync,
  resumeHubspotSync,
  type HubspotResumeResult,
  type HubspotSyncStatus,
} from "../../lib/adminHubspot";

function fmt(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString() : "—";
}

function errorText(e: unknown): string {
  if (e instanceof FirebaseError) return e.message.replace(/^.*?\): /, "");
  return e instanceof Error ? e.message : String(e);
}

/**
 * Pause the nightly HubSpot contact sync (e.g. while creating test accounts),
 * then resume and choose which accounts created during the pause to delete
 * from HubSpot. Backed by the `adminHubspotControl` callable.
 */
export function AdminHubspotPanel() {
  const [status, setStatus] = useState<HubspotSyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [syncNow, setSyncNow] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lastResult, setLastResult] = useState<HubspotResumeResult | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await getHubspotSyncStatus();
      setStatus(s);
      // Drop selections for rows that are no longer listed.
      setSelected((prev) => new Set([...prev].filter((id) => s.createdDuringPause.some((r) => r.uid === id))));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const rows = status?.createdDuringPause ?? [];
  const allSelected = rows.length > 0 && selected.size === rows.length;
  const selectedRows = useMemo(() => rows.filter((r) => selected.has(r.uid)), [rows, selected]);

  const toggle = (uid: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });

  const handlePause = async () => {
    setWorking(true);
    setError(null);
    setLastResult(null);
    try {
      setStatus(await pauseHubspotSync());
      setSelected(new Set());
    } catch (e) {
      setError(errorText(e));
    } finally {
      setWorking(false);
    }
  };

  const handleResume = async () => {
    setConfirmOpen(false);
    setWorking(true);
    setError(null);
    try {
      const res = await resumeHubspotSync({ deleteUids: [...selected], syncNow });
      setLastResult(res);
      setStatus(res.status);
      setSelected(new Set());
    } catch (e) {
      setError(errorText(e));
    } finally {
      setWorking(false);
    }
  };

  return (
    <Card className="p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-foreground">HubSpot sync</h2>
            {status && (
              <Badge variant={status.paused ? "destructive" : "secondary"}>
                {status.paused ? "Paused" : "Running"}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Every user is sent to HubSpot nightly at 03:00 UTC. Pause it before creating test accounts; when you
            resume, pick which accounts created during the pause to delete from HubSpot. Deleting here removes the
            HubSpot contact and keeps that account out of HubSpot for good — the person&apos;s MORTAR account is
            not deleted.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading || working}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading && !status ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading HubSpot status…
        </div>
      ) : status ? (
        <>
          <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {status.paused ? (
              <>
                <dt className="text-muted-foreground">Paused since</dt>
                <dd>
                  {fmt(status.pausedAt)}
                  {status.pausedBy ? ` by ${status.pausedBy}` : ""}
                </dd>
              </>
            ) : null}
            <dt className="text-muted-foreground">Last successful sync</dt>
            <dd>{fmt(status.lastSuccessAt)}</dd>
            {status.lastResume && !status.paused ? (
              <>
                <dt className="text-muted-foreground">Last resumed</dt>
                <dd>
                  {fmt(status.lastResume.resumed_at)} by {status.lastResume.resumed_by} —{" "}
                  {status.lastResume.deleted} deleted, {status.lastResume.kept} kept
                </dd>
              </>
            ) : null}
          </dl>

          {!status.paused ? (
            <Button onClick={() => void handlePause()} disabled={working}>
              {working ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PauseCircle className="w-4 h-4 mr-2" />}
              Pause HubSpot sync
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-medium">
                  Accounts created during the pause ({rows.length})
                </h3>
                {rows.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.uid)))}
                  >
                    {allSelected ? "Select none" : "Select all"}
                  </Button>
                )}
              </div>

              {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No accounts have been created since the pause started.</p>
              ) : (
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left text-muted-foreground">
                      <tr>
                        <th className="w-10 p-2" aria-label="Delete" />
                        <th className="p-2 font-medium">Email</th>
                        <th className="p-2 font-medium">Name</th>
                        <th className="p-2 font-medium">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr
                          key={r.uid}
                          className={`border-t border-border cursor-pointer ${selected.has(r.uid) ? "bg-destructive/10" : "hover:bg-muted/30"}`}
                          onClick={() => toggle(r.uid)}
                        >
                          <td className="p-2" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selected.has(r.uid)}
                              onCheckedChange={() => toggle(r.uid)}
                              aria-label={`Delete ${r.email || r.uid} from HubSpot`}
                            />
                          </td>
                          <td className="p-2 break-all">
                            {r.email || <span className="text-muted-foreground">(no email)</span>}
                            {r.alreadyExcluded && (
                              <Badge variant="outline" className="ml-2">already excluded</Badge>
                            )}
                          </td>
                          <td className="p-2">{r.name || "—"}</td>
                          <td className="p-2 whitespace-nowrap">{fmt(r.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Switch id="hubspot-sync-now" checked={syncNow} onCheckedChange={setSyncNow} />
                <Label htmlFor="hubspot-sync-now" className="text-sm font-normal">
                  Sync everyone else to HubSpot right away (otherwise at the next 03:00 UTC run)
                </Label>
              </div>

              <Button onClick={() => setConfirmOpen(true)} disabled={working}>
                {working ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PlayCircle className="w-4 h-4 mr-2" />}
                {selected.size > 0
                  ? `Resume & delete ${selected.size} selected`
                  : "Resume without deleting"}
              </Button>
            </div>
          )}

          {lastResult && (
            <div className="rounded-md border border-border p-3 text-sm space-y-1">
              <p className="font-medium">Resumed.</p>
              {lastResult.deletions.length === 0 ? (
                <p className="text-muted-foreground">No accounts were deleted.</p>
              ) : (
                <ul className="space-y-0.5">
                  {lastResult.deletions.map((d) => (
                    <li key={d.uid}>
                      {d.email || d.uid}:{" "}
                      {d.hubspot === "deleted" && "deleted from HubSpot and excluded"}
                      {d.hubspot === "not_found" && "never reached HubSpot — excluded from future syncs"}
                      {d.hubspot === "no_email" && "no email — excluded"}
                      {d.hubspot === "failed" && (
                        <span className="text-destructive">
                          excluded, but HubSpot delete failed ({d.error}) — remove it in HubSpot by hand
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {lastResult.sync && (
                <p className="text-muted-foreground">
                  Sync ran: {lastResult.sync.upserted} contacts sent
                  {lastResult.sync.failedBatches ? `, ${lastResult.sync.failedBatches} batch(es) failed` : ""}.
                </p>
              )}
            </div>
          )}
        </>
      ) : null}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedRows.length > 0
                ? `Resume and delete ${selectedRows.length} from HubSpot?`
                : "Resume HubSpot sync?"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                {selectedRows.length > 0 ? (
                  <>
                    <p>
                      These accounts will be removed from HubSpot and never synced again. Their MORTAR accounts stay.
                    </p>
                    <ul className="max-h-40 overflow-y-auto list-disc pl-5 text-foreground">
                      {selectedRows.map((r) => (
                        <li key={r.uid}>{r.email || r.uid}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
                <p>
                  {rows.length - selectedRows.length} other account(s) created during the pause will be synced{" "}
                  {syncNow ? "right away" : "at the next 03:00 UTC run"}.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleResume()}>
              {selectedRows.length > 0 ? "Resume & delete" : "Resume"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
