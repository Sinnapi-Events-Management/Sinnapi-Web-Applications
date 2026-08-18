import { Alert, Box, Stack, Typography } from '@sinnapi/ui';
import AdvanceRateControl from './AdvanceRateControl';
import AdvanceConsentCheckbox from './AdvanceConsentCheckbox';
import type { PaymentTermsChoice } from '../../hooks/usePaymentTermsChoice';

type Props = {
  choice: PaymentTermsChoice;
  disabled?: boolean;
  /** Days before the event the advance is released, from the quote's terms. */
  daysBefore?: number | null;
};

/**
 * How much of the money reaches the vendor before the event, and the client's
 * agreement to it — the one part of escrow that is not reversible by confirming
 * delivery later.
 *
 * Control and consent are one component because they are one decision. Splitting
 * them across the form is how a client ends up ticking a box that names a figure
 * they have since changed.
 *
 * Layout only. The rate, its bounds and whether the client may proceed all
 * belong to `usePaymentTermsChoice`.
 */
export default function AdvanceScheduleField({ choice, disabled, daysBefore }: Props) {
  const { preview, advance } = choice;

  // Two different numbers, and keeping them apart is the whole point of this
  // component. `advance_rate_limit` is what Sinnapi will release at most;
  // `advance_rate` is where the field was started — the vendor's ask if a quote
  // carried one, otherwise the platform's suggestion. They used to be the same
  // value, which capped clients at the suggestion and then blamed the vendor
  // for it.
  const limit = preview?.advance_rate_limit ?? null;
  const suggested = choice.suggestedRate;

  return (
    <Stack spacing={1.5}>
      <Box>
        <Typography variant="subtitle2" fontWeight={700}>
          Released to your vendor before the event
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {daysBefore != null && daysBefore > 0
            ? `This much leaves escrow ${daysBefore} days before your event, whether or not it has ` +
              'happened yet. Everything else is held until you confirm delivery.'
            : 'This much is paid out once the booking is funded. Everything else is held until ' +
              'you confirm delivery.'}
        </Typography>
      </Box>

      {/* The ceiling arrives with the price, so until it does there is no scale
          to draw. The consent below still renders — it is the part that gates
          the form, and hiding it would leave the submit button disabled with
          nothing on screen explaining why. */}
      {limit != null && (
        <AdvanceRateControl
          control={advance.form.control}
          limit={limit}
          value={advance.sliderValue}
          onChange={advance.setRate}
          suggested={suggested}
          hasVendorProposal={choice.hasVendorProposal}
          disabled={disabled}
        />
      )}

      {advance.error && <Alert severity="error">{advance.error}</Alert>}

      <AdvanceConsentCheckbox
        checked={choice.agreed}
        onChange={choice.setAgreed}
        disabled={disabled}
        advanceAmount={preview?.advance_amount ?? null}
        currency={preview?.currency ?? null}
      />
    </Stack>
  );
}
