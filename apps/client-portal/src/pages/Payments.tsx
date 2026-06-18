import { Card, Table, TableHead, TableRow, TableCell, TableBody } from "@mui/material";
import PageTitle from "@/components/ui/PageTitle";
import EmptyState from "@/components/ui/EmptyState";
import StatusChip from "@/components/ui/StatusChip";
import QueryState from "@/components/ui/QueryState";
import { usePayments } from "@/hooks/queries";
import { formatMoney, formatDate, titleize } from "@/lib/config";

export default function Payments() {
  const { data, isLoading, error } = usePayments();
  const rows = data ?? [];

  return (
    <>
      <PageTitle title="Payments" subtitle="Your payment history." />
      <QueryState isLoading={isLoading} error={error}>
        {rows.length === 0 ? (
          <EmptyState title="No payments yet" description="Your payment history will appear here." />
        ) : (
          <Card variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell><TableCell>Purpose</TableCell><TableCell>Method</TableCell>
                  <TableCell align="right">Amount</TableCell><TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((p: any) => (
                  <TableRow key={p.id} hover>
                    <TableCell>{formatDate(p.paid_at ?? p.created_at)}</TableCell>
                    <TableCell>{titleize(p.purpose)}</TableCell>
                    <TableCell>{titleize(p.provider_method)}</TableCell>
                    <TableCell align="right">{formatMoney(p.amount, p.currency)}</TableCell>
                    <TableCell><StatusChip status={p.status} /></TableCell>
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
