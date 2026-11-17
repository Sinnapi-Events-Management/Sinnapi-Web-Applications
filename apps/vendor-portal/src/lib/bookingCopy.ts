import { one } from './rel';
import type { TitleRel } from './types';

/**
 * Plain-language helpers for bookings, shared by the list cards, the dashboard
 * and the booking page so a booking is described the same way everywhere.
 */

/** What the booking is for: the service, else the event, else nothing. */
export function bookingWhat(b: {
  vendor_services?: TitleRel | TitleRel[] | null;
  events?: TitleRel | TitleRel[] | null;
}): string | null {
  return one(b.vendor_services)?.title?.trim() || one(b.events)?.title?.trim() || null;
}

/** Whole days from today (local) to a `YYYY-MM-DD` date; negative = past. */
export function daysFromToday(
  date: string | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!date) return null;
  const [y, m, d] = date.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  const target = Date.UTC(y, m - 1, d);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86_400_000);
}

/** "Today", "Tomorrow", "In 5 days", "Yesterday", "11 days ago". */
export function relativeDay(date: string | null | undefined, now?: Date): string | null {
  const n = daysFromToday(date, now);
  if (n === null) return null;
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  return n > 0 ? `In ${n} days` : `${-n} days ago`;
}

/**
 * The one line a list card shows under a booking: what the vendor should do,
 * or what they are waiting for. Status-only on purpose — the list does not read
 * escrow, so money states are left to the booking page.
 */
export function bookingListHint(b: {
  status: string;
  event_date: string | null;
  payment_terms_status?: string | null;
}): { text: string; urgent: boolean } | null {
  const days = daysFromToday(b.event_date);
  switch (b.status) {
    case 'requested':
      return b.payment_terms_status === 'countered'
        ? { text: 'Waiting for the client to answer your terms', urgent: false }
        : { text: 'Reply to this request', urgent: true };
    case 'confirmed':
    case 'in_progress':
      if (days !== null && days < 0) return { text: 'Mark it as done', urgent: true };
      if (days === 0) return { text: 'The event is today', urgent: true };
      return null;
    default:
      return null;
  }
}
