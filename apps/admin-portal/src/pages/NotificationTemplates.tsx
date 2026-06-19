import { useQueryClient } from '@tanstack/react-query';
import { Card, Table, TableHead, TableRow, TableCell, TableBody, Switch, Chip } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import EmptyState from '@/components/ui/EmptyState';
import QueryState from '@/components/ui/QueryState';
import { useNotificationTemplates } from '@/hooks/queries';
import { supabase } from '@/lib/supabase';

export default function NotificationTemplates() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useNotificationTemplates();
  const rows = data ?? [];

  async function toggle(id: string, is_active: boolean) {
    await supabase.from('notification_templates').update({ is_active }).eq('id', id);
    qc.invalidateQueries({ queryKey: ['notification-templates'] });
  }

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
