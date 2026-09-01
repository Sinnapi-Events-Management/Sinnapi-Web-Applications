import { Stack } from '@sinnapi/ui';
import CalendarStat from '../atoms/CalendarStat';
import { DAY_LOOK, type MonthSummary } from '../../schema';

/**
 * The visible month in three numbers.
 *
 * Answers "how is August looking?" before the vendor has counted a single cell,
 * and re-reads as they navigate — which is why the month is owned by the page
 * rather than by the grid.
 */
export default function CalendarStatStrip({ summary }: { summary: MonthSummary }) {
  return (
    <Stack
      direction="row"
      spacing={{ xs: 1, sm: 1.5 }}
      sx={{ mb: 2.5 }}
      role="group"
      aria-label={`Availability for ${summary.label}`}
    >
      <CalendarStat label="Booked" value={summary.booked} accent={DAY_LOOK.booked.accent} />
      <CalendarStat label="Blocked" value={summary.blocked} accent={DAY_LOOK.blocked.accent} />
      <CalendarStat label="Open" value={summary.open} accent={DAY_LOOK.open.accent} />
    </Stack>
  );
}
