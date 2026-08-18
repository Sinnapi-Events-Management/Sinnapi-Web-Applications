import type { Control } from 'react-hook-form';
import { Box, InputAdornment, Slider, Stack, Typography } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import type { AdvanceRateValues } from '../../schema';

type Props = {
  control: Control<AdvanceRateValues>;
  /** The most Sinnapi will release before an event — `advance_rate_max`. */
  limit: number;
  /** Where the slider sits; the field is the authority on the actual value. */
  value: number;
  onChange: (next: number) => void;
  /**
   * The rate the field started at: the vendor's proposal where there is one,
   * otherwise the platform's own suggested figure. Marked on the scale so the
   * client can see what they have moved away from.
   */
  suggested?: number | null;
  /**
   * Whether `suggested` actually came from the vendor. Decides whose figure the
   * caption names — and the answer is usually "nobody's", because a booking
   * made without a quotation has no vendor proposal at all.
   */
  hasVendorProposal?: boolean;
  disabled?: boolean;
};

/**
 * How much of the fee the client is willing to release before the event.
 *
 * A slider and a number field over the same value, because the two questions
 * are different: the slider is for "somewhat less than suggested", the field is
 * for a client who has a figure in mind.
 *
 * WHAT THE SCALE MEANS
 * It ends at the platform maximum, not at the vendor's proposal. Those were the
 * same number for as long as `advance_rate_ceiling` treated the suggested rate
 * as a ceiling, which capped clients at 30% and told them their vendor had
 * asked for it. The vendor's ask is a suggestion and is drawn as a mark on the
 * scale; the end of the scale is Sinnapi's limit and is labelled as Sinnapi's.
 *
 * The client may now sit anywhere on it, above the suggestion as well as below.
 * Moving up pays the vendor more of their fee earlier, which needs no
 * permission from them — the risk it adds is the client's own, which is why the
 * text above this control spells out what leaves escrow before the event.
 */
export default function AdvanceRateControl({
  control,
  limit,
  value,
  onChange,
  suggested,
  hasVendorProposal,
  disabled,
}: Props) {
  // Only worth marking when it sits somewhere the client can actually see it —
  // a mark at 0 collides with "Nothing early", and one at the limit collides
  // with the limit's own label.
  const showSuggested = suggested != null && suggested > 0 && suggested < limit;

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
              ...(showSuggested ? [{ value: suggested, label: `${suggested}%` }] : []),
              { value: limit, label: `${limit}%` },
            ]}
            sx={{
              '& .MuiSlider-markLabel': { fontSize: 11, color: 'text.secondary' },
              // The end labels sit under the track ends; let them stay inside
              // the control rather than pushing the panel wider.
              '& .MuiSlider-markLabel[data-index="0"]': { transform: 'none' },
              [`& .MuiSlider-markLabel[data-index="${showSuggested ? 2 : 1}"]`]: {
                transform: 'translateX(-100%)',
              },
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
        {hasVendorProposal && suggested != null
          ? `Your vendor asked for ${suggested}%. You can release more or less — Sinnapi allows up to ${limit}%.`
          : `Sinnapi releases at most ${limit}% before the event. The rest is held until you confirm delivery.`}
      </Typography>
    </Stack>
  );
}
