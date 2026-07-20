import { useMemo } from 'react';
import { Alert, DataTable, Snackbar } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import StatusTabs from '@/components/ui/StatusTabs';
import { useUsers } from './hooks/useUsers';
import { getColumns, toFormValues, emptyFormValues } from './schema';
import UsersToolbar from './components/organisms/UsersToolbar';
import UserFormDrawer from './components/organisms/UserFormDrawer';
import UserStatusDialog from './components/organisms/UserStatusDialog';
import UserDeleteDialog from './components/organisms/UserDeleteDialog';
import UserPasswordResetDialog from './components/organisms/UserPasswordResetDialog';

export default function Users() {
  const {
    rows,
    total,
    isLoading,
    isFetching,
    pageError,
    emptyMessage,
    canManage,
    roleOptions,
    tabs,
    countsLoading,
    tab,
    onTabChange,
    search,
    create,
    edit,
    status,
    remove,
    passwordReset,
    notice,
    clearNotice,
    table,
  } = useUsers();

  const { open: onEdit } = edit;
  const { request: onResetPassword } = passwordReset;
  const { request: onRequestStatusChange } = status;
  const { request: onRequestDelete } = remove;

  const columns = useMemo(() => {
    const cols = getColumns({ onEdit, onResetPassword, onRequestStatusChange, onRequestDelete });
    // Row actions are all management operations — hide the column entirely for
    // read-only viewers.
    return canManage ? cols : cols.filter((c) => c.field !== 'actions');
  }, [canManage, onEdit, onResetPassword, onRequestStatusChange, onRequestDelete]);

  // Memoised so react-hook-form's `values` prop stays referentially stable per
  // record and doesn't reset the form on every render.
  const editValues = useMemo(
    () => (edit.user ? toFormValues(edit.user) : emptyFormValues),
    [edit.user],
  );

  return (
    <>
      <PageTitle title="Users" subtitle="Manage Sinnapi staff accounts and their roles." />

      <StatusTabs
        options={tabs}
        value={tab}
        onChange={onTabChange}
        loadingCounts={countsLoading}
        ariaLabel="Filter users by status"
      />
      <UsersToolbar search={search} canManage={canManage} onCreate={create.open} />

      {pageError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {pageError}
        </Alert>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(u) => u.id}
        rowCount={total}
        loading={isLoading || isFetching}
        emptyMessage={emptyMessage}
        {...table.controls}
      />

      <UserFormDrawer
        open={create.isOpen}
        mode="create"
        values={emptyFormValues}
        roleOptions={roleOptions}
        busy={create.busy}
        err={create.err}
        onClose={create.close}
        onSave={create.save}
      />

      <UserFormDrawer
        open={edit.isOpen}
        mode="edit"
        values={editValues}
        roleOptions={roleOptions}
        subtitle={edit.user?.email ?? undefined}
        busy={edit.busy}
        err={edit.err}
        onClose={edit.close}
        onSave={edit.save}
      />

      <UserStatusDialog
        pending={status.pending}
        busy={status.busy}
        onCancel={status.cancel}
        onConfirm={status.confirm}
      />

      <UserDeleteDialog
        pending={remove.pending}
        busy={remove.busy}
        onCancel={remove.cancel}
        onConfirm={remove.confirm}
      />

      <UserPasswordResetDialog
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
