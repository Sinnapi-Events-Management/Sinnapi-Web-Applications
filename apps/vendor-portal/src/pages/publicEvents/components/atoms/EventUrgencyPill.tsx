import { Chip } from '@sinnapi/ui';
import { palette, withAlpha, common } from '@sinnapi/ui/tokens';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import type { EventUrgency } from '../../schema/presenter';

type EventUrgencyPillProps = { urgency: EventUrgency };

/**
 * "In 4 days" over the card's cover — the one number a vendor scanning this
 * feed is actually deciding on.
 *
 * Only the seven-day window spends a colour. A warm fill there and translucent
 * glass everywhere else means the urgent cards pop out of a scrolled grid
 * without the other two-thirds having to compete; colouring every band would
 * turn the whole feed into a traffic-light wall that carries no signal.
 *
 * Colours are fixed rather than scheme-derived because this pill only ever sits
 * on the cover's dark scrim, which is dark under both colour schemes — a
 * scheme-flipping ink would go white-on-white in light mode.
 */
export default function EventUrgencyPill({ urgency }: EventUrgencyPillProps) {
  const isUrgent = urgency.tone === 'urgent';

  return (
    <Chip
      size="small"
      icon={<AccessTimeIcon />}
      label={urgency.label}
      sx={{
        fontWeight: 600,
        // `backdropFilter` is progressive: without support the chip is simply a
        // flat translucent pill, which the scrim already makes legible.
        backdropFilter: 'blur(6px)',
        color: isUrgent ? palette.light.warning.contrastText : common.white,
        bgcolor: isUrgent ? palette.light.warning.light : withAlpha(common.white, 0.18),
        border: '1px solid',
        borderColor: isUrgent ? 'transparent' : withAlpha(common.white, 0.28),
        '& .MuiChip-icon': { color: 'inherit', fontSize: 15 },
      }}
    />
  );
}
