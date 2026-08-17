import { Divider, PaymentTermsBreakdown, PaymentTermsPicker, Stack, Typography } from '@sinnapi/ui';
import AdvanceScheduleField from '../molecules/AdvanceScheduleField';
import type { PaymentTermsChoice } from '../../hooks/usePaymentTermsChoice';

type Props = {
  choice: PaymentTermsChoice;
  /** Days before the event the advance is released, from the quote's terms. */
  advanceDaysBefore?: number | null;
  disabled?: boolean;
};

/**
 * The payment-terms half of every booking form: choose a rail, see what it
 * costs, and agree to the schedule if it has one.
 *
 * The order is the order the decision is actually made in. The comparison comes
 * first, because that is the choice; the itemised cost follows it, because a
 * client who has picked a rail then wants to know exactly what leaves their
 * account; and the advance sits last, because it is the only part that is not a
 * question about price. Off-platform stops after the second block — there is no
 * schedule to consent to when Sinnapi is holding nothing.
 *
 * Composition only. `usePaymentTermsChoice` owns every value here and the rule
 * about when the form may be submitted.
 */
export default function PaymentTermsStep({ choice, advanceDaysBefore, disabled }: Props) {
  return (
    <Stack spacing={2}>
      <Stack spacing={0.5}>
        <Typography variant="subtitle2" fontWeight={700}>
          How would you like to pay?
        </Typography>
        <Typography variant="caption" color="text.secondary">
          This is part of what your vendor is agreeing to, so it is settled now rather than at
          checkout.
        </Typography>
      </Stack>

      <PaymentTermsPicker
        value={choice.rail}
        onChange={choice.setRail}
        preview={choice.preview}
        isPricing={choice.isPricing}
        disabled={disabled}
        lockedReason={choice.lockedReason}
      />

      <Divider />

      <Stack spacing={1.25}>
        <Typography variant="subtitle2" fontWeight={700}>
          What you pay
        </Typography>
        <PaymentTermsBreakdown
          preview={choice.preview}
          rail={choice.rail}
          advanceDaysBefore={advanceDaysBefore}
          isLoading={choice.isLoadingPreview}
          isPricing={choice.isPricing}
          unavailableReason={choice.unavailableReason}
        />
      </Stack>

      {/* Gated on the preview, not just on the rail. Without figures there is
          no split to show and no amount to name in the consent — a checkbox
          reading "I agree to this payment schedule" beside no schedule is
          asking the client to agree to nothing in particular. The breakdown
          above has already said why it is missing. */}
      {choice.isEscrow && choice.preview && (
        <>
          <Divider />
          <AdvanceScheduleField
            choice={choice}
            disabled={disabled}
            daysBefore={advanceDaysBefore}
          />
        </>
      )}
    </Stack>
  );
}
