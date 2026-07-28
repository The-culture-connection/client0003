# Handoff: Mortarverse live action widget + reoriented storefronts (option 1c, "Focus card")

## Overview

Redesign of the post-login **Mortarverse chooser** in the MORTAR Flutter app
(`ExpansionNetworkApp/expansion_network`, branch `staging`).

Today `lib/mortarverse/screens/mortarverse_chooser_screen.dart` renders three
260px-wide storefront cards stacked vertically on a starfield. Problems: the
third tile falls below the fold on a 390×844 device, all three tiles look
equally "open" whether or not anything is happening, and the screen answers
"where can I go?" but never "what needs me?".

This handoff adds a **live action widget** above the storefronts and reorients
the storefronts into a horizontally scrollable "street" so all three read above
the fold. The widget surfaces app-wide action items in priority order:

1. Unread direct messages
2. A new conference just went live
3. Profile completion / badges
4. (fallback, quiet day) a suggested action — browse members, explore curriculum

QR scanning becomes a persistent FAB.

## About the Design Files

The files in this bundle are **design references created in HTML** — prototypes
showing intended look and behavior, **not production code to copy**. The target
codebase is **Flutter** (Dart, Material 3, `go_router`, `provider`). Recreate
these designs as Flutter widgets using the app's existing patterns —
`AppColors` / `ConferenceColors` / `CommonsColors`, `Theme.of(context)`,
`context.go(...)` routing, `ExpansionAnalytics.log(...)` — not as embedded
WebViews or HTML.

Every colour, radius and border below is already grounded in the repo; where a
value is new, it is marked **(new)**.

## Fidelity

**High-fidelity.** Colors, typography, spacing and radii are final. Recreate
pixel-for-pixel at a 390×844 logical-pixel baseline, then let it flex.

## Screens / Views

### Screen: Mortarverse chooser (`/mortarverse`)

Replaces the body of `MortarverseChooserScreen`.

**Purpose:** land the user after sign-in, tell them what needs them right now,
and route them into one of the three shops.

**Layout** (top to bottom, inside `SafeArea`, `Scaffold(backgroundColor: Colors.black)`):

Backdrop is unchanged from today: `RadialGradient(center: Alignment.topCenter,
radius: 1.2, colors: [Color(0xFF262626), Colors.black])` plus the existing
`_StarfieldPainter` (60 dots, `Random(7)`, r=0.8, `grey.shade600` @ 50% alpha).

| # | Block | Padding / size |
| --- | --- | --- |
| 1 | Greeting + wordmark | `EdgeInsets.fromLTRB(22, 20, 22, 0)` |
| 2 | Focus card (the live widget) | horizontal 22, top 18 |
| 3 | Pager dots | top 14, centered |
| 4 | Two secondary chips | top 14, `Row` with 8px gap, each `Expanded` |
| 5 | "WHERE TO GO" section header | `fromLTRB(22, 26, 22, 12)` |
| 6 | Shop street (horizontal scroll) | left inset 22, 12px gap, no right clip padding |
| 7 | `Spacer()` | — |
| 8 | MORTAR events strip | `fromLTRB(22, 0, 22, 26)`, 10px gap |
| 9 | QR FAB | overlaid, `right: 22, bottom: 30` |

**1 — Greeting + wordmark**
- "Good morning, Denise" — Roboto 400 / 13px / `#757575`
- "THE MORTARVERSE" — Roboto 700 / 22px / line-height 1.25 / letter-spacing 1.2 / `#FFFFFF`, 2px below

**2 — Focus card** (the live widget; shows the single highest-priority item)
- Container: radius 22, `border: 1px solid rgba(193,18,31,.55)`, padding 20
- Fill: `LinearGradient(160°)` from `rgba(193,18,31,.22)` → `rgba(193,18,31,.04)` at 60% → transparent
- Glow: `BoxShadow(color: rgba(193,18,31,.22), blurRadius: 40)`
- Row: 7px dot `#C1121F` with `BoxShadow(blur 8, spread 2, rgba(193,18,31,.8))`, 8px gap, eyebrow "WAITING ON YOU" Roboto 700 / 10px / ls 1.6 / `#C1121F`
- Headline "3 unread\nmessages" — Roboto **900** / 30px / line-height 1.15 / white, 14px below eyebrow
- Body "Maya Booker replied to your intro in the Networking Hall, 12 minutes ago." — Roboto 400 / 13px / line-height 1.5 / `#BDBDBD`, 8px below
- Footer row, 18px below: overlapping avatar stack (three 30px circles, 2px `#0A0A0A` ring, −10px overlap, initials Roboto 700 / 11px) then a spacer then the CTA pill: `#C1121F` fill, white Roboto 700 / 13px, padding 11×22, fully rounded — "Open messages"

**3 — Pager dots** — active `20×5` rounded `#C1121F`; then `5×5` `#E6DBB4` @ 60%; then `5×5` `#A8A8A8` @ 45%. 7px gap. One dot per queued action item, tinted by that item's shop colour.

**4 — Secondary chips** (the two items behind the active one, always glanceable)
- Conference chip: fill `rgba(230,219,180,.08)`, border `rgba(230,219,180,.3)`, radius 12, padding 9×11, icon `Icons.stadium` 17px `#E6DBB4`, 7px gap, label "Founders '26\njust opened" Roboto 500 / 11px / lh 1.25 / `#E6DBB4`
- Commons chip: fill `rgba(255,255,255,.05)`, border `rgba(255,255,255,.12)`, icon `Icons.account_circle` 17px `#A8A8A8`, label "Profile 60%\ncomplete" Roboto 500 / 11px / `#BDBDBD`

**5 — Section header** — "WHERE TO GO" Roboto 700 / 11px / ls 1.4 / white, and trailing "Swipe the street →" Roboto 400 / 11px / `#757575`.

**6 — Shop street** — `ListView`/`SingleChildScrollView` horizontal, 148px-wide tiles, 12px gap, left inset 22. At 390px width the third tile peeks ~40px, which is the affordance for the scroll. Each tile:
- radius 20, background `#0D0D0D`, `border: 2px solid <shopColor>`, glow `BoxShadow(blur 34, <shopColor> @ ~.32)` for active shops (Commons has no glow, border `rgba(168,168,168,.8)`)
- Storefront art: `assets/conference/shop_storefront.png` at **92×52**, tinted with `ColorFiltered(ColorFilter.mode(shopColor, BlendMode.srcIn))` — same technique as today. Sits in a header block with padding `18px top / 10px bottom` and a `LinearGradient` top→bottom from `shopColor @ .16` → transparent (`.12` for Commons)
- Body: padding `0 10 14`, 5px gaps, centered:
  - status pill — filled `shopColor` with black/white text for active shops, outlined for Commons; Roboto 700 / 9px / ls 1 / padding 3×8
  - title — Roboto 700 / 12px / lh 1.25 / ls .7 / white, two lines, centered
  - subtitle — Roboto 400 / 10px / `#999999`

| Tile | Colour | Pill | Title | Subtitle | Route |
| --- | --- | --- | --- | --- | --- |
| Networking Hall | `#C1121F` | `3 WAITING` (white on red) | NETWORKING\nHALL | 42 online | `/home`, or `/expansion/enter-code` when `!hasExpansionAccess` |
| Conference Center | `#E6DBB4` | `JUST OPENED` (black on gold) | CONFERENCE\nCENTER | Founders '26 | `/conference/gate` (set `CurrentConferenceHolder.instance.conferenceId` first) |
| The Commons | `#A8A8A8` | `PROFILE 60%` (outlined) | THE\nCOMMONS | 2 new badges | `/commons/profile` |

**8 — MORTAR events strip**
- Header row: "MORTAR EVENTS" Roboto 700 / 11px / ls 1.4 / white; trailing "See all" Roboto 400 / 11px / `#757575`
- Each row: fill `rgba(255,255,255,.04)`, border `rgba(255,255,255,.09)`, radius 14, padding 11×13, 12px gap
  - date block 38×38, radius 10, `#1A1A1A`, day Roboto 700 / 13px white over month Roboto 500 / 8px / ls .8 / `#757575`
  - title Roboto 500 / 13px white; meta Roboto 400 / 11px `#757575`
  - trailing RSVP pill: 1px `rgba(255,255,255,.22)` border, white Roboto 500 / 11px, padding 5×11
- The second row is deliberately narrower (262px) so the FAB never collides with a tappable control.

**9 — QR FAB** — 56×56 circle, `#C1121F`, `Icons.qr_code_scanner` 27px white, `BoxShadow(blur 26, offset (0,8), rgba(193,18,31,.55))`. Persistent on this screen. Routes to the existing scan flow (`member_card_scan_screen.dart` / `conference_booth_scan_screen.dart` depending on conference context).

## Interactions & Behavior

- **Focus card cycles.** The action queue is sorted by priority (unread DMs → new conference → profile completion → suggested action). The card shows item 0; the pager dots show queue length. Auto-advance every ~6s with a 250ms cross-fade + 8px slide, pausing on touch; horizontal drag also advances. Tapping the card or its CTA routes to that item's destination.
- **Empty queue.** When nothing is pending, the focus card falls back to a suggested action — "Finish your profile", "Browse members", "Explore the curriculum" — with the Commons grey (`#A8A8A8`) accent instead of red, eyebrow "SUGGESTED", and no dot glow.
- **Locked Networking Hall.** When `!hasExpansionAccess`, the Networking Hall tile keeps 45% opacity (as today) and its pill reads `LOCKED`; the tap routes to `/expansion/enter-code`.
- **No open conference.** The Conference tile drops to 45% opacity, pill `CLOSED`, subtitle "No conference is open right now", tap disabled — matching today's `enabled` flag. It also stops contributing an item to the action queue.
- **Loading.** While `fetchActiveConference()` is in flight, the Conference tile shows a shimmer on the pill and subtitle "Loading…". The focus card renders its first non-conference item immediately rather than waiting.
- **Street scroll.** Physics `BouncingScrollPhysics`, no snapping. Tiles get a `scale(0.97)` press state, 100ms.
- **Analytics.** Log a `mortarverse_action_widget_shown` event with the item type when the focus card surfaces an item, and `mortarverse_action_widget_tapped` on the CTA — same shape as the existing `ExpansionAnalytics.log(name, sourceScreen: 'mortarverse')` calls.

## State Management

- `List<MortarverseAction> _queue` — built from: unread DM count (`dm_repository.dart`), active conference + its `createdAt` (`conference_repository.dart` → `fetchActiveConference()`), profile completeness (`user_profile_repository.dart`), badges (`badge_repository.dart`), upcoming events (`events_repository.dart`).
- `int _activeIndex` — focus card position; reset when the queue changes.
- `Timer? _cycleTimer` — auto-advance; cancel in `dispose()`.
- `Future<Conference?> _activeConferenceFuture` — already exists; keep it.
- `hasExpansionAccess` from `context.watch<AuthController>()` — already exists.
- Keep the existing `initState` side effect that clears
  `CurrentConferenceHolder.instance.conferenceId` — every exit from the
  Conference app routes through this screen and it is the one place that can
  reliably clear it.

## Design Tokens

Colours (all already in the repo unless marked new):

| Token | Hex | Source |
| --- | --- | --- |
| Expansion / primary red | `#C1121F` | `lib/theme/app_theme.dart` `AppColors.primary` |
| Conference gold | `#E6DBB4` | `lib/conference/theme/conference_colors.dart` `ConferenceColors.gold` |
| Commons grey | `#A8A8A8` | `lib/commons/theme/commons_colors.dart` `CommonsColors.accent` |
| Background | `#000000` | `AppColors.background` |
| Shop card fill | `#0D0D0D` | chooser screen |
| Card | `#1A1A1A` | `AppColors.card` |
| Secondary | `#2A2A2A` | `AppColors.secondary` |
| Muted foreground | `#999999` | `AppColors.mutedForeground` |
| Grey 400 (body) | `#BDBDBD` | Flutter `Colors.grey.shade400` |
| Grey 600 (meta) | `#757575` | Flutter `Colors.grey.shade600` |
| Hairline | `rgba(255,255,255,.09)` | **(new)** |
| Surface veil | `rgba(255,255,255,.04)` | **(new)** |

Spacing scale: 2, 5, 7, 8, 10, 12, 14, 18, 20, 22, 26 (logical px).

Radii: 10 (date block), 12 (chip), 14 (event row), 20 (shop tile), 22 (focus card), 999 (pills, FAB).

Type (Roboto, the Flutter default): 30/900 headline · 22/700 wordmark · 13/500 title · 13/400 body · 12/700 tile title · 11/700 section header · 11/400 meta · 10/400 tile subtitle · 10–9/700 pills. Letter-spacing: 1.6 eyebrow, 1.4 section header, 1.2 wordmark, 1.0 pills, 0.7 tile title.

Shadows: focus card `blur 40, rgba(193,18,31,.22)` · shop tile `blur 34, <shopColor> @ .30–.34` · FAB `offset (0,8), blur 26, rgba(193,18,31,.55)` · status dot `blur 8, spread 2, <shopColor> @ .8`.

## Assets

- `assets/shop_storefront.png` — the existing storefront line art, copied
  verbatim from `ExpansionNetworkApp/expansion_network/assets/conference/shop_storefront.png`
  (1920×1080, transparent). In Flutter keep tinting it with
  `ColorFiltered(ColorFilter.mode(shopColor, BlendMode.srcIn))`; the HTML mocks
  fake that with a CSS `mask` + `background-color`.
- Icons are Material Symbols Rounded in the mock, which map 1:1 to Flutter
  `Icons`: `forum`, `stadium`, `account_circle`, `event`, `qr_code_scanner`,
  `auto_awesome`, `chevron_right`, `person_search`, `school`.
- No new assets are required.

## Files

- `MortarverseFocusCard.dc.html` — **the chosen design (option 1c)**, standalone, opens in any browser.
- `Mortarverse Live Widget (all options).dc.html` — full exploration: `1a` is the current staging screen recreated for comparison, `1b`/`1c`/`1d` are the three redesigns. Open it to see 1c in context and to read the rejected alternatives.
- `assets/shop_storefront.png`

Source files this design was read from, in the MORTAR monorepo
(`The-culture-connection/client0003`, branch `staging`):

- `ExpansionNetworkApp/expansion_network/lib/mortarverse/screens/mortarverse_chooser_screen.dart`
- `ExpansionNetworkApp/expansion_network/lib/theme/app_theme.dart`
- `ExpansionNetworkApp/expansion_network/lib/conference/theme/conference_colors.dart`
- `ExpansionNetworkApp/expansion_network/lib/commons/theme/commons_colors.dart`
- `ExpansionNetworkApp/expansion_network/lib/commons/widgets/commons_shell.dart`
- `ExpansionNetworkApp/expansion_network/lib/screens/welcome_mortarverse_intro_screen.dart`
