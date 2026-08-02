import { Dialog, DialogTitle } from '@sinnapi/ui';
import MediaForm from '../molecules/MediaForm';

type Props = {
  open: boolean;
  vendorId: string;
  onClose: () => void;
};

/** Dialog shell for adding portfolio media. */
export default function MediaDialog({ open, vendorId, onClose }: Props) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add portfolio media</DialogTitle>
      <MediaForm vendorId={vendorId} onCancel={onClose} onSuccess={onClose} />
    </Dialog>
  );
}
