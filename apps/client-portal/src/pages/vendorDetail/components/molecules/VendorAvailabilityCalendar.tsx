import { useMemo } from 'react';
import {
  Box,
  CalendarLegend,
  DateCalendar,
  Typography,
  type DayModifierLabels,
  type DayModifiers,
  type DayTooltips,
} from '@sinnapi/ui';
import AvailabilityDayTooltip from './AvailabilityDayTooltip';

type Props = {
  /** The day the client last tapped, so the grid shows what the notices describe. */
  value: string;
  onSelectDay: (date: string) => void;
  month: Date;
  onMonthChange: (next: Date) => void;
  /** Days this vendor has closed, `YYYY-MM-DD`. */
  unavailableDates: string[];
  /** Prebuilt and memoised upstream — see `useVendorAvailability`. */
  modifiers: DayModifiers;
  modifierLabels: DayModifierLabels;
};

/**
 * A vendor's month, at the size of the card rather than of a form field.
 *
 * Every day is tappable, including the taken ones. A client tapping the 18th to
 * find out what is on it should not be told the day does not exist, and the
 * codebase's standing position is that a closed day is advisory to a client
 * anyway — the request form marks it and warns rather than refusing it. What a
 * tap *means* is decided upstream: free days open a request, taken days get an
 * explanation.
 *
 * Three things carry the "unavailable" state, because one is never enough. The
 * gold tint is the glance-level read; the diagonal hatch and the struck-through
 * number survive having no colour vision at all (WCAG 1.4.1); and the modifier
 * label puts the same word into the day's accessible name, which is the only one
 * of the three a screen reader can reach.
 *
 * The closed days use one `booked` marker for both kinds of block. A client has
 * no business knowing whether the 18th is another client's wedding or the
 * vendor's own day off, and drawing the two differently would tell them.
 */
export default function VendorAvailabilityCalendar({
  value,
  onSelectDay,
  month,
  onMonthChange,
  unavailableDates,
  modifiers,
  modifierLabels,
}: Props) {
  // Keyed on the array the query returned rather than rebuilt per render: the
  // calendar keys its day component on this object, so a fresh map would remount
  // the grid and drop keyboard focus mid-navigation.
  const dayTooltips = useMemo<DayTooltips>(() => {
    const map: DayTooltips = {};
    for (const date of unavailableDates) map[date] = <AvailabilityDayTooltip date={date} />;
    return map;
  }, [unavailableDates]);

  return (
    <Box>
      <DateCalendar
        value={value}
        onChange={onSelectDay}
        month={month}
        onMonthChange={onMonthChange}
        // A booking can only be for a day still to come, so the grid never
        // offers the past and the nav never walks back into it.
        disablePast
        fullWidth
        density="responsive"
        dayEmphasis="hatched"
        modifiers={modifiers}
        dayModifierLabels={modifierLabels}
        dayTooltips={dayTooltips}
        footer={
          <CalendarLegend
            items={[{ color: 'secondary.main', label: 'Unavailable', variant: 'hatched' }]}
          />
        }
      />
      {/* Days became tappable in this revision, and nothing else on the card
          says so — a grid that looks read-only gets treated as read-only. */}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 1.5 }}>
        Tap a day to request it.
      </Typography>
    </Box>
  );
}
