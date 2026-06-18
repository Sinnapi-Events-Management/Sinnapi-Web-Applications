import { Card, Table, TableHead, TableRow, TableCell, TableBody, Chip } from "@mui/material";
import PageTitle from "@/components/ui/PageTitle";
import EmptyState from "@/components/ui/EmptyState";
import QueryState from "@/components/ui/QueryState";
import { useRetention } from "@/hooks/queries";
import { titleize } from "@/lib/config";

export default function Retention() {
  const { data, isLoading, error } = useRetention();
  const rows = data ?? [];
  return (
    <>
      <PageTitle title="Data retention" subtitle="Per-category retention, archival, and deletion policies (GDPR/DPPA)." />
      <QueryState isLoading={isLoading} error={error}>
        {rows.length === 0 ? <EmptyState title="No policies" /> : (
          <Card variant="outlined">
            <Table>
              <TableHead><TableRow><TableCell>Category</TableCell><TableCell>Retention</TableCell><TableCell>On expiry</TableCell><TableCell>Legal hold</TableCell><TableCell>Description</TableCell></TableRow></TableHead>
              <TableBody>
                {rows.map((p: any) => (
                  <TableRow key={p.id} hover>
                    <TableCell>{titleize(p.data_category)}</TableCell>
                    <TableCell>{p.retention_period ?? "—"}</TableCell>
                    <TableCell><Chip size="small" label={titleize(p.action_on_expiry)} /></TableCell>
                    <TableCell>{p.legal_hold ? "Yes" : "No"}</TableCell>
                    <TableCell>{p.description ?? "—"}</TableCell>
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
