'use client';
import { type ReactNode } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { cellValue, type TableColumn } from './tableColumns';

export type SimpleTableColumn<Row> = TableColumn<Row>;

export type SimpleTableProps<Row> = {
  columns: SimpleTableColumn<Row>[];
  rows: Row[];
  getRowId: (row: Row) => string | number;
  /**
   * Line-item tables (a quotation's items, an invoice breakdown) read as a
   * list of facts rather than a grid, so the header band is optional.
   */
  hideHeader?: boolean;
  /** Trailing row — totals, a subtotal breakdown — rendered below the body. */
  footer?: ReactNode;
  emptyMessage?: ReactNode;
  size?: 'small' | 'medium';
  /** Width below which the table scrolls horizontally instead of squashing. */
  minWidth?: number | string;
};

/**
 * A presentational table for content that is already fully loaded — quotation
 * line items, summary breakdowns, short embedded lists.
 *
 * The counterpart to <DataTable />: same column contract (`TableColumn`, so a
 * column set is portable between the two) and the same header treatment, but no
 * pagination, sorting, loading or surface of its own. Anything server-paginated
 * belongs in <DataTable /> instead — that is what keeps the portals consistent.
 * Wrap this in whatever surface the context calls for (usually a Card).
 */
export function SimpleTable<Row>({
  columns,
  rows,
  getRowId,
  hideHeader = false,
  footer,
  emptyMessage = 'Nothing to show.',
  size = 'small',
  minWidth,
}: SimpleTableProps<Row>) {
  return (
    <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
      <Table size={size} sx={{ minWidth }}>
        {!hideHeader && (
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell
                  key={col.field}
                  align={col.align}
                  sx={{
                    width: col.width,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    bgcolor: 'action.hover',
                    color: 'text.primary',
                    borderBottom: 2,
                    borderColor: 'divider',
                  }}
                >
                  {col.headerName}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
        )}

        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
                <Box sx={{ color: 'text.secondary', typography: 'body2' }}>{emptyMessage}</Box>
              </TableCell>
            </TableRow>
          )}

          {rows.map((row) => (
            <TableRow key={getRowId(row)}>
              {columns.map((col) => (
                <TableCell key={col.field} align={col.align} sx={{ width: col.width }}>
                  {cellValue(row, col)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>

        {footer}
      </Table>
    </TableContainer>
  );
}
