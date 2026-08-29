import { Box, Divider, Typography } from '@sinnapi/ui';
import BlockedDateRow from './BlockedDateRow';
import type { MonthGroup } from '../../schema';

type Props = {
  group: MonthGroup;
  onUnblock: (id: string) => void;
  onSelect: (date: string) => void;
  removingId: string | null;
};

/**
 * One month of the agenda: its name, then the days in it.
 *
 * The heading sticks to the top of whatever is scrolling it. In the rail the
 * list scrolls inside a fixed-height panel, and a vendor three months down an
 * unlabelled run of dates has no way back to knowing which month they are in.
 */
export default function AgendaMonthGroup({ group, onUnblock, onSelect, removingId }: Props) {
  return (
    <Box component="section" aria-label={group.label}>
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1,
          bgcolor: 'background.paper',
          pt: 0.5,
        }}
      >
        <Typography variant="overline" color="text.secondary" sx={{ display: 'block' }}>
          {group.label}
        </Typography>
        <Divider sx={{ mb: 0.5 }} />
      </Box>
      {group.rows.map((row) => (
        <BlockedDateRow
          key={row.id}
          row={row}
          onUnblock={onUnblock}
          onSelect={onSelect}
          removing={removingId === row.id}
        />
      ))}
    </Box>
  );
}
