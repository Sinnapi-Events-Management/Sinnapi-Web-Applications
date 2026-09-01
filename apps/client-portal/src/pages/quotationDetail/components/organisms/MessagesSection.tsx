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
  vendorName: string;
  vendorId: string | null;
  isLoading: boolean;
  isStarting: boolean;
  error: string | null;
  onClearError: () => void;
  onStart: () => void;
};

/**
 * The conversation with this vendor, on the quotation page.
 *
 * WHAT THIS THREAD ACTUALLY IS, SAID OUT LOUD
 * `conversations` carries `type`, `vendor_id` and participants — and no
 * `quotation_id`. Both find-or-create RPCs converge on one row per
 * client↔vendor pair by design, so what can be shown here is the whole
 * conversation with this vendor, not the part of it about this quote. Rendering
 * it under a heading that implies otherwise would be the page lying about its
 * own data: a client holding two quotes from one vendor would see the same
 * messages on both and reasonably conclude each had its own thread. The caption
 * says which it is, in one line, once.
 *
 * Composition only, and identical in shape to the vendor's — deliberately. The
 * two sides are having one conversation, and the surfaces they have it through
 * should not behave differently; the caption is now literally the same function
 * call on both, so the wording cannot diverge either.
 * `useQuotationConversation` resolves the thread, `ConversationThread` owns the
 * messages, realtime and the composer, and `EmbeddedThreadSurface` owns the
 * geometry — bounded height so the composer stays pinned, capped reading column
 * so the thread does not stretch across a desktop page.
 */
export default function MessagesSection({
  conversation,
  vendorName,
  vendorId,
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
        caption={conversation ? conversationScopeCaption(vendorName) : undefined}
      >
        {conversation ? (
          <ConversationThread conversation={conversation} />
        ) : (
          <QuotationThreadEmpty
            vendorName={vendorName}
            isLoading={isLoading}
            isStarting={isStarting}
            canMessage={!!vendorId}
            onStart={onStart}
          />
        )}
      </EmbeddedThreadSurface>

      {conversation && <OpenInInboxLink conversationId={conversation.id} />}
    </Stack>
  );
}
