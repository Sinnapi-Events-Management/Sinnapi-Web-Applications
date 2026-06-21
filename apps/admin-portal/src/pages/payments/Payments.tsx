import { Card, Table, TableHead, TableRow, TableCell, TableBody } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import EmptyState from '@/components/ui/EmptyState';
import StatusChip from '@/components/ui/StatusChip';
import QueryState from '@/components/ui/QueryState';
import { formatDate, formatMoney, titleize } from '@/lib/config';
import { usePayments } from './hooks/usePayments';

export default function Payments() {
  const { rows, isLoading, error } = usePayments();
  return (
    <>
      <PageTitle
        title="Payments"
        subtitle="Payment oversight (PSP charges, escrow funding, subscriptions)."
      />
      <QueryState isLoading={isLoading} error={error}>
        {rows.length === 0 ? (
          <EmptyState title="No payments" />
        ) : (
          <Card variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Purpose</TableCell>
                  <TableCell>Provider</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell>{formatDate(p.created_at)}</TableCell>
                    <TableCell>{titleize(p.purpose)}</TableCell>
                    <TableCell>
                      {titleize(p.provider)} · {titleize(p.provider_method)}
                    </TableCell>
                    <TableCell align="right">{formatMoney(p.amount, p.currency)}</TableCell>
                    <TableCell>
                      <StatusChip status={p.status} />
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
