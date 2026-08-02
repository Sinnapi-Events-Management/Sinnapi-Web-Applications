import { Dialog, DialogTitle } from '@sinnapi/ui';
import TemplateForm from '../molecules/TemplateForm';

type Props = {
  open: boolean;
  vendorId: string;
  onClose: () => void;
};

/** Dialog shell for creating a quote template. */
export default function TemplateDialog({ open, vendorId, onClose }: Props) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>New quote template</DialogTitle>
      <TemplateForm vendorId={vendorId} onCancel={onClose} onSuccess={onClose} />
    </Dialog>
  );
}
