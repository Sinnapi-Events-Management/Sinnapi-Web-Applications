import { useMemo } from 'react';
import { Box, DateCalendar, CalendarLegend, type DayTooltips } from '@sinnapi/ui';
import DayTooltipContent from './DayTooltipContent';
import { CALENDAR_LEGEND, type DayIndex } from '../../schema';
import type { ClientNameResolver } from '../../hooks/useBlockedDateClients';

type Props = {
  /** `YYYY-MM-DD` — the day the panel beside the grid is describing. */
  value: string;
  onChange: (next: string) => void;
  month: Date;
  onMonthChange: (next: Date) => void;
  /** Days the vendor blocked by hand. */
  blockedDates: string[];
  /** Days a confirmed booking closed. */
  bookedDates: string[];
  /** Every row blocking each date, for the hover detail. */
  entries: DayIndex;
  clientName: ClientNameResolver;
};

/**
 * The month grid, at the size of the page rather than of a form field.
 *
 * Three deliberate departures from the picker this replaces:
 *
 * `fullWidth` + `spacious` — the grid used to render at its natural ~280px and
 * sit in the left third of a wide card, which is the "too much white space" the
 * page was accused of. It now claims the card.
 *
 * `solid` markers — a blocked day used to be grey text with a 4px dot, i.e. the
 * quietest thing on a screen whose entire job is showing which days are gone.
 * Tinted days make the shape of a month readable without counting.
 *
 * Every day is selectable, including the taken ones. Blocking is no longer what
 * a click means — the panel beside the grid is — and a vendor tapping the 18th
 * to find out what is on it should not be told the day does not exist.
 *
 * Hovering answers the same question without the click: a tint says only that a
 * day is gone, and "gone to whom, when and for how much" is what a vendor is
 * actually scanning a month for.
 */
export default function AvailabilityCalendar({
  value,
  onChange,
  month,
  onMonthChange,
  blockedDates,
  bookedDates,
  entries,
  clientName,
}: Props) {
  // Built up front and memoised because the calendar keys its day component on
  // this object: a fresh map each render would remount the grid and drop
  // keyboard focus mid-navigation. Bounded by how many days a vendor has
  // blocked, so there is nothing to defer.
  const dayTooltips = useMemo<DayTooltips>(() => {
    const map: DayTooltips = {};
    for (const [date, rows] of entries) {
      map[date] = <DayTooltipContent rows={rows} clientName={clientName} />;
    }
    return map;
  }, [entries, clientName]);

  return (
    <Box sx={{ '& .rdp-root': { mx: 'auto' } }}>
      <DateCalendar
        value={value}
        onChange={onChange}
        month={month}
        onMonthChange={onMonthChange}
        disablePast
        fullWidth
        density="spacious"
        dayEmphasis="solid"
        modifiers={{ blocked: blockedDates, booked: bookedDates }}
        dayTooltips={dayTooltips}
        footer={<CalendarLegend items={[...CALENDAR_LEGEND]} />}
      />
    </Box>
  );
}
