import { notificationHeadline, resolveDomain } from './schema/domains';
import type { NotificationView } from './types';

/**
 * The `notifications` columns every portal selects. Structural rather than
 * generated: each portal owns its own database types, and the kit deliberately
 * depends on none of them.
 */
export type NotificationRowLike = {
  id: string;
  trigger_key: string;
  title: string | null;
  body: string | null;
  data: Record<string, unknown> | null;
  channel: string;
  read_at: string | null;
  created_at: string | null;
};

/**
 * Flattens a table row into the display-ready shape the kit renders.
 *
 * Lives here rather than beside each feed because all three portals were
 * writing the same nine-line function, and the two that drifted would drift
 * silently — a headline humanised in one place and a raw `booking.status_changed`
 * shown in another. Resolving the domain and headline on the way in is also
 * what keeps trigger-key parsing out of the components.
 */
export function toNotificationView(row: NotificationRowLike): NotificationView {
  return {
    id: row.id,
    headline: notificationHeadline(row.trigger_key, row.title),
    body: row.body,
    triggerKey: row.trigger_key,
    domain: resolveDomain(row.trigger_key),
    channel: row.channel,
    data: row.data,
    createdAt: row.created_at,
    readAt: row.read_at,
    unread: !row.read_at,
  };
}
