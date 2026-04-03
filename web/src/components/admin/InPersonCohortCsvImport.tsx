"use client";

import { useState } from "react";
import { doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

/** Matches Expansion Network (`alumni_network_constants.dart`). */
const EXPANSION_COHORT_EMAILS_COLLECTION = "expansion_cohort_emails";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQ = false;
  for (let j = 0; j < line.length; j++) {
    const c = line[j];
    if (c === '"') {
      inQ = !inQ;
      continue;
    }
    if (c === "," && !inQ) {
      result.push(cur.trim());
      cur = "";
      continue;
    }
    cur += c;
  }
  result.push(cur.trim());
  return result.map((s) => s.replace(/^"|"$/g, ""));
}

function parseEmailsFromCsv(text: string): { emails: string[]; errors: string[] } {
  const errors: string[] = [];
  const raw = text.replace(/^\uFEFF/, "").trim();
  if (!raw) {
    errors.push("File is empty.");
    return { emails: [], errors };
  }
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let startRow = 0;
  let col = 0;
  const headerParts = splitCsvLine(lines[0]);
  const headerJoined = headerParts.join(",").toLowerCase();
  if (headerJoined.includes("email")) {
    const idx = headerParts.findIndex((p) => p.toLowerCase().includes("email"));
    col = idx >= 0 ? idx : 0;
    startRow = 1;
  }

  const seen = new Set<string>();
  const emails: string[] = [];
  for (let i = startRow; i < lines.length; i++) {
    const parts = splitCsvLine(lines[i]);
    const rawCell = (parts[col] ?? "").trim();
    const cell = rawCell.toLowerCase();
    if (!cell) continue;
    if (!EMAIL_RE.test(cell)) {
      errors.push(`Row ${i + 1}: invalid email "${rawCell}"`);
      continue;
    }
    if (!seen.has(cell)) {
      seen.add(cell);
      emails.push(cell);
    }
  }
  if (emails.length === 0 && errors.length === 0) {
    errors.push("No valid email addresses found.");
  }
  return { emails, errors };
}

const BATCH_CHUNK = 400;

export function InPersonCohortCsvImport() {
  const [cohortTitle, setCohortTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [previewCount, setPreviewCount] = useState<number | null>(null);

  const onFileSelected = async (file: File | null) => {
    setMessage(null);
    setParseErrors([]);
    setPreviewCount(null);
    if (!file) return;
    const text = await file.text();
    const { emails, errors } = parseEmailsFromCsv(text);
    setParseErrors(errors);
    setPreviewCount(emails.length);
  };

  const runImport = async (emails: string[], cohortId: string) => {
    let written = 0;
    for (let i = 0; i < emails.length; i += BATCH_CHUNK) {
      const slice = emails.slice(i, i + BATCH_CHUNK);
      const batch = writeBatch(db);
      for (const emailLower of slice) {
        const ref = doc(db, EXPANSION_COHORT_EMAILS_COLLECTION, emailLower);
        batch.set(
          ref,
          {
            cohort_id: cohortId,
            email: emailLower,
            source: "admin_csv_upload",
            updated_at: serverTimestamp(),
          },
          { merge: true },
        );
      }
      await batch.commit();
      written += slice.length;
    }
    return written;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    const cohortId = cohortTitle.trim();
    if (!cohortId) {
      setMessage("Enter a cohort title — it becomes each member’s cohort ID in the app.");
      return;
    }

    const form = e.currentTarget;
    const input = form.querySelector<HTMLInputElement>('input[type="file"]');
    const file = input?.files?.[0];
    if (!file) {
      setMessage("Choose a CSV file first.");
      return;
    }

    const text = await file.text();
    const { emails, errors } = parseEmailsFromCsv(text);
    setParseErrors(errors);
    if (emails.length === 0) {
      setMessage("No valid emails to import.");
      return;
    }

    setBusy(true);
    try {
      const n = await runImport(emails, cohortId);
      setMessage(
        `Imported ${n} email(s) into ${EXPANSION_COHORT_EMAILS_COLLECTION} with cohort_id “${cohortId}”. Alumni network access still requires an eligibleUsers record and (for first-time users) an invite code from the Expansion invites tab.`,
      );
      setPreviewCount(n);
      form.reset();
      setCohortTitle("");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6 max-w-2xl border-border bg-card">
      <h2 className="text-lg font-semibold text-foreground mb-1">
        In-person cohort (CSV)
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Provide a <strong>cohort title</strong> (stored as each user’s <code className="text-xs bg-muted px-1 rounded">cohort_id</code> in onboarding)
        and a CSV of emails. Each row creates/merges{" "}
        <code className="text-xs bg-muted px-1 rounded">
          {EXPANSION_COHORT_EMAILS_COLLECTION}/&lt;email&gt;
        </code>
        . Alumni authenticate in the app (already signed in, or email + password), then continue to
        onboarding. Anyone whose email is <strong>not</strong> on this list cannot use the app and
        sees the standard “not part of the alumni network” message — including curriculum-only
        accounts that were never added here. If someone must use a new Firebase account with the
        same email, delete the field{" "}
        <code className="text-xs bg-muted px-1 rounded">expansion_linked_firebase_uid</code> on
        their roster document in Firestore first.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="cohortTitle">Cohort title (required — becomes cohort ID)</Label>
          <Input
            id="cohortTitle"
            value={cohortTitle}
            onChange={(e) => setCohortTitle(e.target.value)}
            placeholder="e.g. Spring 2026 Cincinnati"
            className="mt-1"
            required
          />
        </div>
        <div>
          <Label htmlFor="csv">CSV file (emails only)</Label>
          <Input
            id="csv"
            type="file"
            accept=".csv,text/csv"
            className="mt-1 cursor-pointer"
            onChange={(e) => void onFileSelected(e.target.files?.[0] ?? null)}
          />
        </div>
        {previewCount !== null && (
          <p className="text-sm text-muted-foreground">
            Parsed: <strong>{previewCount}</strong> unique email(s)
          </p>
        )}
        {parseErrors.length > 0 && (
          <ul className="text-sm text-amber-600 dark:text-amber-400 list-disc pl-5 max-h-32 overflow-y-auto">
            {parseErrors.slice(0, 20).map((err, i) => (
              <li key={i}>{err}</li>
            ))}
            {parseErrors.length > 20 && (
              <li>…and {parseErrors.length - 20} more</li>
            )}
          </ul>
        )}
        <Button type="submit" disabled={busy} className="w-full sm:w-auto">
          {busy ? "Importing…" : "Save cohort emails"}
        </Button>
      </form>
      {message && (
        <p className="mt-4 text-sm text-foreground whitespace-pre-wrap">{message}</p>
      )}
    </Card>
  );
}
