import { Card, Table, TableHead, TableRow, TableCell, TableBody } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import EmptyState from '@/components/ui/EmptyState';
import StatusChip from '@/components/ui/StatusChip';
import QueryState from '@/components/ui/QueryState';
import { formatDate, formatMoney } from '@/lib/config';
import { one } from '@/lib/rel';
import type { VendorRef } from '@/lib/types';
import { useQuotations } from './hooks/useQuotations';

export default function Quotations() {
  const { rows, isLoading, error } = useQuotations();
  return (
    <>
      <PageTitle title="Quotations" subtitle="Platform-wide quotation oversight." />
      <QueryState isLoading={isLoading} error={error}>
        {rows.length === 0 ? (
          <EmptyState title="No quotations" />
        ) : (
          <Card variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Reference</TableCell>
                  <TableCell>Vendor</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((q) => (
                  <TableRow key={q.id} hover>
                    <TableCell>{q.reference_no}</TableCell>
                    <TableCell>{one<VendorRef>(q.vendors)?.business_name ?? '—'}</TableCell>
                    <TableCell align="right">
                      {q.total ? formatMoney(q.total, q.currency) : '—'}
                    </TableCell>
                    <TableCell>{formatDate(q.created_at)}</TableCell>
                    <TableCell>
                      <StatusChip status={q.status} />
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
