import type { Control } from 'react-hook-form';
import { Box, Stack, Typography } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import { alpha } from '@mui/material/styles';
import { formatMoney } from '@/lib/config';
import {
  ADVANCE_DAYS_MAX,
  ADVANCE_RATE_MAX,
  advanceAmount,
  type QuotationFormValues,
} from '../../schema';

type Props = {
  control: Control<QuotationFormValues>;
  /** The quote total, so the percentage can be shown as real money. */
  total: number;
  currency: string;
  rate: string;
  daysBefore: string;
};

/**
 * The advance the vendor is proposing.
 *
 * Shown as money as well as a percentage, because "30%" and "UGX 60,000
 * seven days before the event" are different amounts of information — and the
 * second is what the client will be asked to agree to.
 */
export default function AdvanceTermsFields({ control, total, currency, rate, daysBefore }: Props) {
  const advance = advanceAmount(total, rate);
  const balance = total - advance;
  const days = Number(daysBefore);

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: (t) => alpha(t.palette.secondary.main, 0.05),
        border: (t) => `1px solid ${alpha(t.palette.secondary.main, 0.2)}`,
      }}
    >
      <Stack spacing={2}>
        <Box>
          <Typography variant="subtitle2" fontWeight={700}>
            Payment schedule
          </Typography>
          <Typography variant="caption" color="text.secondary">
            How much of your fee you receive before the event. The client must accept these terms
            before they can pay.
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <ControlledField
            name="advance_rate"
            control={control}
            label="Advance (%)"
            type="number"
            sx={{ width: { sm: 150 } }}
            inputProps={{ min: 0, max: ADVANCE_RATE_MAX, step: 5 }}
          />
          <ControlledField
            name="advance_release_days_before"
            control={control}
            label="Days before event"
            type="number"
            sx={{ width: { sm: 180 } }}
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
        />

        {total > 0 && (
          <Stack spacing={0.5}>
            <Typography variant="body2">
              You receive{' '}
              <Box component="span" fontWeight={700}>
                {formatMoney(advance, currency)}
              </Box>
              {Number.isFinite(days) && days > 0
                ? ` ${days} day${days === 1 ? '' : 's'} before the event`
                : ' as soon as the client pays'}
              .
            </Typography>
            <Typography variant="body2" color="text.secondary">
              The remaining {formatMoney(balance, currency)} is released once the client confirms
              the service was delivered.
            </Typography>
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
