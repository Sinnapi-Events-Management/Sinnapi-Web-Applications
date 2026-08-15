import { Stack, PageTitle, Alert } from '@sinnapi/ui';
import { InboxLayout, InboxToolbar, ConversationListPanel } from '@sinnapi/ui/messaging';
import ConversationThread from '@/components/messaging/ConversationThread';
import { useMessagesPage } from './hooks/useMessagesPage';
import { useNewConversation } from './hooks/useNewConversation';
import StartConversationMenu from './components/molecules/StartConversationMenu';
import VendorPickerDialog from './components/organisms/VendorPickerDialog';
import InboxTabs from './components/molecules/InboxTabs';

/**
 * The client inbox.
 *
 * Layout only — `useMessagesPage` owns the rows, filters and open thread, and
 * `useNewConversation` owns starting one. What changed here is the last of
 * those: the previous page listed conversations and told the reader to "message
 * a vendor from their profile", which was both the only route in and a route
 * that did not work — the vendor profile's own button linked back to this list.
 * Reaching Sinnapi was not possible from anywhere in the portal.
 */
export default function Messages() {
  const page = useMessagesPage();
  const start = useNewConversation();

  const master = (
    <Stack spacing={2}>
      <InboxToolbar
        search={page.search}
        audience="client"
        typeFilter={page.typeFilter}
        resultCount={page.rows.length}
        action={
          <StartConversationMenu
            onMessageVendor={start.pickVendor}
            onContactSupport={start.contactSupport}
            busy={start.isBusy}
            compact
          />
        }
      />

      <InboxTabs counts={page.counts} value={page.tab} onChange={page.setTab} />

      <ConversationListPanel
        rows={page.rows}
        audience="client"
        isLoading={page.isLoading}
        error={page.error}
        activeId={page.activeId}
        onOpen={page.open}
        isFiltered={page.isFiltered}
        onClearFilters={page.clearAll}
        emptyTitle="No conversations yet"
        emptyDescription="Message a vendor you are working with, or ask the Sinnapi team a question."
        emptyAction={
          <StartConversationMenu
            onMessageVendor={start.pickVendor}
            onContactSupport={start.contactSupport}
            busy={start.isBusy}
          />
        }
      />
    </Stack>
  );

  return (
    <>
      <PageTitle title="Messages" subtitle="Chat with your vendors and the Sinnapi team." />

      {/* Failures from starting a conversation surface here rather than inside
          the dialog, because `contactSupport` has no dialog to fail in. */}
      {start.error && !start.vendorPickerOpen && (
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

      <VendorPickerDialog
        open={start.vendorPickerOpen}
        onClose={start.closeVendorPicker}
        onPick={start.messageVendor}
        busy={start.isBusy}
        error={start.error}
      />
    </>
  );
}
