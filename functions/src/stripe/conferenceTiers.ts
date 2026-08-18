/**
 * Conference ticket tiers (General Admission, VIP, …).
 *
 * Tiers live on the conference doc as `ticketTiers`, next to every other price
 * in Mortar (course modules, events, shop items) rather than as Stripe Prices.
 * Hosting the amounts in Stripe would not save any work: the buyer still has to
 * pick a tier, the choice still has to ride session metadata, and the webhook
 * still has to write it to the roster. It would only add a second place to keep
 * numbers in sync with the admin panel that already owns them.
 *
 * Conferences created before tiers existed carry a single `priceCents`. Those
 * are read as one implicit General Admission tier so old docs keep selling
 * without a migration.
 */

import {HttpsError} from "firebase-functions/v2/https";

export interface ConferenceTier {
  id: string;
  name: string;
  priceCents: number;
  /** What the buyer gets — shown at checkout and on the roster. */
  perks: string[];
  /** Ask Stripe Checkout for a shirt size when this tier includes apparel. */
  collectsShirtSize: boolean;
}

/** Tier id used when a legacy conference has only a bare `priceCents`. */
export const GENERAL_ADMISSION_TIER_ID = "ga";

function parseTier(raw: unknown): ConferenceTier | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  const id = String(t.id ?? "").trim();
  const name = String(t.name ?? "").trim();
  if (!id || !name) return null;

  const cents = Number(t.priceCents ?? 0);
  const perks = Array.isArray(t.perks)
    ? t.perks.map((p) => String(p ?? "").trim()).filter((p) => p.length > 0)
    : [];

  return {
    id,
    name,
    priceCents: Number.isFinite(cents) && cents > 0 ? Math.round(cents) : 0,
    perks,
    collectsShirtSize: t.collectsShirtSize === true,
  };
}

/**
 * Every sellable tier on a conference, newest shape first.
 *
 * Returns the legacy single-price tier when `ticketTiers` is absent or holds
 * nothing usable, so a conference that predates this field still resolves.
 */
export function readConferenceTiers(conf: FirebaseFirestore.DocumentData): ConferenceTier[] {
  const raw = conf.ticketTiers;
  if (Array.isArray(raw)) {
    const tiers = raw.map(parseTier).filter((t): t is ConferenceTier => t !== null);
    if (tiers.length > 0) return tiers;
  }

  const legacyCents = Number(conf.priceCents ?? 0);
  return [
    {
      id: GENERAL_ADMISSION_TIER_ID,
      name: "General Admission",
      priceCents: Number.isFinite(legacyCents) && legacyCents > 0 ? Math.round(legacyCents) : 0,
      perks: [],
      collectsShirtSize: false,
    },
  ];
}

/**
 * Pick the tier the buyer asked for.
 *
 * A missing `tier_id` is only allowed when there is exactly one tier — that is
 * an older app build buying a single-price conference. Once a conference offers
 * a choice, an app that cannot express one must not silently get the cheapest.
 */
export function selectConferenceTier(
  tiers: ConferenceTier[],
  requestedId: string | undefined
): ConferenceTier {
  if (!requestedId) {
    if (tiers.length === 1) return tiers[0];
    throw new HttpsError(
      "invalid-argument",
      "This conference offers more than one ticket type — choose one to continue."
    );
  }

  const tier = tiers.find((t) => t.id === requestedId);
  if (!tier) {
    throw new HttpsError("not-found", `Ticket type not available: ${requestedId}`);
  }
  return tier;
}
