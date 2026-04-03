"use client";

import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

const ROLES = [
  "superAdmin",
  "Admin",
  "Alumni",
  "Digital Curriculum Alumni",
  "Digital Curriculum Students",
] as const;

export function EligibleUsersAdminPanel() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("Alumni");
  const [cohortId, setCohortId] = useState("");
  const [genInvite, setGenInvite] = useState(true);
  const [expDays, setExpDays] = useState("14");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [lastCode, setLastCode] = useState<string | null>(null);

  const [bulkJson, setBulkJson] = useState(
    '[{"email":"user@example.com","role":"Alumni"}]',
  );

  const [promoteEmail, setPromoteEmail] = useState("");
  const [promoteGenInvite, setPromoteGenInvite] = useState(false);

  const run = async (fn: string, data: Record<string, unknown>) => {
    setBusy(true);
    setMsg(null);
    try {
      const callable = httpsCallable(functions, fn);
      const res = await callable(data);
      return res.data as Record<string, unknown>;
    } catch (e: unknown) {
      const err = e as { message?: string };
      setMsg(err.message ?? String(e));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const handleUpsert = async () => {
    const out = await run("createOrUpdateEligibleUser", {
      email: email.trim(),
      role,
      source: "admin_dashboard",
      generateInvite: genInvite,
      expirationDays: Number(expDays) || 14,
      cohortId: cohortId.trim() || undefined,
    });
    if (out?.ok) {
      setMsg(`Saved ${out.normalizedEmail as string}`);
      setLastCode((out.code as string) ?? null);
    }
  };

  const handleGenerateOnly = async () => {
    const out = await run("generateInviteCode", {
      email: email.trim(),
      expirationDays: Number(expDays) || 14,
    });
    if (out?.code) {
      setLastCode(out.code as string);
      setMsg(`New code generated (copy now; stored in Firestore).`);
    }
  };

  const handleBulk = async () => {
    let users: { email: string; role: string; cohortId?: string }[];
    try {
      users = JSON.parse(bulkJson) as typeof users;
    } catch {
      setMsg("Invalid JSON");
      return;
    }
    const out = await run("bulkUploadEligibleUsers", { users });
    if (out?.written != null) {
      setMsg(`Bulk upsert: ${out.written as number} row(s).`);
    }
  };

  const handlePromote = async () => {
    const out = await run("promoteToDigitalCurriculumAlumni", {
      email: promoteEmail.trim(),
      generateInvite: promoteGenInvite,
      expirationDays: Number(expDays) || 14,
    });
    if (out?.ok) {
      setMsg("Promoted to Digital Curriculum Alumni.");
      if (out.code) setLastCode(out.code as string);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Card className="p-6 border-border bg-card">
        <h2 className="text-lg font-semibold mb-2">Eligible user + invite</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Upserts <code className="text-xs bg-muted px-1">eligibleUsers/&lt;email&gt;</code>.
          Roles must match exactly (case-sensitive). Invites are not generated for{" "}
          <strong>Digital Curriculum Students</strong> by default.
        </p>
        <div className="space-y-3">
          <div>
            <Label>Email</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Cohort ID (optional)</Label>
            <Input
              value={cohortId}
              onChange={(e) => setCohortId(e.target.value)}
              className="mt-1"
              placeholder="Prefilled in mobile onboarding"
            />
          </div>
          <div>
            <Label>Invite expiration (days)</Label>
            <Input
              value={expDays}
              onChange={(e) => setExpDays(e.target.value)}
              className="mt-1"
              type="number"
              min={1}
              max={90}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="gen"
              checked={genInvite}
              onCheckedChange={(v) => setGenInvite(v === true)}
            />
            <Label htmlFor="gen">Generate invite code (network-access roles)</Label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={busy} onClick={() => void handleUpsert()}>
              Save eligible user
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => void handleGenerateOnly()}
            >
              Regenerate invite only
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6 border-border bg-card">
        <h2 className="text-lg font-semibold mb-2">Bulk JSON</h2>
        <p className="text-sm text-muted-foreground mb-2">
          Array of <code className="text-xs">{"{ email, role, cohortId? }"}</code> (max 500).
        </p>
        <Textarea
          value={bulkJson}
          onChange={(e) => setBulkJson(e.target.value)}
          rows={6}
          className="font-mono text-sm"
        />
        <Button className="mt-2" disabled={busy} onClick={() => void handleBulk()}>
          Bulk upload
        </Button>
      </Card>

      <Card className="p-6 border-border bg-card">
        <h2 className="text-lg font-semibold mb-2">
          Promote Digital Curriculum Students → Digital Curriculum Alumni
        </h2>
        <Input
          value={promoteEmail}
          onChange={(e) => setPromoteEmail(e.target.value)}
          placeholder="Email"
          className="mb-2"
        />
        <div className="flex items-center gap-2 mb-2">
          <Checkbox
            id="pg"
            checked={promoteGenInvite}
            onCheckedChange={(v) => setPromoteGenInvite(v === true)}
          />
          <Label htmlFor="pg">Generate invite after promotion</Label>
        </div>
        <Button disabled={busy} onClick={() => void handlePromote()}>
          Promote
        </Button>
      </Card>

      {msg && <p className="text-sm text-foreground">{msg}</p>}
      {lastCode && (
        <Card className="p-4 border-amber-600/50 bg-amber-950/20">
          <p className="text-sm font-medium">Latest plain invite code (copy now):</p>
          <p className="text-lg font-mono tracking-widest mt-1">{lastCode}</p>
        </Card>
      )}
    </div>
  );
}
