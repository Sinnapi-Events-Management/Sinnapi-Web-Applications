import type { Control } from 'react-hook-form';
import { Box, Stack, Typography } from '@sinnapi/ui';
import { ControlledField, ControlledCheckbox } from '@sinnapi/ui/forms';
import { ADVANCE_DAYS_MAX, ADVANCE_RATE_MAX } from '@/components/quotation/schema';
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
export default function PackageTermsFields({ control }: { control: Control<PackageFormValues> }) {
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
        <Typography variant="caption" color="text.secondary">
          How much of your fee you receive before the event. Pre-filled into every quote you build
          from this package, and still editable there.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1.5 }}>
          <ControlledField
            name="advance_rate"
            control={control}
            label="Advance (%)"
            type="number"
            sx={{ flex: 1 }}
            inputProps={{ min: 0, max: ADVANCE_RATE_MAX, step: 5 }}
          />
          <ControlledField
            name="advance_release_days_before"
            control={control}
            label="Days before event"
            type="number"
            sx={{ flex: 1 }}
            inputProps={{ min: 0, max: ADVANCE_DAYS_MAX }}
          />
        </Stack>
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
