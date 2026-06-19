import { Card, Table, TableHead, TableRow, TableCell, TableBody, Typography } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import EmptyState from '@/components/ui/EmptyState';
import QueryState from '@/components/ui/QueryState';
import { useAuditLogs } from '@/hooks/queries';
import { formatDateTime } from '@/lib/config';

export default function Audit() {
  const { data, isLoading, error } = useAuditLogs();
  const rows = data ?? [];
  return (
    <>
      <PageTitle title="Audit log" subtitle="Append-only record of sensitive actions." />
      <QueryState isLoading={isLoading} error={error}>
        {rows.length === 0 ? (
          <EmptyState title="No audit entries" />
        ) : (
          <Card variant="outlined" sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>When</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Entity</TableCell>
                  <TableCell>Actor</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((l) => (
                  <TableRow key={l.id} hover>
                    <TableCell>{formatDateTime(l.occurred_at)}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {l.action}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {l.entity_type}
                      {l.entity_id ? ` · ${String(l.entity_id).slice(0, 8)}` : ''}
                    </TableCell>
                    <TableCell>{l.actor_id ? String(l.actor_id).slice(0, 8) : 'system'}</TableCell>
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
