'use client';
import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import { ConversationAvatar, UnreadBadge, formatRelativeTime } from '../../../messaging';
import type { ConversationView, MessagingAudience } from '../../../messaging';

export type PortalMessagePreviewRowProps = {
  conversation: ConversationView;
  audience: MessagingAudience;
  onOpen: (conversationId: string) => void;
};

/**
 * One conversation, compressed to a top-bar row.
 *
 * A denser sibling of the inbox's `ConversationRow` rather than a reuse of it:
 * that row carries a type chip, a status chip, a subject line and a two-line
 * preview, which is right for a 400px-wide master column and far too much for a
 * dropdown the user is scanning in under a second. What both share — the
 * avatar, the unread pill, the relative stamp — is imported, so the two stay
 * recognisably the same object in two densities.
 *
 * Unread reads three ways at once (weight, the tinted rail, the count) because
 * each fails where the others do not: weight vanishes at a glance down a list,
 * the rail alone excludes anyone who cannot see the colour, and only the count
 * says *how much*.
 */
export function PortalMessagePreviewRow({
  conversation,
  audience,
  onOpen,
}: PortalMessagePreviewRowProps) {
  const unread = conversation.unreadCount > 0;

  return (
    <ButtonBase
      onClick={() => onOpen(conversation.id)}
      aria-label={`Open conversation with ${conversation.title}${
        unread ? `, ${conversation.unreadCount} unread` : ''
      }`}
      sx={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        px: 1.25,
        py: 1.25,
        borderRadius: 2,
        borderLeft: 3,
        borderColor: unread ? 'primary.main' : 'transparent',
        bgcolor: unread ? 'action.hover' : 'transparent',
        transition: 'background-color 120ms ease',
        '&:hover, &:focus-visible': { bgcolor: 'action.selected' },
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <ConversationAvatar
          title={conversation.title}
          type={conversation.type}
          audience={audience}
          avatarUrl={conversation.avatarUrl}
          size={36}
        />

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <Typography
              variant="body2"
              noWrap
              sx={{ flex: 1, minWidth: 0, fontWeight: unread ? 700 : 500 }}
            >
              {conversation.title}
            </Typography>
            <Typography
              variant="caption"
              color={unread ? 'primary.main' : 'text.secondary'}
              sx={{ whiteSpace: 'nowrap', fontWeight: unread ? 600 : 400 }}
            >
              {formatRelativeTime(conversation.lastMessageAt)}
            </Typography>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.25 }}>
            <Typography
              variant="caption"
              color={conversation.preview ? 'text.secondary' : 'text.disabled'}
              sx={{
                flex: 1,
                minWidth: 0,
                display: '-webkit-box',
                WebkitLineClamp: 1,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                wordBreak: 'break-word',
                fontStyle: conversation.preview ? 'normal' : 'italic',
              }}
            >
              {conversation.preview ? (
                <>
                  {/* Naming your own last message is what stops an unanswered
                      thread from looking like it is waiting on you. */}
                  {conversation.previewIsMine && (
                    <Box component="span" sx={{ color: 'text.disabled' }}>
                      You:{' '}
                    </Box>
                  )}
                  {conversation.preview}
                </>
              ) : (
                'No messages yet'
              )}
            </Typography>
            <UnreadBadge count={conversation.unreadCount} muted={conversation.muted} />
          </Stack>
        </Box>
      </Stack>
    </ButtonBase>
  );
}
