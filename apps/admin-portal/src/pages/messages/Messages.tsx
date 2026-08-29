import { Stack, PageTitle } from '@sinnapi/ui';
import { InboxLayout, InboxToolbar, ConversationListPanel } from '@sinnapi/ui/messaging';
import { StatusTabs } from '@sinnapi/ui';
import { useMessagesPage } from './hooks/useMessagesPage';
import { buildInboxTabs } from './schema';
import InboxSummary from './components/organisms/InboxSummary';
import ConversationPane from './components/organisms/ConversationPane';

/**
 * The Sinnapi operator inbox.
 *
 * The list, rows, toolbar and master–detail shell now come from
 * `@sinnapi/ui/messaging` — they were built here first and were promoted so the
 * client and vendor portals stopped shipping 59-line stubs against the same
 * data. What stays local is what is genuinely operator-only: the KPI tiles, the
 * status tabs including `blocked`, and the observer/participant handling in the
 * thread pane.
 */
export default function Messages() {
  const { inbox, active } = useMessagesPage();

  const master = (
    <Stack spacing={2}>
      <InboxToolbar
        search={inbox.search}
        audience="admin"
        typeFilter={inbox.typeFilter}
        resultCount={inbox.rows.length}
      />
      <ConversationListPanel
        rows={inbox.rows}
        audience="admin"
        isLoading={inbox.isLoading}
        error={inbox.error}
        activeId={active.activeId}
        onOpen={active.open}
        isFiltered={inbox.isFiltered}
        onClearFilters={inbox.clearAll}
        emptyTitle="No conversations yet"
        emptyDescription="Vendor, client and support threads appear here as they are opened."
      />
    </Stack>
  );

  return (
    <>
      <PageTitle
        title="Messages"
        subtitle="Vendor and client conversations handled by the Sinnapi team."
      />

      <InboxSummary counts={inbox.counts} loading={inbox.countsLoading} />

      <StatusTabs
        options={buildInboxTabs(inbox.counts)}
        value={inbox.tab}
        onChange={inbox.setTab}
        loadingCounts={inbox.countsLoading}
        ariaLabel="Filter conversations by status"
      />

      <InboxLayout
        master={master}
        detailOpen={!!active.active}
        onCloseDetail={active.close}
        detail={<ConversationPane conversation={active.active} onClose={active.close} />}
      />
    </>
  );
}
