import { Stack, Card, CardContent, Typography, Button, Alert } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import EmptyState from '@/components/ui/EmptyState';
import StatusChip from '@/components/ui/StatusChip';
import QueryState from '@/components/ui/QueryState';
import { formatDate, titleize } from '@/lib/config';
import { one } from '@/lib/rel';
import type { MessageRef } from '@/lib/types';
import { useMessagingModeration } from './hooks/useMessagingModeration';

export default function MessagingModeration() {
  const { rows, isLoading, error, busy, err, blockMessage, dismiss } = useMessagingModeration();

  return (
    <>
      <PageTitle
        title="Messaging moderation"
        subtitle="Flagged messages (auto-detected scam/profanity or user-reported)."
      />
      {err && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      )}
      <QueryState isLoading={isLoading} error={error}>
        {rows.length === 0 ? (
          <EmptyState title="No flagged messages" />
        ) : (
          <Stack spacing={2}>
            {rows.map((f) => {
              const msg = one<MessageRef>(f.messages);
              return (
                <Card key={f.id} variant="outlined">
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle2">Flag: {titleize(f.reason)}</Typography>
                      <StatusChip status={f.status} />
                    </Stack>
                    {msg && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        “{msg.body}”
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(f.created_at)}
                    </Typography>
                    {f.status === 'open' && (
                      <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                        <Button
                          size="small"
                          color="error"
                          variant="contained"
                          disabled={busy === f.id}
                          onClick={() => blockMessage(msg?.id, f.id)}
                        >
                          Block message
                        </Button>
                        <Button size="small" disabled={busy === f.id} onClick={() => dismiss(f.id)}>
                          Dismiss
                        </Button>
                      </Stack>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        )}
      </QueryState>
    </>
  );
}
