import { HeroMetaStrip } from '@sinnapi/ui';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ScheduleIcon from '@mui/icons-material/Schedule';
import PlaceIcon from '@mui/icons-material/Place';
import PaymentsIcon from '@mui/icons-material/Payments';
import { formatDate, formatMoney } from '@/lib/config';
import type { VendorBookingDetailModel } from '@/lib/types';

type Props = {
  booking: VendorBookingDetailModel;
  timeWindow: string | null;
};

/**
 * The four facts a vendor checks before deciding anything: when, how long,
 * where and how much. Mapping only — `HeroMetaStrip` owns the layout and drops
 * the entries that come back falsy.
 */
export default function BookingHeroMeta({ booking: b, timeWindow }: Props) {
  return (
    <HeroMetaStrip
      facts={[
        { icon: <CalendarMonthIcon />, text: formatDate(b.event_date) },
        timeWindow && { icon: <ScheduleIcon />, text: timeWindow },
        b.location && { icon: <PlaceIcon />, text: b.location },
        { icon: <PaymentsIcon />, text: formatMoney(b.amount, b.currency) },
      ]}
    />
  );
}
