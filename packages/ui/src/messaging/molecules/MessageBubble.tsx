'use client';
import { Box, Stack, Typography, Button, alpha } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { MessageMeta } from '../atoms/MessageMeta';
import { AttachmentChip } from './AttachmentChip';
import type { MessageAttachmentView, MessageView } from '../types';

export type MessageBubbleProps = {
  message: MessageView;
  mine: boolean;
  /**
   * True when the previous bubble is from the same sender within the grouping
   * window. Drops the avatar and tightens the corner radius so a run of replies
   * reads as one turn rather than several.
   */
  grouped?: boolean;
  /** Rendered to the left of an incoming bubble; omitted when `grouped`. */
  avatar?: React.ReactNode;
  /** Shown above the first bubble of an incoming turn in multi-party threads. */
  senderName?: string | null;
  onOpenAttachment?: (attachment: MessageAttachmentView) => Promise<void>;
  /** Offered on a failed optimistic send. */
  onRetry?: (message: MessageView) => void;
};

/**
 * One message.
 *
 * Own messages take the portal's action colour; incoming ones are a translucent
 * wash of the ink colour rather than a fixed grey, so the step off the card
 * holds in both the light scheme and the warm dark one. That choice is carried
 * over from the client portal's original inline bubble, which got it right.
 *
 * The asymmetric corner — square on the side the bubble is anchored to — is
 * what makes a column of bubbles read as a conversation with two sides rather
 * than a list of pills. It is dropped mid-run so grouped messages fuse.
 */
export function MessageBubble({
  message,
  mine,
  grouped = false,
  avatar,
  senderName,
  onOpenAttachment,
  onRetry,
}: MessageBubbleProps) {
  const hasBody = !!message.body?.trim();
  const hasAttachments = message.attachments.length > 0;

  return (
    <Box
      component="li"
      sx={{
        listStyle: 'none',
        display: 'flex',
        gap: 1,
        alignItems: 'flex-end',
        flexDirection: mine ? 'row-reverse' : 'row',
        // A tight gap inside a turn, a wider one between turns: the vertical
        // rhythm is what tells the reader where one person stopped talking.
        mt: grouped ? 0.25 : 1.25,
      }}
    >
      {!mine && avatar}

      <Box sx={{ maxWidth: { xs: '82%', sm: '72%' }, minWidth: 0 }}>
        {!mine && !grouped && senderName && (
          <Typography
            variant="caption"
            sx={{ display: 'block', px: 0.75, mb: 0.25, fontWeight: 600, color: 'text.secondary' }}
          >
            {senderName}
          </Typography>
        )}

        <Box
          sx={{
            px: 1.5,
            py: 1,
            borderRadius: 2.5,
            ...(mine
              ? { borderBottomRightRadius: grouped ? 2.5 : 0.5 }
              : { borderBottomLeftRadius: grouped ? 2.5 : 0.5 }),
            bgcolor: mine ? 'secondary.main' : (t) => alpha(t.palette.text.primary, 0.07),
            color: mine ? 'secondary.contrastText' : 'text.primary',
            // A failed send stays legible but visibly not-delivered.
            opacity: message.failed ? 0.6 : 1,
          }}
        >
          {hasBody && (
            <Typography
              variant="body2"
              sx={{
                // Newlines the sender typed are meaning, not whitespace to
                // collapse; `break-word` stops an unbroken URL from widening
                // the bubble past its container.
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere',
              }}
            >
              {message.body}
            </Typography>
          )}

          {hasAttachments && (
            <Stack spacing={0.75} sx={{ mt: hasBody ? 1 : 0, minWidth: { xs: 180, sm: 240 } }}>
              {message.attachments.map((a) => (
                <AttachmentChip key={a.id} attachment={a} mine={mine} onOpen={onOpenAttachment} />
              ))}
            </Stack>
          )}
        </Box>

        <MessageMeta
          createdAt={message.createdAt}
          editedAt={message.editedAt}
          mine={mine}
          pending={message.pending}
          failed={message.failed}
        />

        {message.failed && onRetry && (
          <Box sx={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
            <Button
              size="small"
              startIcon={<RefreshIcon sx={{ fontSize: 14 }} />}
              onClick={() => onRetry(message)}
              sx={{ minHeight: 0, py: 0.25, fontSize: 12 }}
            >
              Retry
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}
