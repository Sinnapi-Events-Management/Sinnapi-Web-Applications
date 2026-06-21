import {
  Card,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Alert,
  Stack,
} from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import EmptyState from '@/components/ui/EmptyState';
import StatusChip from '@/components/ui/StatusChip';
import QueryState from '@/components/ui/QueryState';
import { formatMoney, formatDate } from '@/lib/config';
import { one } from '@/lib/rel';
import type { VendorRef } from '@/lib/types';
import { usePayouts } from './hooks/usePayouts';

export default function Payouts() {
  const { rows, isLoading, error, has, busy, err, approve, process } = usePayouts();

  return (
    <>
      <PageTitle
        title="Payouts"
        subtitle="Approve (Finance) then process disbursement. Approver must differ from requester."
      />
      {err && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      )}
      <QueryState isLoading={isLoading} error={error}>
        {rows.length === 0 ? (
          <EmptyState title="No payouts" />
        ) : (
          <Card variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Vendor</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Requested</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell>{one<VendorRef>(p.vendors)?.business_name ?? '—'}</TableCell>
                    <TableCell align="right">
                      <strong>{formatMoney(p.amount, p.currency)}</strong>
                    </TableCell>
                    <TableCell>{formatDate(p.created_at)}</TableCell>
                    <TableCell>
                      <StatusChip status={p.status} />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        {has('payout.approve') && p.status === 'requested' && (
                          <Button
                            size="small"
                            variant="contained"
                            disabled={busy === p.id}
                            onClick={() => approve(p.id)}
                          >
                            Approve
                          </Button>
                        )}
                        {has('payout.process') && p.status === 'approved' && (
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={busy === p.id}
                            onClick={() => process(p.id)}
                          >
                            Process
                          </Button>
                        )}
                      </Stack>
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
