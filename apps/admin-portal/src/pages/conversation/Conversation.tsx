import { Card, CardContent, Box } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import MessageThread from '@/components/messaging/MessageThread';
import MessageComposer from '@/components/messaging/MessageComposer';
import { useConversation } from './hooks/useConversation';

/**
 * Full-page view of a single thread, reached from the inbox's "open full view"
 * action or a deep link. Rendering goes through the shared <MessageThread />, so
 * it stays identical to the inbox's thread pane.
 */
export default function Conversation() {
  const { conversationId, messages, currentUserId, isLoading, error } = useConversation();

  return (
    <>
      <PageTitle title="Conversation" subtitle="Full message history for this thread." />
      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent
          sx={{ minHeight: 360, maxHeight: 'calc(100vh - 260px)', overflowY: 'auto', py: 2 }}
        >
          <MessageThread
            messages={messages}
            currentUserId={currentUserId}
            isLoading={isLoading}
            error={error}
            scrollKey={conversationId}
          />
        </CardContent>
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <MessageComposer conversationId={conversationId} />
        </Box>
      </Card>
    </>
  );
}
