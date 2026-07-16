import { useMemo, useState } from 'react';
import type { SortModel } from '@sinnapi/ui';
import type { PageParams } from '@/lib/table';

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
 */
export function useTableState(opts?: { pageSize?: number; sort?: SortModel }): TableState {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(opts?.pageSize ?? 25);
  const [sort, setSort] = useState<SortModel>(opts?.sort ?? null);

  return useMemo(
    () => ({
      params: { page, pageSize, sort },
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
    [page, pageSize, sort],
  );
}
