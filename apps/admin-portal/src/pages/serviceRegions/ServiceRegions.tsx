import { useMemo } from 'react';
import { DataTable, Alert, Button } from '@sinnapi/ui';
import AddIcon from '@mui/icons-material/Add';
import PageTitle from '@/components/ui/PageTitle';
import type { ServiceRegionModel } from '@/lib/types';
import { useServiceRegions } from './hooks/useServiceRegions';
import { getColumns } from './schema';
import RegionsToolbar from './components/organisms/RegionsToolbar';
import RegionDrawer from './components/organisms/RegionDrawer';
import RegionDeleteDialog from './components/organisms/RegionDeleteDialog';

export default function ServiceRegions() {
  const {
    rows,
    total,
    isLoading,
    isFetching,
    error,
    filters,
    nextSortOrder,
    edit,
    remove,
    toggleActive,
    table,
  } = useServiceRegions();

  const columns = useMemo(
    () =>
      getColumns({
        onEdit: edit.openEdit,
        onToggleActive: toggleActive,
        onRequestDelete: remove.request,
      }),
    [edit.openEdit, toggleActive, remove.request],
  );

  // Save failures live in the drawer; delete failures live in the dialog. Only
  // the list load error belongs at the page level.
  const pageError = error
    ? error instanceof Error
      ? error.message
      : 'Failed to load regions.'
    : null;

  return (
    <>
      <PageTitle
        title="Service regions"
        subtitle="Register and manage the regions vendors can serve."
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={edit.openCreate}>
            New region
          </Button>
        }
      />

      <RegionsToolbar filters={filters} />

      {pageError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {pageError}
        </Alert>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(r: ServiceRegionModel) => r.id}
        rowCount={total}
        loading={isLoading || isFetching}
        emptyMessage="No regions yet. Create your first region."
        {...table.controls}
      />

      <RegionDrawer
        open={edit.isOpen}
        mode={edit.mode}
        region={edit.region}
        nextSortOrder={nextSortOrder}
        busy={edit.busy}
        err={edit.err}
        onClose={edit.close}
        onSave={edit.save}
      />

      <RegionDeleteDialog
        pending={remove.pending}
        busy={remove.busy}
        err={remove.err}
        onCancel={remove.cancel}
        onConfirm={remove.confirm}
      />
    </>
  );
}
