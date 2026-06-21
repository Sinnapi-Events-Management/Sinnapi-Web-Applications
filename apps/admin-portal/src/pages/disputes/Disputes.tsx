import {
  Card,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
} from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import EmptyState from '@/components/ui/EmptyState';
import StatusChip from '@/components/ui/StatusChip';
import QueryState from '@/components/ui/QueryState';
import { formatDate } from '@/lib/config';
import { one } from '@/lib/rel';
import type { BookingRef } from '@/lib/types';
import { useDisputes } from './hooks/useDisputes';

const RESOLUTIONS = [
  { value: 'resolved_refund', label: 'Resolve — refund client' },
  { value: 'resolved_release', label: 'Resolve — release to vendor' },
  { value: 'resolved_partial', label: 'Resolve — partial' },
  { value: 'closed', label: 'Close (no action)' },
];

export default function Disputes() {
  const { has, rows, isLoading, error, active, setActive, busy, err, resolve } = useDisputes();

  return (
    <>
      <PageTitle title="Disputes" subtitle="Adjudicate disputes based on evidence and SLA." />
      {err && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      )}
      <QueryState isLoading={isLoading} error={error}>
        {rows.length === 0 ? (
          <EmptyState title="No disputes" />
        ) : (
          <Card variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Booking</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>SLA due</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((d) => (
                  <TableRow key={d.id} hover>
                    <TableCell>{one<BookingRef>(d.bookings)?.reference_no ?? '—'}</TableCell>
                    <TableCell>{d.reason}</TableCell>
                    <TableCell>{formatDate(d.sla_due_at)}</TableCell>
                    <TableCell>
                      <StatusChip status={d.status} />
                    </TableCell>
                    <TableCell align="right">
                      {has('dispute.manage') &&
                        ['open', 'under_review', 'awaiting_evidence'].includes(d.status) && (
                          <Button size="small" variant="contained" onClick={() => setActive(d.id)}>
                            Resolve
                          </Button>
                        )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </QueryState>

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
