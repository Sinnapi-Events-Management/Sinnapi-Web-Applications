import { DataTable, Alert, type DataTableColumn, type SortModel } from '@sinnapi/ui';
import { useTableState } from '@/hooks/useTableState';
import type { PageParams, Paged } from '@/lib/table';

type QueryLike<Row> = {
  data?: Paged<Row>;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
};

type Props<Row extends { id: string }> = {
  vendorId: string;
  /** One of the vendor-scoped paginated query hooks from `@/hooks/queries`. */
  useData: (id: string, params: PageParams) => QueryLike<Row>;
  columns: DataTableColumn<Row>[];
  emptyMessage: string;
  sort?: SortModel;
};

/**
 * Server-paginated table for a single vendor's related collection. Owns its own
 * page/sort state so each tab paginates independently. Generic over the row
 * type — pass any `(id, params)` query hook and its matching columns.
 */
export default function VendorRelatedTable<Row extends { id: string }>({
  vendorId,
  useData,
  columns,
  emptyMessage,
  sort = { field: 'created_at', direction: 'desc' },
}: Props<Row>) {
  const table = useTableState({ sort });
  const { data, isLoading, isFetching, error } = useData(vendorId, table.params);

  return (
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error instanceof Error ? error.message : 'Failed to load data.'}
        </Alert>
      )}
      <DataTable
        columns={columns}
        rows={data?.rows ?? []}
        getRowId={(row) => row.id}
        rowCount={data?.total ?? 0}
        loading={isLoading || isFetching}
        emptyMessage={emptyMessage}
        {...table.controls}
      />
    </>
  );
}
