/**
 * What an offer takes off a price, in the browser.
 *
 * THE THIRD IMPLEMENTATION, AND WHY IT IS ALLOWED TO EXIST
 * `packagePricing.ts` computes what a reader is shown for a tier. `send_quotation`
 * computes what a client is charged. This module computes what an OFFER does to
 * the first of those — and it exists for the same reason `packagePricing` does:
 * a client scrolling a list of packages must see the discounted price without a
 * round trip per tier, and a price that only the server can produce is a price
 * that arrives after the card has already been read.
 *
 * It mirrors `resolve_discount_amount` in SQL, clause for clause:
 *
 *     percentage:  amount = round(net × value / 100, 2)
 *     fixed:       amount = value
 *     both:        amount = min(amount, max_discount_amount)   -- if capped
 *     both:        amount = min(amount, net)                   -- never negative
 *
 * `net` is the tier's price AFTER the tier's own `discount_rate` and BEFORE
 * tax — `PackageTierPricing.net`, exactly. That is the same input the RPC
 * receives, which is what makes the two agree rather than merely resemble each
 * other.
 *
 * WHAT THIS MODULE MUST NEVER BE USED FOR
 * Sending a price. Nothing here should ever reach `send_quotation` as an
 * amount: the server recomputes from the offer row and the items as sent,
 * precisely because a number that has been through a browser is a number a
 * browser could have edited. This is display arithmetic and only that.
 *
 * Pure — no React, no MUI — so a Next.js server component can render a
 * discounted price into the HTML a crawler reads.
 */
import type { PackageTierPricing } from '../../molecules/packagePricing';
import type { OfferModel } from '../types';

/** Money to the cent, so a rate applied to a base cannot drift by a fraction. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * A stored numeric as a number.
 *
 * PostgREST returns `numeric` as a JSON number, but one that has been through
 * a form or a URL arrives as a string. Anything unreadable is 0, never `NaN`:
 * a saving that formats as `UGX NaN` is worse than one that is wrong.
 */
function toAmount(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(parsed) ? parsed : 0;
}

/** What this offer takes off `net`. Zero when it takes nothing. */
export function offerSaving(offer: OfferModel | null | undefined, net: number): number {
  if (!offer || !Number.isFinite(net) || net <= 0) return 0;

  const value = toAmount(offer.value);
  if (value <= 0) return 0;

  const raw = offer.type === 'percentage' ? round2((net * value) / 100) : value;

  const cap = offer.max_discount_amount == null ? Infinity : toAmount(offer.max_discount_amount);
  return round2(Math.min(raw, cap > 0 ? cap : Infinity, net));
}

/**
 * The ceiling, when it is the thing actually deciding the saving.
 *
 * A cap that bites is invisible in the number it produces: "20% off" on a
 * 500,000 tier that takes off 2 looks like broken arithmetic, and every screen
 * that showed only the result left the reader — and the vendor reading their
 * own card back — no way to tell a cap from a bug. Returning the cap only when
 * it undercuts both the rate and the net is what lets a caller say WHY the
 * figure is what it is, and stay silent on the ordinary offer where the rate
 * decided it and a "capped at" note would be noise.
 */
export function offerCapApplied(offer: OfferModel | null | undefined, net: number): number | null {
  if (!offer || !Number.isFinite(net) || net <= 0) return null;

  const value = toAmount(offer.value);
  if (value <= 0) return null;

  const cap = offer.max_discount_amount == null ? 0 : toAmount(offer.max_discount_amount);
  if (cap <= 0) return null;

  const raw = offer.type === 'percentage' ? round2((net * value) / 100) : value;
  return cap < Math.min(raw, net) ? round2(cap) : null;
}

/**
 * Does this offer's floor let it apply to a booking of this size?
 *
 * Tested against the PRE-discount subtotal, because `min_amount` has always
 * meant "minimum booking amount" — testing it against the discounted figure
 * would let a discount disqualify itself. `discount_block_reason` does exactly
 * this in SQL; this is the copy that keeps an inapplicable offer off the card
 * rather than letting the client find out at the quote.
 */
export function offerMeetsMinimum(offer: OfferModel | null | undefined, base: number): boolean {
  if (!offer || offer.min_amount == null) return true;
  return base >= toAmount(offer.min_amount);
}

export type OfferedTierPricing = PackageTierPricing & {
  /** The offer applied, or null when none was. */
  offer: OfferModel | null;
  /** What the offer took off the tier's net. Always positive. */
  offerSaving: number;
  /** The tier's total with the offer applied — what the client would pay. */
  offeredTotal: number;
  /** The tier's total without it, kept so a card can strike it through. */
  listTotal: number;
  /**
   * The offer's ceiling, when the ceiling — not the rate — is what set
   * `offerSaving`. Null on every offer whose own terms decided the figure.
   */
  offerCap: number | null;
};

/**
 * A tier's pricing, re-derived with one offer applied.
 *
 * Tax is recomputed on the reduced net rather than carried over, because tax
 * follows the amount actually charged. Carrying the original tax would leave a
 * card showing a discount and a tax figure that no longer belong to the same
 * number — and, on an inclusive-tax package, would misstate what the vendor
 * owes the revenue authority on a sale they discounted.
 *
 * Returns the tier untouched, with `offer: null`, when nothing applies. Callers
 * render one shape either way rather than branching per card.
 */
export function applyOfferToTier(
  pricing: PackageTierPricing,
  offer: OfferModel | null | undefined,
): OfferedTierPricing {
  const listTotal = pricing.total;

  if (!offer || !pricing.isPriced || !offerMeetsMinimum(offer, pricing.base)) {
    return {
      ...pricing,
      offer: null,
      offerSaving: 0,
      offeredTotal: listTotal,
      listTotal,
      offerCap: null,
    };
  }

  const saving = offerSaving(offer, pricing.net);
  if (saving <= 0) {
    return {
      ...pricing,
      offer: null,
      offerSaving: 0,
      offeredTotal: listTotal,
      listTotal,
      offerCap: null,
    };
  }

  const net = round2(pricing.net - saving);
  const tax = pricing.taxInclusive
    ? round2(net - net / (1 + pricing.taxRate / 100))
    : round2((net * pricing.taxRate) / 100);
  const total = pricing.taxInclusive ? net : round2(net + tax);

  return {
    ...pricing,
    net,
    tax,
    total,
    offer,
    offerSaving: saving,
    offeredTotal: total,
    listTotal,
    offerCap: offerCapApplied(offer, pricing.net),
  };
}

/**
 * The offer a client should be shown out of several that apply.
 *
 * The largest saving, ties broken by the earlier deadline — the same order
 * `best_automatic_discount` uses in SQL, so the offer the card advertises is
 * the offer the server will pick when the quote is priced. Any other ordering
 * here would advertise one saving and deliver another.
 *
 * `base` is the pre-discount subtotal, used only to drop offers whose minimum
 * this booking does not meet. Omitting it disables that filter, which is right
 * for a caller that has no priced tier to test against.
 */
export function bestOffer(
  offers: readonly OfferModel[] | null | undefined,
  net: number,
  base?: number,
): OfferModel | null {
  const applicable = (offers ?? []).filter(
    (offer) => (base == null || offerMeetsMinimum(offer, base)) && offerSaving(offer, net) > 0,
  );
  if (applicable.length === 0) return null;

  return applicable.reduce((best, offer) => {
    const a = offerSaving(offer, net);
    const b = offerSaving(best, net);
    if (a !== b) return a > b ? offer : best;
    return (offer.ends_at ?? '') < (best.ends_at ?? '') ? offer : best;
  });
}

/**
 * The offers that actually move THIS tier's price, in the order a reader
 * should meet them.
 *
 * A tier-scoped offer on another tier is filtered out by the server; what this
 * removes is the offer whose minimum this tier does not reach — which the
 * server cannot filter, because it does not know which tier a card is showing
 * until the caller says so.
 */
export function applicableOffers(
  offers: readonly OfferModel[] | null | undefined,
  pricing: PackageTierPricing,
): OfferModel[] {
  return (offers ?? [])
    .filter(
      (offer) => offerMeetsMinimum(offer, pricing.base) && offerSaving(offer, pricing.net) > 0,
    )
    .sort((a, b) => offerSaving(b, pricing.net) - offerSaving(a, pricing.net));
}

/**
 * The saving as a percentage of what the client would otherwise have paid.
 *
 * A fixed UGX 300,000 off a 1.2m booking is 25% off, and "25%" is the number a
 * reader compares between two cards. Rounded to a whole number: a badge saying
 * "24.7% off" reads as a calculation rather than as an offer.
 */
export function offerSavingPercent(saving: number, listTotal: number): number | null {
  if (!Number.isFinite(saving) || !Number.isFinite(listTotal) || listTotal <= 0 || saving <= 0) {
    return null;
  }
  return Math.round((saving / listTotal) * 100);
}
