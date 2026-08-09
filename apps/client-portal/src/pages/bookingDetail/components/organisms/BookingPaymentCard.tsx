import { SectionCard } from '@sinnapi/ui';
import PaymentsIcon from '@mui/icons-material/Payments';
import type { BookingDetailModel } from '@/lib/types';
import AmountHeadline from '../molecules/AmountHeadline';

type Props = {
  booking: BookingDetailModel;
};

/** What the booking costs and how it is being settled. */
export default function BookingPaymentCard({ booking: b }: Props) {
  return (
    <SectionCard title="Payment" icon={<PaymentsIcon />}>
      <AmountHeadline amount={b.amount} currency={b.currency} paymentType={b.payment_type} />
    </SectionCard>
  );
}
