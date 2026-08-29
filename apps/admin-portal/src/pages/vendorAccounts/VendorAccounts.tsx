import { useMemo } from 'react';
import { Alert, DataTable, PageTitle, Snackbar } from '@sinnapi/ui';
import { StatusTabs } from '@sinnapi/ui';
import { useVendorAccounts } from './hooks/useVendorAccounts';
import { getColumns } from './schema';
import VendorAccountsToolbar from './components/organisms/VendorAccountsToolbar';
import VendorLifecycleDialog from './components/organisms/VendorLifecycleDialog';
import VendorCredentialsDialog from './components/organisms/VendorCredentialsDialog';
import VendorPasswordResetDialog from './components/organisms/VendorPasswordResetDialog';

export default function VendorAccounts() {
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
    lifecycle,
    credentials,
    passwordReset,
    notice,
    clearNotice,
    viewListing,
    table,
  } = useVendorAccounts();

  const columns = useMemo(() => {
    const cols = getColumns({
      onViewListing: (row) => viewListing(row.vendor_id),
      onResendCredentials: credentials.request,
      onResetPassword: passwordReset.request,
      onLifecycleAction: lifecycle.request,
    });
    // Every action in that column changes someone's access. A read-only viewer
    // loses the column outright rather than being shown a menu of things that
    // will be refused.
    return canManage ? cols : cols.filter((c) => c.field !== 'actions');
  }, [canManage, viewListing, credentials.request, passwordReset.request, lifecycle.request]);

  return (
    <>
      <PageTitle
        title="Vendor Accounts"
        subtitle="The people behind the listings — sign-in access, credentials and standing."
      />

      <StatusTabs
        options={tabs}
        value={tab}
        onChange={onTabChange}
        loadingCounts={countsLoading}
        ariaLabel="Filter vendor accounts by status"
      />
      <VendorAccountsToolbar search={search} />

      {pageError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {pageError}
        </Alert>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(row) => row.profile_id}
        rowCount={total}
        loading={isLoading || isFetching}
        // The row opens the LISTING, which is the only detail page a vendor has.
        // Accounts with no listing are not clickable, rather than navigating to
        // a page that cannot exist.
        onRowClick={(row) => viewListing(row.vendor_id)}
        emptyMessage={emptyMessage}
        {...table.controls}
      />

      <VendorLifecycleDialog
        pending={lifecycle.pending}
        busy={lifecycle.busy}
        onCancel={lifecycle.cancel}
        onConfirm={lifecycle.confirm}
      />

      <VendorCredentialsDialog
        pending={credentials.pending}
        busy={credentials.busy}
        onCancel={credentials.cancel}
        onConfirm={credentials.confirm}
      />

      <VendorPasswordResetDialog
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
