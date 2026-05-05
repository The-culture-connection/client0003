import { BookOpen, Smartphone, Layers } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../ui/utils";
import type { MortarPlatformScope } from "../../lib/mortarPlatformScope";

export type { MortarPlatformScope };

export const PLATFORM_SCOPE_META: Record<
  MortarPlatformScope,
  { label: string; shortLabel: string; hint: string; icon: LucideIcon; badgeClass: string }
> = {
  digital_curriculum: {
    label: "Digital Curriculum",
    shortLabel: "Web",
    hint: "Mortar Masters web app — courses, web groups & events hub, shop, learner DMs, web analytics.",
    icon: BookOpen,
    badgeClass:
      "border-sky-500/55 bg-sky-950/45 text-sky-100 shadow-[inset_0_1px_0_0_rgba(56,189,248,0.12)]",
  },
  expansion_mobile: {
    label: "Expansion mobile",
    shortLabel: "Mobile",
    hint: "Flutter Expansion Network app — communities, feed, mobile events, moderation & mobile analytics.",
    icon: Smartphone,
    badgeClass:
      "border-amber-500/55 bg-amber-950/45 text-amber-100 shadow-[inset_0_1px_0_0_rgba(251,191,36,0.12)]",
  },
  both: {
    label: "Both surfaces",
    shortLabel: "Both",
    hint: "Shared Firestore data or staff workflows that span web and the Expansion app.",
    icon: Layers,
    badgeClass:
      "border-violet-500/55 bg-violet-950/45 text-violet-100 shadow-[inset_0_1px_0_0_rgba(167,139,250,0.12)]",
  },
};

export function PlatformScopeBadge({
  scope,
  className,
  showIcon = true,
  compact = false,
}: {
  scope: MortarPlatformScope;
  className?: string;
  showIcon?: boolean;
  compact?: boolean;
}) {
  const meta = PLATFORM_SCOPE_META[scope];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        meta.badgeClass,
        compact && "px-1.5 py-0 text-[9px]",
        className
      )}
      title={`${meta.label}: ${meta.hint}`}
    >
      {showIcon && <Icon className="w-3 h-3 shrink-0 opacity-90" aria-hidden />}
      <span>{meta.shortLabel}</span>
    </span>
  );
}

/** Compact horizontal legend — tooltips carry full detail so this stays out of the way. */
export function PlatformScopeKey({ className }: { className?: string }) {
  const scopes = Object.keys(PLATFORM_SCOPE_META) as MortarPlatformScope[];
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-2 gap-y-1 sm:gap-x-3",
        className
      )}
      role="note"
      aria-label="Platform scope key"
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground shrink-0">
        Key
      </span>
      <span className="hidden sm:inline text-border h-3 w-px shrink-0 bg-border" aria-hidden />
      {scopes.map((scope, index) => {
        const m = PLATFORM_SCOPE_META[scope];
        return (
          <span key={scope} className="inline-flex items-center gap-1.5 min-w-0">
            {index > 0 && (
              <span className="text-muted-foreground/40 hidden sm:inline select-none" aria-hidden>
                ·
              </span>
            )}
            <PlatformScopeBadge scope={scope} />
            <span
              className="text-[11px] text-muted-foreground truncate max-w-[9.5rem] sm:max-w-none sm:whitespace-nowrap"
              title={`${m.label}: ${m.hint}`}
            >
              {m.label}
            </span>
          </span>
        );
      })}
    </div>
  );
}
