import { Chip } from '@sinnapi/ui';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import type { EventUrgency } from '@/lib/events';

type EventUrgencyPillProps = {
  urgency: EventUrgency;
  size?: 'small' | 'medium';
};

/**
 * "In 4 days" — the one number a vendor scanning this feed is actually
 * deciding on.
 *
 * It used to sit on the card's cover image, which meant it could be painted in
 * fixed white-on-scrim ink. The cover is gone (the card now mirrors the client
 * portal's event card), so the pill sits on the card's own surface and has to
 * work on paper in both colour schemes — hence theme colours rather than
 * literal palette tokens, which is also what keeps it legible on the hero's
 * tinted banner where the event page reuses it.
 *
 * Only the seven-day window spends a colour. A warm fill there and a quiet
 * outline everywhere else means the urgent cards pop out of a scrolled grid
 * without the other two-thirds having to compete; colouring every band would
 * turn the whole feed into a traffic-light wall that carries no signal.
 */
export default function EventUrgencyPill({ urgency, size = 'small' }: EventUrgencyPillProps) {
  const isUrgent = urgency.tone === 'urgent';

  return (
    <Chip
      size={size}
      icon={<AccessTimeIcon />}
      label={urgency.label}
      color={isUrgent ? 'warning' : 'default'}
      variant={isUrgent ? 'filled' : 'outlined'}
      sx={{
        fontWeight: 600,
        flexShrink: 0,
        // A past event is a fact, not a prompt — it is the one tone that should
        // recede rather than merely stay quiet.
        ...(urgency.tone === 'past' && { color: 'text.disabled' }),
        '& .MuiChip-icon': { color: 'inherit', fontSize: 15 },
      }}
    />
  );
}
