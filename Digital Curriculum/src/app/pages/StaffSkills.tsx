import { useEffect, useState } from "react";
import { Link } from "react-router";
import { CheckCircle2, Sparkles } from "lucide-react";
import { useAuth } from "../components/auth/AuthProvider";
import { BrandedLoading } from "../components/BrandedLoading";
import { TagPicker } from "../components/staffSkills/TagPicker";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Checkbox } from "../components/ui/checkbox";
import {
  addCatalogEntry,
  emptyProfile,
  loadCatalog,
  loadMyStaffSkillsProfile,
  saveMyStaffSkillsProfile,
  type CatalogKind,
  type StaffSkillsProfile,
} from "../lib/staffSkills";
import {
  MONTHLY_HOURS_OPTIONS,
  PASSION_CATALOG,
  SKILL_CATALOG,
  TRAINING_AUDIENCES,
  TRAINING_FORMATS,
} from "../lib/staffSkillsCatalog";

/**
 * MORTAR staff Skills & Passions form.
 *
 * Lives behind AuthGuard (sign in or sign up first, then you land back here),
 * but outside OnboardingGate so staff aren't pushed through learner onboarding.
 * One response per account; coming back loads it for editing.
 */
export function StaffSkillsPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<StaffSkillsProfile | null>(null);
  const [isNew, setIsNew] = useState(true);
  const [catalog, setCatalog] = useState<Record<CatalogKind, string[]>>({
    skill: SKILL_CATALOG,
    passion: PASSION_CATALOG,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const [existing, cat] = await Promise.all([loadMyStaffSkillsProfile(user.uid), loadCatalog()]);
        if (cancelled) return;
        setCatalog(cat);
        if (existing) {
          setProfile({ ...emptyProfile(user.uid, user.email, user.displayName), ...existing });
          setIsNew(false);
        } else {
          setProfile(emptyProfile(user.uid, user.email, user.displayName));
        }
      } catch {
        if (!cancelled) setProfile(emptyProfile(user.uid, user.email, user.displayName));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading || !profile || !user) return <BrandedLoading />;

  const set = <K extends keyof StaffSkillsProfile>(key: K, val: StaffSkillsProfile[K]) =>
    setProfile((p) => (p ? { ...p, [key]: val } : p));

  const toggle = (key: "training_formats" | "audiences", item: string) => {
    const list = profile[key];
    set(key, list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  };

  const create = (kind: CatalogKind) => (label: string) => {
    setCatalog((c) => ({ ...c, [kind]: [...c[kind], label].sort((a, b) => a.localeCompare(b)) }));
    void addCatalogEntry(kind, label, user.uid);
  };

  const problems: string[] = [];
  if (!profile.full_name.trim()) problems.push("your name");
  if (!profile.title.trim()) problems.push("your role at MORTAR");
  if (profile.skills.length === 0) problems.push("at least one skill");
  if (profile.passions.length === 0) problems.push("at least one passion");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (problems.length) {
      setError(`Please add ${problems.join(", ")}.`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveMyStaffSkillsProfile(
        {
          ...profile,
          full_name: profile.full_name.trim(),
          title: profile.title.trim(),
          team: profile.team.trim(),
          linkedin_url: profile.linkedin_url.trim(),
          email: user.email,
        },
        isNew
      );
      setIsNew(false);
      setSaved(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      setError((err as { message?: string }).message ?? "We couldn't save your answers. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <div className="min-h-screen bg-background px-4 py-12">
        <Card className="mx-auto max-w-2xl p-8 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
          <h1 className="font-headline mt-4 text-3xl font-black uppercase tracking-tight text-foreground">
            Thank you!
          </h1>
          <p className="mt-3 text-muted-foreground">
            Your skills and passions are saved. We&apos;ll use them to shape MORTAR&apos;s trainings and
            workshops. You can come back to this page any time to update your answers.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button variant="outline" onClick={() => setSaved(false)}>
              Edit my answers
            </Button>
            <Button asChild>
              <Link to="/dashboard">Go to the Digital Curriculum</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <form onSubmit={submit} className="mx-auto max-w-2xl space-y-6">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-accent">
            <Sparkles className="h-4 w-4" /> MORTAR staff
          </p>
          <h1 className="font-headline mt-2 text-3xl font-black uppercase leading-none tracking-tight text-foreground sm:text-4xl">
            Skills &amp; Passions
          </h1>
          <p className="mt-3 text-muted-foreground">
            Help us see what our team could teach. Your answers shape the trainings and workshops MORTAR
            offers to entrepreneurs and partner organizations. It takes about 10 minutes.
          </p>
          {!isNew && (
            <p className="mt-2 text-sm text-muted-foreground">You&apos;ve filled this out before — update anything below.</p>
          )}
        </div>

        <Card className="space-y-5 p-6">
          <h2 className="font-headline text-base font-black uppercase tracking-wider text-foreground">About you</h2>
          <Field id="full_name" label="Full name" required>
            <Input id="full_name" value={profile.full_name} onChange={(e) => set("full_name", e.target.value)} />
          </Field>
          <Field id="title" label="Your role or title at MORTAR" required>
            <Input id="title" value={profile.title} onChange={(e) => set("title", e.target.value)} />
          </Field>
          <Field id="team" label="Team or department">
            <Input id="team" value={profile.team} onChange={(e) => set("team", e.target.value)} />
          </Field>
          <Field id="linkedin_url" label="LinkedIn profile URL">
            <Input
              id="linkedin_url"
              type="url"
              placeholder="https://www.linkedin.com/in/…"
              value={profile.linkedin_url}
              onChange={(e) => set("linkedin_url", e.target.value)}
            />
          </Field>
        </Card>

        <Card className="space-y-5 p-6">
          <h2 className="font-headline text-base font-black uppercase tracking-wider text-foreground">Skills</h2>
          <Field
            id="skills"
            label="What skills could you teach someone else?"
            hint="Search the list and pick as many as apply. Don't see one? Type it and choose “Add”."
            required
          >
            <TagPicker
              id="skills"
              options={catalog.skill}
              value={profile.skills}
              onChange={(v) => set("skills", v)}
              onCreate={create("skill")}
              placeholder="Search skills — e.g. bookkeeping, video editing, pitching"
            />
          </Field>
          <Field id="certifications" label="Certifications, degrees or credentials">
            <Textarea
              id="certifications"
              rows={2}
              value={profile.certifications}
              onChange={(e) => set("certifications", e.target.value)}
            />
          </Field>
          <Field id="workshop_topics" label="Topics you could lead a 60-minute workshop on">
            <Textarea
              id="workshop_topics"
              rows={3}
              value={profile.workshop_topics}
              onChange={(e) => set("workshop_topics", e.target.value)}
            />
          </Field>
        </Card>

        <Card className="space-y-5 p-6">
          <h2 className="font-headline text-base font-black uppercase tracking-wider text-foreground">Passions</h2>
          <Field
            id="passions"
            label="What are you passionate about, at work or outside it?"
            hint="Search the list, or type your own and choose “Add”."
            required
          >
            <TagPicker
              id="passions"
              options={catalog.passion}
              value={profile.passions}
              onChange={(v) => set("passions", v)}
              onCreate={create("passion")}
              placeholder="Search passions — e.g. financial literacy, music, mentorship"
            />
          </Field>
        </Card>

        <Card className="space-y-5 p-6">
          <h2 className="font-headline text-base font-black uppercase tracking-wider text-foreground">
            Teaching preferences
          </h2>
          <CheckGroup
            legend="Formats you'd be comfortable teaching in"
            options={TRAINING_FORMATS}
            selected={profile.training_formats}
            onToggle={(o) => toggle("training_formats", o)}
          />
          <CheckGroup
            legend="Audiences you'd enjoy teaching"
            options={TRAINING_AUDIENCES}
            selected={profile.audiences}
            onToggle={(o) => toggle("audiences", o)}
          />
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-foreground">Hours per month you could give to trainings</legend>
            <div className="flex flex-wrap gap-2">
              {MONTHLY_HOURS_OPTIONS.map((h) => (
                <Pill key={h} active={profile.monthly_hours === h} onClick={() => set("monthly_hours", h)}>
                  {h}
                </Pill>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-foreground">
              Is it okay to feature you in MORTAR marketing for a training?
            </legend>
            <div className="flex gap-2">
              <Pill active={profile.ok_to_feature === "yes"} onClick={() => set("ok_to_feature", "yes")}>
                Yes
              </Pill>
              <Pill active={profile.ok_to_feature === "no"} onClick={() => set("ok_to_feature", "no")}>
                No
              </Pill>
            </div>
          </fieldset>
        </Card>

        {error && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? "Saving…" : isNew ? "Submit" : "Save changes"}
        </Button>
      </form>
    </div>
  );
}

function Field({
  id,
  label,
  hint,
  required,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={id} className="mb-1 block text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {hint && <p className="mb-2 text-xs text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}

function CheckGroup({
  legend,
  options,
  selected,
  onToggle,
}: {
  legend: string;
  options: string[];
  selected: string[];
  onToggle: (o: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-foreground">{legend}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((o) => {
          const cid = `${legend}-${o}`.replace(/\W+/g, "-");
          return (
            <label key={o} htmlFor={cid} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <Checkbox id={cid} checked={selected.includes(o)} onCheckedChange={() => onToggle(o)} />
              {o}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
        active
          ? "border-accent bg-accent text-accent-foreground"
          : "border-border text-foreground hover:border-accent/60"
      }`}
    >
      {children}
    </button>
  );
}
