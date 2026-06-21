import { Card, Table, TableHead, TableRow, TableCell, TableBody, Typography } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import EmptyState from '@/components/ui/EmptyState';
import StatusChip from '@/components/ui/StatusChip';
import QueryState from '@/components/ui/QueryState';
import VendorGate from '@/vendor/VendorGate';
import { formatDate, formatMoney } from '@/lib/config';
import { one } from '@/lib/rel';
import type { ProfileRel } from '@/lib/types';
import { useQuotations } from './hooks/useQuotations';

function QuotesTable({ vendorId }: { vendorId: string }) {
  const { navigate, rows, isLoading, error } = useQuotations(vendorId);
  return (
    <QueryState isLoading={isLoading} error={error}>
      {rows.length === 0 ? (
        <EmptyState
          title="No quote requests yet"
          description="When clients request quotes, they'll appear here for you to build and send."
        />
      ) : (
        <Card variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Reference</TableCell>
                <TableCell>Client</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell>Valid until</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((q) => (
                <TableRow
                  key={q.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/quotations/${q.id}`)}
                >
                  <TableCell>
                    <Typography variant="body2">{q.reference_no}</Typography>
                  </TableCell>
                  <TableCell>{one<ProfileRel>(q.profiles)?.full_name ?? 'Client'}</TableCell>
                  <TableCell align="right">
                    {q.total ? formatMoney(q.total, q.currency) : '—'}
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
  );
}

export default function Quotations() {
  return (
    <>
      <PageTitle
        title="Quotations"
        subtitle="Build and send quotes in response to client requests."
      />
      <VendorGate>{(vendorId) => <QuotesTable vendorId={vendorId} />}</VendorGate>
    </>
  );
}
