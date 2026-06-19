import { useParams } from 'react-router-dom';
import { Card, CardContent, Box, Typography, Stack } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import QueryState from '@/components/ui/QueryState';
import MessageComposer from '@/components/messaging/MessageComposer';
import { useMessages } from '@/hooks/queries';
import { useAuth } from '@/auth/AuthProvider';

export default function Conversation() {
  const { conversationId = '' } = useParams();
  const { user } = useAuth();
  const { data, isLoading, error } = useMessages(conversationId);
  const messages = data ?? [];

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
                          bgcolor: mine ? 'primary.main' : 'grey.100',
                          color: mine ? 'primary.contrastText' : 'text.primary',
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
