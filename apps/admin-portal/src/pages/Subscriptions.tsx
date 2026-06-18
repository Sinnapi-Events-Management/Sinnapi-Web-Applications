import { Card, Table, TableHead, TableRow, TableCell, TableBody } from "@mui/material";
import PageTitle from "@/components/ui/PageTitle";
import EmptyState from "@/components/ui/EmptyState";
import StatusChip from "@/components/ui/StatusChip";
import QueryState from "@/components/ui/QueryState";
import { useSubscriptionsAdmin } from "@/hooks/queries";
import { formatDate } from "@/lib/config";
import { one } from "@/lib/rel";

export default function Subscriptions() {
  const { data, isLoading, error } = useSubscriptionsAdmin();
  const rows = data ?? [];
  return (
    <>
      <PageTitle title="Subscriptions" subtitle="Monitor vendor subscriptions, trials, and grace periods." />
      <QueryState isLoading={isLoading} error={error}>
        {rows.length === 0 ? <EmptyState title="No subscriptions" /> : (
          <Card variant="outlined">
            <Table>
              <TableHead><TableRow><TableCell>Vendor</TableCell><TableCell>Plan</TableCell><TableCell>Period ends</TableCell><TableCell>Grace until</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
              <TableBody>
                {rows.map((s: any) => (
                  <TableRow key={s.id} hover>
                    <TableCell>{one<any>(s.vendors)?.business_name ?? "—"}</TableCell>
                    <TableCell>{one<any>(s.pricing_plans)?.name ?? "—"}</TableCell>
                    <TableCell>{formatDate(s.current_period_end)}</TableCell>
                    <TableCell>{formatDate(s.grace_until)}</TableCell>
                    <TableCell><StatusChip status={s.status} /></TableCell>
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
