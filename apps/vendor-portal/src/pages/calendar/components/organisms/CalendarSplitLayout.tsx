import { Grid } from '@sinnapi/ui';
import AvailabilityCalendarCard from './AvailabilityCalendarCard';
import CalendarRail from './CalendarRail';
import type { CalendarController } from '../../hooks/useCalendar';
import type { CalendarRailController } from '../../hooks/useCalendarRail';

type Props = {
  calendar: CalendarController;
  rail: CalendarRailController;
};

/**
 * The wide screen: the month, and the rail that answers what a tap on it means.
 *
 * The grid takes the larger column because it is the question the vendor opened
 * the page with. Nothing sits under either of them — the agenda that used to
 * live down there is the rail's second tab now, which is the whole point of the
 * split: the page ends where the fold does.
 */
export default function CalendarSplitLayout({ calendar, rail }: Props) {
  // No `alignItems` override on the container: the item has to stretch to the
  // row's height, or the sticky rail inside it has no distance to stick over.
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} lg={8}>
        <AvailabilityCalendarCard
          summary={calendar.summary}
          selectedDate={calendar.selection.date}
          onSelectDate={rail.pickDate}
          month={calendar.month}
          onMonthChange={calendar.setMonth}
          blockedDates={calendar.days.manual}
          bookedDates={calendar.days.booked}
          entries={calendar.index}
          clientName={calendar.clientName}
          isOnCurrentMonth={calendar.isOnCurrentMonth}
          onGoToToday={calendar.goToToday}
        />
      </Grid>
      <Grid item xs={12} lg={4}>
        <CalendarRail calendar={calendar} rail={rail} />
      </Grid>
    </Grid>
  );
}
