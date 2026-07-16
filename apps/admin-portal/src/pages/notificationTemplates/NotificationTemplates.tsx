import { useMemo } from 'react';
import { DataTable, Alert, Switch, Chip, type DataTableColumn } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import type { NotificationTemplateModel } from '@/lib/types';
import { useNotificationTemplates } from './hooks/useNotificationTemplates';

export default function NotificationTemplates() {
  const { rows, total, isLoading, isFetching, error, toggle, table } = useNotificationTemplates();

  const columns = useMemo<DataTableColumn<NotificationTemplateModel>[]>(
    () => [
      { field: 'trigger_key', headerName: 'Trigger', sortable: true, render: (t) => t.trigger_key },
      {
        field: 'channel',
        headerName: 'Channel',
        sortable: true,
        render: (t) => <Chip size="small" label={t.channel} />,
      },
      { field: 'locale', headerName: 'Locale', sortable: true, render: (t) => t.locale },
      { field: 'subject', headerName: 'Subject', render: (t) => t.subject ?? '—' },
      {
        field: 'is_active',
        headerName: 'Active',
        render: (t) => <Switch checked={t.is_active} onChange={(_, c) => toggle(t.id, c)} />,
      },
    ],
    [toggle],
  );

  return (
    <>
      <PageTitle title="Notification templates" subtitle="Email / in-app templates per trigger." />
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error instanceof Error ? error.message : 'Failed to load templates.'}
        </Alert>
      )}
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(t) => t.id}
        rowCount={total}
        loading={isLoading || isFetching}
        emptyMessage="No templates yet. Seed templates per trigger key (email + in-app)."
        {...table.controls}
      />
    </>
  );
}
