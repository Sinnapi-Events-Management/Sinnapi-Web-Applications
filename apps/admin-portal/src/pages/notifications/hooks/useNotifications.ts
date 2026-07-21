import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNotifications as useNotificationsQuery, useUnreadCount } from '@/hooks/queries';
import { supabase } from '@/lib/supabase';
import type { NotificationModel } from '@/lib/types';
import {
  resolveDomain,
  notificationHeadline,
  groupByDay,
  type NotificationDomain,
  type NotificationCounts,
  type NotificationTab,
  type DayGroup,
} from '../schema';

/**
 * Flattened, display-ready notification. Resolving the domain and headline here
 * keeps trigger-key parsing out of the components — a row renders what it is
 * given.
 */
export type NotificationView = {
  id: string;
  /** Humanised title, never a raw trigger key. */
  headline: string;
  body: string | null;
  triggerKey: string;
  domain: NotificationDomain;
  channel: string;
  data: Record<string, unknown> | null;
  createdAt: string | null;
  readAt: string | null;
  unread: boolean;
};

function toView(n: NotificationModel): NotificationView {
  return {
    id: n.id,
    headline: notificationHeadline(n.trigger_key, n.title),
    body: n.body,
    triggerKey: n.trigger_key,
    domain: resolveDomain(n.trigger_key),
    channel: n.channel,
    data: n.data,
    createdAt: n.created_at,
    readAt: n.read_at,
    unread: !n.read_at,
  };
}

/**
 * Feed data, filters and paging. Owns everything the page needs to decide *what*
 * to render; master–detail UI state lives in `useActiveNotification` so this hook
 * stays purely about the list.
 *
 * Counts come from the server (the feed query's exact count and the shared
 * unread head-count) rather than from the loaded pages, so the tiles and tab
 * badges describe the whole feed even when only the first page is in hand. The
 * *list* is still filtered client-side over what is loaded — which is why the
 * toolbar reports "showing N of M" and offers Load more.
 */
export function useNotifications() {
  const qc = useQueryClient();
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useNotificationsQuery();
  const { data: unreadCount = 0, isLoading: unreadLoading } = useUnreadCount();

  const [tab, setTab] = useState<NotificationTab>('all');
  const [domains, setDomains] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [markingAll, setMarkingAll] = useState(false);

  const all = useMemo(() => (data?.pages ?? []).flatMap((p) => p.rows).map(toView), [data?.pages]);

  const total = data?.pages[0]?.total ?? 0;

  const counts: NotificationCounts = useMemo(
    // `read` is derived rather than counted: one fewer round trip, and it can't
    // disagree with the two exact figures it is built from. Clamped because the
    // two counts are separate requests and can briefly straddle a new arrival.
    () => ({ all: total, unread: unreadCount, read: Math.max(0, total - unreadCount) }),
    [total, unreadCount],
  );

  const query = searchInput.trim().toLowerCase();

  const rows = useMemo(() => {
    let list = all;
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
  }, [all, tab, domains, query]);

  const groups: DayGroup<NotificationView>[] = useMemo(() => groupByDay(rows), [rows]);

  // Chips are offered for domains that actually occur, so the row never shows a
  // filter that can only return nothing. Derived from `all`, not `rows` — using
  // the filtered list would make a chip erase its own siblings on click.
  const availableDomains = useMemo(() => new Set(all.map((n) => n.domain.key)), [all]);

  function toggleDomain(value: string) {
    setDomains((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value],
    );
  }

  async function markAll() {
    setMarkingAll(true);
    try {
      await supabase.rpc('mark_all_notifications_read');
      // Both keys: the feed drives this page, `unread` the sidebar badge.
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['notifications'] }),
        qc.invalidateQueries({ queryKey: ['unread'] }),
      ]);
    } finally {
      setMarkingAll(false);
    }
  }

  return {
    rows,
    groups,
    counts,
    availableDomains,
    isLoading,
    countsLoading: isLoading || unreadLoading,
    error,
    tab,
    setTab,
    domainFilter: {
      selected: domains,
      toggle: toggleDomain,
      clear: () => setDomains([]),
      isSelected: (value: string) => domains.includes(value),
    },
    search: {
      input: searchInput,
      setInput: setSearchInput,
      clear: () => setSearchInput(''),
    },
    paging: {
      loaded: all.length,
      total,
      hasMore: !!hasNextPage,
      loadingMore: isFetchingNextPage,
      loadMore: () => void fetchNextPage(),
    },
    markAll,
    markingAll,
    /** True when a filter — not an empty feed — is what emptied the list. */
    isFiltered: !!query || domains.length > 0 || tab !== 'all',
  };
}

export type DomainFilter = ReturnType<typeof useNotifications>['domainFilter'];
export type SearchState = ReturnType<typeof useNotifications>['search'];
export type PagingState = ReturnType<typeof useNotifications>['paging'];
