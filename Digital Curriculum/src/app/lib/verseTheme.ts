/**
 * Verse/chapter theme colors — MORTAR UI overhaul.
 *
 * Per the new card style spec, the lesson player's theme color (progress
 * bars, statistics, quiz results, bottom texture) follows the
 * chapter/verse color. Verse one is the "Masters" green (#74af38); later
 * verses cycle through the textbook palette from STYLEGUIDE_V1.
 *
 * Usage:
 *   const verseColor = getVerseThemeColor({ verseIndex, chapterId });
 *   <div style={verseThemeStyle(verseColor)}>…</div>
 * The style sets the --verse-theme CSS variable, which drives the
 * `bg-verse` / `text-verse` / `border-verse` Tailwind utilities and the
 * `.verse-texture-bottom` texture defined in theme.css.
 */

import type { CSSProperties } from "react";

/** Ordered verse palette: verse 1 → green, 2 → yellow, 3 → blue, 4 → red, then repeats. */
export const VERSE_PALETTE = [
  "#74af38", // verse green (new card style spec)
  "#e2bb28", // textbook yellow
  "#578ca9", // textbook blue
  "#b56154", // textbook red
] as const;

/** Stable non-negative hash so an unknown chapter still gets a consistent color. */
function stableHash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export interface VerseThemeInput {
  /** Explicit color override (e.g. a future `theme_color` field on the chapter). Wins if set. */
  override?: string | null;
  /** 0-based index of the verse/module within the course — preferred. */
  verseIndex?: number | null;
  /** Fallback: any stable id (chapterId/moduleId) hashed onto the palette. */
  chapterId?: string | null;
}

export function getVerseThemeColor({ override, verseIndex, chapterId }: VerseThemeInput): string {
  if (override && /^#[0-9a-fA-F]{3,8}$/.test(override)) return override;
  if (verseIndex != null && verseIndex >= 0) {
    return VERSE_PALETTE[verseIndex % VERSE_PALETTE.length];
  }
  if (chapterId) {
    return VERSE_PALETTE[stableHash(chapterId) % VERSE_PALETTE.length];
  }
  return VERSE_PALETTE[0];
}

/** Inline style that scopes the verse theme to a subtree. */
export function verseThemeStyle(color: string): CSSProperties {
  return { "--verse-theme": color } as CSSProperties;
}
