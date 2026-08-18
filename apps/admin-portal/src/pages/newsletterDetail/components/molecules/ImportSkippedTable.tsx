import { Chip, DataTable, Typography, type DataTableColumn } from '@sinnapi/ui';
import type { ImportRejection } from '../../hooks/useContactImport';
import type { ImportPreviewApi } from '../../hooks/useImportPreview';
import { IMPORT_REJECTION_LABELS, type ImportRejectionReason } from '../../schema';

type Props = { preview: ImportPreviewApi };

/** A missing name is a fixable omission; a broken address is a typo. */
const COLOR: Record<ImportRejectionReason, 'warning' | 'error'> = {
  'no-email': 'error',
  'invalid-email': 'error',
  'no-name': 'warning',
};

/**
 * The rows that held something but produced no contact.
 *
 * ── Why every one of them, paged, rather than the first few ───────────────
 * A file of 400 rows that yields 380 contacts raises exactly one question, and
 * the operator has to be able to answer it before sending. "Row 7, row 12 and
 * 16 more" answers it for two people. The row number is the whole point of the
 * column: the fix happens in Excel, and this is the coordinate to fix.
 *
 * ── Why the offending value is shown ──────────────────────────────────────
 * "Row 44 — no name" sends somebody hunting; "row 44 — ada@x.com — no name"
 * usually ends the hunt on the spot, because the address is enough to recognise
 * the person whose name cell is blank.
 */
export default function ImportSkippedTable({ preview }: Props) {
  const columns: DataTableColumn<ImportRejection>[] = [
    {
      field: 'row',
      headerName: 'Row',
      width: 72,
      align: 'right',
      render: (row) => (
        <Typography variant="caption" color="text.secondary">
          {row.row}
        </Typography>
      ),
    },
    {
      field: 'value',
      headerName: 'In the file',
      render: (row) => (
        <Typography variant="body2" noWrap>
          {row.value || <em>(blank)</em>}
        </Typography>
      ),
    },
    {
      field: 'reason',
      headerName: 'Why it was skipped',
      width: 200,
      render: (row) => (
        <Chip size="small" color={COLOR[row.reason]} label={IMPORT_REJECTION_LABELS[row.reason]} />
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={preview.rejectedPage}
      getRowId={(r) => r.row}
      rowCount={preview.rejectedCount}
      page={preview.page}
      pageSize={preview.pageSize}
      onPageChange={preview.setPage}
      onPageSizeChange={() => undefined}
      pageSizeOptions={[preview.pageSize]}
      size="small"
      emptyMessage="Every row in this file became a contact."
      minWidth={480}
    />
  );
}
