import { useWatch, type Control, type UseFormSetValue } from 'react-hook-form';
import { Box, Stack, Typography } from '@sinnapi/ui';
import { ControlledField, ControlledCheckbox } from '@sinnapi/ui/forms';
import {
  ADVANCE_DAYS_MAX,
  ADVANCE_DAY_PRESETS,
  ADVANCE_RATE_PRESETS,
  formatAdvanceDays,
  formatAdvanceRate,
} from '@/components/quotation/schema';
import PresetChips from '@/components/quotation/components/molecules/PresetChips';
import type { PackageFormValues } from '../../schema';

/**
 * The terms that travel with the package into every quote built from it.
 *
 * These are the fields a vendor currently retypes on every single quotation.
 * Setting them once, per package, is most of what makes a package worth having
 * — and it is why they live here rather than staying on the builder alone.
 *
 * The tax mode is a checkbox rather than a select because the two options are
 * one question — "is this rate already in my prices?" — and a select forces a
 * vendor to read two labels to answer it.
 */
export default function PackageTermsFields({
  control,
  setValue,
  advanceRateMax,
}: {
  control: Control<PackageFormValues>;
  setValue: UseFormSetValue<PackageFormValues>;
  /** The vendor's live ceiling (`advance_rate_default`). */
  advanceRateMax: number;
}) {
  const [rate = '', daysBefore = ''] = useWatch({
    control,
    name: ['advance_rate', 'advance_release_days_before'],
  });
  const pick = (name: 'advance_rate' | 'advance_release_days_before') => (n: number) =>
    setValue(name, String(n), { shouldValidate: true, shouldDirty: true });

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="subtitle2" fontWeight={700}>
          Tax
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Leave the rate at 0 if you are not registered for VAT.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1.5 }}>
          <ControlledField
            name="tax_rate"
            control={control}
            label="Tax rate (%)"
            type="number"
            sx={{ width: { sm: 180 } }}
            inputProps={{ min: 0, max: 100, step: 0.5 }}
          />
          <Box sx={{ flex: 1 }}>
            <ControlledCheckbox
              name="tax_inclusive"
              control={control}
              label={
                <Box>
                  <Typography variant="body2">My prices already include tax</Typography>
                  <Typography variant="caption" color="text.secondary">
                    The total stays what you typed; the tax is shown as the portion inside it. Leave
                    this off to add the rate on top.
                  </Typography>
                </Box>
              }
            />
          </Box>
        </Stack>
      </Box>

      <Box>
        <Typography variant="subtitle2" fontWeight={700}>
          Timing
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1.5 }}>
          <ControlledField
            name="valid_days"
            control={control}
            label="Quotes valid for (days)"
            type="number"
            sx={{ flex: 1 }}
            inputProps={{ min: 1, max: 365 }}
          />
          <ControlledField
            name="lead_time_days"
            control={control}
            label="Book at least (days ahead)"
            type="number"
            sx={{ flex: 1 }}
            inputProps={{ min: 0, max: 365 }}
            helperText="Optional"
          />
        </Stack>
      </Box>

      <Box>
        <Typography variant="subtitle2" fontWeight={700}>
          Payment schedule
        </Typography>
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 1.5 }}>
          How much of your fee you receive before the event. Pre-filled into every quote you build
          from this package, and still editable there.
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

        {Number(rate) > 0 && (
          <Box sx={{ mt: 2.5 }}>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
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
        <ControlledField
          name="advance_terms_note"
          control={control}
          label="Note to the client (optional)"
          placeholder="e.g. The advance covers materials and venue deposits."
          multiline
          minRows={2}
          sx={{ mt: 2 }}
        />
      </Box>
    </Stack>
  );
}
