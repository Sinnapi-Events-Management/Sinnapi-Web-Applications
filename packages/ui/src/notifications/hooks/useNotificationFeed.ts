'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { groupNotificationsByDay } from '../schema/grouping';
import type { NotificationDayGroup, NotificationTab, NotificationView } from '../types';

export type NotificationDomainFilter = {
  selected: string[];
  toggle: (key: string) => void;
  clear: () => void;
  isSelected: (key: string) => boolean;
};

export type NotificationSearchState = {
  input: string;
  setInput: (next: string) => void;
  clear: () => void;
};

export type NotificationSelection = {
  ids: string[];
  count: number;
  /** True once anything is selected — the list switches to selection mode. */
  active: boolean;
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  /** Select every currently visible row; deselect them all if already complete. */
  toggleAll: () => void;
  /** True when every visible row is selected and there is at least one. */
  allSelected: boolean;
  clear: () => void;
};

export type NotificationFeedState = {
  /** Visible rows, after tab + domain + search. */
  rows: NotificationView[];
  groups: NotificationDayGroup[];
  tab: NotificationTab;
  setTab: (next: NotificationTab) => void;
  domainFilter: NotificationDomainFilter;
  search: NotificationSearchState;
  selection: NotificationSelection;
  /** Domain keys occurring in the loaded feed — the chips worth offering. */
  availableDomains: Set<string>;
  /** True when a filter — not an empty feed — is what emptied the list. */
  isFiltered: boolean;
};

/**
 * Filtering, day-grouping and multi-select over a loaded feed.
 *
 * Pure view state: it holds no query, fires no request, and is given the rows it
 * works on. That is what lets the client and vendor portals — which fetch
 * through their own `queries.ts` with their own Supabase client — share one
 * behaviour, and what makes this testable without a network at all.
 *
 * Filtering is client-side over the loaded pages by design. Pushing tab and
 * search into the query would make every keystroke a round trip and every count
 * disagree with what is on screen; the toolbar instead reports "N shown"
 * honestly and Load more remains available underneath.
 */
export function useNotificationFeed(notifications: NotificationView[]): NotificationFeedState {
  const [tab, setTab] = useState<NotificationTab>('all');
  const [domains, setDomains] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const query = searchInput.trim().toLowerCase();

  const rows = useMemo(() => {
    let list = notifications;
    if (tab === 'unread') list = list.filter((n) => n.unread);
    else if (tab === 'read') list = list.filter((n) => !n.unread);
    if (domains.length) list = list.filter((n) => domains.includes(n.domain.key));
    if (query) {
      list = list.filter(
        (n) =>
          n.headline.toLowerCase().includes(query) ||
          !!n.body?.toLowerCase().includes(query) ||
          n.triggerKey.toLowerCase().includes(query),
      );
    }
    return list;
  }, [notifications, tab, domains, query]);

  const groups = useMemo(() => groupNotificationsByDay(rows), [rows]);

  // Chips are offered for domains that actually occur, so the row never shows a
  // filter that can only return nothing. Derived from the full feed, not from
  // `rows` — using the filtered list would make a chip erase its own siblings
  // the moment it was clicked.
  const availableDomains = useMemo(
    () => new Set(notifications.map((n) => n.domain.key)),
    [notifications],
  );

  // A selected row that scrolls out of the filter is no longer something the
  // user can see they have selected, and acting on it would surprise them.
  // Pruning keeps the count and the checkboxes describing the same set.
  const visibleIds = useMemo(() => new Set(rows.map((n) => n.id)), [rows]);
  const visibleRef = useRef(visibleIds);
  visibleRef.current = visibleIds;

  useEffect(() => {
    setSelectedIds((prev) => {
      const next = prev.filter((id) => visibleIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [visibleIds]);

  const toggleDomain = useCallback((key: string) => {
    setDomains((prev) => (prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key]));
  }, []);

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const toggleAll = useCallback(() => {
    const ids = [...visibleRef.current];
    setSelectedIds((prev) => (prev.length >= ids.length && ids.length > 0 ? [] : ids));
  }, []);

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  const selection: NotificationSelection = {
    ids: selectedIds,
    count: selectedIds.length,
    active: selectedIds.length > 0,
    isSelected: (id: string) => selectedIds.includes(id),
    toggle: toggleSelected,
    toggleAll,
    allSelected: rows.length > 0 && selectedIds.length === rows.length,
    clear: clearSelection,
  };

  return {
    rows,
    groups,
    tab,
    setTab,
    domainFilter: {
      selected: domains,
      toggle: toggleDomain,
      clear: () => setDomains([]),
      isSelected: (key: string) => domains.includes(key),
    },
    search: {
      input: searchInput,
      setInput: setSearchInput,
      clear: () => setSearchInput(''),
    },
    selection,
    availableDomains,
    isFiltered: !!query || domains.length > 0 || tab !== 'all',
  };
}
