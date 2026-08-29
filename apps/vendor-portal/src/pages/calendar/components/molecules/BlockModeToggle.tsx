import { ToggleButton, ToggleButtonGroup } from '@sinnapi/ui';
import type { BlockMode } from '../../schema';

type Props = {
  value: BlockMode;
  onChange: (next: BlockMode) => void;
  disabled?: boolean;
};

/**
 * One day, or a run of them.
 *
 * A segmented control rather than a checkbox reading "block more than one day":
 * the two modes take different inputs, and the control has to say which input
 * is coming before the field under it changes shape.
 *
 * `null` from the group is ignored — that is a press on the already-selected
 * side, and deselecting leaves the form in no mode at all.
 */
export default function BlockModeToggle({ value, onChange, disabled }: Props) {
  return (
    <ToggleButtonGroup
      exclusive
      fullWidth
      size="small"
      value={value}
      disabled={disabled}
      onChange={(_, next: BlockMode | null) => next && onChange(next)}
      aria-label="How much time to block"
    >
      <ToggleButton value="single" sx={{ textTransform: 'none' }}>
        A single day
      </ToggleButton>
      <ToggleButton value="range" sx={{ textTransform: 'none' }}>
        A date range
      </ToggleButton>
    </ToggleButtonGroup>
  );
}
