import { HeroMetaSection } from '@sinnapi/ui';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import TagIcon from '@mui/icons-material/Tag';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { formatDateTime } from '@/lib/config';
import type { PaymentAdminDetailModel } from '@/lib/types';
import { methodLabel, providerLabel } from '@/pages/payments/schema';

type Props = { payment: PaymentAdminDetailModel };

/**
 * The facts worth reading before scrolling: which rail, the provider's handle
 * on it, and what it was for. Mapping only — `HeroMetaSection` owns the layout
 * and drops the entries that come back falsy.
 *
 * The rail and the provider reference survive on a phone: they are what an
 * investigator quotes to the PSP. The booking and the two timestamps are marked
 * `secondary` and drop below `md`; all three are labelled rows on the Overview
 * tab.
 */
export default function PaymentHeroMeta({ payment: p }: Props) {
  return (
    <HeroMetaSection
      facts={[
        {
          icon: <CreditCardIcon />,
          text: `${providerLabel(p.provider)} · ${methodLabel(p.provider_method)}`,
        },
        p.provider_ref && { icon: <TagIcon />, text: p.provider_ref },
        p.booking?.reference_no && {
          icon: <ReceiptLongIcon />,
          text: `Booking ${p.booking.reference_no}`,
          secondary: true,
        },
        { icon: <CalendarMonthIcon />, text: formatDateTime(p.created_at), secondary: true },
        p.paid_at && {
          icon: <CheckCircleIcon />,
          text: `Paid ${formatDateTime(p.paid_at)}`,
          secondary: true,
        },
      ]}
    />
  );
}
