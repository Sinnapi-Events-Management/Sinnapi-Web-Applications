import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, MoneyBreakdown, SectionCard, Skeleton, Stack } from '@sinnapi/ui';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { NextStepsList } from '@sinnapi/ui/payments';
import { formatMoney } from '@/lib/config';
import type { EscrowDetailModel, PaymentReturnModel } from '@/lib/types';

type Props = {
  payment: PaymentReturnModel;
  escrow: EscrowDetailModel | null;
  isEscrowLoading: boolean;
  bookingRef: string | null;
  bookingHref: string;
  email: string | null;
};

function longDate(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * The money is in. What was charged, how it is split in time, and what the
 * client should expect to happen without doing anything.
 *
 * The figures come from the escrow row, not from the payment: the payment
 * knows only the gross, and the point of this page is to show the client
 * where that gross goes — what their vendor receives, what Sinnapi's fee and
 * the processing fee were, and how much leaves early versus stays protected.
 * Those were quoted before they paid; this is the same breakdown, now a fact.
 */
export default function PaymentConfirmedCard({
  payment,
  escrow,
  isEscrowLoading,
  bookingRef,
  bookingHref,
  email,
}: Props) {
  const currency = escrow?.currency ?? payment.currency ?? 'UGX';
  const advanceRate = Number(escrow?.advance_rate ?? 0);
  const advanceDue = longDate(escrow?.advance_release_due_at ?? null);
  // `held` straight after funding means the release date was already behind
  // us, so the advance is on its way now rather than on a date.
  const advanceNow =
    !!escrow && (escrow.status === 'held' || !!escrow.advance_released_at) && advanceRate > 0;

  const steps = [
    <>Your vendor has been told the money is secured, and can now prepare for your event.</>,
    advanceRate <= 0 ? (
      <>Nothing is released before your event. The full amount stays protected by Sinnapi.</>
    ) : advanceNow ? (
      <>
        The <b>{formatMoney(escrow?.advance_amount, currency)}</b> advance ({advanceRate}%) is being
        released to your vendor now, because the release date has already passed.
      </>
    ) : (
      <>
        <b>{formatMoney(escrow?.advance_amount, currency)}</b> ({advanceRate}% advance) is released
        to your vendor{advanceDue ? ` on ${advanceDue}` : ' before the event'}.
      </>
    ),
    <>
      The remaining <b>{formatMoney(escrow?.balance_amount, currency)}</b> stays protected until you
      confirm the service was delivered, after the event.
    </>,
    email ? (
      <>
        A confirmation is on its way to <b>{email}</b>. Nothing else is needed from you today.
      </>
    ) : (
      <>A confirmation email is on its way. Nothing else is needed from you today.</>
    ),
  ];

  return (
    <SectionCard
      title="Payment received"
      subtitle={bookingRef ? `Booking ${bookingRef}` : undefined}
      icon={<CheckCircleIcon />}
      accent="success"
    >
      <Stack spacing={3}>
        <Alert severity="success">
          {formatMoney(payment.amount, payment.currency)} is now held securely by Sinnapi for this
          booking.
        </Alert>

        {isEscrowLoading || !escrow ? (
          <Stack spacing={1}>
            <Skeleton height={22} />
            <Skeleton height={22} />
            <Skeleton height={22} />
            <Skeleton height={32} />
          </Stack>
        ) : (
          <MoneyBreakdown
            currency={currency}
            lines={[
              { label: 'Agreed with your vendor', amount: escrow.agreed_amount },
              {
                label: `Sinnapi service fee (${Number(escrow.commission_rate ?? 0)}%)`,
                amount: escrow.commission_amount,
                additive: true,
              },
              {
                label: `Processing fee (${Number(escrow.psp_fee_rate ?? 0)}%)`,
                amount: escrow.psp_fee_amount,
                additive: true,
              },
            ]}
            total={{ label: 'Paid', amount: escrow.gross_amount }}
            afterTotal={[
              {
                label: 'Of which — released before the event',
                amount: escrow.advance_amount,
                muted: true,
              },
              {
                label: 'Of which — held until you confirm',
                amount: escrow.balance_amount,
                muted: true,
              },
            ]}
          />
        )}

        <NextStepsList steps={steps} />

        <Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button component={RouterLink} to={bookingHref} variant="contained">
              View booking
            </Button>
            <Button component={RouterLink} to="/payments" variant="text">
              All payments
            </Button>
          </Stack>
        </Box>
      </Stack>
    </SectionCard>
  );
}
