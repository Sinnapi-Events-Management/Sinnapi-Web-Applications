'use client';
import { useMemo, useState } from 'react';
import type { SortModel } from '../organisms/DataTable';
import type { PageFilters, PageParams } from './table';
import { useThrottledValue } from './timing';

export type TableState = {
  /** Params to hand to a paginated query. */
  params: PageParams;
  /** Props to spread onto <DataTable /> for pagination + sorting control. */
  controls: {
    page: number;
    pageSize: number;
    sortModel: SortModel;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
    onSortChange: (sort: SortModel) => void;
  };
};

/**
 * Owns page / pageSize / sort state for a server-paginated table. Keeps page
 * hooks tiny: read `params` for the query, spread `controls` onto <DataTable/>.
 * Changing sort or page size resets to the first page.
 *
 * `filters` (e.g. `useListFilters().query`) rides along into `params.filters`,
 * and a change to it also returns to the first page. The reset happens during
 * render, not in an effect, so the query never fires for "page 4 of the new
 * filters" — a page that may not exist — before snapping back.
 *
 * `throttleMs` (opt-in; e.g. `LIST_TIMING.pageThrottleMs`) paces `params` —
 * what the query reads — while `controls` stay instant, so the pager shows the
 * page clicked at once and a run of rapid "next" clicks costs one request per
 * window instead of one per click. Leading edge: a lone click never waits.
 * Off by default, so existing lists are unchanged.
 *
 * Shared by all three portals so a list behaves the same wherever it lives.
 */
export function useTableState(opts?: {
  pageSize?: number;
  sort?: SortModel;
  filters?: PageFilters;
  throttleMs?: number;
}): TableState {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(opts?.pageSize ?? 25);
  const [sort, setSort] = useState<SortModel>(opts?.sort ?? null);

  const filters = opts?.filters;
  const filtersKey = filters ? JSON.stringify(filters) : '';
  const [seenFiltersKey, setSeenFiltersKey] = useState(filtersKey);
  if (seenFiltersKey !== filtersKey) {
    // React's sanctioned "adjust state while rendering" pattern.
    setSeenFiltersKey(filtersKey);
    if (page !== 0) setPage(0);
  }

  const liveParams = useMemo<PageParams>(
    () => ({ page, pageSize, sort, ...(filters ? { filters } : {}) }),
    // `filtersKey` stands in for `filters`: same content, same params.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page, pageSize, sort, filtersKey],
  );
  const params = useThrottledValue(liveParams, opts?.throttleMs ?? 0);

  return useMemo(
    () => ({
      params,
      controls: {
        page,
        pageSize,
        sortModel: sort,
        onPageChange: setPage,
        onPageSizeChange: (next: number) => {
          setPageSize(next);
          setPage(0);
        },
        onSortChange: (next: SortModel) => {
          setSort(next);
          setPage(0);
        },
      },
    }),
    [params, page, pageSize, sort],
  );
}
