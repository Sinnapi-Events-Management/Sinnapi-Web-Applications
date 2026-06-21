import { Card, Table, TableHead, TableRow, TableCell, TableBody, Switch, Chip } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import EmptyState from '@/components/ui/EmptyState';
import QueryState from '@/components/ui/QueryState';
import { useNotificationTemplates } from './hooks/useNotificationTemplates';

export default function NotificationTemplates() {
  const { rows, isLoading, error, toggle } = useNotificationTemplates();

  return (
    <>
      <PageTitle title="Notification templates" subtitle="Email / in-app templates per trigger." />
      <QueryState isLoading={isLoading} error={error}>
        {rows.length === 0 ? (
          <EmptyState
            title="No templates"
            description="Seed templates per trigger key (email + in-app)."
          />
        ) : (
          <Card variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Trigger</TableCell>
                  <TableCell>Channel</TableCell>
                  <TableCell>Locale</TableCell>
                  <TableCell>Subject</TableCell>
                  <TableCell>Active</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((t) => (
                  <TableRow key={t.id} hover>
                    <TableCell>{t.trigger_key}</TableCell>
                    <TableCell>
                      <Chip size="small" label={t.channel} />
                    </TableCell>
                    <TableCell>{t.locale}</TableCell>
                    <TableCell>{t.subject ?? '—'}</TableCell>
                    <TableCell>
                      <Switch checked={t.is_active} onChange={(_, c) => toggle(t.id, c)} />
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
