import { SectionCard } from '@sinnapi/ui';
import PaymentsIcon from '@mui/icons-material/Payments';
import type { VendorBookingDetailModel } from '@/lib/types';
import AmountHeadline from '../molecules/AmountHeadline';

type Props = {
  booking: VendorBookingDetailModel;
};

/** What the booking is worth and how the client is settling it. */
export default function BookingPaymentCard({ booking: b }: Props) {
  return (
    <SectionCard title="Payment" icon={<PaymentsIcon />}>
      <AmountHeadline amount={b.amount} currency={b.currency} paymentType={b.payment_type} />
    </SectionCard>
  );
}
