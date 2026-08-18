import { Alert, EscrowJourney, MoneyBreakdown, Stack } from '@sinnapi/ui';
import type { VendorBookingEscrowModel } from '@/lib/types';

type Props = {
  escrow: VendorBookingEscrowModel;
  advanceReleased: boolean;
  isFrozen: boolean;
  isSettled: boolean;
};

/**
 * Where the money is, told from the vendor's side.
 *
 * The same journey the client sees, because it is the same money and the two
 * of them comparing notes should not find two different accounts of it. What
 * changes is the arithmetic beside it: the client's breakdown builds *up* to
 * what they paid, fees included, while the vendor's splits what they are owed
 * into the part already released and the part still held.
 *
 * Sinnapi's fee is deliberately absent. It is charged to the client on top of
 * the agreed amount and never comes out of the vendor's side — showing it here
 * would imply a deduction that does not exist.
 */
export default function EscrowStateSummary({
  escrow,
  advanceReleased,
  isFrozen,
  isSettled,
}: Props) {
  const currency = escrow.currency ?? 'UGX';

  return (
    <Stack spacing={2}>
      <EscrowJourney
        status={escrow.status}
        currency={currency}
        grossAmount={escrow.gross_amount}
        advanceAmount={escrow.advance_amount}
        balanceAmount={escrow.balance_amount}
      />

      <MoneyBreakdown
        dense
        currency={currency}
        lines={[
          {
            label: advanceReleased ? 'Advance released to you' : 'Advance due to you',
            amount: escrow.advance_amount,
            hint: advanceReleased
              ? 'Already on its way to your payout account.'
              : 'Released on the schedule the client accepted, before the event.',
          },
          {
            label: 'Held until the client confirms',
            amount: escrow.balance_amount,
            hint: 'Released once the client confirms the service was delivered.',
          },
        ]}
      />

      {isFrozen && (
        <Alert severity="warning">
          Releases are paused while our team reviews an issue raised on this booking. Nothing moves
          — in either direction — until that is resolved.
        </Alert>
      )}

      {isSettled && (
        <Alert severity="success">
          Everything owed on this booking has been paid out. There is nothing left to release.
        </Alert>
      )}
    </Stack>
  );
}
