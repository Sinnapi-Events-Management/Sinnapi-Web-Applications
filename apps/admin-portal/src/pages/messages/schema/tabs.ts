import type { StatusTabOption } from '@/components/ui/StatusTabs';

/**
 * The `conversation_status` enum, in lifecycle order, plus an "all" view. This
 * is the authoritative list behind the inbox tabs and their counts.
 */
export const CONVERSATION_STATUSES = ['active', 'archived', 'blocked'] as const;

export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];

export type InboxTab = ConversationStatus | 'all';

export const INBOX_TAB_DEFS: { value: InboxTab; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'all', label: 'All' },
];

export type InboxCounts = Record<InboxTab, number> & { unread: number };

export const EMPTY_INBOX_COUNTS: InboxCounts = {
  active: 0,
  archived: 0,
  blocked: 0,
  all: 0,
  unread: 0,
};

/** Merge live counts into the static tab defs for <StatusTabs />. */
export function buildInboxTabs(counts: InboxCounts): StatusTabOption<InboxTab>[] {
  return INBOX_TAB_DEFS.map((t) => ({ ...t, count: counts[t.value] }));
}
