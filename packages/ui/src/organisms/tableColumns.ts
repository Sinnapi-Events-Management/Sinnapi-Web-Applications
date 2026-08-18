import { type ReactNode } from 'react';

/**
 * The column shape both table organisms share. <DataTable /> extends it with
 * `sortable`; <SimpleTable /> uses it as-is. Defining it once means a column set
 * written for one can be handed to the other unchanged.
 */
export type TableColumn<Row> = {
  /** Key used for sorting callbacks and the default cell value lookup. */
  field: string;
  headerName: ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: number | string;
  /** Custom cell renderer; defaults to String(row[field]). */
  render?: (row: Row) => ReactNode;
};

/** Resolve a cell: the column's renderer, else the row's value for `field`. */
export function cellValue<Row>(row: Row, col: TableColumn<Row>): ReactNode {
  if (col.render) return col.render(row);
  const raw = (row as Record<string, unknown>)[col.field];
  return raw == null ? '' : String(raw);
}
