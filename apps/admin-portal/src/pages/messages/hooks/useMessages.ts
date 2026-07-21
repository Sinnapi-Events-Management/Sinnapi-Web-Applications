import { useMemo, useState } from 'react';
import { useConversations, useConversationReadState } from '@/hooks/queries';
import { useAuth } from '@/auth/AuthProvider';
import { one } from '@/lib/rel';
import { titleize } from '@/lib/config';
import type { ConversationModel, VendorRef } from '@/lib/types';
import { EMPTY_INBOX_COUNTS, type InboxCounts, type InboxTab } from '../schema';

/**
 * Flattened, display-ready view of a conversation. Normalising the embedded
 * vendor/message relations here keeps `one<VendorRef>()` and the "messages is an
 * array of at most one" quirk out of the UI components.
 */
export type ConversationView = {
  id: string;
  /** Vendor business name, else the subject, else the titleized type. */
  title: string;
  subject: string | null;
  type: string;
  status: string;
  lastMessageAt: string | null;
  createdAt: string | null;
  /** Body of the newest message, for the row preview. */
  preview: string | null;
  /** True when the other party has written since the admin last read this. */
  unread: boolean;
  muted: boolean;
};

function toView(
  c: ConversationModel,
  reads: Map<string, { lastReadAt: string | null; muted: boolean }>,
  myId: string | undefined,
): ConversationView {
  const vendorName = one<VendorRef>(c.vendors)?.business_name ?? null;
  const latest = c.messages?.[0] ?? null;
  const read = reads.get(c.id);

  // Unread means the *other* party spoke after our last read. A conversation the
  // admin doesn't participate in (visible via moderation.manage) has no read row,
  // so it can never nag — deliberate: it isn't their thread to answer.
  const unread =
    !!read &&
    !!latest?.created_at &&
    latest.sender_id !== myId &&
    (!read.lastReadAt || new Date(latest.created_at) > new Date(read.lastReadAt));

  return {
    id: c.id,
    title: vendorName ?? c.subject ?? titleize(c.type),
    subject: c.subject,
    type: c.type,
    status: c.status,
    lastMessageAt: c.last_message_at,
    createdAt: c.created_at,
    preview: latest?.body ?? null,
    unread,
    muted: read?.muted ?? false,
  };
}

/**
 * Inbox data + filter state. Owns everything the page needs to decide *what* to
 * render: normalised rows, the tab/type/search filters, and the live counts
 * behind the tabs and summary tiles. Master–detail UI state lives in
 * `useActiveConversation` and thread reads in `useConversationThread`, so this
 * hook stays purely about the list.
 */
export function useMessages() {
  const { user } = useAuth();
  const { data, isLoading, error } = useConversations();
  const { data: readRows, isLoading: readsLoading } = useConversationReadState(user?.id);

  const [tab, setTab] = useState<InboxTab>('active');
  const [types, setTypes] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState('');

  const reads = useMemo(
    () =>
      new Map(
        (readRows ?? []).map((r) => [
          r.conversation_id,
          { lastReadAt: r.last_read_at, muted: r.is_muted },
        ]),
      ),
    [readRows],
  );

  const all = useMemo(
    () => (data ?? []).map((c) => toView(c, reads, user?.id)),
    [data, reads, user?.id],
  );

  const counts: InboxCounts = useMemo(
    () =>
      all.reduce<InboxCounts>(
        (acc, c) => {
          acc.all += 1;
          if (c.status === 'active') acc.active += 1;
          else if (c.status === 'archived') acc.archived += 1;
          else if (c.status === 'blocked') acc.blocked += 1;
          if (c.unread) acc.unread += 1;
          return acc;
        },
        { ...EMPTY_INBOX_COUNTS },
      ),
    [all],
  );

  const query = searchInput.trim().toLowerCase();

  const rows = useMemo(() => {
    let list = tab === 'all' ? all : all.filter((c) => c.status === tab);
    if (types.length) list = list.filter((c) => types.includes(c.type));
    if (query) {
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(query) ||
          !!c.subject?.toLowerCase().includes(query) ||
          !!c.preview?.toLowerCase().includes(query),
      );
    }
    return list;
  }, [all, tab, types, query]);

  function toggleType(value: string) {
    setTypes((prev) => (prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]));
  }

  return {
    rows,
    counts,
    // Read state only tints badges, so the list renders as soon as the rows land;
    // the skeleton waits on the conversations query alone.
    isLoading,
    countsLoading: isLoading || readsLoading,
    error,
    tab,
    setTab,
    typeFilter: {
      selected: types,
      toggle: toggleType,
      clear: () => setTypes([]),
      isSelected: (value: string) => types.includes(value),
    },
    search: {
      input: searchInput,
      setInput: setSearchInput,
      clear: () => setSearchInput(''),
    },
    /** True when a filter — not an empty inbox — is what emptied the list. */
    isFiltered: !!query || types.length > 0 || tab !== 'all',
  };
}

export type TypeFilter = ReturnType<typeof useMessages>['typeFilter'];
export type SearchState = ReturnType<typeof useMessages>['search'];
