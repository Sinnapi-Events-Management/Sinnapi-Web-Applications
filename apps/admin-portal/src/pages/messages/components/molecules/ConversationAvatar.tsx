import { Avatar, Badge, alpha } from '@sinnapi/ui';
import { initials } from '@/lib/config';
import { conversationTypeMeta } from '../../schema';

type Props = {
  title: string;
  type: string;
  size?: number;
};

/**
 * Identity mark for a conversation: initials tinted by conversation type, with
 * the type's icon as a corner badge so vendor and support threads are
 * distinguishable at a glance without reading the chip.
 */
export default function ConversationAvatar({ title, type, size = 44 }: Props) {
  const { color, Icon, label } = conversationTypeMeta(type);
  const tint = color === 'default' ? 'text.secondary' : `${color}.main`;

  return (
    <Badge
      overlap="circular"
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      badgeContent={
        <Icon
          aria-hidden
          sx={{
            fontSize: 13,
            color: 'common.white',
            bgcolor: tint,
            borderRadius: '50%',
            p: '2px',
            boxSizing: 'content-box',
            border: 2,
            borderColor: 'background.paper',
          }}
        />
      }
    >
      <Avatar
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
        {initials(title)}
      </Avatar>
    </Badge>
  );
}
