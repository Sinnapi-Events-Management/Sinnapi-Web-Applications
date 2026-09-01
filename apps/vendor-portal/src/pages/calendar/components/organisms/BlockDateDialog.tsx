import { Dialog, DialogTitle } from '@sinnapi/ui';
import BlockDateFields from '../molecules/BlockDateFields';

type Props = {
  vendorId: string;
  /** The day the grid has selected — the form's starting point. */
  date: string;
  today: string;
  /** Days a booking or an earlier block already holds. */
  unavailable: string[];
  open: boolean;
  onClose: () => void;
  onSuccess: (outcome: string) => void;
};

/**
 * Confirming a block.
 *
 * The body is mounted only while the dialog is open, which is what resets it
 * between blocks — the form's defaults are seeded from `date`, and a kept-alive
 * form would carry the last date, the last range and the last reason into the
 * next day the vendor picks.
 */
export default function BlockDateDialog({
  vendorId,
  date,
  today,
  unavailable,
  open,
  onClose,
  onSuccess,
}: Props) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Block time off</DialogTitle>
      {open && (
        <BlockDateFields
          vendorId={vendorId}
          date={date}
          today={today}
          unavailable={unavailable}
          onCancel={onClose}
          onSuccess={onSuccess}
        />
      )}
    </Dialog>
  );
}
