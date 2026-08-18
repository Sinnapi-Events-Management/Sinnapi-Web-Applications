import {
  Alert,
  Box,
  Checkbox,
  DataTable,
  SearchField,
  Stack,
  Typography,
  type DataTableColumn,
} from '@sinnapi/ui';
import type { AudienceApi } from '../../hooks/useCampaignAudience';
import type { NewsletterAudienceRow } from '@/lib/types';
import ConsentReasonChip from '../molecules/ConsentReasonChip';

type Props = { api: AudienceApi; disabled?: boolean };

/**
 * The pickable audience table.
 *
 * ── The header checkbox does not mean "this page" ──────────────────────────
 * It means every eligible person matching the current audience and search,
 * across every page — which is the only reading that matches the operator's
 * intent and the only one the queue RPC implements. Its label says the number
 * out loud for exactly that reason: a "select all" that quietly meant 25 rows
 * would be indistinguishable from this one right up until the send.
 *
 * ── Ineligible rows are shown, disabled, with a reason ─────────────────────
 * Filtering them out would leave the operator with a list that does not match
 * any count they can see, and no way to answer "why isn't X getting this".
 */
export default function AudiencePicker({ api, disabled }: Props) {
  const columns: DataTableColumn<NewsletterAudienceRow>[] = [
    {
      field: 'select',
      headerName: (
        <Checkbox
          size="small"
          checked={api.selectAll}
          disabled={disabled}
          onChange={(e) => api.toggleAll(e.target.checked)}
          inputProps={{ 'aria-label': 'Select everyone matching' }}
        />
      ),
      width: 56,
      render: (row) => (
        <Checkbox
          size="small"
          checked={api.isRowSelected(row.profile_id, row.eligible)}
          disabled={disabled || !row.eligible}
          onChange={() => api.toggleRow(row.profile_id)}
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
        <Box sx={{ minWidth: 0, opacity: row.eligible ? 1 : 0.6 }}>
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
      field: 'reason',
      headerName: 'Consent',
      render: (row) => <ConsentReasonChip reason={row.reason} />,
    },
  ];

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
        <Box sx={{ flex: 1 }}>
          <SearchField
            value={api.searchInput}
            onChange={api.onSearchChange}
            onClear={() => api.onSearchChange('')}
            placeholder="Search by name or email…"
            ariaLabel="Search the audience"
          />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
          {api.audienceSelectedCount.toLocaleString()} selected
        </Typography>
      </Stack>

      {api.selectAll && (
        <Alert severity="info">
          Everyone who can be mailed{api.searchInput ? ' and matches your search' : ''} is selected
          — <strong>{api.audienceSelectedCount.toLocaleString()} people</strong>, not just the rows
          on this page. Untick anyone you want to leave out, or untick the header box to start from
          an empty selection.
        </Alert>
      )}

      {api.error && <Alert severity="error">{api.error}</Alert>}

      <DataTable
        columns={columns}
        rows={api.rows}
        getRowId={(r) => r.profile_id}
        rowCount={api.total}
        page={api.page}
        pageSize={api.pageSize}
        onPageChange={api.setPage}
        // Fixed page size: this table is a picker, not a report, and a page-size
        // control here only adds a way to lose your place mid-selection.
        onPageSizeChange={() => undefined}
        pageSizeOptions={[api.pageSize]}
        loading={api.isLoading || api.isFetching}
        emptyMessage="Nobody in this audience matches."
        onRowClick={(row) => row.eligible && !disabled && api.toggleRow(row.profile_id)}
        minWidth={560}
      />
    </Stack>
  );
}
