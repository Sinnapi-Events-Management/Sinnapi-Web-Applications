import { useCallback, useMemo, useState } from 'react';
import { useContactListContacts } from '@/hooks/queries';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { ContactListModel } from '@/lib/types';

export type ContactListSelectionApi = ReturnType<typeof useContactListSelection>;

const PAGE_SIZE = 10;

/**
 * Picking people out of one saved address book.
 *
 * ── The selection model is the audience picker's, for the audience picker's
 *    reason ───────────────────────────────────────────────────────────────
 * An address book can hold thousands of contacts and is shown ten at a time, so
 * "select everyone" cannot be a set of ticked ids — the browser only has the
 * page it loaded, and a UI that posts its ticks posts ten people while claiming
 * four thousand. So selection is a MODE plus a delta, exactly as
 * `useCampaignAudience` models the audience:
 *
 *   selectAll = true    every contact in the list matching the current search,
 *                       minus `excluded`. Unticking a row adds to `excluded`.
 *   selectAll = false   exactly `selected`. Entered by unticking the header box.
 *
 * Both, plus the search term, go to `admin_newsletter_queue`, which resolves
 * them against `newsletter_contacts` server-side. The names come from the same
 * rows, so nothing has to be shipped up from the browser and nothing can drift
 * between what was shown and what is mailed.
 *
 * ── Search narrows the selection on purpose ───────────────────────────────
 * With a term active, "all" means all MATCHING, which is what makes one big
 * address book usable as several segments ("everyone from the Kampala expo").
 * That is why the term is part of the queue payload and not just a view filter.
 */
export function useContactListSelection() {
  const [list, setList] = useState<ContactListModel | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput, 300).trim() || undefined;
  const [page, setPage] = useState(0);

  const [selectAll, setSelectAll] = useState(true);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading, isFetching, error } = useContactListContacts({
    listId: list?.id ?? null,
    search,
    page,
    pageSize: PAGE_SIZE,
  });

  /** Switching books resets everything downstream of the choice. */
  const chooseList = useCallback((next: ContactListModel | null) => {
    setList(next);
    setSearchInput('');
    setPage(0);
    setSelectAll(true);
    setExcluded(new Set());
    setSelected(new Set());
  }, []);

  const onSearchChange = useCallback((next: string) => {
    setSearchInput(next);
    setPage(0);
  }, []);

  const isRowSelected = useCallback(
    (contactId: string, suppressed: boolean) => {
      if (suppressed) return false;
      return selectAll ? !excluded.has(contactId) : selected.has(contactId);
    },
    [selectAll, excluded, selected],
  );

  const toggleRow = useCallback(
    (contactId: string) => {
      const flip = (prev: Set<string>) => {
        const next = new Set(prev);
        if (next.has(contactId)) next.delete(contactId);
        else next.add(contactId);
        return next;
      };
      if (selectAll) setExcluded(flip);
      else setSelected(flip);
    },
    [selectAll],
  );

  /** The header checkbox: on → everyone matching, off → nobody, pick manually. */
  const toggleAll = useCallback((next: boolean) => {
    setSelectAll(next);
    setExcluded(new Set());
    setSelected(new Set());
  }, []);

  const matching = data?.total ?? 0;

  /**
   * How many of this book are going to be mailed.
   *
   * In select-all mode this is the server's count of matching contacts minus
   * the ones unticked — never the length of anything the browser holds, which
   * would be the page size. Suppressed contacts are still counted here: the
   * queue drops them and reports them back as skipped, and a count that
   * pre-empted that would disagree with the confirmation dialog.
   */
  const selectedCount = useMemo(() => {
    if (!list) return 0;
    if (!selectAll) return selected.size;
    return Math.max(matching - excluded.size, 0);
  }, [list, selectAll, selected.size, matching, excluded.size]);

  return {
    list,
    chooseList,

    rows: data?.rows ?? [],
    total: matching,
    isLoading,
    isFetching,
    error: error instanceof Error ? error.message : null,

    searchInput,
    onSearchChange,
    page,
    pageSize: PAGE_SIZE,
    setPage,

    selectAll,
    toggleAll,
    isRowSelected,
    toggleRow,
    selectedCount,

    /** The slice of `admin_newsletter_queue`'s arguments this hook owns. */
    queueArgs: {
      p_list_id: list?.id ?? null,
      p_list_select_all: selectAll,
      p_list_search: search ?? null,
      p_list_contact_ids: selectAll ? null : Array.from(selected),
      p_list_excluded_ids: selectAll ? Array.from(excluded) : null,
    },
  };
}
