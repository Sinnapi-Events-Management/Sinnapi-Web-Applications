import { Box, Chip } from '@sinnapi/ui';
import { AGENDA_FILTERS, type AgendaCounts, type AgendaFilter } from '../../schema';

type Props = {
  value: AgendaFilter;
  counts: AgendaCounts;
  onChange: (next: AgendaFilter) => void;
};

/**
 * Which upcoming rows to show.
 *
 * Chips rather than a second tab bar: the rail's tabs already say which of the
 * page's two questions is on screen, and stacking tabs under tabs makes the
 * narrower choice look like the larger one. Each chip carries its own count, so
 * a vendor can see there is nothing behind "Blocked by you" without pressing it.
 */
export default function AgendaFilterChips({ value, counts, onChange }: Props) {
  return (
    <Box
      role="group"
      aria-label="Filter unavailable dates"
      // `gap` rather than Stack spacing: these wrap on a narrow rail, and
      // margin-based spacing leaves a ragged first column when they do.
      sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}
    >
      {AGENDA_FILTERS.map((option) => {
        const active = option.value === value;
        return (
          <Chip
            key={option.value}
            size="small"
            label={`${option.label} · ${counts[option.value]}`}
            onClick={() => onChange(option.value)}
            color={active ? 'secondary' : 'default'}
            variant={active ? 'filled' : 'outlined'}
            aria-pressed={active}
            sx={{ fontWeight: active ? 600 : 400 }}
          />
        );
      })}
    </Box>
  );
}
