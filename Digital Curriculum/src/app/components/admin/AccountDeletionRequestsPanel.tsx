"use client";

import { useEffect, useState } from "react";
import {
  Timestamp,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { ShieldAlert } from "lucide-react";

/**
 * Staff queue for account & data deletion requests submitted from the public
 * /delete-account page (Google Play compliance).
 *
 * Deletion itself is deliberately manual: financial records must be retained,
 * and an account under moderation may need to be held. This panel is the record
 * that a request was seen and actioned — Play expects requests to be honoured
 * within 30 days, so `pending` items are surfaced first.
 */

const COLLECTION = "account_deletion_requests";

type DeletionRequest = {
  id: string;
  reference?: string;
  email?: string;
  display_name?: string | null;
  reason?: string | null;
  matched_uid?: string | null;
  status?: string;
  staff_notes?: string | null;
  created_at?: Timestamp;
  handled_at?: Timestamp | null;
};

function localTime(ts?: Timestamp | null): string {
  return ts?.toDate ? ts.toDate().toLocaleString() : "—";
}

/** Days since submission — Play expects deletion within 30. */
function ageInDays(ts?: Timestamp): number | null {
  if (!ts?.toDate) return null;
  return Math.floor((Date.now() - ts.toDate().getTime()) / 86400000);
}

export function AccountDeletionRequestsPanel() {
  const [rows, setRows] = useState<DeletionRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, COLLECTION), orderBy("created_at", "desc")),
      (snap) =>
        setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }))),
      (e) => setError(e.message)
    );
    return () => unsub();
  }, []);

  const setStatus = async (row: DeletionRequest, status: string) => {
    setBusyId(row.id);
    setError(null);
    try {
      await updateDoc(doc(db, COLLECTION, row.id), {
        status,
        staff_notes: notes[row.id]?.trim() || row.staff_notes || null,
        handled_at: serverTimestamp(),
        handled_by_uid: auth.currentUser?.uid ?? null,
      });
    } catch (e: unknown) {
      setError((e as { message?: string }).message ?? String(e));
    } finally {
      setBusyId(null);
    }
  };

  const pending = rows.filter((r) => r.status === "pending");
  const done = rows.filter((r) => r.status !== "pending");

  return (
    <Card className="p-6 border-border bg-card">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <ShieldAlert className="h-5 w-5" />
          Account deletion requests
        </h2>
        <Badge variant={pending.length > 0 ? "destructive" : "secondary"}>
          {pending.length} pending
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Submitted from the public <code className="text-xs bg-muted px-1">/delete-account</code>{" "}
        page. Confirm the requester&rsquo;s identity by email before deleting anything.
        Google Play expects requests to be honoured within 30 days.
      </p>

      {error ? <p className="text-sm text-destructive mb-3">{error}</p> : null}

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No deletion requests.</p>
      ) : (
        <ul className="space-y-3">
          {[...pending, ...done].map((row) => {
            const age = ageInDays(row.created_at);
            const overdue = row.status === "pending" && age !== null && age >= 25;
            return (
              <li
                key={row.id}
                className="rounded-md border border-border/80 bg-background/40 p-3 space-y-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-foreground">
                    {row.reference ?? row.id}
                  </span>
                  <Badge variant={row.status === "pending" ? "outline" : "secondary"}>
                    {row.status ?? "unknown"}
                  </Badge>
                  {overdue ? (
                    <Badge variant="destructive">{age} days old</Badge>
                  ) : null}
                  <span className="text-xs text-muted-foreground">
                    {localTime(row.created_at)}
                  </span>
                </div>

                <p className="text-sm text-foreground">{row.email}</p>
                {row.display_name ? (
                  <p className="text-sm text-muted-foreground">
                    Name given: {row.display_name}
                  </p>
                ) : null}
                <p className="text-xs text-muted-foreground font-mono break-all">
                  {row.matched_uid
                    ? `matched uid: ${row.matched_uid}`
                    : "no matching account found for this email"}
                </p>
                {row.reason ? (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    “{row.reason}”
                  </p>
                ) : null}
                {row.staff_notes ? (
                  <p className="text-xs text-muted-foreground">
                    Notes: {row.staff_notes}
                  </p>
                ) : null}

                {row.status === "pending" ? (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Input
                      className="max-w-xs"
                      placeholder="Notes (optional)"
                      value={notes[row.id] ?? ""}
                      onChange={(e) =>
                        setNotes((n) => ({ ...n, [row.id]: e.target.value }))
                      }
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={busyId === row.id}
                      onClick={() => void setStatus(row, "completed")}
                    >
                      Mark deleted
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busyId === row.id}
                      onClick={() => void setStatus(row, "rejected")}
                    >
                      Could not verify
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Handled {localTime(row.handled_at)}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
