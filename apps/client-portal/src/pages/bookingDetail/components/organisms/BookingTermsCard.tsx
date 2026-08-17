import { Button, PaymentTermsNotice, SectionCard, Stack, Typography } from '@sinnapi/ui';
import HandshakeIcon from '@mui/icons-material/Handshake';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import type { BookingDetailModel } from '@/lib/types';
import { useTermsCounter } from '../../hooks/useTermsCounter';
import TermsCounterDialog from './TermsCounterDialog';

type Props = { booking: BookingDetailModel };

/**
 * How this booking is being paid, and whose move it is.
 *
 * Kept apart from the payment card below it, which is about *money moving* —
 * funding, holding, releasing. This one is about the agreement: which rail was
 * proposed, whether the vendor said yes, and what the client does if they said
 * something else. Merging them would put "waiting for your vendor to agree"
 * inside a card whose primary button is "pay now".
 *
 * The card decides its own absence: a booking whose terms were never proposed —
 * every booking made before this existed — has nothing to report here.
 */
export default function BookingTermsCard({ booking }: Props) {
  const counter = useTermsCounter(booking);
  const { view } = counter;

  if (!view.rail) return null;

  return (
    <SectionCard
      title="Payment terms"
      icon={<HandshakeIcon />}
      // Gold while it is the client's move, so the one card on the page that
      // needs them reads as the one card on the page that needs them.
      accent={view.isWaitingOnMe ? 'secondary' : 'info'}
    >
      <Stack spacing={2}>
        <PaymentTermsNotice view={view} counterpartyLabel="your vendor" />

        {view.awaitingClient && (
          <Stack spacing={1}>
            <Button
              variant="contained"
              disableElevation
              startIcon={<SwapHorizIcon />}
              onClick={() => counter.setOpen(true)}
            >
              Review your vendor’s terms
            </Button>
            <Typography variant="caption" color="text.secondary">
              Your date is not held until you answer.
            </Typography>
          </Stack>
        )}
      </Stack>

      {counter.open && <TermsCounterDialog booking={booking} counter={counter} />}
    </SectionCard>
  );
}
