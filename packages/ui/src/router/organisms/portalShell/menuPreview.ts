import type { ConversationView } from '../../../messaging';
import type { NotificationView } from '../../../notifications';

/** Rows a top-bar preview panel shows before deferring to its full page. */
export const MENU_PREVIEW_LIMIT = 6;

/** Newest first, missing timestamps last. */
function byRecency(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return b.localeCompare(a);
}

/**
 * The threads worth previewing.
 *
 * Strictly by recency, not unread-first. The panel is a window onto the inbox,
 * and a window that reorders what it looks at makes the two disagree: the top
 * row here would not be the top row there, and "the message I just saw" becomes
 * something the user has to hunt for. Unread state is carried by weight and a
 * count instead — visible without moving anything.
 *
 * Sorted defensively even though the RPC already orders: the list also arrives
 * from a cache that a client-side write may have touched.
 */
export function previewConversations(
  conversations: ConversationView[],
  limit = MENU_PREVIEW_LIMIT,
): ConversationView[] {
  return [...conversations]
    .sort((a, b) => byRecency(a.lastMessageAt ?? a.createdAt, b.lastMessageAt ?? b.createdAt))
    .slice(0, limit);
}

/** The same window onto the notification feed. */
export function previewNotifications(
  notifications: NotificationView[],
  limit = MENU_PREVIEW_LIMIT,
): NotificationView[] {
  return [...notifications].sort((a, b) => byRecency(a.createdAt, b.createdAt)).slice(0, limit);
}

/** "3 unread" / "All caught up" — the panel subtitle, and never a bare "0". */
export function unreadSummary(count: number, singular: string, plural: string): string {
  if (count <= 0) return 'All caught up';
  return `${count} unread ${count === 1 ? singular : plural}`;
}
