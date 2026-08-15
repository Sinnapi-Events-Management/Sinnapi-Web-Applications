import { Stack, PageTitle, Alert } from '@sinnapi/ui';
import { InboxLayout, InboxToolbar, ConversationListPanel } from '@sinnapi/ui/messaging';
import ConversationThread from '@/components/messaging/ConversationThread';
import { useMessagesPage } from './hooks/useMessagesPage';
import { useNewConversation } from './hooks/useNewConversation';
import StartConversationMenu from './components/molecules/StartConversationMenu';
import ClientPickerDialog from './components/organisms/ClientPickerDialog';
import InboxTabs from './components/molecules/InboxTabs';

/**
 * The vendor inbox.
 *
 * Layout only — `useMessagesPage` owns rows, filters and the open thread, and
 * `useNewConversation` owns starting one. The page it replaces was a 59-line
 * list that could name none of its conversations (every row read "Client
 * Vendor"), offered no way to begin one, and pointed its empty state at
 * `/discover` — a client-portal route that does not exist in this app.
 */
export default function Messages() {
  const page = useMessagesPage();
  const start = useNewConversation();

  const newMessage = (compact: boolean) => (
    <StartConversationMenu
      onMessageClient={start.pickClient}
      onContactSupport={start.contactSupport}
      busy={start.isBusy}
      compact={compact}
    />
  );

  const master = (
    <Stack spacing={2}>
      <InboxToolbar
        search={page.search}
        audience="vendor"
        typeFilter={page.typeFilter}
        resultCount={page.rows.length}
        action={newMessage(true)}
      />

      <InboxTabs counts={page.counts} value={page.tab} onChange={page.setTab} />

      <ConversationListPanel
        rows={page.rows}
        audience="vendor"
        isLoading={page.isLoading}
        error={page.error}
        activeId={page.activeId}
        onOpen={page.open}
        isFiltered={page.isFiltered}
        onClearFilters={page.clearAll}
        emptyTitle="No conversations yet"
        emptyDescription="Message a client you are working with, or ask the Sinnapi team a question."
        emptyAction={newMessage(false)}
      />
    </Stack>
  );

  return (
    <>
      <PageTitle title="Messages" subtitle="Chat with your clients and the Sinnapi team." />

      {/* `contactSupport` has no dialog to fail inside, so its errors surface here. */}
      {start.error && !start.clientPickerOpen && (
        <Alert severity="error" onClose={start.clearError} sx={{ mb: 2 }}>
          {start.error}
        </Alert>
      )}

      <InboxLayout
        master={master}
        detail={<ConversationThread conversation={page.active} onClose={page.close} />}
        detailOpen={!!page.active}
        onCloseDetail={page.close}
      />

      <ClientPickerDialog
        open={start.clientPickerOpen}
        onClose={start.closeClientPicker}
        onPick={start.messageClient}
        busy={start.isBusy}
        error={start.error}
      />
    </>
  );
}
