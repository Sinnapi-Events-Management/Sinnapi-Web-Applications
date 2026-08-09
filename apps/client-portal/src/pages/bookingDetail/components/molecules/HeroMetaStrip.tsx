import { Stack } from '@sinnapi/ui';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ScheduleIcon from '@mui/icons-material/Schedule';
import PlaceIcon from '@mui/icons-material/Place';
import PaymentsIcon from '@mui/icons-material/Payments';
import { formatDate, formatMoney } from '@/lib/config';
import type { BookingDetailModel } from '@/lib/types';
import HeroMetaItem from '../atoms/HeroMetaItem';

type Props = {
  booking: BookingDetailModel;
  timeWindow: string | null;
};

/**
 * The four facts worth reading before scrolling: when, how long, where and how
 * much. Absent values are dropped rather than shown as "—" — a hero that
 * advertises what a booking is missing is noise, and the detail card below
 * already accounts for every field.
 */
export default function HeroMetaStrip({ booking: b, timeWindow }: Props) {
  const items = [
    { icon: <CalendarMonthIcon />, text: formatDate(b.event_date) },
    timeWindow && { icon: <ScheduleIcon />, text: timeWindow },
    b.location && { icon: <PlaceIcon />, text: b.location },
    { icon: <PaymentsIcon />, text: formatMoney(b.amount, b.currency) },
  ].filter(Boolean) as { icon: React.ReactNode; text: string }[];

  return (
    <Stack direction="row" flexWrap="wrap" useFlexGap gap={{ xs: 1.5, sm: 3 }}>
      {items.map((m, i) => (
        <HeroMetaItem key={i} icon={m.icon} text={m.text} />
      ))}
    </Stack>
  );
}
