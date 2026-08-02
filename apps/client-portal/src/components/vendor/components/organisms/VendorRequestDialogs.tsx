import { Dialog, DialogTitle } from '@sinnapi/ui';
import type { VendorActionDialog } from '../../hooks/useVendorActions';
import QuoteRequestForm from '../molecules/QuoteRequestForm';
import BookingRequestForm from '../molecules/BookingRequestForm';

type Props = {
  vendorId: string;
  open: VendorActionDialog;
  onClose: () => void;
};

/**
 * The two request dialogs a vendor page can raise. Each form lives inside its
 * Dialog so MUI's unmount-on-close clears react-hook-form's state — reopening
 * after a cancel starts from a blank request, not a stale draft.
 */
export default function VendorRequestDialogs({ vendorId, open, onClose }: Props) {
  return (
    <>
      <Dialog open={open === 'quote'} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>Request a quotation</DialogTitle>
        <QuoteRequestForm vendorId={vendorId} onCancel={onClose} onSuccess={onClose} />
      </Dialog>

      <Dialog open={open === 'booking'} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>Request a booking</DialogTitle>
        <BookingRequestForm vendorId={vendorId} onCancel={onClose} onSuccess={onClose} />
      </Dialog>
    </>
  );
}
