import { recordId, referencePath } from '@sinnapi/ui/notifications';
import type { NotificationTarget, NotificationView } from '@sinnapi/ui/notifications';

/**
 * Where a notification leads inside the *client* portal.
 *
 * Routing lives here rather than in the shared kit because the three portals
 * genuinely differ: a client reaches an escrow through its booking (there is no
 * `/escrow/:id` outside admin), has no `/payouts` at all, and browses vendors by
 * slug rather than by id. A shared table of routes would be wrong for two of
 * the three consumers of it.
 *
 * Every branch degrades to its section when the payload carries no id, because
 * a legacy `{aggregate, id}` row and a modern reference block do not name the
 * same things — landing on the bookings list beats a CTA that isn't there.
 */

/** Route prefixes this portal actually serves — the guard on the `url` fallback. */
const KNOWN_PREFIXES = [
  '/bookings',
  '/quotations',
  '/messages',
  '/payments',
  '/escrow',
  '/reviews',
  '/my-events',
  '/discover',
];

export function resolveTarget(notification: NotificationView): NotificationTarget | null {
  const id = (key: string) => recordId(notification, key);

  switch (notification.domain.key) {
    case 'bookings': {
      const bookingId = id('booking_id');
      return bookingId
        ? { path: `/bookings/${bookingId}`, label: 'View booking' }
        : { path: '/bookings', label: 'View bookings' };
    }

    case 'escrow': {
      // The client's escrow lives on the booking page — `/escrow` is a summary
      // list with no per-record route to send them to.
      const bookingId = id('booking_id');
      return bookingId
        ? { path: `/bookings/${bookingId}`, label: 'View booking' }
        : { path: '/escrow', label: 'View escrow' };
    }

    case 'quotations': {
      const quotationId = id('quotation_id');
      return quotationId
        ? { path: `/quotations/${quotationId}`, label: 'View quote' }
        : { path: '/quotations', label: 'View quotes' };
    }

    case 'messages': {
      const conversationId = id('conversation_id');
      return conversationId
        ? { path: `/messages/${conversationId}`, label: 'Open conversation' }
        : { path: '/messages', label: 'Open messages' };
    }

    // Refunds surface on the payments ledger for a client; there is no separate
    // refunds page the way there is in admin.
    case 'payments':
    case 'refunds':
      return { path: '/payments', label: 'View payments' };

    case 'reviews':
      return { path: '/reviews', label: 'View reviews' };

    case 'events':
      return { path: '/my-events', label: 'View events' };

    case 'vendors':
      // Vendor detail is keyed by slug, which notifications never carry, so the
      // best honest destination is discovery.
      return { path: '/discover', label: 'Browse vendors' };

    default:
      return fallbackTarget(notification);
  }
}

/**
 * Last resort for a trigger no domain claims: the producer's own `data.url`,
 * reduced to a path and only accepted if it names a route this portal serves.
 *
 * That guard matters — `url` is built for the email CTA and may well point at
 * the vendor or admin origin, so an unchecked path would 404 inside the app.
 */
function fallbackTarget(notification: NotificationView): NotificationTarget | null {
  const path = referencePath(notification);
  if (!path) return null;
  if (!KNOWN_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return null;
  }
  return { path, label: 'View details' };
}
