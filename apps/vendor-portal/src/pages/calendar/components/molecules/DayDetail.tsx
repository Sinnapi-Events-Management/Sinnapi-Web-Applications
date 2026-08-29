import { Box, Button, Divider, Stack, Typography, formatIsoDateLong } from '@sinnapi/ui';
import BlockIcon from '@mui/icons-material/Block';
import DayStateChip from '../atoms/DayStateChip';
import DayEntryRow from './DayEntryRow';
import type { DaySelection } from '../../hooks/useCalendarView';

type Props = {
  selection: DaySelection;
  onBlock: () => void;
  onUnblock: (id: string) => void;
  removingId: string | null;
};

/**
 * What is on the day the vendor just tapped, and what they can do about it.
 *
 * This is why every day on the grid stayed selectable, taken ones included:
 * without somewhere for a tap to land, a calendar can only ever say
 * "unavailable", and the vendor still has to go and look up which job it was.
 *
 * A day may hold both a booking and a manual block — the table's uniqueness is
 * per `(vendor, date, source)` — so the entries are a list, not a single record.
 *
 * It carries its own heading rather than borrowing a card's, because it is
 * shown in two places: a tab in the rail on a wide screen, and a sheet over the
 * grid on a narrow one. Neither has a title row to lend it.
 */
export default function DayDetail({ selection, onBlock, onUnblock, removingId }: Props) {
  const { date, state, rows } = selection;
  const isPast = state === 'past';
  const canBlock = state === 'open';

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Typography variant="h6" sx={{ lineHeight: 1.2, flex: 1, minWidth: 0 }}>
          {formatIsoDateLong(date) || 'No day selected'}
        </Typography>
        <DayStateChip state={state} />
      </Stack>

      {rows.length > 0 ? (
        <Stack divider={<Divider flexItem />}>
          {rows.map((row) => (
            <DayEntryRow
              key={row.id}
              row={row}
              onUnblock={onUnblock}
              removing={removingId === row.id}
            />
          ))}
        </Stack>
      ) : (
        <Box sx={{ py: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {isPast
              ? 'This day has been and gone.'
              : 'Nothing on this day — clients can request it.'}
          </Typography>
        </Box>
      )}

      {canBlock && (
        <Button
          onClick={onBlock}
          variant="outlined"
          color="error"
          startIcon={<BlockIcon />}
          fullWidth
        >
          Block this day
        </Button>
      )}
    </Stack>
  );
}
