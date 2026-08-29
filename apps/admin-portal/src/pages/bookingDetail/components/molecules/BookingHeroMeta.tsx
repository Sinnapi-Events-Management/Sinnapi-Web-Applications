import { HeroMetaSection } from '@sinnapi/ui';
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
 * and whether Sinnapi is holding the money. Mapping only — `HeroMetaSection`
 * owns the layout and drops the entries that come back falsy.
 *
 * The amount and the escrow state survive on a phone; the date, the time window
 * and the address are marked `secondary` and drop below `md`. That split is by
 * what an operator is usually called about — money, and whether we are holding
 * it — and the three that go are all labelled rows on the Overview tab, one tap
 * away and better presented there than as a wrapping icon strip. The hero and
 * the tab bar together were eating most of a small screen before the first
 * section began.
 */
export default function BookingHeroMeta({ booking: b, timeWindow }: Props) {
  return (
    <HeroMetaSection
      facts={[
        { icon: <PaymentsIcon />, text: formatMoney(b.amount, b.currency) },
        b.escrow && { icon: <ShieldIcon />, text: `Escrow ${titleize(b.escrow.status)}` },
        { icon: <CalendarMonthIcon />, text: formatDate(b.event_date), secondary: true },
        timeWindow && { icon: <ScheduleIcon />, text: timeWindow, secondary: true },
        b.location && { icon: <PlaceIcon />, text: b.location, secondary: true },
      ]}
    />
  );
}
