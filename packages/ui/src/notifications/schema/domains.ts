import { titleizeToken } from '../../messaging/format';
import type { NotificationDomain } from '../types';

/**
 * Trigger-key prefix → domain. Longest prefix wins, so `finance.dispute_*` is
 * claimed by Disputes before the broader `finance` entry sees it, and
 * `vendor.application.*` by Applications before `vendor`.
 *
 * Keys are namespaced `domain.event` by every producer (the outbox dispatch
 * ROUTES table, the messaging trigger, the cron jobs and the reconciliation
 * function), which is why the prefix — not the `data` payload — is the routing
 * signal: `trigger_key` is `not null`, whereas `data` is optional and
 * differently shaped per writer.
 *
 * Shared across all three portals. It carries no routes: the same
 * `payout.paid` row means "Payouts" everywhere, but only the vendor portal has
 * a `/payouts` page to open. Routing is the host's job, via a
 * `NotificationTargetResolver`.
 */
const DOMAIN_PREFIXES: { prefix: string; domain: NotificationDomain }[] = [
  {
    prefix: 'vendor.application',
    domain: { key: 'applications', label: 'Applications', accent: 'info' },
  },
  { prefix: 'finance.dispute', domain: { key: 'disputes', label: 'Disputes', accent: 'error' } },
  { prefix: 'dispute', domain: { key: 'disputes', label: 'Disputes', accent: 'error' } },
  {
    prefix: 'subscription',
    domain: { key: 'subscriptions', label: 'Subscription', accent: 'secondary' },
  },
  { prefix: 'payment', domain: { key: 'payments', label: 'Payments', accent: 'success' } },
  { prefix: 'booking', domain: { key: 'bookings', label: 'Bookings', accent: 'primary' } },
  { prefix: 'escrow', domain: { key: 'escrow', label: 'Escrow', accent: 'warning' } },
  { prefix: 'payout', domain: { key: 'payouts', label: 'Payouts', accent: 'success' } },
  { prefix: 'refund', domain: { key: 'refunds', label: 'Refunds', accent: 'warning' } },
  { prefix: 'finance', domain: { key: 'finance', label: 'Finance', accent: 'warning' } },
  // Both spellings occur: the legacy outbox route emits `quote.status`, the
  // void RPC `quotation.voided`.
  { prefix: 'quotation', domain: { key: 'quotations', label: 'Quotes', accent: 'info' } },
  { prefix: 'quote', domain: { key: 'quotations', label: 'Quotes', accent: 'info' } },
  { prefix: 'vendor', domain: { key: 'vendors', label: 'Vendors', accent: 'primary' } },
  { prefix: 'review', domain: { key: 'reviews', label: 'Reviews', accent: 'secondary' } },
  { prefix: 'message', domain: { key: 'messages', label: 'Messages', accent: 'info' } },
  { prefix: 'promotion', domain: { key: 'promotions', label: 'Promotions', accent: 'secondary' } },
  { prefix: 'discount', domain: { key: 'promotions', label: 'Promotions', accent: 'secondary' } },
  { prefix: 'event', domain: { key: 'events', label: 'Events', accent: 'primary' } },
];

/** Catch-all for a trigger key no prefix claims — labelled, but never linked. */
export const SYSTEM_DOMAIN: NotificationDomain = {
  key: 'system',
  label: 'System',
  accent: 'secondary',
};

// Longest prefix first, so the specific entries above shadow the general ones
// regardless of the order they were declared in.
const SORTED_PREFIXES = [...DOMAIN_PREFIXES].sort((a, b) => b.prefix.length - a.prefix.length);

/** Resolve a `domain.event` trigger key to its domain, never failing. */
export function resolveDomain(triggerKey: string): NotificationDomain {
  return SORTED_PREFIXES.find((e) => triggerKey.startsWith(e.prefix))?.domain ?? SYSTEM_DOMAIN;
}

/** Every distinct domain, alphabetised — the source list for the filter chips. */
export const NOTIFICATION_DOMAINS: NotificationDomain[] = Object.values(
  DOMAIN_PREFIXES.reduce<Record<string, NotificationDomain>>((acc, e) => {
    acc[e.domain.key] = e.domain;
    return acc;
  }, {}),
).sort((a, b) => a.label.localeCompare(b.label));

/**
 * Display headline for a row. The outbox dispatcher stores the raw trigger key
 * as the title for legacy routes (`title: humanise(route.trigger)`), and older
 * rows stored it verbatim, so a title that merely echoes the key is treated as
 * absent and humanised rather than shown as `escrow.status`.
 */
export function notificationHeadline(triggerKey: string, title: string | null): string {
  const humanised = titleizeToken(triggerKey.replace(/\./g, ' '));
  return !title || title === triggerKey ? humanised : title;
}
