import { Dialog, DialogTitle } from '@sinnapi/ui';
import DisputeForm from '../molecules/DisputeForm';

type Props = {
  open: boolean;
  escrowId: string;
  onClose: () => void;
};

/**
 * Dialog shell for raising a dispute. The form lives inside so that MUI's
 * default unmount-on-close discards react-hook-form's state along with it.
 */
export default function DisputeDialog({ open, escrowId, onClose }: Props) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Raise a dispute</DialogTitle>
      <DisputeForm escrowId={escrowId} onCancel={onClose} onSuccess={onClose} />
    </Dialog>
  );
}
