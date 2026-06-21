import { Card, Table, TableHead, TableRow, TableCell, TableBody } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import EmptyState from '@/components/ui/EmptyState';
import StatusChip from '@/components/ui/StatusChip';
import QueryState from '@/components/ui/QueryState';
import { formatMoney, formatDate } from '@/lib/config';
import { one } from '@/lib/rel';
import type { VendorNameSlugRefModel } from '@/lib/types';
import { useCompareQuotes } from './hooks/useCompareQuotes';

export default function CompareQuotes() {
  const { rows, isLoading, error } = useCompareQuotes();

  return (
    <>
      <PageTitle title="Compare quotations" subtitle="Side-by-side comparison of vendor quotes." />
      <QueryState isLoading={isLoading} error={error}>
        {rows.length === 0 ? (
          <EmptyState
            title="No quotes to compare"
            description="Quotes vendors have sent you will appear here."
            ctaLabel="Back to quotations"
            ctaHref="/quotations"
          />
        ) : (
          <Card variant="outlined" sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Vendor</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell>Valid until</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((q) => (
                  <TableRow key={q.id} hover>
                    <TableCell>
                      {one<VendorNameSlugRefModel>(q.vendors)?.business_name ?? '—'}
                    </TableCell>
                    <TableCell align="right">
                      <strong>{formatMoney(q.total, q.currency)}</strong>
                    </TableCell>
                    <TableCell>{formatDate(q.valid_until)}</TableCell>
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
