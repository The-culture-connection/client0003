import { useCallback, useEffect, useState } from "react";
import { httpsCallable, type HttpsCallableResult } from "firebase/functions";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import { Loader2, RefreshCw, KeyRound, Ban, UserPlus } from "lucide-react";
import { db, functions } from "../../lib/firebase";
import {
  DIGITAL_CURRICULUM_ALUMNI_ROLE,
  registerDigitalCurriculumAlumniEligible,
} from "../../lib/expansionEligible";

const ELIGIBLE = "eligibleUsers";
const INVITES = "inviteCodes";
const USERS = "users";

const CANONICAL_ROLES = [
  "superAdmin",
  "Admin",
  "Alumni",
  "Digital Curriculum Alumni",
  "Digital Curriculum Students",
] as const;

export type ExpansionCanonicalRole = (typeof CANONICAL_ROLES)[number];

export type InviteCodeStatus = "pending" | "used" | "expired" | "revoked" | "none" | "missing";

function statusFromInvite(
  inv: Record<string, unknown> | undefined,
  nowMs: number,
): InviteCodeStatus {
  if (!inv) return "missing";
  if (inv.revoked === true) return "revoked";
  if (inv.used === true) return "used";
  const exp = inv.expiresAt as Timestamp | undefined;
  if (exp && typeof exp.toMillis === "function" && exp.toMillis() < nowMs) {
    return "expired";
  }
  return "pending";
}

function statusBadgeVariant(
  s: InviteCodeStatus,
): "default" | "secondary" | "destructive" | "outline" {
  switch (s) {
    case "pending":
      return "outline";
    case "used":
      return "secondary";
    case "expired":
      return "secondary";
    case "revoked":
      return "destructive";
    default:
      return "secondary";
  }
}

export interface EligibleHubRow {
  id: string;
  email: string;
  role: string;
  networkAccess: boolean;
  accountClaimed: boolean;
  linkedUid: string | null;
  latestInviteCodeId: string | null;
  cohortId?: string;
  inviteStatus: InviteCodeStatus;
  codePreview: string | null;
  expiresAtLabel: string | null;
  onboardingComplete: boolean | null;
  profileCreated: boolean | null;
}

async function callFn<T>(
  name: string,
  data: Record<string, unknown>,
): Promise<HttpsCallableResult<T>> {
  const fn = httpsCallable(functions, name);
  return fn(data) as Promise<HttpsCallableResult<T>>;
}

export function AppAccessHubPanel() {
  const [rows, setRows] = useState<EligibleHubRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [busyRow, setBusyRow] = useState<string | null>(null);
  const [formBusy, setFormBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ExpansionCanonicalRole>("Alumni");
  const [cohortId, setCohortId] = useState("");
  const [expDays, setExpDays] = useState("14");
  const [genInvite, setGenInvite] = useState(true);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [lastPlainCode, setLastPlainCode] = useState<string | null>(null);

  const loadRows = useCallback(async () => {
    setLoadingList(true);
    setListError(null);
    try {
      const snap = await getDocs(collection(db, ELIGIBLE));
      const nowMs = Date.now();
      const built: EligibleHubRow[] = [];

      for (const d of snap.docs) {
        const data = d.data();
        const latestId = (data.latestInviteCodeId as string) || null;
        let inv: Record<string, unknown> | undefined;
        if (latestId) {
          const invSnap = await getDoc(doc(db, INVITES, latestId));
          inv = invSnap.exists() ? (invSnap.data() as Record<string, unknown>) : undefined;
        }
        const st = latestId ? statusFromInvite(inv, nowMs) : "none";
        const codePreview =
          (inv?.codePreview as string) ||
          (typeof inv?.code === "string" ? `${String(inv.code).slice(0, 2)}••••` : null);
        let expiresAtLabel: string | null = null;
        const exp = inv?.expiresAt as Timestamp | undefined;
        if (exp && typeof exp.toDate === "function") {
          expiresAtLabel = exp.toDate().toLocaleString();
        }

        const linkedUid = (data.linkedUid as string) || null;
        let onboardingComplete: boolean | null = null;
        let profileCreated: boolean | null = null;
        if (linkedUid) {
          const uSnap = await getDoc(doc(db, USERS, linkedUid));
          if (uSnap.exists()) {
            const u = uSnap.data();
            onboardingComplete = u.onboardingComplete === true ? true : u.onboardingComplete === false ? false : null;
            profileCreated = u.profileCreated === true ? true : u.profileCreated === false ? false : null;
            if (onboardingComplete == null && u.expansionOnboardingComplete === true) {
              onboardingComplete = true;
            }
            if (profileCreated == null && u.onboarding_status === "complete") {
              profileCreated = true;
            }
          }
        }

        built.push({
          id: d.id,
          email: (data.email as string) || d.id,
          role: (data.role as string) || "—",
          networkAccess: data.networkAccess === true,
          accountClaimed: data.accountClaimed === true,
          linkedUid,
          latestInviteCodeId: latestId,
          cohortId: data.cohortId as string | undefined,
          inviteStatus: st,
          codePreview,
          expiresAtLabel,
          onboardingComplete,
          profileCreated,
        });
      }

      built.sort((a, b) => a.email.localeCompare(b.email));
      setRows(built);
    } catch (e: unknown) {
      console.error(e);
      setListError(
        e instanceof Error ? e.message : "Could not load eligible users (check Firestore rules).",
      );
      setRows([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const handleUpsert = async () => {
    setFormBusy(true);
    setFormMessage(null);
    setLastPlainCode(null);
    try {
      const res = await callFn<{
        ok?: boolean;
        code?: string;
        normalizedEmail?: string;
      }>("createOrUpdateEligibleUser", {
        email: email.trim(),
        role,
        source: "digital_curriculum_admin_app_access_hub",
        generateInvite: genInvite,
        expirationDays: Number(expDays) || 14,
        cohortId: cohortId.trim() || undefined,
      });
      const d = res.data;
      if (d?.code) setLastPlainCode(d.code);
      setFormMessage(`Saved eligible user: ${d?.normalizedEmail ?? email.trim()}`);
      await loadRows();
    } catch (e: unknown) {
      const err = e as { message?: string };
      setFormMessage(err.message ?? String(e));
    } finally {
      setFormBusy(false);
    }
  };

  const handleGenerateForEmail = async (rowEmail: string) => {
    setBusyRow(rowEmail);
    try {
      const res = await callFn<{ code?: string }>("generateInviteCode", {
        email: rowEmail.trim(),
        expirationDays: Number(expDays) || 14,
      });
      if (res.data?.code) {
        setLastPlainCode(res.data.code);
        setFormMessage(`New code for ${rowEmail} — copy from highlighted box below.`);
      }
      await loadRows();
    } catch (e: unknown) {
      const err = e as { message?: string };
      alert(err.message ?? String(e));
    } finally {
      setBusyRow(null);
    }
  };

  const handleRevoke = async (inviteId: string, rowEmail: string) => {
    if (!inviteId) return;
    if (!window.confirm(`Revoke the current invite code for ${rowEmail}?`)) return;
    setBusyRow(rowEmail);
    try {
      await callFn("revokeInviteCode", { inviteId });
      await loadRows();
    } catch (e: unknown) {
      const err = e as { message?: string };
      alert(err.message ?? String(e));
    } finally {
      setBusyRow(null);
    }
  };

  const handleStudentExpansionAlumniAccess = async (rowEmail: string) => {
    setBusyRow(rowEmail);
    setFormMessage(null);
    setLastPlainCode(null);
    try {
      const out = await registerDigitalCurriculumAlumniEligible(rowEmail, {
        expirationDays: Number(expDays) || 14,
        source: "app_access_hub_student_row",
      });
      if (out.ok) {
        if (out.code) setLastPlainCode(out.code);
        setFormMessage(
          `Saved as ${DIGITAL_CURRICULUM_ALUMNI_ROLE}: ${out.normalizedEmail ?? rowEmail.trim()}`,
        );
      } else {
        alert(out.errorMessage ?? "Could not update eligible user.");
      }
      await loadRows();
    } catch (e: unknown) {
      const err = e as { message?: string };
      alert(err.message ?? String(e));
    } finally {
      setBusyRow(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-start gap-3 mb-4">
          <KeyRound className="w-6 h-6 text-accent shrink-0 mt-0.5" />
          <div>
            <h2 className="text-xl font-semibold text-foreground">App Access Hub</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Manage Expansion Network access: eligible emails, roles, and one-time invite codes
              (Firebase Callable + Firestore <code className="text-xs bg-muted px-1 rounded">eligibleUsers</code> /{" "}
              <code className="text-xs bg-muted px-1 rounded">inviteCodes</code>).
            </p>
          </div>
        </div>
      </Card>

      {lastPlainCode && (
        <Card className="p-4 border-amber-500/40 bg-amber-500/5">
          <p className="text-sm font-medium text-foreground">Latest plain invite code (copy now)</p>
          <p className="text-lg font-mono tracking-widest mt-1 break-all">{lastPlainCode}</p>
        </Card>
      )}

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-1">Assign email &amp; role</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Creates or updates <strong>eligibleUsers</strong>. Roles must match exactly. Invites are not generated for{" "}
          <strong>Digital Curriculum Students</strong> by default; use the table action <strong>Alumni app invite</strong>{" "}
          on a student row to grant Expansion access with an invite.
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-2 min-w-[220px] flex-1">
            <Label htmlFor="hub-email" className="text-foreground">
              Email
            </Label>
            <Input
              id="hub-email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-background"
            />
          </div>
          <div className="space-y-2 min-w-[200px]">
            <Label htmlFor="hub-role" className="text-foreground">
              Role
            </Label>
            <select
              id="hub-role"
              value={role}
              onChange={(e) => setRole(e.target.value as ExpansionCanonicalRole)}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground"
            >
              {CANONICAL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2 min-w-[140px]">
            <Label htmlFor="hub-exp" className="text-foreground">
              Expire (days)
            </Label>
            <Input
              id="hub-exp"
              type="number"
              min={1}
              max={90}
              value={expDays}
              onChange={(e) => setExpDays(e.target.value)}
              className="bg-background"
            />
          </div>
        </div>
        <div className="space-y-2 mt-4">
          <Label htmlFor="hub-cohort" className="text-foreground">
            Cohort ID (optional)
          </Label>
          <Input
            id="hub-cohort"
            placeholder="Prefilled in mobile onboarding"
            value={cohortId}
            onChange={(e) => setCohortId(e.target.value)}
            className="bg-background max-w-md"
          />
        </div>
        <div className="flex items-center gap-2 mt-4">
          <Checkbox
            id="hub-gen"
            checked={genInvite}
            onCheckedChange={(v) => setGenInvite(v === true)}
          />
          <Label htmlFor="hub-gen" className="text-foreground font-normal cursor-pointer">
            Generate invite code (network-access roles only)
          </Label>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            onClick={() => void handleUpsert()}
            disabled={formBusy || !email.trim()}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {formBusy ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Save eligible user
              </>
            )}
          </Button>
        </div>
        {formMessage && <p className="text-sm mt-3 text-muted-foreground">{formMessage}</p>}
      </Card>

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h3 className="text-lg font-semibold text-foreground">Eligible users &amp; code status</h3>
          <Button variant="outline" size="sm" onClick={() => void loadRows()} disabled={loadingList}>
            {loadingList ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </>
            )}
          </Button>
        </div>
        {listError && <p className="text-sm text-destructive mb-4">{listError}</p>}
        {loadingList && rows.length === 0 ? (
          <div className="flex justify-center py-12 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground py-6">No eligible users yet. Add one above.</p>
        ) : (
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-sm text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Email</th>
                  <th className="py-2 pr-3 font-medium">Role</th>
                  <th className="py-2 pr-3 font-medium">Network</th>
                  <th className="py-2 pr-3 font-medium">Claimed</th>
                  <th className="py-2 pr-3 font-medium">Onboarding</th>
                  <th className="py-2 pr-3 font-medium">Code status</th>
                  <th className="py-2 pr-3 font-medium">Preview / expires</th>
                  <th className="py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 align-top">
                    <td className="py-3 pr-3 text-foreground">{r.email}</td>
                    <td className="py-3 pr-3">
                      <Badge variant="outline" className="font-normal">
                        {r.role}
                      </Badge>
                    </td>
                    <td className="py-3 pr-3">
                      {r.networkAccess ? (
                        <Badge className="bg-green-500/15 text-green-600 border-green-500/30">yes</Badge>
                      ) : (
                        <Badge variant="secondary">no</Badge>
                      )}
                    </td>
                    <td className="py-3 pr-3">{r.accountClaimed ? "yes" : "no"}</td>
                    <td className="py-3 pr-3 text-muted-foreground">
                      {r.linkedUid
                        ? r.onboardingComplete === true
                          ? "complete"
                          : r.profileCreated === true
                            ? "in progress"
                            : "—"
                        : "—"}
                    </td>
                    <td className="py-3 pr-3">
                      <Badge variant={statusBadgeVariant(r.inviteStatus)}>{r.inviteStatus}</Badge>
                    </td>
                    <td className="py-3 pr-3 text-muted-foreground text-xs max-w-[200px]">
                      {r.codePreview && <span className="block font-mono">{r.codePreview}</span>}
                      {r.expiresAtLabel && <span className="block mt-0.5">{r.expiresAtLabel}</span>}
                      {!r.codePreview && !r.expiresAtLabel && "—"}
                    </td>
                    <td className="py-3 text-right whitespace-nowrap">
                      <div className="flex flex-wrap justify-end gap-1">
                        {r.networkAccess && r.role !== "Digital Curriculum Students" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8"
                            disabled={busyRow === r.email}
                            onClick={() => void handleGenerateForEmail(r.email)}
                          >
                            <KeyRound className="w-3 h-3 mr-1" />
                            New code
                          </Button>
                        )}
                        {r.latestInviteCodeId && r.inviteStatus === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8"
                            disabled={busyRow === r.email}
                            onClick={() => void handleRevoke(r.latestInviteCodeId!, r.email)}
                          >
                            <Ban className="w-3 h-3 mr-1" />
                            Revoke
                          </Button>
                        )}
                        {r.role === "Digital Curriculum Students" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8"
                            disabled={busyRow === r.email}
                            onClick={() => void handleStudentExpansionAlumniAccess(r.email)}
                          >
                            Alumni app invite
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
