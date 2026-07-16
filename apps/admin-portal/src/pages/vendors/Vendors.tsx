import { useMemo } from 'react';
import { DataTable, Alert } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import type { VendorAdminModel } from '@/lib/types';
import { useVendors } from './hooks/useVendors';
import { getColumns } from './schema';
import VendorStatusDialog from './components/organisms/VendorStatusDialog';
import VendorEditDrawer from './components/organisms/VendorEditDrawer';
import VendorDeleteDialog from './components/organisms/VendorDeleteDialog';

export default function Vendors() {
  const { rows, total, isLoading, isFetching, error, status, edit, remove, navigate, table } =
    useVendors();

  const columns = useMemo(
    () =>
      getColumns({
        onView: (v: VendorAdminModel) => navigate(`/vendors/${v.id}`),
        onEdit: edit.open,
        onRequestStatusChange: status.request,
        onRequestDelete: remove.request,
      }),
    [navigate, edit.open, status.request, remove.request],
  );

  // Save failures belong to the drawer, so they're rendered there instead.
  const pageError =
    status.err ??
    remove.err ??
    (error ? (error instanceof Error ? error.message : 'Failed to load vendors.') : null);

  return (
    <>
      <PageTitle title="Vendors" subtitle="Monitor and manage vendor listings." />
      {pageError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {pageError}
        </Alert>
      )}
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(v) => v.id}
        rowCount={total}
        loading={isLoading || isFetching}
        onRowClick={(v) => navigate(`/vendors/${v.id}`)}
        emptyMessage="No vendors yet."
        {...table.controls}
      />

      <VendorStatusDialog
        pending={status.pending}
        busy={status.busy}
        onCancel={status.cancel}
        onConfirm={status.confirm}
      />

      <VendorEditDrawer
        open={edit.isOpen}
        vendor={edit.vendor}
        loading={edit.loading}
        loadError={edit.loadError}
        busy={edit.busy}
        err={edit.err}
        onClose={edit.close}
        onSave={edit.save}
      />

      <VendorDeleteDialog
        pending={remove.pending}
        busy={remove.busy}
        onCancel={remove.cancel}
        onConfirm={remove.confirm}
      />
    </>
  );
}
