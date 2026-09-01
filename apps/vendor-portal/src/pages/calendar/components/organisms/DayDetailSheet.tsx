import { Box, Drawer } from '@sinnapi/ui';
import DayDetail from '../molecules/DayDetail';
import type { DaySelection } from '../../hooks/useCalendarView';

type Props = {
  selection: DaySelection;
  open: boolean;
  onClose: () => void;
  onBlock: () => void;
  onUnblock: (id: string) => void;
  removingId: string | null;
};

/**
 * The selected day, on a screen with no room for a rail.
 *
 * A sheet rather than a panel stacked under the calendar: the answer to a tap
 * has to arrive where the tap happened. A panel below the grid means the grid
 * scrolls out of sight to read it and back into sight to try another day, which
 * on a phone is the whole interaction.
 *
 * Capped short of the viewport on purpose — the edge of the grid stays visible
 * behind it, so the sheet reads as something over the calendar rather than as
 * a new screen the vendor has navigated to.
 */
export default function DayDetailSheet({
  selection,
  open,
  onClose,
  onBlock,
  onUnblock,
  removingId,
}: Props) {
  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          maxHeight: '80vh',
          px: 2.5,
          pb: 3,
          pt: 1.5,
        },
      }}
    >
      {/* The grab handle every bottom sheet has. Decorative — the sheet is
          dismissed by the backdrop or Escape, both of which MUI already wires. */}
      <Box
        aria-hidden
        sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: 'divider', mx: 'auto', mb: 2 }}
      />
      <DayDetail
        selection={selection}
        onBlock={onBlock}
        onUnblock={onUnblock}
        removingId={removingId}
      />
    </Drawer>
  );
}
