/**
 * The notification kit's vocabulary.
 *
 * Everything here is portal-agnostic on purpose. A notification row means the
 * same thing to a client, a vendor and an admin — what differs is only *where*
 * it points, which is why routing is expressed as an injected resolver
 * (`NotificationTargetResolver`) rather than baked into the domain table.
 */

import type { AccentColor } from '../molecules/IconBadge';

export type NotificationAccent = AccentColor;

/** The subject area a notification belongs to — the badge, chip and glyph. */
export type NotificationDomain = {
  /** Stable id: the filter chip value and the icon lookup key. */
  key: string;
  label: string;
  accent: NotificationAccent;
};

/**
 * A display-ready notification. Trigger-key parsing, domain resolution and
 * headline humanising all happen once, on the way in, so components render what
 * they are handed and never re-derive anything.
 */
export type NotificationView = {
  id: string;
  /** Humanised title — never a raw trigger key. */
  headline: string;
  body: string | null;
  triggerKey: string;
  domain: NotificationDomain;
  /** `notification_channel` enum — 'in_app' | 'email'. */
  channel: string;
  /** Producer-supplied references. Shapes vary by writer; always probe. */
  data: Record<string, unknown> | null;
  createdAt: string | null;
  readAt: string | null;
  unread: boolean;
};

/** Where a row's "open" affordance goes, within the host portal. */
export type NotificationTarget = {
  /** An in-portal path, e.g. `/bookings/abc`. Never an absolute URL. */
  path: string;
  /** CTA copy, e.g. "View booking". */
  label: string;
};

/**
 * Resolves a notification to somewhere in the host portal, or null when the
 * portal surfaces nothing for it.
 *
 * Injected rather than derived here because the three portals genuinely differ:
 * `/payouts` exists only for vendors, `/discover` only for clients, and only
 * admin has a per-record escrow route.
 */
export type NotificationTargetResolver = (
  notification: NotificationView,
) => NotificationTarget | null;

/** Read-state views over the feed. */
export const NOTIFICATION_TABS = ['all', 'unread', 'read'] as const;

export type NotificationTab = (typeof NOTIFICATION_TABS)[number];

/**
 * Feed totals. Server-exact where the host can manage it — these describe the
 * whole feed, not just the pages loaded so far.
 */
export type NotificationCounts = Record<NotificationTab, number>;

/** A calendar-day section of the feed. */
export type NotificationDayGroup = {
  /** `YYYY-MM-DD` in local time, or `undated` for rows with no timestamp. */
  key: string;
  /** "Today", "Yesterday", a weekday, else an absolute date. */
  label: string;
  items: NotificationView[];
};

/** Paging state for the "Load more" control and its honest row count. */
export type NotificationPaging = {
  loaded: number;
  total: number;
  hasMore: boolean;
  loadingMore: boolean;
  loadMore: () => void;
};
