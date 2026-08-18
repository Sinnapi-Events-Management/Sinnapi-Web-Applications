import { Box, Checkbox, DataTable, Typography, type DataTableColumn } from '@sinnapi/ui';
import type { ImportedContactRow } from '../../hooks/useContactImport';
import type { ImportedRecipientsApi } from '../../hooks/useImportedRecipients';
import type { ImportPreviewApi } from '../../hooks/useImportPreview';

type Props = {
  api: ImportedRecipientsApi;
  preview: ImportPreviewApi;
  disabled?: boolean;
};

/**
 * The name-and-address pairs the file yielded, exactly as they will be sent.
 *
 * ── Two columns, because two columns is all a campaign has ────────────────
 * Whatever else the spreadsheet held — company, phone, the account manager's
 * initials — is gone by the time it reaches here. Showing the file's other
 * columns would suggest they travel with the send; they do not, and the note
 * under the table names them instead.
 *
 * ── The values shown are the normalised ones ──────────────────────────────
 * "ADA@X.COM " in the sheet appears here as `ada@x.com`, because that is the
 * address that will be mailed and de-duplicated against. A preview that showed
 * the raw cell would be a preview of the file rather than of the send, and the
 * two differ in exactly the cases worth catching.
 *
 * ── Unticking greys the row rather than removing it ───────────────────────
 * The row count has to keep matching the file the operator is holding. A row
 * that disappears when unticked leaves them counting a list that no longer
 * agrees with their spreadsheet, and no way back to a person they excluded by
 * mis-click.
 */
export default function ImportPreviewTable({ api, preview, disabled }: Props) {
  const columns: DataTableColumn<ImportedContactRow>[] = [
    {
      field: 'select',
      headerName: (
        <Checkbox
          size="small"
          checked={api.allSelected}
          indeterminate={api.someSelected}
          disabled={disabled}
          onChange={(e) => api.toggleAll(e.target.checked)}
          inputProps={{ 'aria-label': 'Include every row from this file' }}
        />
      ),
      width: 56,
      render: (row) => (
        <Checkbox
          size="small"
          checked={api.isRowSelected(row.contact.email)}
          disabled={disabled}
          onChange={() => api.toggleRow(row.contact.email)}
          // The row itself is clickable; without this the row handler would
          // immediately undo what the checkbox just did.
          onClick={(e) => e.stopPropagation()}
          inputProps={{ 'aria-label': `Include ${row.contact.email}` }}
        />
      ),
    },
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
      field: 'full_name',
      headerName: 'Name',
      render: (row) => (
        <Box sx={{ minWidth: 0, opacity: api.isRowSelected(row.contact.email) ? 1 : 0.5 }}>
          <Typography variant="body2" fontWeight={600} noWrap>
            {row.contact.full_name}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'email',
      headerName: 'Email',
      render: (row) => (
        <Typography
          variant="body2"
          color="text.secondary"
          noWrap
          sx={{ opacity: api.isRowSelected(row.contact.email) ? 1 : 0.5 }}
        >
          {row.contact.email}
        </Typography>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={preview.acceptedPage}
      getRowId={(r) => r.contact.email}
      rowCount={preview.acceptedCount}
      page={preview.page}
      pageSize={preview.pageSize}
      onPageChange={preview.setPage}
      // Fixed page size — see `useImportPreview`.
      onPageSizeChange={() => undefined}
      pageSizeOptions={[preview.pageSize]}
      size="small"
      emptyMessage="No complete contacts in this file."
      onRowClick={(row) => !disabled && api.toggleRow(row.contact.email)}
      minWidth={520}
    />
  );
}
