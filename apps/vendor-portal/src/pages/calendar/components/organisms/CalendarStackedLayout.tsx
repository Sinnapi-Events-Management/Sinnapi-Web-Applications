import { Stack } from '@sinnapi/ui';
import AvailabilityCalendarCard from './AvailabilityCalendarCard';
import UnavailableDatesSection from './UnavailableDatesSection';
import DayDetailSheet from './DayDetailSheet';
import type { CalendarController } from '../../hooks/useCalendar';
import type { CalendarRailController } from '../../hooks/useCalendarRail';

type Props = {
  calendar: CalendarController;
  rail: CalendarRailController;
};

/**
 * The narrow screen: one column, and the day as a sheet over it.
 *
 * With no second column there is nothing to tab between — the agenda simply
 * follows the calendar, and the reading that would have been the rail's other
 * tab arrives over the grid the moment a day is tapped.
 */
export default function CalendarStackedLayout({ calendar, rail }: Props) {
  return (
    <Stack spacing={3}>
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

      <UnavailableDatesSection
        groups={rail.groups}
        counts={rail.counts}
        filter={rail.filter}
        onFilterChange={rail.setFilter}
        onUnblock={calendar.unblock}
        onSelect={rail.pickDate}
        onBlock={rail.requestBlock}
        removingId={calendar.removingId}
      />

      <DayDetailSheet
        selection={calendar.selection}
        open={rail.dayOpen}
        onClose={rail.closeDay}
        onBlock={rail.requestBlock}
        onUnblock={calendar.unblock}
        removingId={calendar.removingId}
      />
    </Stack>
  );
}
