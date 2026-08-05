import { useMemo } from 'react';
import { Alert, DataTable, Snackbar } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import { useBlockedAccounts } from './hooks/useBlockedAccounts';
import { getColumns, rowKey } from './schema';
import BlockedToolbar from './components/organisms/BlockedToolbar';
import BlockedActionDialog from './components/organisms/BlockedActionDialog';
import DataProcessingNotice from './components/organisms/DataProcessingNotice';

export default function BlockedAccounts() {
  const {
    rows,
    total,
    isLoading,
    isFetching,
    pageError,
    emptyMessage,
    canManage,
    table,
    filters,
    actions,
    ip,
  } = useBlockedAccounts();

  const columns = useMemo(() => {
    const cols = getColumns({
      onAction: actions.request,
      isRevealed: ip.isRevealed,
      onReveal: ip.reveal,
    });
    // Read-only staff can see who is blocked and why — that is the diagnostic
    // half — but resolving a block is a management action, so the column goes
    // rather than rendering a menu whose every entry would be refused.
    return canManage ? cols : cols.filter((c) => c.field !== 'actions');
  }, [canManage, actions.request, ip.isRevealed, ip.reveal]);

  return (
    <>
      <PageTitle
        title="Blocked accounts"
        subtitle="Accounts that cannot currently sign in — locked out by repeated failed attempts, or suspended by an administrator."
      />

      <DataProcessingNotice />

      <BlockedToolbar filters={filters} />

      {pageError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {pageError}
        </Alert>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={rowKey}
        rowCount={total}
        loading={isLoading || isFetching}
        size="small"
        emptyMessage={emptyMessage}
        {...table.controls}
      />

      <BlockedActionDialog
        pending={actions.pending}
        busy={actions.busy}
        onCancel={actions.cancel}
        onConfirm={actions.confirm}
      />

      <Snackbar
        open={!!actions.notice}
        autoHideDuration={6000}
        onClose={actions.clearNotice}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={actions.clearNotice}
          sx={{ width: '100%' }}
        >
          {actions.notice}
        </Alert>
      </Snackbar>
    </>
  );
}
