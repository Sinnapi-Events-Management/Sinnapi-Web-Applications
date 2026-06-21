import {
  Card,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  MenuItem,
} from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import EmptyState from '@/components/ui/EmptyState';
import StatusChip from '@/components/ui/StatusChip';
import QueryState from '@/components/ui/QueryState';
import { formatDate } from '@/lib/config';
import { one } from '@/lib/rel';
import type { ProfileRef } from '@/lib/types';
import { useErasure } from './hooks/useErasure';

const STATUSES = [
  'requested',
  'reviewing',
  'approved',
  'partially_fulfilled',
  'rejected',
  'completed',
];

export default function Erasure() {
  const { rows, isLoading, error, setStatus } = useErasure();

  return (
    <>
      <PageTitle
        title="Erasure requests"
        subtitle="GDPR right-to-erasure — subject to legal/financial retention holds."
      />
      <QueryState isLoading={isLoading} error={error}>
        {rows.length === 0 ? (
          <EmptyState title="No erasure requests" />
        ) : (
          <Card variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Requester</TableCell>
                  <TableCell>Requested</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Set status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>{one<ProfileRef>(r.profiles)?.email ?? '—'}</TableCell>
                    <TableCell>{formatDate(r.created_at)}</TableCell>
                    <TableCell>
                      <StatusChip status={r.status} />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        select
                        size="small"
                        value={r.status}
                        onChange={(e) => setStatus(r.id, e.target.value)}
                        sx={{ minWidth: 180 }}
                      >
                        {STATUSES.map((s) => (
                          <MenuItem key={s} value={s}>
                            {s}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </QueryState>
    </>
  );
}
