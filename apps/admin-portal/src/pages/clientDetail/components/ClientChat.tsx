import { Box, Typography, Stack, CircularProgress, Alert } from '@sinnapi/ui';
import MessageComposer from '@/components/messaging/MessageComposer';
import { useAuth } from '@/auth/AuthProvider';
import { useClientAdminConversation, useMessages } from '@/hooks/queries';

/**
 * Admin ↔ client chat. Resolves (or creates) the client_admin conversation via
 * an RPC, then reuses the shared messaging query + composer. The current admin
 * is enrolled as a participant by the RPC, so they can post immediately.
 */
export default function ClientChat({ clientId }: { clientId: string }) {
  const { user } = useAuth();
  const {
    data: conversationId,
    isLoading: convoLoading,
    error: convoError,
  } = useClientAdminConversation(clientId);
  const { data: messages = [], isLoading, error } = useMessages(conversationId ?? '');

  if (convoLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (convoError || !conversationId) {
    return (
      <Alert severity="error">
        {convoError instanceof Error ? convoError.message : "Couldn't open this conversation."}
      </Alert>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 460 }}>
      <Box sx={{ flex: 1, overflowY: 'auto', px: 0.5, py: 1 }}>
        {error ? (
          <Alert severity="error">
            {error instanceof Error ? error.message : 'Failed to load messages.'}
          </Alert>
        ) : isLoading ? (
          <Box sx={{ display: 'grid', placeItems: 'center', height: '100%' }}>
            <CircularProgress size={24} />
          </Box>
        ) : messages.length === 0 ? (
          <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 6 }}>
            No messages yet. Start the conversation 👋
          </Typography>
        ) : (
          <Stack spacing={1}>
            {messages.map((m) => {
              const mine = m.sender_id === user?.id;
              return (
                <Box
                  key={m.id}
                  sx={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '75%' }}
                >
                  <Box
                    sx={{
                      px: 1.5,
                      py: 1,
                      borderRadius: 2,
                      bgcolor: mine ? 'primary.main' : 'grey.100',
                      color: mine ? 'primary.contrastText' : 'text.primary',
                    }}
                  >
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {m.body}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>
      <Box sx={{ pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
        <MessageComposer conversationId={conversationId} />
      </Box>
    </Box>
  );
}
