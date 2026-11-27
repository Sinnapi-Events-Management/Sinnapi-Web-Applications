import type { Control, UseFormSetValue } from 'react-hook-form';
import { Box, Stack, Typography } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import { formatMoney } from '@/lib/config';
import {
  ADVANCE_DAYS_MAX,
  ADVANCE_DAY_PRESETS,
  ADVANCE_RATE_PRESETS,
  advanceAmount,
  formatAdvanceDays,
  formatAdvanceRate,
  type QuotationFormValues,
} from '../../schema';
import PresetChips from './PresetChips';

type Props = {
  control: Control<QuotationFormValues>;
  setValue: UseFormSetValue<QuotationFormValues>;
  total: number;
  currency: string;
  rate: string;
  daysBefore: string;
  advanceRateMax: number;
};

/**
 * "When do you get paid?" — one-tap choices for the usual answers, with the
 * exact fields underneath for anything else. The sentence at the bottom says
 * what the choices mean in money, which is the only thing the vendor actually
 * needs to check.
 */
export default function AdvanceTermsFields({
  control,
  setValue,
  total,
  currency,
  rate,
  daysBefore,
  advanceRateMax,
}: Props) {
  const advance = advanceAmount(total, rate);
  const balance = total - advance;
  const days = Number(daysBefore);
  const when =
    Number.isFinite(days) && days > 0
      ? ` ${days} day${days === 1 ? '' : 's'} before the event`
      : ' as soon as the client pays';
  const pick = (name: 'advance_rate' | 'advance_release_days_before') => (n: number) =>
    setValue(name, String(n), { shouldValidate: true, shouldDirty: true });

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="subtitle1" fontWeight={700}>
          How much do you want before the event?
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          This part of your price reaches you before the event. The rest comes after the work is
          done. The client agrees to this before they pay.
        </Typography>
        <PresetChips
          label="Advance presets"
          values={ADVANCE_RATE_PRESETS.filter((n) => n <= advanceRateMax)}
          current={rate}
          format={formatAdvanceRate}
          onPick={pick('advance_rate')}
        />
        <ControlledField
          name="advance_rate"
          control={control}
          label={`Or type a percentage (up to ${advanceRateMax}%)`}
          type="number"
          sx={{ mt: 1.5, width: { xs: '100%', sm: 260 } }}
          inputProps={{ min: 0, max: advanceRateMax, step: 5, inputMode: 'numeric' }}
        />
      </Box>

      {Number(rate) > 0 && (
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            How many days before the event?
          </Typography>
          <PresetChips
            label="Days presets"
            values={ADVANCE_DAY_PRESETS}
            current={daysBefore}
            format={formatAdvanceDays}
            onPick={pick('advance_release_days_before')}
          />
          <ControlledField
            name="advance_release_days_before"
            control={control}
            label="Or type the number of days"
            type="number"
            sx={{ mt: 1.5, width: { xs: '100%', sm: 260 } }}
            inputProps={{ min: 0, max: ADVANCE_DAYS_MAX, inputMode: 'numeric' }}
          />
        </Box>
      )}

      {total > 0 && (
        <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
          {Number(rate) > 0 && balance <= 0 ? (
            // 100%: nothing is left for after the event, so don't promise a
            // zero "other part".
            <Typography variant="body1">
              You get all{' '}
              <Box component="span" fontWeight={700}>
                {formatMoney(total, currency)}
              </Box>
              {when}.
            </Typography>
          ) : Number(rate) > 0 ? (
            <>
              <Typography variant="body1">
                You get{' '}
                <Box component="span" fontWeight={700}>
                  {formatMoney(advance, currency)}
                </Box>
                {when}.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                The other {formatMoney(balance, currency)} comes after the client confirms the work
                was done.
              </Typography>
            </>
          ) : (
            <Typography variant="body1">
              You get all {formatMoney(total, currency)} after the client confirms the work was
              done.
            </Typography>
          )}
        </Box>
      )}

      <ControlledField
        name="advance_terms_note"
        control={control}
        label="Message to the client (optional)"
        placeholder="e.g. The advance pays for transport and equipment."
        multiline
        minRows={2}
      />
    </Stack>
  );
}
