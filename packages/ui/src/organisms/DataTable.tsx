'use client';
import { type ReactNode } from 'react';
import { cellValue, type TableColumn } from './tableColumns';
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
  Pagination,
  Stack,
  useMediaQuery,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';

export type SortDirection = 'asc' | 'desc';
export type SortModel = { field: string; direction: SortDirection } | null;

export type { TableColumn };

/** A `TableColumn` that can additionally opt into server-side sorting. */
export type DataTableColumn<Row> = TableColumn<Row> & { sortable?: boolean };

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
  /**
   * Below `md`, render each row as this card instead of a table row — a list
   * of tappable cards with page buttons underneath. Return a `RecordCard`.
   * Omit to keep the table (scrolling sideways) at every width.
   */
  renderCard?: (row: Row) => ReactNode;
};

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
  renderCard,
}: DataTableProps<Row>) {
  const sortingEnabled = Boolean(onSortChange);
  const isInitialLoad = loading && rows.length === 0;
  const compact = useMediaQuery((t: Theme) => t.breakpoints.down('md'));

  if (renderCard && compact) {
    const pages = Math.ceil(rowCount / pageSize);
    return (
      <Stack spacing={1.25}>
        {isInitialLoad &&
          Array.from({ length: Math.min(loadingRows, 3) }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={84} />
          ))}
        {!isInitialLoad && rows.length === 0 && (
          <Paper variant="outlined" sx={{ py: 6, px: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" component="div">
              {emptyMessage}
            </Typography>
          </Paper>
        )}
        {!isInitialLoad && rows.map((row) => <Box key={getRowId(row)}>{renderCard(row)}</Box>)}
        {pages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1 }}>
            <Pagination count={pages} page={page + 1} onChange={(_, p) => onPageChange(p - 1)} />
          </Box>
        )}
      </Stack>
    );
  }

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
        {/* Outside the table on purpose: inside it, the message is centred on
            the table's `minWidth`, so on a phone it sits half off-screen. */}
        {!isInitialLoad && rows.length === 0 && (
          <Box sx={{ py: 6, px: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" component="div">
              {emptyMessage}
            </Typography>
          </Box>
        )}
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
