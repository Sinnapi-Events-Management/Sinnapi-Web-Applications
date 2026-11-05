import { Chip } from '@sinnapi/ui';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { CHANNEL_LABELS, isNotificationChannel } from '../../schema';

type Props = {
  channel: string;
};

/**
 * Delivery-channel chip: an icon + label that lets an admin tell email from
 * in-app at a glance. Falls back to the raw value for any channel not yet mapped
 * so an unexpected enum member still renders instead of breaking the row.
 */
export default function ChannelBadge({ channel }: Props) {
  const known = isNotificationChannel(channel);
  const label = known ? CHANNEL_LABELS[channel] : channel;
  const look =
    channel === 'email'
      ? { color: 'primary' as const, icon: <EmailOutlinedIcon /> }
      : channel === 'whatsapp'
        ? { color: 'success' as const, icon: <WhatsAppIcon /> }
        : { color: 'info' as const, icon: <NotificationsNoneOutlinedIcon /> };

  return (
    <Chip
      size="small"
      variant="outlined"
      color={look.color}
      icon={look.icon}
      label={label}
      sx={{ fontWeight: 600, textTransform: 'capitalize' }}
    />
  );
}
