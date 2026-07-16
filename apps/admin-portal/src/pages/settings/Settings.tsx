import { useMemo } from 'react';
import {
  DataTable,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  type DataTableColumn,
} from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import type { SettingModel } from '@/lib/types';
import { useSettings } from './hooks/useSettings';

export default function Settings() {
  const { rows, total, isLoading, isFetching, error, edit, setEdit, busy, err, save, table } =
    useSettings();

  const columns = useMemo<DataTableColumn<SettingModel>[]>(
    () => [
      { field: 'key', headerName: 'Key', sortable: true, render: (s) => s.key },
      {
        field: 'value',
        headerName: 'Value',
        render: (s) => <code>{JSON.stringify(s.value)}</code>,
      },
      { field: 'description', headerName: 'Description', render: (s) => s.description ?? '—' },
      {
        field: 'edit',
        headerName: 'Edit',
        align: 'right',
        render: (s) => (
          <Button size="small" onClick={() => setEdit(s)}>
            Edit
          </Button>
        ),
      },
    ],
    [setEdit],
  );

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

      <Dialog
        open={!!edit}
        onClose={() => setEdit(null)}
        fullWidth
        maxWidth="xs"
        PaperProps={{ component: 'form', onSubmit: save }}
      >
        <DialogTitle>Edit {edit?.key}</DialogTitle>
        <DialogContent>
          {err && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {err}
            </Alert>
          )}
          <TextField
            name="value"
            label="Value (JSON)"
            defaultValue={JSON.stringify(edit?.value)}
            fullWidth
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEdit(null)}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
