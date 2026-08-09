import { Box, FormHelperText, DateCalendar, CalendarLegend } from '@sinnapi/ui';

type Props = {
  /** `YYYY-MM-DD`, or `''` when nothing is picked yet. */
  value: string;
  onChange: (next: string) => void;
  /** Days the vendor blocked by hand — removable, and not re-blockable. */
  blockedDates: string[];
  /** Days a confirmed booking closed — shown, but never selectable. */
  bookedDates: string[];
  error?: string;
};

/**
 * The month grid the vendor picks an unavailable day from.
 *
 * Showing the existing blocks on the same surface used to create one is what
 * makes the page answer "am I free on the 18th?" without reading a list — and
 * days already spoken for are greyed rather than merely marked, so double
 * blocking is impossible instead of merely discouraged. Past days are out for
 * the same reason: blocking a date that has been and gone changes nothing.
 *
 * Presentational — the selection lives in `useBlockDateForm`.
 */
export default function AvailabilityCalendar({
  value,
  onChange,
  blockedDates,
  bookedDates,
  error,
}: Props) {
  return (
    <Box>
      <DateCalendar
        value={value}
        onChange={onChange}
        disablePast
        disabledDates={[...blockedDates, ...bookedDates]}
        modifiers={{ blocked: blockedDates, booked: bookedDates }}
        footer={
          <CalendarLegend
            items={[
              { color: 'error.main', label: 'Blocked by you' },
              { color: 'secondary.main', label: 'Confirmed booking' },
            ]}
          />
        }
      />
      {error && <FormHelperText error>{error}</FormHelperText>}
    </Box>
  );
}
