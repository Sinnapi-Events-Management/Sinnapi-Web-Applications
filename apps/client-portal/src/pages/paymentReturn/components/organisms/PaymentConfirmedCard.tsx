import { Link as RouterLink } from 'react-router-dom';
import { Alert, Button, Skeleton, Stack } from '@sinnapi/ui';
import {
  NextStepsList,
  OutcomeActions,
  OutcomeCard,
  OutcomeHeader,
  OutcomeLayout,
  ReceiptPanel,
} from '@sinnapi/ui/payments';
import type { EscrowDetailModel, PaymentReturnModel } from '@/lib/types';
import { usePaymentConfirmed } from '../../hooks/usePaymentConfirmed';

type Props = {
  payment: PaymentReturnModel;
  escrow: EscrowDetailModel | null;
  isEscrowLoading: boolean;
  bookingRef: string | null;
  bookingHref: string;
  email: string | null;
};

/**
 * The money is in and held. What was paid, and what happens to it next.
 *
 * Laid out as verdict-and-steps beside a receipt rail rather than one narrow
 * centred column: on a desktop the total stays in view while the client reads
 * the release schedule, and on a phone the same three blocks stack in the
 * order they are wanted — did it work, how much, then what now.
 *
 * Every figure and every sentence comes from `usePaymentConfirmed`. This file
 * places them.
 */
export default function PaymentConfirmedCard(props: Props) {
  const { isEscrowLoading, totalAmount, breakdown, steps } = usePaymentConfirmed(props);

  return (
    <OutcomeLayout
      header={
        <OutcomeHeader
          accent="success"
          title="Payment successful"
          reference={props.bookingRef ? `Booking ${props.bookingRef}` : undefined}
          description="Your money is held by Sinnapi and released to your vendor in stages."
        />
      }
      aside={
        isEscrowLoading && !breakdown ? (
          <ReceiptSkeleton />
        ) : (
          <ReceiptPanel
            totalLabel="Total paid"
            totalAmount={totalAmount}
            totalCaption="Includes the Sinnapi service fee and processing fee."
            breakdown={breakdown ?? undefined}
            footer={
              <Alert severity="info" sx={{ '& .MuiAlert-message': { py: 0.25 } }}>
                Held in Sinnapi escrow. Nothing reaches your vendor until its release date.
              </Alert>
            }
          />
        )
      }
    >
      <OutcomeCard accent="success">
        <NextStepsList steps={steps} accent="success" />
        <OutcomeActions>
          <Button component={RouterLink} to={props.bookingHref} variant="contained" size="large">
            View booking
          </Button>
          <Button component={RouterLink} to="/payments" variant="outlined" size="large">
            All payments
          </Button>
        </OutcomeActions>
      </OutcomeCard>
    </OutcomeLayout>
  );
}

/**
 * The rail while the escrow row is still in flight.
 *
 * Shaped like the panel it replaces — a label, a headline figure, a divider,
 * a disclosure — so the receipt does not jump a hundred pixels down the page
 * the moment the real amounts land.
 */
function ReceiptSkeleton() {
  return (
    <Stack
      spacing={2}
      sx={{
        borderRadius: 4,
        p: { xs: 2.5, sm: 3 },
        border: (theme) => `1px solid ${theme.palette.divider}`,
      }}
    >
      <Skeleton width={80} height={14} />
      <Skeleton width="70%" height={40} />
      <Skeleton height={1} />
      <Skeleton width="55%" height={20} />
    </Stack>
  );
}
