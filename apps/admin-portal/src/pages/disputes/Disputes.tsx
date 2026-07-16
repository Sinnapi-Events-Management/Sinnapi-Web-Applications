import { useMemo } from 'react';
import {
  DataTable,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  type DataTableColumn,
} from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import StatusChip from '@/components/ui/StatusChip';
import { formatDate } from '@/lib/config';
import { one } from '@/lib/rel';
import type { DisputeModel, BookingRef } from '@/lib/types';
import { useDisputes } from './hooks/useDisputes';

const RESOLUTIONS = [
  { value: 'resolved_refund', label: 'Resolve — refund client' },
  { value: 'resolved_release', label: 'Resolve — release to vendor' },
  { value: 'resolved_partial', label: 'Resolve — partial' },
  { value: 'closed', label: 'Close (no action)' },
];

export default function Disputes() {
  const {
    has,
    rows,
    total,
    isLoading,
    isFetching,
    error,
    active,
    setActive,
    busy,
    err,
    resolve,
    table,
  } = useDisputes();

  const columns = useMemo<DataTableColumn<DisputeModel>[]>(
    () => [
      {
        field: 'booking',
        headerName: 'Booking',
        render: (d) => one<BookingRef>(d.bookings)?.reference_no ?? '—',
      },
      { field: 'reason', headerName: 'Reason', render: (d) => d.reason },
      {
        field: 'sla_due_at',
        headerName: 'SLA due',
        sortable: true,
        render: (d) => formatDate(d.sla_due_at),
      },
      {
        field: 'status',
        headerName: 'Status',
        sortable: true,
        render: (d) => <StatusChip status={d.status} />,
      },
      {
        field: 'action',
        headerName: 'Action',
        align: 'right',
        render: (d) =>
          has('dispute.manage') &&
          ['open', 'under_review', 'awaiting_evidence'].includes(d.status) ? (
            <Button size="small" variant="contained" onClick={() => setActive(d.id)}>
              Resolve
            </Button>
          ) : null,
      },
    ],
    [has, setActive],
  );

  return (
    <>
      <PageTitle title="Disputes" subtitle="Adjudicate disputes based on evidence and SLA." />
      {(err || error) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err ?? (error instanceof Error ? error.message : 'Failed to load disputes.')}
        </Alert>
      )}
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(d) => d.id}
        rowCount={total}
        loading={isLoading || isFetching}
        emptyMessage="No disputes yet."
        {...table.controls}
      />

      <Dialog
        open={!!active}
        onClose={() => setActive(null)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ component: 'form', onSubmit: resolve }}
      >
        <DialogTitle>Resolve dispute</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField name="resolution" label="Resolution" select defaultValue="resolved_partial">
              {RESOLUTIONS.map((r) => (
                <MenuItem key={r.value} value={r.value}>
                  {r.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField name="notes" label="Resolution notes" multiline minRows={3} />
            <Alert severity="info">
              Issue any refund from the Refunds page; this records the dispute outcome.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActive(null)}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy}>
            Save resolution
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
