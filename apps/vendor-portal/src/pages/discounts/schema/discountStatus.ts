import { formatDate } from '@/lib/config';
import type { DiscountModel } from '@/lib/types';

/**
 * Where a discount code is in its life, as a vendor thinks about it.
 *
 * The database has `is_active`, which answers only "did anyone switch this
 * off". Rendered directly — as this screen used to — it puts a green "Active"
 * chip on a code whose window closed last February, and on a code that hit its
 * fiftieth and last redemption this morning. Neither can be redeemed, and a
 * vendor reading either chip is being told they have an offer running that
 * nobody can use. The real state is the flag, the window and the cap resolved
 * together, and it is derived here so every surface reads it the same way.
 *
 * `exhausted` is the state this screen exists to surface. It is the only one
 * that is *good news* — a code sold out — and it is the only one a vendor can
 * act on profitably, by raising the cap while demand is still there.
 *
 * Precedence is deliberate. `paused` wins because a vendor who switched a code
 * off wants to see that they switched it off, not that its dates still cover
 * today. The window beats the cap because a code that both ended and sold out
 * is, first, over. See `promotionStatus`, whose ordering this mirrors.
 */
export type DiscountStatus = 'live' | 'scheduled' | 'exhausted' | 'ended' | 'paused';

const DAY_MS = 86_400_000;

/**
 * Local midnight of the calendar day `value` falls on.
 *
 * The window is stored as timestamps but is *meant* as whole days — a vendor
 * picks two dates, not two instants — so every comparison is snapped to day
 * boundaries. Local rather than UTC, so a countdown agrees with the dates
 * printed beside it, which `formatDate` also renders locally.
 */
function dayStart(value: string | number): number {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** Whole days from `from` to `to`, both snapped to their calendar day. */
function daysBetween(from: number, to: number): number {
  return Math.round((to - from) / DAY_MS);
}

/** True once a capped code has no redemptions left in it. */
export function isExhausted(discount: DiscountModel): boolean {
  return discount.max_uses != null && discount.used_count >= discount.max_uses;
}

export function discountStatus(discount: DiscountModel, now: number): DiscountStatus {
  if (discount.is_active === false) return 'paused';

  // Both columns are NOT NULL in the schema; an open-ended window is the safe
  // reading if one ever arrives null rather than declaring the code over.
  const start = discount.starts_at ? dayStart(discount.starts_at) : Number.NEGATIVE_INFINITY;
  const end = discount.ends_at ? dayStart(discount.ends_at) : Number.POSITIVE_INFINITY;
  const today = dayStart(now);

  if (today < start) return 'scheduled';
  // Inclusive: a code ending today is redeemable for the whole of today.
  if (today > end) return 'ended';
  if (isExhausted(discount)) return 'exhausted';
  return 'live';
}

/**
 * How much of a capped code has been redeemed, or null when it is uncapped.
 *
 * An uncapped code has no denominator, so there is no bar to draw: a full bar
 * would claim a limit it does not have and an empty one would claim it has
 * gone unused. Those codes report their count as a number instead.
 */
export function discountUsage(
  discount: DiscountModel,
): { used: number; max: number; percent: number; remaining: number } | null {
  if (discount.max_uses == null || discount.max_uses <= 0) return null;

  const used = Math.min(discount.used_count, discount.max_uses);
  return {
    used,
    max: discount.max_uses,
    percent: (used / discount.max_uses) * 100,
    remaining: discount.max_uses - used,
  };
}

/**
 * The one line a vendor scanning the grid actually wants: not the dates, which
 * are printed above it, but how long they have. Phrased in days because that is
 * the unit the window is picked in — an hours-precise countdown on a two-week
 * offer reads as pressure rather than information.
 */
export function discountCountdown(discount: DiscountModel, now: number): string {
  const status = discountStatus(discount, now);
  const today = dayStart(now);

  if (status === 'paused') return 'Paused — cannot be redeemed';
  if (status === 'exhausted') return 'Cap reached';

  if (status === 'scheduled' && discount.starts_at) {
    const days = daysBetween(today, dayStart(discount.starts_at));
    if (days <= 0) return 'Starts today';
    if (days === 1) return 'Starts tomorrow';
    return `Starts in ${days} days`;
  }

  if (status === 'ended' && discount.ends_at) return `Ended ${formatDate(discount.ends_at)}`;

  if (status === 'live' && discount.ends_at) {
    const days = daysBetween(today, dayStart(discount.ends_at));
    if (days <= 0) return 'Last day';
    if (days === 1) return '1 day left';
    return `${days} days left`;
  }

  return '';
}

/** How each state is labelled and coloured, so no card invents its own words. */
export const DISCOUNT_STATUS_META: Record<
  DiscountStatus,
  { label: string; color: 'success' | 'info' | 'warning' | 'default' }
> = {
  live: { label: 'Live', color: 'success' },
  scheduled: { label: 'Scheduled', color: 'info' },
  // Not an error state: the code did its job. Coloured as the one that wants a
  // decision — raise the cap, or let it stand.
  exhausted: { label: 'Fully redeemed', color: 'warning' },
  paused: { label: 'Paused', color: 'warning' },
  ended: { label: 'Ended', color: 'default' },
};

/** Which slice of the code list the toolbar is showing. */
export type DiscountFilter = 'all' | DiscountStatus;

export const DISCOUNT_FILTERS: { value: DiscountFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'live', label: 'Live' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'exhausted', label: 'Fully redeemed' },
  { value: 'paused', label: 'Paused' },
  { value: 'ended', label: 'Ended' },
];
