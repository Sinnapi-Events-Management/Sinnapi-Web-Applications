'use client';
import { Box, Button, Stack, Typography, alpha } from '@mui/material';
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
  /** Rendered in the gutter beside an incoming bubble. */
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
 *
 * WHY THE WIDTH IS CAPPED IN `ch` AND NOT ONLY IN `%`
 * A percentage alone is a promise about the container, not about the reader. On
 * a wide pane, 72% of the pane is a 1300px bubble — around 190 characters per
 * line, more than twice the ~65–75 the eye can track without losing its place
 * on the return sweep. `min()` keeps the percentage as the mobile floor and lets
 * the character measure win the moment there is room for it to.
 *
 * WHY THE ROW IS A COLUMN
 * The avatar has to bottom-align with the *bubble*. Laying the avatar and a
 * single stack containing bubble-plus-footer side by side bottom-aligns it with
 * the footer instead, which is what left the avatar hanging below its own
 * message. So the turn is a column: an avatar-and-bubble row that can be
 * bottom-aligned honestly, with the retry affordance underneath it.
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
        flexDirection: 'column',
        alignItems: mine ? 'flex-end' : 'flex-start',
        // A tight gap inside a turn, a wider one between turns: the vertical
        // rhythm is what tells the reader where one person stopped talking.
        mt: grouped ? 0.375 : 1.5,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          alignItems: 'flex-end',
          flexDirection: mine ? 'row-reverse' : 'row',
          maxWidth: { xs: '92%', sm: 'min(84%, 58ch)' },
          minWidth: 0,
        }}
      >
        {!mine && avatar}

        <Box sx={{ minWidth: 0 }}>
          {!mine && !grouped && senderName && (
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                px: 0.75,
                mb: 0.25,
                fontWeight: 600,
                color: 'text.secondary',
              }}
            >
              {senderName}
            </Typography>
          )}

          <Box
            sx={{
              px: 1.75,
              py: 1.15,
              borderRadius: 2.5,
              ...(mine
                ? { borderBottomRightRadius: grouped ? 2.5 : 0.75 }
                : { borderBottomLeftRadius: grouped ? 2.5 : 0.75 }),
              bgcolor: mine ? 'secondary.main' : (t) => alpha(t.palette.text.primary, 0.06),
              color: mine ? 'secondary.contrastText' : 'text.primary',
              // A hairline keeps the incoming wash from dissolving into a pale
              // card; at 6% opacity the fill alone has no edge to read.
              border: 1,
              borderColor: mine ? 'transparent' : (t) => alpha(t.palette.text.primary, 0.07),
              // A failed send stays legible but visibly not-delivered.
              opacity: message.failed ? 0.6 : 1,
            }}
          >
            {hasAttachments && (
              <Stack spacing={0.75} sx={{ mb: 0.75, minWidth: { xs: 180, sm: 240 } }}>
                {message.attachments.map((a) => (
                  <AttachmentChip key={a.id} attachment={a} mine={mine} onOpen={onOpenAttachment} />
                ))}
              </Stack>
            )}

            {/* Text and stamp share the last line where there is room for both,
                which is where every messaging app has taught people to look. */}
            <Box sx={{ display: 'flex', alignItems: 'flex-end', columnGap: 1.75, minWidth: 0 }}>
              {hasBody && (
                <Typography
                  variant="body2"
                  sx={{
                    // Newlines the sender typed are meaning, not whitespace to
                    // collapse; `anywhere` stops an unbroken URL from widening
                    // the bubble past its container.
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'anywhere',
                    // Looser than the body default: at chat measure the return
                    // sweep is the hard part, and 1.55 is what keeps consecutive
                    // lines from being mistaken for one another.
                    lineHeight: 1.55,
                    minWidth: 0,
                  }}
                >
                  {message.body}
                </Typography>
              )}

              <MessageMeta
                createdAt={message.createdAt}
                editedAt={message.editedAt}
                mine={mine}
                pending={message.pending}
                failed={message.failed}
                tone={mine ? 'onAccent' : 'default'}
              />
            </Box>
          </Box>
        </Box>
      </Box>

      {message.failed && onRetry && (
        <Button
          size="small"
          startIcon={<RefreshIcon sx={{ fontSize: 14 }} />}
          onClick={() => onRetry(message)}
          sx={{ minHeight: 0, py: 0.25, fontSize: 12, mt: 0.25 }}
        >
          Retry
        </Button>
      )}
    </Box>
  );
}
