import type { NotificationView } from '../types';

/**
 * Reading record ids out of a notification's `data` payload.
 *
 * Three generations of producer write that column and none agree on a shape:
 *
 *   - the outbox dispatcher's addressed path writes a reference block —
 *     `{booking_id, escrow_id, conversation_id, quotation_id, …, audience, url}`
 *   - its legacy path writes `{aggregate: 'bookings_changed', id}`
 *   - SQL RPCs write their own keys, e.g. `{quotation_id, reference_no, …}`
 *
 * so a portal resolver that destructured one shape would silently link nothing
 * for the other two. These helpers probe instead, and every one of them tolerates
 * a null payload — `data` is nullable in the table.
 */

/** A `data` key holding a uuid, or undefined when absent, blank or non-string. */
export function reference(notification: NotificationView, key: string): string | undefined {
  const value = notification.data?.[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * Legacy `*_changed` aggregate names → the reference key their bare `id` means.
 * Without this the legacy rows — which are most of the booking and quote feed —
 * would carry an `id` no resolver could interpret.
 */
const LEGACY_AGGREGATES: Record<string, string> = {
  bookings_changed: 'booking_id',
  quotations_changed: 'quotation_id',
  escrow_transactions_changed: 'escrow_id',
  payments_changed: 'payment_id',
  subscriptions_changed: 'subscription_id',
  reviews_changed: 'review_id',
  event_interests_changed: 'event_id',
  messages_changed: 'conversation_id',
  vendor_applications_changed: 'vendor_id',
};

/**
 * The id a notification carries for `key`, from either the modern reference
 * block or a legacy `{aggregate, id}` pair.
 *
 * The legacy fallback is deliberately narrow: it answers only when the
 * aggregate maps to exactly the key being asked for, so a
 * `{aggregate: 'bookings_changed'}` row can never hand its id to a caller
 * asking for a quotation.
 */
export function recordId(notification: NotificationView, key: string): string | undefined {
  const direct = reference(notification, key);
  if (direct) return direct;

  const aggregate = notification.data?.aggregate;
  if (typeof aggregate !== 'string') return undefined;
  if (LEGACY_AGGREGATES[aggregate] !== key) return undefined;

  return reference(notification, 'id');
}

/**
 * The producer's own deep link, reduced to a path this portal can navigate to.
 *
 * `data.url` is written for the *email* CTA, so it is an absolute URL that may
 * well point at a different portal's origin. Taking its pathname is safe and
 * occasionally useful as a last resort; following it verbatim would bounce the
 * user out of the app, so this never returns an origin.
 */
export function referencePath(notification: NotificationView): string | undefined {
  const raw = notification.data?.url;
  if (typeof raw !== 'string' || raw.length === 0) return undefined;
  try {
    // A base is required for relative inputs and ignored for absolute ones; its
    // value is irrelevant because only the path is ever read back.
    const { pathname } = new URL(raw, 'https://sinnapi.invalid');
    return pathname === '/' ? undefined : pathname;
  } catch {
    return undefined;
  }
}
