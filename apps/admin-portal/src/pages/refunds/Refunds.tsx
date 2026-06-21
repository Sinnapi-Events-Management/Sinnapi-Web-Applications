import { Card, Table, TableHead, TableRow, TableCell, TableBody, Button, Alert } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import EmptyState from '@/components/ui/EmptyState';
import StatusChip from '@/components/ui/StatusChip';
import QueryState from '@/components/ui/QueryState';
import { formatMoney, formatDate, titleize } from '@/lib/config';
import { useRefunds } from './hooks/useRefunds';

export default function Refunds() {
  const { has, isLoading, error, busy, err, rows, approve } = useRefunds();

  return (
    <>
      <PageTitle
        title="Refunds"
        subtitle="Approve refunds (partial allowed). Approver must differ from requester."
      />
      {err && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      )}
      <QueryState isLoading={isLoading} error={error}>
        {rows.length === 0 ? (
          <EmptyState title="No refund requests" />
        ) : (
          <Card variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Requested</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>{titleize(r.type)}</TableCell>
                    <TableCell align="right">{formatMoney(r.amount, r.currency)}</TableCell>
                    <TableCell>{r.reason ?? '—'}</TableCell>
                    <TableCell>{formatDate(r.created_at)}</TableCell>
                    <TableCell>
                      <StatusChip status={r.status} />
                    </TableCell>
                    <TableCell align="right">
                      {has('refund.approve') && r.status === 'requested' && (
                        <Button
                          size="small"
                          variant="contained"
                          disabled={busy === r.id}
                          onClick={() => approve(r.id)}
                        >
                          Approve
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
    </>
  );
}
