import {
  Card,
  CardContent,
  Box,
  Typography,
  Stack,
  PageTitle,
  QueryState,
  alpha,
} from '@sinnapi/ui';
import MessageComposer from '@/components/messaging/MessageComposer';
import { useConversation } from './hooks/useConversation';

export default function Conversation() {
  const { conversationId, user, messages, isLoading, error } = useConversation();

  return (
    <>
      <PageTitle title="Conversation" />
      <Card variant="outlined">
        <CardContent sx={{ minHeight: 360, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <QueryState isLoading={isLoading} error={error}>
            {messages.length === 0 ? (
              <Typography color="text.secondary" sx={{ m: 'auto' }}>
                No messages yet. Say hello 👋
              </Typography>
            ) : (
              <Stack spacing={1} sx={{ flex: 1 }}>
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
                          // Own messages carry the portal's action colour; the
                          // incoming bubble is a translucent ink wash rather
                          // than a fixed grey, so it stays a subtle step off the
                          // card in both the light and the warm dark scheme.
                          bgcolor: mine
                            ? 'secondary.main'
                            : (t) => alpha(t.palette.text.primary, 0.07),
                          color: mine ? 'secondary.contrastText' : 'text.primary',
                        }}
                      >
                        <Typography variant="body2">{m.body}</Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </QueryState>
        </CardContent>
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <MessageComposer conversationId={conversationId} />
        </Box>
      </Card>
    </>
  );
}
