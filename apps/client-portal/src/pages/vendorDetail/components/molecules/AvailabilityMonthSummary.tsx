import { Stack, Typography } from '@sinnapi/ui';
import AvailabilityStat from '../atoms/AvailabilityStat';
import type { MonthAvailability } from '../../schema';

/**
 * The visible month in two numbers.
 *
 * Answers "how is September looking?" before anyone has counted a single cell,
 * and re-reads as they navigate — which is why the month is owned by the hook
 * rather than by the grid.
 *
 * Both figures count only days still to come, so the strip and the grid agree:
 * the greyed-out first half of the current month is in neither.
 */
export default function AvailabilityMonthSummary({ summary }: { summary: MonthAvailability }) {
  return (
    <Stack
      spacing={1}
      sx={{ mb: 2.5 }}
      role="group"
      aria-label={`Availability for ${summary.label}`}
    >
      <Stack direction="row" spacing={{ xs: 1, sm: 1.5 }}>
        <AvailabilityStat label="Days open" value={summary.open} accent="success" />
        <AvailabilityStat label="Unavailable" value={summary.unavailable} accent="secondary" />
      </Stack>
      {/* "0 days open" is a number the reader has to interpret; this is the
          interpretation. Only for a month that is genuinely full — a month with
          nothing booked at all also has nothing to say here. */}
      {summary.fullyBooked && (
        <Typography variant="body2" color="text.secondary">
          {summary.label} is fully booked. Try another month, or use the next open date above.
        </Typography>
      )}
    </Stack>
  );
}
