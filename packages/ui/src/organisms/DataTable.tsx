'use client';
import { type ReactNode } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Skeleton,
  Typography,
  LinearProgress,
} from '@mui/material';

export type SortDirection = 'asc' | 'desc';
export type SortModel = { field: string; direction: SortDirection } | null;

export type DataTableColumn<Row> = {
  /** Key used for sorting callbacks and the default cell value lookup. */
  field: string;
  headerName: ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: number | string;
  /** Custom cell renderer; defaults to String(row[field]). */
  render?: (row: Row) => ReactNode;
};

export type DataTableProps<Row> = {
  columns: DataTableColumn<Row>[];
  rows: Row[];
  getRowId: (row: Row) => string | number;

  /* ---- server-side pagination (fully controlled by the parent) ---- */
  /** Total row count across all pages (e.g. Supabase `count`). */
  rowCount: number;
  /** Zero-based current page. */
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];

  /* ---- server-side sorting (optional) ---- */
  sortModel?: SortModel;
  onSortChange?: (sort: SortModel) => void;

  loading?: boolean;
  onRowClick?: (row: Row) => void;
  emptyMessage?: ReactNode;
  /** Skeleton rows shown while the first page loads. */
  loadingRows?: number;
  size?: 'small' | 'medium';
  stickyHeader?: boolean;
  /**
   * Minimum table width before the container scrolls horizontally. Keeps
   * dense tables legible on small screens instead of squashing columns.
   */
  minWidth?: number | string;
};

function cellValue<Row>(row: Row, col: DataTableColumn<Row>): ReactNode {
  if (col.render) return col.render(row);
  const raw = (row as Record<string, unknown>)[col.field];
  return raw == null ? '' : String(raw);
}

/**
 * Controlled, server-side paginated table. It owns no data-fetching: the parent
 * supplies `rows`/`rowCount` for the current page and reacts to page/sort changes
 * (see the package README for the Supabase + react-query wiring).
 */
export function DataTable<Row>({
  columns,
  rows,
  getRowId,
  rowCount,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  sortModel = null,
  onSortChange,
  loading = false,
  onRowClick,
  emptyMessage = 'No results.',
  loadingRows = 5,
  size = 'medium',
  stickyHeader = false,
  minWidth = 640,
}: DataTableProps<Row>) {
  const sortingEnabled = Boolean(onSortChange);
  const isInitialLoad = loading && rows.length === 0;

  function handleSort(field: string) {
    if (!onSortChange) return;
    const isActive = sortModel?.field === field;
    const nextDirection: SortDirection =
      isActive && sortModel?.direction === 'asc' ? 'desc' : 'asc';
    onSortChange({ field, direction: nextDirection });
  }

  return (
    <Paper variant="outlined">
      <Box sx={{ position: 'relative' }}>
        {/* Subtle progress bar for refetches when rows are already visible. */}
        {loading && !isInitialLoad && (
          <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2 }} />
        )}
        <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
          <Table size={size} stickyHeader={stickyHeader} sx={{ minWidth }}>
            <TableHead>
              <TableRow>
                {columns.map((col) => {
                  const active = sortModel?.field === col.field;
                  const canSort = sortingEnabled && col.sortable === true;
                  return (
                    <TableCell
                      key={col.field}
                      align={col.align}
                      sx={{
                        width: col.width,
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        // Standout header: tinted band + stronger text so the
                        // header row is clearly separated from the body.
                        bgcolor: 'action.hover',
                        color: 'text.primary',
                        borderBottom: 2,
                        borderColor: 'divider',
                      }}
                      sortDirection={active ? sortModel?.direction : false}
                    >
                      {canSort ? (
                        <TableSortLabel
                          active={active}
                          direction={active ? sortModel?.direction : 'asc'}
                          onClick={() => handleSort(col.field)}
                        >
                          {col.headerName}
                        </TableSortLabel>
                      ) : (
                        col.headerName
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableHead>

            <TableBody>
              {isInitialLoad &&
                Array.from({ length: loadingRows }).map((_, r) => (
                  <TableRow key={`skeleton-${r}`}>
                    {columns.map((col) => (
                      <TableCell key={col.field} align={col.align}>
                        <Skeleton variant="text" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {!isInitialLoad && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center" sx={{ py: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      {emptyMessage}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}

              {!isInitialLoad &&
                rows.map((row) => (
                  <TableRow
                    key={getRowId(row)}
                    hover={Boolean(onRowClick)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    sx={onRowClick ? { cursor: 'pointer' } : undefined}
                  >
                    {columns.map((col) => (
                      <TableCell key={col.field} align={col.align} sx={{ width: col.width }}>
                        {cellValue(row, col)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <TablePagination
        component="div"
        count={rowCount}
        page={page}
        rowsPerPage={pageSize}
        rowsPerPageOptions={pageSizeOptions}
        onPageChange={(_, newPage) => onPageChange(newPage)}
        onRowsPerPageChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
      />
    </Paper>
  );
}
