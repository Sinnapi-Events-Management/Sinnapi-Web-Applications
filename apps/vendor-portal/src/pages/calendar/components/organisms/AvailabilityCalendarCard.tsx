import { Button, SectionCard } from '@sinnapi/ui';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CalendarStatStrip from '../molecules/CalendarStatStrip';
import AvailabilityCalendar from '../molecules/AvailabilityCalendar';
import type { DayIndex, MonthSummary } from '../../schema';
import type { ClientNameResolver } from '../../hooks/useBlockedDateClients';

type Props = {
  summary: MonthSummary;
  selectedDate: string;
  onSelectDate: (next: string) => void;
  month: Date;
  onMonthChange: (next: Date) => void;
  blockedDates: string[];
  bookedDates: string[];
  entries: DayIndex;
  clientName: ClientNameResolver;
  isOnCurrentMonth: boolean;
  onGoToToday: () => void;
};

/**
 * The calendar and the three numbers that describe whatever month it is showing.
 *
 * They share a card because they are one reading: the strip is the grid
 * summarised, and separating them would let a vendor scroll the figures out of
 * sight of the month they belong to.
 */
export default function AvailabilityCalendarCard({
  summary,
  selectedDate,
  onSelectDate,
  month,
  onMonthChange,
  blockedDates,
  bookedDates,
  entries,
  clientName,
  isOnCurrentMonth,
  onGoToToday,
}: Props) {
  return (
    <SectionCard
      title={summary.label}
      icon={<CalendarMonthIcon />}
      // Only offered once the grid has wandered — a "Today" button on the month
      // that already contains today is a control that does nothing.
      action={
        !isOnCurrentMonth ? (
          <Button size="small" onClick={onGoToToday} sx={{ textTransform: 'none' }}>
            Today
          </Button>
        ) : undefined
      }
    >
      <CalendarStatStrip summary={summary} />
      <AvailabilityCalendar
        value={selectedDate}
        onChange={onSelectDate}
        month={month}
        onMonthChange={onMonthChange}
        blockedDates={blockedDates}
        bookedDates={bookedDates}
        entries={entries}
        clientName={clientName}
      />
    </SectionCard>
  );
}
