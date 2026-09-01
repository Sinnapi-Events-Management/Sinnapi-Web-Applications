import { Chip } from '@sinnapi/ui';

type RequirementOpenChipProps = { isOpen: boolean };

/**
 * Whether the client still needs someone for this line.
 *
 * `is_open` is derived server-side from COMMITTED BOOKINGS ONLY (see
 * `list_event_requirements_public`), which is the distinction the copy has to
 * carry: a line with two quotes already out is still worth a third vendor's
 * time and reads as open, while one that is booked is genuinely gone. "Taken"
 * rather than "Closed" says that — a closed line sounds like the client stopped
 * looking, when in fact somebody else won it.
 *
 * Colour-neutral by design. Open is the healthy starting state of a plan, not a
 * warning, and tinting it would put a wall of green or amber down a list where
 * every row is an ordinary fact.
 */
export default function RequirementOpenChip({ isOpen }: RequirementOpenChipProps) {
  return (
    <Chip
      size="small"
      variant={isOpen ? 'filled' : 'outlined'}
      color={isOpen ? 'success' : 'default'}
      label={isOpen ? 'Open' : 'Taken'}
      sx={{ flexShrink: 0, ...(!isOpen && { color: 'text.secondary' }) }}
    />
  );
}
