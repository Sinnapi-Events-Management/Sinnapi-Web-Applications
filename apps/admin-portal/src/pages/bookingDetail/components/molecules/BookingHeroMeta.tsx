import { HeroMetaStrip } from '@sinnapi/ui';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ScheduleIcon from '@mui/icons-material/Schedule';
import PlaceIcon from '@mui/icons-material/Place';
import PaymentsIcon from '@mui/icons-material/Payments';
import ShieldIcon from '@mui/icons-material/Shield';
import { formatDate, formatMoney, titleize } from '@/lib/config';
import type { BookingAdminModel } from '@/lib/types';

type Props = {
  booking: BookingAdminModel;
  timeWindow: string | null;
};

/**
 * The facts worth reading before scrolling: when, how long, where, how much,
 * and whether Sinnapi is holding the money. Mapping only — `HeroMetaStrip` owns
 * the layout and drops the entries that come back falsy.
 */
export default function BookingHeroMeta({ booking: b, timeWindow }: Props) {
  return (
    <HeroMetaStrip
      facts={[
        { icon: <CalendarMonthIcon />, text: formatDate(b.event_date) },
        timeWindow && { icon: <ScheduleIcon />, text: timeWindow },
        b.location && { icon: <PlaceIcon />, text: b.location },
        { icon: <PaymentsIcon />, text: formatMoney(b.amount, b.currency) },
        b.escrow && { icon: <ShieldIcon />, text: `Escrow ${titleize(b.escrow.status)}` },
      ]}
    />
  );
}
