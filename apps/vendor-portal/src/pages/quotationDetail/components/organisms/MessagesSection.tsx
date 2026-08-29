import { Alert, Stack } from '@sinnapi/ui';
import {
  EmbeddedThreadSurface,
  conversationScopeCaption,
  type ConversationView,
} from '@sinnapi/ui/messaging';
import ConversationThread from '@/components/messaging/ConversationThread';
import QuotationThreadEmpty from '../molecules/QuotationThreadEmpty';
import OpenInInboxLink from '../molecules/OpenInInboxLink';

type Props = {
  conversation: ConversationView | null;
  clientName: string;
  clientId: string | null;
  isLoading: boolean;
  isStarting: boolean;
  error: string | null;
  onClearError: () => void;
  onStart: () => void;
};

/**
 * The conversation with this client, on the quotation page.
 *
 * WHAT THIS THREAD ACTUALLY IS, SAID OUT LOUD
 * `conversations` carries `type`, `vendor_id` and participants — and no
 * `quotation_id`. Both find-or-create RPCs converge on one row per
 * client↔vendor pair by design, so what can be shown here is the whole
 * conversation with this client, not the part of it about this quote. Rendering
 * it under a heading that implies otherwise would be the page lying about its
 * own data: a vendor who quoted this client twice would see the same messages
 * on both quotes and reasonably conclude each page had its own thread. The
 * caption says which it is, in one line, once — and comes from
 * `conversationScopeCaption` so the client's copy of it cannot drift.
 *
 * Composition only, and nothing here decides how the thread looks.
 * `useQuotationConversation` resolves the thread and owns the find-or-create;
 * `ConversationThread` owns the messages, realtime, presence and the composer;
 * `EmbeddedThreadSurface` owns the geometry — the bounded height that keeps the
 * composer pinned inside a tab panel, and the capped reading column that keeps
 * a desktop-width page from stretching the conversation across the monitor.
 */
export default function MessagesSection({
  conversation,
  clientName,
  clientId,
  isLoading,
  isStarting,
  error,
  onClearError,
  onStart,
}: Props) {
  return (
    <Stack spacing={2}>
      {error && (
        <Alert severity="error" onClose={onClearError}>
          {error}
        </Alert>
      )}

      <EmbeddedThreadSurface
        caption={conversation ? conversationScopeCaption(clientName) : undefined}
      >
        {conversation ? (
          <ConversationThread conversation={conversation} />
        ) : (
          <QuotationThreadEmpty
            clientName={clientName}
            isLoading={isLoading}
            isStarting={isStarting}
            canMessage={!!clientId}
            onStart={onStart}
          />
        )}
      </EmbeddedThreadSurface>

      {conversation && <OpenInInboxLink conversationId={conversation.id} />}
    </Stack>
  );
}
