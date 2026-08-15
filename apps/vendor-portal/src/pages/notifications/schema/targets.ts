import { recordId, referencePath } from '@sinnapi/ui/notifications';
import type { NotificationTarget, NotificationView } from '@sinnapi/ui/notifications';

/**
 * Where a notification leads inside the *vendor* portal.
 *
 * Routing lives here rather than in the shared kit because the three portals
 * genuinely differ: a vendor's money lands in `/payouts`, which no other portal
 * has, and their own application status belongs on `/profile` rather than on an
 * applications queue only admins can see.
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
  '/payouts',
  '/escrow',
  '/reviews',
  '/promotions',
  '/discounts',
  '/public-events',
  '/subscription',
  '/profile',
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

    // Escrow, refunds and disputes are all one conversation about one booking
    // from a vendor's side, and the booking page is where that conversation
    // has its context. `/escrow` is the summary fallback, not the destination.
    case 'escrow':
    case 'refunds':
    case 'disputes':
    case 'finance': {
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

    // A vendor is paid out, not charged, so both money domains land on payouts.
    case 'payouts':
    case 'payments':
      return { path: '/payouts', label: 'View payouts' };

    case 'reviews':
      return { path: '/reviews', label: 'View reviews' };

    case 'subscriptions':
      return { path: '/subscription', label: 'View subscription' };

    case 'promotions':
      return { path: '/promotions', label: 'View promotions' };

    case 'events':
      return { path: '/public-events', label: 'View events' };

    // The vendor's own application and account changes — their profile is the
    // only place they can see or act on either.
    case 'applications':
    case 'vendors':
      return { path: '/profile', label: 'View profile' };

    default:
      return fallbackTarget(notification);
  }
}

/**
 * Last resort for a trigger no domain claims: the producer's own `data.url`,
 * reduced to a path and only accepted if it names a route this portal serves.
 *
 * That guard matters — `url` is built for the email CTA and may well point at
 * the client or admin origin, so an unchecked path would 404 inside the app.
 */
function fallbackTarget(notification: NotificationView): NotificationTarget | null {
  const path = referencePath(notification);
  if (!path) return null;
  if (!KNOWN_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return null;
  }
  return { path, label: 'View details' };
}
