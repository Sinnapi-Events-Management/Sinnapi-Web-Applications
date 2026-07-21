import { Stack } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import StatusTabs from '@/components/ui/StatusTabs';
import { useMessages } from './hooks/useMessages';
import { useActiveConversation } from './hooks/useActiveConversation';
import { buildInboxTabs } from './schema';
import InboxSummary from './components/organisms/InboxSummary';
import InboxToolbar from './components/organisms/InboxToolbar';
import InboxWorkspace from './components/organisms/InboxWorkspace';
import ConversationList from './components/organisms/ConversationList';
import ConversationPane from './components/organisms/ConversationPane';

export default function Messages() {
  const {
    rows,
    counts,
    isLoading,
    countsLoading,
    error,
    tab,
    setTab,
    typeFilter,
    search,
    isFiltered,
  } = useMessages();

  const active = useActiveConversation(rows);

  const master = (
    <Stack spacing={2}>
      <InboxToolbar search={search} typeFilter={typeFilter} resultCount={rows.length} />
      <ConversationList
        rows={rows}
        isLoading={isLoading}
        error={error}
        isFiltered={isFiltered}
        active={active}
      />
    </Stack>
  );

  return (
    <>
      <PageTitle
        title="Messages"
        subtitle="Vendor and client conversations handled by the Sinnapi team."
      />

      <InboxSummary counts={counts} loading={countsLoading} />

      <StatusTabs
        options={buildInboxTabs(counts)}
        value={tab}
        onChange={setTab}
        loadingCounts={countsLoading}
        ariaLabel="Filter conversations by status"
      />

      <InboxWorkspace
        master={master}
        detailOpen={!!active.active}
        onCloseDetail={active.close}
        detail={<ConversationPane conversation={active.active} onClose={active.close} />}
      />
    </>
  );
}
