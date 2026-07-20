import { Alert, Snackbar, Stack } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import StatusTabs from '@/components/ui/StatusTabs';
import { useMessagingModeration } from './hooks/useMessagingModeration';
import { useFlagDetail } from './hooks/useFlagDetail';
import { buildTabs } from './schema';
import ModerationSummary from './components/organisms/ModerationSummary';
import ModerationToolbar from './components/organisms/ModerationToolbar';
import ModerationWorkspace from './components/organisms/ModerationWorkspace';
import FlagList from './components/organisms/FlagList';
import FlagDetail from './components/organisms/FlagDetail';
import BulkActionBar from './components/molecules/BulkActionBar';

export default function MessagingModeration() {
  const {
    rows,
    counts,
    isLoading,
    error,
    busy,
    bulkBusy,
    err,
    notice,
    clearNotice,
    tab,
    setTab,
    search,
    selection,
    blockMessage,
    dismiss,
    blockSelected,
    dismissSelected,
  } = useMessagingModeration();

  const detail = useFlagDetail(rows);

  const master = (
    <Stack spacing={2}>
      <ModerationToolbar search={search} resultCount={rows.length} />
      <BulkActionBar
        selection={selection}
        busy={bulkBusy}
        onBlock={blockSelected}
        onDismiss={dismissSelected}
      />
      {err && <Alert severity="error">{err}</Alert>}
      <FlagList
        rows={rows}
        isLoading={isLoading}
        error={error}
        selection={selection}
        detail={detail}
      />
    </Stack>
  );

  return (
    <>
      <PageTitle
        title="Messaging moderation"
        subtitle="Flagged messages (auto-detected scam/profanity or user-reported)."
      />

      <ModerationSummary counts={counts} loading={isLoading} />

      <StatusTabs
        options={buildTabs(counts)}
        value={tab}
        onChange={setTab}
        loadingCounts={isLoading}
        ariaLabel="Filter flagged messages by status"
      />

      <ModerationWorkspace
        master={master}
        detailOpen={!!detail.active}
        onCloseDetail={detail.close}
        detail={
          <FlagDetail
            flag={detail.active}
            busy={busy === detail.active?.id}
            onBlock={blockMessage}
            onDismiss={dismiss}
            onClose={detail.close}
          />
        }
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
