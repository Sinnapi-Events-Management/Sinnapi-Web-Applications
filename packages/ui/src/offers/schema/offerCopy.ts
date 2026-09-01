/**
 * What an offer is called, in every place it is named.
 *
 * Pure data, no React, for the reason `money.ts` gives: an offer that reads
 * "20% off" on the marketing site and "Percentage: 20" in the client portal is
 * the same platform describing one thing two ways, and a client comparing two
 * tabs is the person who notices.
 *
 * THE BLOCK REASONS ARE THE IMPORTANT PART OF THIS FILE
 * `discount_block_reason` returns a token per failure precisely so the client
 * can be told the true one. That investment is wasted if the browser renders
 * `wrong_tier` — or, worse, collapses all thirteen into "This code is not
 * valid", which is the sentence that sends a client holding a perfectly good
 * code to support. Each one below names the thing the reader can act on.
 */
import { formatAmount } from '../../molecules/money';
import type { OfferBlockReason, OfferLifecycle, OfferModel, OfferScope } from '../types';

/**
 * The days an event may fall on to qualify for an offer, as `YYYY-MM-DD`.
 *
 * The browser's mirror of `discount_event_window` in SQL, and deliberately
 * derived from `starts_at`/`ends_at` in one place: today those two timestamps
 * are both the claim window and the event window, and if that is ever split
 * this function and its SQL twin are the two things that change.
 *
 * Dates, not timestamps. An offer that ends at 09:00 on the 30th is good for an
 * event ON the 30th — a client whose party is that evening is inside the
 * campaign, and comparing instants would tell them otherwise.
 */
export type OfferDateWindow = { startsOn: string; endsOn: string };

export function offerDateWindow(
  offer: { starts_at?: string | null; ends_at?: string | null } | null | undefined,
): OfferDateWindow | null {
  const startsOn = offer?.starts_at?.slice(0, 10);
  const endsOn = offer?.ends_at?.slice(0, 10);
  return startsOn && endsOn ? { startsOn, endsOn } : null;
}

/** `27 Aug` and `26 Sep 2026` — the window as one readable phrase. */
export function formatOfferWindow(window: OfferDateWindow): string {
  const on = (iso: string, withYear: boolean) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      ...(withYear ? { year: 'numeric' } : {}),
    });
  const sameYear = window.startsOn.slice(0, 4) === window.endsOn.slice(0, 4);
  return `${on(window.startsOn, !sameYear)} and ${on(window.endsOn, true)}`;
}

function toAmount(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * The offer's own claim, in the fewest words that are still true.
 *
 * `20% off` / `UGX 300,000 off`. The cap is deliberately NOT folded in here —
 * "20% off up to UGX 500,000" is two facts, and a badge that carries both is a
 * badge nobody reads. `offerConditions` carries the second one.
 */
export function offerHeadline(offer: OfferModel | null | undefined): string {
  if (!offer) return '';
  const value = toAmount(offer.value);
  if (offer.type === 'percentage') {
    return `${Number(value.toFixed(2))}% off`;
  }
  return `${formatAmount(value, offer.currency ?? 'UGX')} off`;
}

/**
 * The qualifiers on that claim, as separate phrases.
 *
 * Returned as an array rather than a joined sentence so a card can render them
 * as a list and a chip row can render the first two — and so the caller decides
 * the separator rather than inheriting a comma that reads badly in their layout.
 */
export function offerConditions(offer: OfferModel | null | undefined): string[] {
  if (!offer) return [];
  const currency = offer.currency ?? 'UGX';
  const conditions: string[] = [];

  if (offer.min_amount != null && toAmount(offer.min_amount) > 0) {
    conditions.push(`On bookings from ${formatAmount(offer.min_amount, currency)}`);
  }
  if (offer.max_discount_amount != null && toAmount(offer.max_discount_amount) > 0) {
    conditions.push(`Up to ${formatAmount(offer.max_discount_amount, currency)} off`);
  }
  if (offer.remaining_uses != null) {
    conditions.push(offer.remaining_uses === 1 ? 'Last one left' : `${offer.remaining_uses} left`);
  }
  return conditions;
}

/** What the offer covers, said to a client rather than to a database. */
export function offerScopeLabel(scope: OfferScope | string | null | undefined): string {
  switch (scope) {
    case 'tier':
      return 'This tier only';
    case 'package':
      return 'This package';
    case 'campaign':
      return 'Selected packages';
    case 'vendor':
      return 'Everything from this vendor';
    default:
      return '';
  }
}

/**
 * How a client claims it.
 *
 * The three states are genuinely different actions: an automatic offer needs
 * nothing, a code the reader can see needs copying, and a code redacted behind
 * a login needs signing in. Collapsing them is how a signed-out visitor ends up
 * staring at a "Use code" button with no code.
 */
export function offerClaimLabel(offer: OfferModel | null | undefined): string {
  if (!offer) return '';
  if (offer.is_automatic) return 'Applied automatically';
  if (offer.code) return `Use code ${offer.code}`;
  return 'Sign in to get the code';
}

/**
 * Why the offer cannot be used, as a sentence for the person who typed it.
 *
 * Every branch names what to do next, because a refusal that only states a
 * fact leaves the reader with the same problem they started with. The default
 * is deliberately vague rather than echoing an unknown token: a reason added
 * in SQL and not here should read as a generic refusal, not as `snake_case` on
 * a client's screen — and the union in `types.ts` is what makes that a build
 * error rather than a silent one.
 */
export function offerBlockCopy(
  reason: OfferBlockReason | string | null | undefined,
  context?: { tierName?: string | null; packageName?: string | null; window?: OfferDateWindow },
): string {
  switch (reason) {
    // The date reasons carry the window when the caller has it, because
    // "pick another day" without saying which days is an instruction nobody
    // can follow. Both fall through to the same sentence shape.
    case 'event_before_window':
    case 'event_after_window':
      return context?.window
        ? `This offer covers events between ${formatOfferWindow(context.window)}. Pick a date in that range, or request this package without the saving.`
        : 'This offer does not cover your event date.';
    case 'not_found':
      return 'We do not recognise that code. Check it for typos and try again.';
    case 'suspended':
      return 'This offer has been withdrawn and can no longer be used.';
    case 'paused':
      return 'The vendor has paused this offer. It may come back — ask them.';
    case 'not_started':
      return 'This offer has not opened yet. Come back on its start date.';
    case 'expired':
      return 'This offer has ended.';
    case 'campaign_inactive':
      return 'The campaign behind this code is no longer running.';
    case 'vendor_unavailable':
      return 'This vendor is not currently taking bookings.';
    case 'wrong_vendor':
      return 'That code belongs to a different vendor.';
    case 'wrong_package':
      return context?.packageName
        ? `That code does not cover ${context.packageName}.`
        : 'That code does not cover this package.';
    case 'wrong_tier':
      return context?.tierName
        ? `That code does not cover the ${context.tierName} tier. Try another tier.`
        : 'That code covers a different tier of this package.';
    case 'below_minimum':
      return 'This booking is below the minimum this offer applies to.';
    case 'exhausted':
      return 'This offer has been fully claimed.';
    case 'client_limit_reached':
      return 'You have already used this offer as many times as it allows.';
    default:
      return 'This offer cannot be used right now.';
  }
}

/**
 * The state of an offer, derived in the browser.
 *
 * The same clauses in the same order as the CASE in `admin_search_offers`, so
 * a vendor's card and an operator's row cannot disagree about one campaign.
 * `now` is passed in rather than read here so a list re-derives every row
 * against one clock — a grid where each card called `Date.now()` would flip
 * rows to `ended` at thirty different instants.
 */
export function deriveOfferLifecycle(
  offer: {
    deleted_at?: string | null;
    admin_suspended_at?: string | null;
    is_active?: boolean | null;
    starts_at?: string | null;
    ends_at?: string | null;
    remaining_uses?: number | null;
  },
  now: number = Date.now(),
): OfferLifecycle {
  if (offer.deleted_at) return 'deleted';
  if (offer.admin_suspended_at) return 'suspended';
  if (offer.is_active === false) return 'paused';

  const starts = offer.starts_at ? Date.parse(offer.starts_at) : null;
  const ends = offer.ends_at ? Date.parse(offer.ends_at) : null;

  if (starts != null && Number.isFinite(starts) && starts > now) return 'scheduled';
  if (ends != null && Number.isFinite(ends) && ends < now) return 'ended';
  if (offer.remaining_uses != null && offer.remaining_uses <= 0) return 'exhausted';
  return 'live';
}

export const OFFER_LIFECYCLE_LABELS: Record<OfferLifecycle, string> = {
  live: 'Live',
  scheduled: 'Scheduled',
  paused: 'Paused',
  suspended: 'Withdrawn',
  ended: 'Ended',
  exhausted: 'Fully claimed',
  deleted: 'Deleted',
};

/**
 * The chip colour for each state, in MUI's palette vocabulary.
 *
 * `suspended` is `error` and `paused` is `warning` on purpose: one is a
 * decision made about the vendor and the other is a decision made by them, and
 * a vendor scanning their own list needs to tell those apart at a glance.
 */
export const OFFER_LIFECYCLE_COLORS: Record<
  OfferLifecycle,
  'success' | 'info' | 'warning' | 'error' | 'default'
> = {
  live: 'success',
  scheduled: 'info',
  paused: 'warning',
  suspended: 'error',
  ended: 'default',
  exhausted: 'default',
  deleted: 'default',
};

/**
 * How long is left, as a reader would say it.
 *
 * Days until it is hours, hours until it is minutes. A countdown to the second
 * on a campaign that runs for three weeks is theatre; one that says "2 days
 * left" on the last weekend is the thing that actually moves a booking.
 *
 * Null when the deadline is absent or already past — a caller renders nothing
 * rather than "-3 days left".
 */
export function offerTimeLeft(
  endsAt: string | null | undefined,
  now: number = Date.now(),
): string | null {
  if (!endsAt) return null;
  const end = Date.parse(endsAt);
  if (!Number.isFinite(end)) return null;

  const ms = end - now;
  if (ms <= 0) return null;

  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 48) return `${Math.floor(hours / 24)} days left`;
  if (hours >= 24) return 'Ends tomorrow';
  if (hours >= 1) return `${hours} ${hours === 1 ? 'hour' : 'hours'} left`;

  const minutes = Math.max(1, Math.floor(ms / 60_000));
  return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} left`;
}

/**
 * Is the deadline close enough to say so loudly?
 *
 * Used to switch a deadline chip from neutral to warning. Two days rather than
 * one: a client deciding on an event booking needs an evening to talk to
 * somebody, and an offer that only looks urgent on its final day is one they
 * find out about too late to use.
 */
export function offerIsEndingSoon(
  endsAt: string | null | undefined,
  now: number = Date.now(),
): boolean {
  if (!endsAt) return false;
  const end = Date.parse(endsAt);
  if (!Number.isFinite(end)) return false;
  const ms = end - now;
  return ms > 0 && ms <= 48 * 3_600_000;
}
