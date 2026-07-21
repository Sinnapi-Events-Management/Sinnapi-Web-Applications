import { titleize } from '@/lib/config';

/** Accent tints available to a domain badge. Mirrors <IconBadge />'s palette. */
export type DomainAccent = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

export type NotificationDomain = {
  /** Stable id — the filter chip value and the icon lookup key. */
  key: string;
  label: string;
  accent: DomainAccent;
  /**
   * Section the "View" CTA opens. The portal has no per-record detail routes for
   * finance domains (see App.tsx — /disputes, /payouts, /refunds and /escrow are
   * list pages only), so this deliberately lands on the section, not the row.
   * `null` means nothing in the portal surfaces this domain.
   */
  route: string | null;
  /** Permission guarding `route`; undefined means any admin may open it. */
  perm?: string;
};

/**
 * Trigger-key prefix → domain. Longest prefix wins, so `finance.dispute_*` is
 * claimed by Disputes before the broader `finance` entry sees it, and
 * `vendor.application.*` by Applications before `vendor`.
 *
 * Keys are namespaced `domain.event` by every producer (the outbox dispatch
 * ROUTES table, the cron jobs and the reconciliation function), which is why the
 * prefix — not the `data` payload — is the routing signal: `trigger_key` is
 * `not null`, whereas `data` is optional and differently shaped per writer.
 */
const DOMAIN_PREFIXES: { prefix: string; domain: NotificationDomain }[] = [
  {
    prefix: 'vendor.application',
    domain: {
      key: 'applications',
      label: 'Applications',
      accent: 'info',
      route: '/applications',
      perm: 'vendor.review',
    },
  },
  {
    prefix: 'finance.dispute',
    domain: {
      key: 'disputes',
      label: 'Disputes',
      accent: 'error',
      route: '/disputes',
      perm: 'dispute.manage',
    },
  },
  {
    prefix: 'dispute',
    domain: {
      key: 'disputes',
      label: 'Disputes',
      accent: 'error',
      route: '/disputes',
      perm: 'dispute.manage',
    },
  },
  {
    prefix: 'subscription',
    domain: {
      key: 'subscriptions',
      label: 'Subscriptions',
      accent: 'secondary',
      route: '/subscriptions',
      perm: 'subscriptions.manage',
    },
  },
  {
    prefix: 'payment',
    domain: {
      key: 'payments',
      label: 'Payments',
      accent: 'success',
      route: '/payments',
      perm: 'payments.read',
    },
  },
  {
    prefix: 'booking',
    domain: {
      key: 'bookings',
      label: 'Bookings',
      accent: 'primary',
      route: '/bookings',
      perm: 'bookings.read',
    },
  },
  {
    prefix: 'escrow',
    domain: {
      key: 'escrow',
      label: 'Escrow',
      accent: 'warning',
      route: '/escrow',
      perm: 'escrow.read',
    },
  },
  {
    prefix: 'payout',
    domain: {
      key: 'payouts',
      label: 'Payouts',
      accent: 'success',
      route: '/payouts',
      perm: 'payout.approve',
    },
  },
  {
    prefix: 'refund',
    domain: {
      key: 'refunds',
      label: 'Refunds',
      accent: 'warning',
      route: '/refunds',
      perm: 'refund.approve',
    },
  },
  {
    prefix: 'finance',
    domain: {
      key: 'finance',
      label: 'Finance',
      accent: 'warning',
      route: '/ledger',
      perm: 'finance.read',
    },
  },
  {
    prefix: 'quote',
    domain: {
      key: 'quotations',
      label: 'Quotations',
      accent: 'info',
      route: '/quotations',
      perm: 'quotations.read',
    },
  },
  {
    prefix: 'vendor',
    domain: {
      key: 'vendors',
      label: 'Vendors',
      accent: 'primary',
      route: '/vendors',
      perm: 'vendor.manage',
    },
  },
  {
    prefix: 'review',
    domain: {
      key: 'reviews',
      label: 'Reviews',
      accent: 'secondary',
      route: '/reviews-moderation',
      perm: 'moderation.manage',
    },
  },
  {
    prefix: 'message',
    // /messages is ungated — every admin has an inbox.
    domain: { key: 'messages', label: 'Messages', accent: 'info', route: '/messages' },
  },
  {
    prefix: 'event',
    domain: {
      key: 'events',
      label: 'Events',
      accent: 'primary',
      route: '/events',
      perm: 'events.manage',
    },
  },
];

/** Catch-all for a trigger key no prefix claims — labelled, but never linked. */
export const SYSTEM_DOMAIN: NotificationDomain = {
  key: 'system',
  label: 'System',
  accent: 'secondary',
  route: null,
};

// Longest prefix first, so the specific entries above shadow the general ones
// regardless of the order they were declared in.
const SORTED_PREFIXES = [...DOMAIN_PREFIXES].sort((a, b) => b.prefix.length - a.prefix.length);

/** Resolve a `domain.event` trigger key to its domain, never failing. */
export function resolveDomain(triggerKey: string): NotificationDomain {
  return SORTED_PREFIXES.find((e) => triggerKey.startsWith(e.prefix))?.domain ?? SYSTEM_DOMAIN;
}

/** Distinct domains, alphabetised — the filter chip row. */
export const DOMAIN_FILTERS: NotificationDomain[] = Object.values(
  DOMAIN_PREFIXES.reduce<Record<string, NotificationDomain>>((acc, e) => {
    acc[e.domain.key] = e.domain;
    return acc;
  }, {}),
).sort((a, b) => a.label.localeCompare(b.label));

/**
 * Display headline for a row. The outbox dispatcher stores the raw trigger key
 * as the title (`title: route.trigger`), so a title that merely echoes the key
 * is treated as absent and humanised rather than shown as `escrow.status`.
 */
export function notificationHeadline(triggerKey: string, title: string | null): string {
  const humanised = titleize(triggerKey.replace(/\./g, ' '));
  return !title || title === triggerKey ? humanised : title;
}
