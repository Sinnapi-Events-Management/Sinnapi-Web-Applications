import { Box, Stack, Typography, Tooltip, alpha } from '@sinnapi/ui';
import BlockIcon from '@mui/icons-material/Block';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { formatDateTime, formatRelative } from '@/lib/config';
import type { MessageModel } from '@/lib/types';

type Props = {
  message: MessageModel;
  /** Renders on the right, in the primary tint, when the admin wrote it. */
  mine: boolean;
};

/**
 * A single chat bubble. Purely presentational — the thread decides ownership and
 * grouping. Moderation state is surfaced inline (blocked messages are dimmed and
 * struck through) because admins read these threads to police them, not just to
 * reply.
 */
export default function MessageBubble({ message, mine }: Props) {
  const blocked = message.moderation_status === 'blocked';
  const pending = message.moderation_status === 'pending';

  return (
    <Box sx={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
      <Box sx={{ maxWidth: { xs: '85%', sm: '75%' }, minWidth: 0 }}>
        <Box
          sx={{
            px: 1.75,
            py: 1.25,
            borderRadius: 2.5,
            // Tail on the sender's side, mirroring common chat UIs.
            borderBottomRightRadius: mine ? 6 : 20,
            borderBottomLeftRadius: mine ? 20 : 6,
            bgcolor: mine ? 'primary.main' : 'action.hover',
            color: mine ? 'primary.contrastText' : 'text.primary',
            border: 1,
            borderColor: mine ? 'transparent' : 'divider',
            opacity: blocked ? 0.55 : 1,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              textDecoration: blocked ? 'line-through' : 'none',
              fontStyle: message.body ? 'normal' : 'italic',
            }}
          >
            {message.body ?? 'Message removed'}
          </Typography>
        </Box>

        <Stack
          direction="row"
          alignItems="center"
          spacing={0.5}
          sx={{ mt: 0.5, px: 0.5, justifyContent: mine ? 'flex-end' : 'flex-start' }}
        >
          {blocked && (
            <Tooltip title="Blocked by moderation">
              <BlockIcon sx={{ fontSize: 14, color: 'error.main' }} />
            </Tooltip>
          )}
          {pending && (
            <Tooltip title="Awaiting moderation">
              <ScheduleIcon sx={{ fontSize: 14, color: 'warning.main' }} />
            </Tooltip>
          )}
          <Tooltip title={formatDateTime(message.created_at)}>
            <Typography
              variant="caption"
              sx={{ color: (t) => alpha(t.palette.text.secondary, 0.9) }}
            >
              {formatRelative(message.created_at)}
            </Typography>
          </Tooltip>
        </Stack>
      </Box>
    </Box>
  );
}
