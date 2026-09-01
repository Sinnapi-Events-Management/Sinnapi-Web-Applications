import { formatMoney } from '@/lib/config';

/**
 * Event derivations shared by the two screens that read a public event: the
 * feed's cards and the event's own page.
 *
 * They live here rather than in `pages/publicEvents/schema/presenter` because
 * the detail page is not part of the feed, and a page reaching into another
 * page's schema folder is the first step towards two copies of "what does
 * `soon` mean". The presenter keeps what is genuinely the feed's — facet
 * counting and the tab bar — and everything about an *event* is here.
 *
 * Pure functions over the row shape, structural typing on purpose: the feed's
 * `PublicEventModel` and the detail page's `PublicEventDetailModel` are
 * different reads of the same table, and neither should have to be named here.
 */

/** The budget fields any read of an event carries. */
export type EventBudgetLike = {
  budget_min: number | null;
  budget_max: number | null;
  currency: string | null;
};

/**
 * The stated budget as a range, a floor, or a ceiling depending on what the
 * poster actually filled in. Null rather than a placeholder keeps the row off
 * the card entirely — "Budget: —" is noise on a brief that simply doesn't
 * quote one.
 */
export function budgetLabel(event: EventBudgetLike): string | null {
  const { budget_min: min, budget_max: max, currency } = event;
  if (min == null && max == null) return null;
  if (min != null && max != null && min !== max) {
    return `${formatMoney(min, currency)} – ${formatMoney(max, currency)}`;
  }
  if (min != null && max != null) return formatMoney(min, currency);
  if (min != null) return `From ${formatMoney(min, currency)}`;
  return `Up to ${formatMoney(max, currency)}`;
}

/**
 * Whole calendar days from today to `iso`, or null if it isn't a date.
 *
 * Built from local date parts rather than `new Date(iso)`: the RPC returns a
 * bare `YYYY-MM-DD`, which `Date` parses as *UTC* midnight, so anywhere west of
 * Greenwich an event dated today reads as yesterday. Both sides are pinned to
 * local midnight so the answer is a difference in calendar days, not in hours.
 */
function daysUntil(iso: string): number | null {
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!parts) return null;
  const target = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Rounded, not floored: a DST boundary inside the span shifts the difference
  // by an hour, which would otherwise silently lose a day.
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/**
 * How close an event is, as a tone the pill colours itself with.
 *
 * `urgent` is the seven-day window — the point at which a vendor either pitches
 * now or doesn't pitch at all — and it is the only tone that spends a colour.
 * Everything further out is deliberately quiet: a feed where every card shouts
 * is a feed where nothing does.
 */
export type EventUrgencyTone = 'urgent' | 'soon' | 'scheduled' | 'past';

export type EventUrgency = { label: string; tone: EventUrgencyTone };

export function eventUrgency(eventDate: string | null): EventUrgency | null {
  if (!eventDate) return null;
  const days = daysUntil(eventDate);
  if (days === null) return null;

  if (days < 0) return { label: 'Past event', tone: 'past' };
  if (days === 0) return { label: 'Today', tone: 'urgent' };
  if (days === 1) return { label: 'Tomorrow', tone: 'urgent' };
  if (days <= 7) return { label: `In ${days} days`, tone: 'urgent' };
  if (days <= 30) return { label: `In ${Math.round(days / 7)} weeks`, tone: 'soon' };
  return { label: `In ${Math.round(days / 30)} months`, tone: 'scheduled' };
}

/** Whether this vendor can act on the event at all — admin posts are inspiration. */
export function isActionable(event: { source: string | null }): boolean {
  return event.source === 'client';
}
