import { formatDate } from '@/lib/config';
import type { PromotionModel } from '@/lib/types';

/**
 * Where a promotion is in its life, as a vendor thinks about it.
 *
 * The database has only `is_active`, which answers "did anyone switch this
 * off" and nothing else — a campaign that ran last February still carries
 * `is_active = true` forever. Rendering that flag directly is what let a card
 * show a green "Active" chip on a promotion no client has been able to see for
 * six months. The real state is the flag *and* the window, resolved together,
 * and it is derived here so every surface reads it the same way.
 *
 * `paused` beats the window deliberately: a vendor who switched a live campaign
 * off wants to see that they switched it off, not that its dates still cover
 * today.
 */
export type PromotionStatus = 'live' | 'scheduled' | 'ended' | 'paused';

const DAY_MS = 86_400_000;

/**
 * Local midnight of the calendar day `value` falls on.
 *
 * The window is stored as timestamps but is *meant* as whole days — a vendor
 * picks two dates, not two instants — so every comparison is snapped to day
 * boundaries. Local rather than UTC, so the card's progress agrees with the
 * dates printed beside it, which `formatDate` also renders locally.
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

export function promotionStatus(promotion: PromotionModel, now: number): PromotionStatus {
  if (promotion.is_active === false) return 'paused';

  // Both columns are NOT NULL in the schema; an open-ended window is the safe
  // reading if one ever arrives null rather than declaring the campaign over.
  const start = promotion.starts_at ? dayStart(promotion.starts_at) : Number.NEGATIVE_INFINITY;
  const end = promotion.ends_at ? dayStart(promotion.ends_at) : Number.POSITIVE_INFINITY;
  const today = dayStart(now);

  if (today < start) return 'scheduled';
  // Inclusive: a promotion ending today is live for the whole of today.
  if (today > end) return 'ended';
  return 'live';
}

/** How far through its run a promotion is, or null when it is not running. */
export function promotionProgress(
  promotion: PromotionModel,
  now: number,
): { day: number; totalDays: number; percent: number } | null {
  if (!promotion.starts_at || !promotion.ends_at) return null;
  if (promotionStatus(promotion, now) !== 'live') return null;

  const start = dayStart(promotion.starts_at);
  const totalDays = daysBetween(start, dayStart(promotion.ends_at)) + 1;
  if (totalDays < 1) return null;

  const today = dayStart(now);
  const day = Math.min(Math.max(daysBetween(start, today) + 1, 1), totalDays);

  return { day, totalDays, percent: (day / totalDays) * 100 };
}

/**
 * The one line a vendor scanning the grid actually wants: not the dates, which
 * are printed above it, but how long they have. Phrased in days because that is
 * the unit the window is picked in — an hours-precise countdown on a two-week
 * campaign reads as pressure rather than information.
 */
export function promotionCountdown(promotion: PromotionModel, now: number): string {
  const status = promotionStatus(promotion, now);
  const today = dayStart(now);

  if (status === 'paused') return 'Paused — hidden from clients';

  if (status === 'scheduled' && promotion.starts_at) {
    const days = daysBetween(today, dayStart(promotion.starts_at));
    if (days <= 0) return 'Starts today';
    if (days === 1) return 'Starts tomorrow';
    return `Starts in ${days} days`;
  }

  if (status === 'ended' && promotion.ends_at) {
    return `Ended ${formatDate(promotion.ends_at)}`;
  }

  if (status === 'live' && promotion.ends_at) {
    const days = daysBetween(today, dayStart(promotion.ends_at));
    if (days <= 0) return 'Last day';
    if (days === 1) return '1 day left';
    return `${days} days left`;
  }

  return '';
}

/** How each state is labelled and coloured, so no card invents its own words. */
export const PROMOTION_STATUS_META: Record<
  PromotionStatus,
  { label: string; color: 'success' | 'info' | 'warning' | 'default' }
> = {
  live: { label: 'Live', color: 'success' },
  scheduled: { label: 'Scheduled', color: 'info' },
  paused: { label: 'Paused', color: 'warning' },
  ended: { label: 'Ended', color: 'default' },
};

/** Which slice of the campaign list the toolbar is showing. */
export type PromotionFilter = 'all' | PromotionStatus;

export const PROMOTION_FILTERS: { value: PromotionFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'live', label: 'Live' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'paused', label: 'Paused' },
  { value: 'ended', label: 'Ended' },
];
