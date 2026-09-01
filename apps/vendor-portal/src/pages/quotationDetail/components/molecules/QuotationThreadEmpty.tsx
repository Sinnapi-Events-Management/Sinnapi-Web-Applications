import { IconBadge, Skeleton, Stack, Typography } from '@sinnapi/ui';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import MessageClientButton from './MessageClientButton';

type Props = {
  clientName: string;
  isLoading: boolean;
  isStarting: boolean;
  canMessage: boolean;
  onStart: () => void;
};

/**
 * The message tab before there is anything to show.
 *
 * Two states that must not be confused with each other. `isLoading` means the
 * inbox read has not landed and a thread may well exist — showing "no messages
 * yet" here would tell a vendor mid-conversation that they have never spoken to
 * this client, and the correction a beat later is worse than the wait. Only
 * once the list is in does the absence mean anything.
 *
 * The thread is not created on arrival, which is why this state exists at all:
 * a vendor opening ten quotes would otherwise seed ten empty threads into ten
 * clients' inboxes, each one a notification about nothing. The row is written
 * when they press the button.
 */
export default function QuotationThreadEmpty({
  clientName,
  isLoading,
  isStarting,
  canMessage,
  onStart,
}: Props) {
  if (isLoading) {
    return (
      <Stack spacing={1.5} sx={{ flex: 1, justifyContent: 'center', p: 2 }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} variant="rounded" height={48} />
        ))}
      </Stack>
    );
  }

  return (
    <Stack
      spacing={2}
      alignItems="center"
      justifyContent="center"
      sx={{ flex: 1, textAlign: 'center', px: { xs: 2, sm: 4 }, py: 6 }}
    >
      <IconBadge accent="primary" size={56} circular>
        <ForumOutlinedIcon />
      </IconBadge>

      <Stack spacing={0.75} sx={{ maxWidth: 380 }}>
        <Typography variant="h6">No messages yet</Typography>
        <Typography variant="body2" color="text.secondary">
          {canMessage
            ? `Ask ${clientName} a question about this request, or send a note explaining what you have quoted. It is often quicker than a formal revision round.`
            : 'This quotation has no client on it, so there is nobody to message.'}
        </Typography>
      </Stack>

      {canMessage && (
        <MessageClientButton
          onClick={onStart}
          busy={isStarting}
          emphasis="primary"
          label={`Message ${clientName}`}
        />
      )}
    </Stack>
  );
}
