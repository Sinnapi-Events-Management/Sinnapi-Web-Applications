import type { InboxCounts, InboxTab } from '@sinnapi/ui/messaging';
import type { StatusTabOption } from '@sinnapi/ui';

/**
 * The `conversation_status` enum, in lifecycle order, plus an "all" view.
 *
 * `InboxTab` and `InboxCounts` are re-exported from `@sinnapi/ui/messaging`
 * rather than redeclared: the shared `useInboxFilters` produces them, and two
 * structurally-identical definitions of the same enum is exactly the drift that
 * shows up later as a tab whose count is always zero.
 */
export type { InboxCounts, InboxTab };

export const CONVERSATION_STATUSES = ['active', 'archived', 'blocked'] as const;

export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];

export const INBOX_TAB_DEFS: { value: InboxTab; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
  // Present here and deliberately absent from the client and vendor inboxes:
  // blocking is a moderation outcome, and it is the operator's queue that has
  // to be able to review it.
  { value: 'blocked', label: 'Blocked' },
  { value: 'all', label: 'All' },
];

/** Merge live counts into the static tab defs for <StatusTabs />. */
export function buildInboxTabs(counts: InboxCounts): StatusTabOption<InboxTab>[] {
  return INBOX_TAB_DEFS.map((t) => ({ ...t, count: counts[t.value] }));
}
