import { Dialog, DialogTitle } from '@sinnapi/ui';
import ServiceForm from '../molecules/ServiceForm';

type Props = {
  open: boolean;
  vendorId: string;
  onClose: () => void;
};

/**
 * Dialog shell for adding a service. The form is a child so MUI's default
 * unmount-on-close discards react-hook-form's state with it.
 */
export default function ServiceDialog({ open, vendorId, onClose }: Props) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add a service</DialogTitle>
      <ServiceForm vendorId={vendorId} onCancel={onClose} onSuccess={onClose} />
    </Dialog>
  );
}
