import {
  Alert,
  PaymentTermsBreakdown,
  Stack,
  Typography,
  type PaymentRail,
  type PaymentTermsPreview,
} from '@sinnapi/ui';
import { formatMoney } from '@/lib/config';

type Props = {
  /** The budget being typed above. Null until the client has stated one. */
  amount: number | null;
  currency: string;
  rail: PaymentRail;
  preview: PaymentTermsPreview | null;
  isLoading: boolean;
  isPricing: boolean;
  unavailableReason: string | null;
};

/**
 * What the chosen rail would cost, priced against the stated budget.
 *
 * An illustration, and labelled as one. The event has no agreed amount — each
 * booking under it is priced on its own figure — so presenting this as "what
 * you will pay" would be a number nobody is going to be charged.
 *
 * With no budget stated the block does not disappear: it says what is missing
 * and points at the fields directly above, which now exist. An empty space
 * where numbers belong teaches a client nothing about how to fill it.
 */
export default function EventTermsCostPreview({
  amount,
  currency,
  rail,
  preview,
  isLoading,
  isPricing,
  unavailableReason,
}: Props) {
  if (amount == null) {
    return (
      <Alert severity="info">
        Add your budget above and we will show you what each way of paying would come to. The choice
        below still applies either way.
      </Alert>
    );
  }

  return (
    <Stack spacing={1.25}>
      <Typography variant="subtitle2" fontWeight={700}>
        What that would cost on a {formatMoney(amount, currency)} booking
      </Typography>
      <PaymentTermsBreakdown
        preview={preview}
        rail={rail}
        isLoading={isLoading}
        isPricing={isPricing}
        unavailableReason={unavailableReason}
      />
      <Typography variant="caption" color="text.secondary">
        Based on your stated budget. Each booking is priced on what that booking is actually worth.
      </Typography>
    </Stack>
  );
}
