import type { Control } from 'react-hook-form';
import { Box, InputAdornment, Slider, Stack, Typography } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import type { AdvanceRateValues } from '../../schema';

type Props = {
  control: Control<AdvanceRateValues>;
  /** The most the client may release early — what their vendor proposed. */
  limit: number;
  /** Where the slider sits; the field is the authority on the actual value. */
  value: number;
  onChange: (next: number) => void;
  disabled?: boolean;
};

/**
 * How much of the fee the client is willing to release before the event.
 *
 * A slider and a number field over the same value, because the two questions
 * are different: the slider is for "somewhat less than they asked", the field
 * is for a client who has a figure in mind. The scale ends at the vendor's
 * proposal — this control can only ever reduce the vendor's pre-event
 * exposure, so there is no position on it that needs the vendor's agreement.
 */
export default function AdvanceRateControl({ control, limit, value, onChange, disabled }: Props) {
  return (
    <Stack spacing={0.5}>
      <Stack direction="row" spacing={2} alignItems="flex-start">
        <Box sx={{ flex: 1, minWidth: 0, px: 1 }}>
          <Slider
            value={value}
            onChange={(_, next) => onChange(Array.isArray(next) ? next[0] : next)}
            min={0}
            max={limit}
            step={1}
            disabled={disabled}
            color="secondary"
            size="small"
            aria-label="Advance percentage"
            marks={[
              { value: 0, label: 'Nothing early' },
              { value: limit, label: `${limit}%` },
            ]}
            sx={{
              '& .MuiSlider-markLabel': { fontSize: 11, color: 'text.secondary' },
              // The end labels sit under the track ends; let them stay inside
              // the control rather than pushing the panel wider.
              '& .MuiSlider-markLabel[data-index="0"]': { transform: 'none' },
              '& .MuiSlider-markLabel[data-index="1"]': { transform: 'translateX(-100%)' },
            }}
          />
        </Box>

        <ControlledField
          name="advance_rate"
          control={control}
          label="Advance"
          type="number"
          size="small"
          disabled={disabled}
          inputProps={{ min: 0, max: limit, step: 5, 'aria-describedby': 'advance-rate-help' }}
          InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
          sx={{ width: 132, flexShrink: 0 }}
        />
      </Stack>

      <Typography id="advance-rate-help" variant="caption" color="text.secondary">
        Your vendor proposed {limit}%. You can release less, never more.
      </Typography>
    </Stack>
  );
}
