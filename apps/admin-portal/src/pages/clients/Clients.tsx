import { useMemo } from 'react';
import { Alert, DataTable, Snackbar } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import StatusTabs from '@/components/ui/StatusTabs';
import { useClients } from './hooks/useClients';
import { getColumns } from './schema';
import ClientsToolbar from './components/organisms/ClientsToolbar';
import ClientStatusDialog from './components/organisms/ClientStatusDialog';
import ClientDeleteDialog from './components/organisms/ClientDeleteDialog';
import ClientPasswordResetDialog from './components/organisms/ClientPasswordResetDialog';

export default function Clients() {
  const {
    rows,
    total,
    isLoading,
    isFetching,
    pageError,
    emptyMessage,
    canManage,
    tabs,
    countsLoading,
    tab,
    onTabChange,
    search,
    status,
    remove,
    passwordReset,
    notice,
    clearNotice,
    navigate,
    table,
  } = useClients();

  const goToClient = (id: string) => navigate(`/clients/${id}`);

  const columns = useMemo(() => {
    const cols = getColumns({
      onView: (c) => goToClient(c.id),
      onResetPassword: passwordReset.request,
      onRequestStatusChange: status.request,
      onRequestDelete: remove.request,
    });
    // Only the "view" is available to read-only viewers; the rest are management
    // actions, so drop the whole column when the admin can't manage.
    return canManage ? cols : cols.filter((c) => c.field !== 'actions');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage, passwordReset.request, status.request, remove.request]);

  return (
    <>
      <PageTitle title="Clients" subtitle="Registered clients and event planners." />

      <StatusTabs
        options={tabs}
        value={tab}
        onChange={onTabChange}
        loadingCounts={countsLoading}
        ariaLabel="Filter clients by status"
      />
      <ClientsToolbar search={search} />

      {pageError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {pageError}
        </Alert>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(c) => c.id}
        rowCount={total}
        loading={isLoading || isFetching}
        onRowClick={(c) => goToClient(c.id)}
        emptyMessage={emptyMessage}
        {...table.controls}
      />

      <ClientStatusDialog
        pending={status.pending}
        busy={status.busy}
        onCancel={status.cancel}
        onConfirm={status.confirm}
      />

      <ClientDeleteDialog
        pending={remove.pending}
        busy={remove.busy}
        onCancel={remove.cancel}
        onConfirm={remove.confirm}
      />

      <ClientPasswordResetDialog
        pending={passwordReset.pending}
        busy={passwordReset.busy}
        onCancel={passwordReset.cancel}
        onConfirm={passwordReset.confirm}
      />

      <Snackbar
        open={!!notice}
        autoHideDuration={6000}
        onClose={clearNotice}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" onClose={clearNotice} sx={{ width: '100%' }}>
          {notice}
        </Alert>
      </Snackbar>
    </>
  );
}
