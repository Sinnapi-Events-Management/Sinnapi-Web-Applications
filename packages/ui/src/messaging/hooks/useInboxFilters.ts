'use client';
import { useCallback, useMemo, useState } from 'react';
import type { ConversationView } from '../types';

/**
 * Tab / type / search filtering for an inbox, shared by all three portals.
 *
 * Filtering runs in the browser rather than the query. An inbox is bounded by
 * how many people you have actually talked to — tens, not thousands — RLS has
 * already scoped the rows to yours, and a round trip per keystroke would make
 * search feel worse than the list it is searching. If an operator inbox ever
 * outgrows that, the fix is a server-side search RPC behind this same
 * interface, not a different component.
 */

export type InboxTab = 'active' | 'archived' | 'blocked' | 'all';

export type InboxCounts = Record<InboxTab, number> & { unread: number };

export const EMPTY_INBOX_COUNTS: InboxCounts = {
  active: 0,
  archived: 0,
  blocked: 0,
  all: 0,
  unread: 0,
};

export type UseInboxFiltersOptions<T extends ConversationView> = {
  conversations: T[];
  defaultTab?: InboxTab;
};

/**
 * Generic over the row type so a portal can carry extra fields through the
 * filters untouched — the admin queue adds `isObserver`, which decides whether
 * the thread pane offers a composer or an invitation to join. Narrowing to
 * `ConversationView` here would strip that on the way out and force a cast at
 * every call site.
 */
export function useInboxFilters<T extends ConversationView>({
  conversations,
  defaultTab = 'active',
}: UseInboxFiltersOptions<T>) {
  const [tab, setTab] = useState<InboxTab>(defaultTab);
  const [types, setTypes] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState('');

  // Counts are over everything, not over the filtered view — a tab whose count
  // only reflected the current search would drop to zero as you typed.
  const counts: InboxCounts = useMemo(
    () =>
      conversations.reduce<InboxCounts>(
        (acc, c) => {
          acc.all += 1;
          if (c.status === 'active') acc.active += 1;
          else if (c.status === 'archived') acc.archived += 1;
          else if (c.status === 'blocked') acc.blocked += 1;
          acc.unread += c.muted ? 0 : c.unreadCount;
          return acc;
        },
        { ...EMPTY_INBOX_COUNTS },
      ),
    [conversations],
  );

  const query = searchInput.trim().toLowerCase();

  const rows = useMemo(() => {
    let list = tab === 'all' ? conversations : conversations.filter((c) => c.status === tab);
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
  }, [conversations, tab, types, query]);

  const toggleType = useCallback((value: string) => {
    setTypes((prev) => (prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]));
  }, []);

  const clearAll = useCallback(() => {
    setTypes([]);
    setSearchInput('');
    setTab('all');
  }, []);

  return {
    rows,
    counts,
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
    clearAll,
    /** True when a filter — not an empty inbox — is what emptied the list. */
    isFiltered: !!query || types.length > 0 || tab !== 'all',
  };
}

export type InboxFilters = ReturnType<typeof useInboxFilters>;
