import { Box, CircularProgress, Alert } from '@sinnapi/ui';
import EmbeddedThread from '@/components/messaging/EmbeddedThread';
import { useClientAdminConversation } from '@/hooks/queries';

/**
 * Admin ↔ client chat on the client detail page.
 *
 * `useClientAdminConversation` resolves — or creates — the `client_admin`
 * thread and enrols the calling admin as a participant, so they can post
 * immediately. It converges on the same thread the client reaches through
 * "Contact Sinnapi" in their own portal, because both RPCs match on the
 * client's participation rather than creating a fresh row.
 *
 * Everything below the resolve is the shared thread: bubbles, day dividers,
 * attachments, typing and realtime.
 */
export default function ClientChat({
  clientId,
  clientName,
}: {
  clientId: string;
  clientName?: string | null;
}) {
  const { data: conversationId, isLoading, error } = useClientAdminConversation(clientId);

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !conversationId) {
    return (
      <Alert severity="error">
        {error instanceof Error ? error.message : "Couldn't open this conversation."}
      </Alert>
    );
  }

  return (
    <EmbeddedThread
      conversationId={conversationId}
      counterpartyName={clientName || 'Client'}
      counterpartyType="client_admin"
    />
  );
}
