import { useMemo } from 'react';
import { DataTable, Alert } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import { useSettings } from './hooks/useSettings';
import { getColumns } from './schema';
import SettingEditDialog from './components/organisms/SettingEditDialog';

export default function Settings() {
  const { rows, total, isLoading, isFetching, error, edit, setEdit, busy, err, save, table } =
    useSettings();

  const columns = useMemo(() => getColumns({ onEdit: setEdit }), [setEdit]);

  return (
    <>
      <PageTitle
        title="Platform settings"
        subtitle="Commission %, grace period, FX, quote expiry, etc."
      />
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error instanceof Error ? error.message : 'Failed to load settings.'}
        </Alert>
      )}
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(s) => s.id}
        rowCount={total}
        loading={isLoading || isFetching}
        emptyMessage="No settings yet."
        {...table.controls}
      />

      <SettingEditDialog
        setting={edit}
        busy={busy}
        err={err}
        onClose={() => setEdit(null)}
        onSave={save}
      />
    </>
  );
}
