import { Stack, Typography } from '@sinnapi/ui';
import AgendaFilterChips from './AgendaFilterChips';
import AgendaMonthGroup from './AgendaMonthGroup';
import {
  agendaEmptyMessage,
  type AgendaCounts,
  type AgendaFilter,
  type MonthGroup,
} from '../../schema';

type Props = {
  /** Already narrowed by `filter` — see `filterAgenda`. */
  groups: MonthGroup[];
  counts: AgendaCounts;
  filter: AgendaFilter;
  onFilterChange: (next: AgendaFilter) => void;
  onUnblock: (id: string) => void;
  onSelect: (date: string) => void;
  removingId: string | null;
};

/**
 * Every unavailable day still ahead, month by month.
 *
 * The grid answers "is the 18th free?"; this answers "when am I next away?",
 * which no month view can — the next block is as likely to be in November as in
 * the month currently on screen. Past blocks are left out: there is nothing to
 * do about them, and they would push the actionable rows out of sight.
 *
 * The body is shared by the rail and by the full-width card a narrow screen
 * gets instead of one, so the two can never drift into different lists.
 */
export default function AgendaList({
  groups,
  counts,
  filter,
  onFilterChange,
  onUnblock,
  onSelect,
  removingId,
}: Props) {
  return (
    <>
      <AgendaFilterChips value={filter} counts={counts} onChange={onFilterChange} />

      {groups.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
          {agendaEmptyMessage(filter)}
        </Typography>
      ) : (
        <Stack spacing={2.5}>
          {groups.map((group) => (
            <AgendaMonthGroup
              key={group.key}
              group={group}
              onUnblock={onUnblock}
              onSelect={onSelect}
              removingId={removingId}
            />
          ))}
        </Stack>
      )}
    </>
  );
}
