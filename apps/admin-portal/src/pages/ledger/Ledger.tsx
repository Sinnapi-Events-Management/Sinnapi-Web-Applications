import { Card, Table, TableHead, TableRow, TableCell, TableBody, Chip } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import EmptyState from '@/components/ui/EmptyState';
import QueryState from '@/components/ui/QueryState';
import { formatDateTime, formatMoney, titleize } from '@/lib/config';
import { useLedger } from './hooks/useLedger';

export default function Ledger() {
  const { rows, isLoading, error } = useLedger();
  return (
    <>
      <PageTitle title="Ledger" subtitle="Append-only double-entry ledger (read-only)." />
      <QueryState isLoading={isLoading} error={error}>
        {rows.length === 0 ? (
          <EmptyState title="No ledger entries" />
        ) : (
          <Card variant="outlined" sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>When</TableCell>
                  <TableCell>Account</TableCell>
                  <TableCell>Dr/Cr</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Description</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((l) => (
                  <TableRow key={l.id} hover>
                    <TableCell>{formatDateTime(l.occurred_at)}</TableCell>
                    <TableCell>{titleize(l.account)}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={l.direction === 'debit' ? 'info' : 'success'}
                        label={l.direction === 'debit' ? 'DR' : 'CR'}
                      />
                    </TableCell>
                    <TableCell align="right">{formatMoney(l.amount, l.currency)}</TableCell>
                    <TableCell>{l.description}</TableCell>
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
