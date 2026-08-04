/**
 * Branded full-screen loading state — MORTAR industrial/Mortarverse system.
 * Black space surface + starfield, pulsing trowell, brick spinner with glow,
 * technical uppercase label. Used by AuthGuard / OnboardingGate / RoleGate
 * (and anywhere else a full-page loader is needed).
 */
export function BrandedLoading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="relative min-h-screen overflow-hidden space-surface flex items-center justify-center">
      <div aria-hidden className="starfield absolute inset-0 pointer-events-none" />
      <div aria-hidden className="aura-glow w-[420px] h-[420px] -top-24 -right-24 opacity-40" />
      <div aria-hidden className="aura-glow w-[320px] h-[320px] -bottom-20 -left-24 opacity-25" />
      <div className="relative z-10 text-center">
        <img
          src="/brand/white-trowell.png"
          alt=""
          aria-hidden
          className="h-14 w-auto mx-auto mb-6 opacity-90 animate-pulse"
        />
        <div className="w-12 h-12 border-2 border-mortar-brick border-t-transparent rounded-full animate-spin mx-auto mb-5 glow-brick" />
        <p className="font-technical uppercase tracking-[0.3em] text-xs text-muted-foreground">
          {label} //
        </p>
      </div>
    </div>
  );
}
