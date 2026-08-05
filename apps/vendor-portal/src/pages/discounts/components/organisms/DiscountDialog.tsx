import { Dialog, DialogTitle } from '@sinnapi/ui';
import DiscountForm from '../molecules/DiscountForm';

type Props = {
  open: boolean;
  vendorId: string;
  onClose: () => void;
};

/** Dialog shell for creating a discount. */
export default function DiscountDialog({ open, vendorId, onClose }: Props) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>New discount</DialogTitle>
      <DiscountForm vendorId={vendorId} onCancel={onClose} onSuccess={onClose} />
    </Dialog>
  );
}
