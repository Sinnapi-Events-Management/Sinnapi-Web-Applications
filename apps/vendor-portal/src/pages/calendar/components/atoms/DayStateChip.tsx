import { Chip } from '@sinnapi/ui';
import { DAY_LOOK, type DayState } from '../../schema';

/**
 * What one day is, as a pill. The colour comes from `DAY_LOOK` so the chip can
 * never name a state in a different hue from the grid that drew it.
 */
export default function DayStateChip({
  state,
  size = 'small',
}: {
  state: DayState;
  size?: 'small' | 'medium';
}) {
  const look = DAY_LOOK[state];
  return <Chip size={size} label={look.label} color={look.accent} variant="filled" />;
}
