'use client';
import { Avatar, Badge, Box, alpha } from '@mui/material';
import { conversationTypeMeta, type MessagingAudience } from '../conversationType';
import { initialsOf } from '../format';
import { PresenceDot } from '../atoms/PresenceDot';

export type ConversationAvatarProps = {
  title: string;
  type: string;
  audience: MessagingAudience;
  size?: number;
  avatarUrl?: string | null;
  /**
   * Presence of the counterparty. `undefined` means "not tracked here" and
   * renders no dot at all — distinct from `false`, which is a known-offline
   * state the dot does show.
   */
  online?: boolean;
  /**
   * Set false in the thread gutter. A corner badge on a 28px disc, repeated
   * beside every incoming turn, is a marker restating what the header already
   * said once — and at that size the icon inside it is illegible anyway, so all
   * it contributes is clutter down the left edge of the conversation.
   */
  showBadge?: boolean;
};

/**
 * Identity mark for a conversation: the counterparty's photo where one exists,
 * initials tinted by conversation type where it does not.
 *
 * The corner badge carries either presence or the type icon, never both — they
 * occupy the same anchor, and stacking two markers on a 44px circle produces a
 * smear rather than two signals. Presence wins when it is being tracked,
 * because "are they here right now" is the more perishable fact; the type is
 * still available from the chip on the row and from the avatar's own tint.
 */
export function ConversationAvatar({
  title,
  type,
  audience,
  size = 44,
  avatarUrl,
  online,
  showBadge = true,
}: ConversationAvatarProps) {
  const { color, Icon, label } = conversationTypeMeta(type, audience);
  const tint = color === 'default' ? 'text.secondary' : `${color}.main`;

  const badge =
    online === undefined ? (
      <Icon
        aria-hidden
        sx={{
          fontSize: Math.max(11, size / 3.4),
          color: 'common.white',
          bgcolor: tint,
          borderRadius: '50%',
          p: '2px',
          boxSizing: 'content-box',
          border: 2,
          borderColor: 'background.paper',
        }}
      />
    ) : (
      <PresenceDot online={online} size={Math.max(8, size / 5)} ring />
    );

  const face = (
    <Avatar
      src={avatarUrl ?? undefined}
      aria-label={`${label} conversation with ${title}`}
      sx={{
        width: size,
        height: size,
        fontSize: size / 3,
        fontWeight: 700,
        color: tint,
        bgcolor: (t) =>
          alpha(color === 'default' ? t.palette.text.secondary : t.palette[color].main, 0.14),
      }}
    >
      {initialsOf(title)}
    </Avatar>
  );

  if (!showBadge) return face;

  return (
    <Badge
      overlap="circular"
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      badgeContent={badge}
    >
      {face}
    </Badge>
  );
}

/**
 * Avatar-sized spacer.
 *
 * Consecutive bubbles from the same sender drop their avatar, but the bubbles
 * still have to line up with the one that kept it — otherwise a run of replies
 * marches leftward up the thread. This holds the column open.
 */
export function ConversationAvatarSpacer({ size = 28 }: { size?: number }) {
  return <Box aria-hidden sx={{ width: size, height: size, flexShrink: 0 }} />;
}
