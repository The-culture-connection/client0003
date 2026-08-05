/**
 * Mortarverse space backdrop for pages OUTSIDE the Root shell
 * (Login, Join, Onboarding). Drop as the first child of a
 * `relative space-surface overflow-x-clip` wrapper — the layers sit at
 * -z-10 so existing in-flow content needs no z changes.
 */
export function SpaceBackdrop() {
  return (
    <div aria-hidden className="absolute inset-0 -z-10 pointer-events-none">
      <div className="starfield absolute inset-0" />
      <div className="blueprint-grid absolute inset-0" />
      <div className="aura-glow w-[420px] h-[420px] -top-28 -right-24 opacity-40" />
      <div className="aura-glow w-[360px] h-[360px] top-[60%] -left-32 opacity-25" />
    </div>
  );
}
