import { SectionGrid } from '@sinnapi/ui';
import type { PaymentChaseAction } from '@sinnapi/ui';
import type { BookingAdminModel } from '@/lib/types';
import BookingMoneyCard from './BookingMoneyCard';
import BookingPaymentWindowCard from './BookingPaymentWindowCard';

type Props = {
  booking: BookingAdminModel;
  canChase: boolean;
  onChase: (
    action: PaymentChaseAction,
    booking: { id: string; reference_no: string | null },
  ) => void;
  chaseBusy: boolean;
  chaseError: string | null;
};

/**
 * What the booking is worth and where its payment stands.
 *
 * The amount leads because it is the fact every other question is asked
 * against; the clock follows because it is the one an operator acts on. That is
 * the order the money moves in — agreed, then owed, then paid.
 *
 * The window card draws nothing at all once there is no clock: an off-platform
 * booking, or one already funded. `SectionGrid` is why the amount then takes
 * the space rather than sitting beside a hole. The amount card never draws
 * nothing, so the section is never empty.
 */
export default function MoneySection({ booking, canChase, onChase, chaseBusy, chaseError }: Props) {
  return (
    <SectionGrid>
      <BookingMoneyCard booking={booking} />
      <BookingPaymentWindowCard
        booking={booking}
        canChase={canChase}
        onChase={onChase}
        busy={chaseBusy}
        error={chaseError}
      />
    </SectionGrid>
  );
}
