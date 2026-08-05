import { Dialog, DialogTitle } from '@sinnapi/ui';
import PromotionForm from '../molecules/PromotionForm';

type Props = {
  open: boolean;
  vendorId: string;
  onClose: () => void;
};

/** Dialog shell for creating a promotion. */
export default function PromotionDialog({ open, vendorId, onClose }: Props) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>New promotion</DialogTitle>
      <PromotionForm vendorId={vendorId} onCancel={onClose} onSuccess={onClose} />
    </Dialog>
  );
}
