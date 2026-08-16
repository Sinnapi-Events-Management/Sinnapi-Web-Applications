import { Box, Checkbox, Chip, DataTable, Typography, type DataTableColumn } from '@sinnapi/ui';
import type { ContactListContactModel } from '@/lib/types';
import type { ContactListSelectionApi } from '../../hooks/useContactListSelection';

type Props = { api: ContactListSelectionApi; disabled?: boolean };

/**
 * Who in the chosen address book receives this campaign.
 *
 * ── The header checkbox does not mean "this page" ─────────────────────────
 * It means every contact in the book matching the current search, across every
 * page — the same contract the audience picker keeps, resolved by the same RPC.
 * The label says the number out loud for exactly that reason.
 *
 * ── Suppressed contacts are shown, disabled, and labelled ─────────────────
 * They cannot be ticked and would be dropped at send time anyway. Hiding them
 * would leave a book whose contact count never matches the rows on screen, and
 * no answer to "why didn't X get this".
 */
export default function ContactListTable({ api, disabled }: Props) {
  const columns: DataTableColumn<ContactListContactModel>[] = [
    {
      field: 'select',
      headerName: (
        <Checkbox
          size="small"
          checked={api.selectAll}
          disabled={disabled}
          onChange={(e) => api.toggleAll(e.target.checked)}
          inputProps={{ 'aria-label': 'Select everyone in this address book' }}
        />
      ),
      width: 56,
      render: (row) => (
        <Checkbox
          size="small"
          checked={api.isRowSelected(row.id, row.suppressed)}
          disabled={disabled || row.suppressed}
          onChange={() => api.toggleRow(row.id)}
          // The row itself is clickable; without this the row handler would
          // immediately undo what the checkbox just did.
          onClick={(e) => e.stopPropagation()}
          inputProps={{ 'aria-label': `Select ${row.email}` }}
        />
      ),
    },
    {
      field: 'full_name',
      headerName: 'Name',
      render: (row) => (
        <Box sx={{ minWidth: 0, opacity: row.suppressed ? 0.6 : 1 }}>
          <Typography variant="body2" fontWeight={600} noWrap>
            {row.full_name}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap display="block">
            {row.email}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'suppressed',
      headerName: 'Status',
      width: 140,
      render: (row) =>
        row.suppressed ? (
          <Chip size="small" color="warning" label="Suppressed" />
        ) : (
          <Typography variant="caption" color="text.secondary">
            —
          </Typography>
        ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={api.rows}
      getRowId={(r) => r.id}
      rowCount={api.total}
      page={api.page}
      pageSize={api.pageSize}
      onPageChange={api.setPage}
      // Fixed page size: this is a picker, not a report, and a page-size control
      // here only adds a way to lose your place mid-selection.
      onPageSizeChange={() => undefined}
      pageSizeOptions={[api.pageSize]}
      loading={api.isLoading || api.isFetching}
      emptyMessage="Nobody in this address book matches."
      onRowClick={(row) => !row.suppressed && !disabled && api.toggleRow(row.id)}
      minWidth={480}
    />
  );
}
