import { Dialog, DialogTitle } from '@sinnapi/ui';
import type { VendorActionDialog } from '../../hooks/useVendorActions';
import QuoteRequestForm from '../molecules/QuoteRequestForm';
import BookingRequestForm from '../molecules/BookingRequestForm';

type Props = {
  vendorId: string;
  open: VendorActionDialog;
  onClose: () => void;
  /**
   * Seeds the booking form's event date — set when the request was started from
   * a day on the availability calendar rather than from the sidebar button.
   *
   * The quote form takes no seed: a quotation is a question about price, and the
   * date is one of the things being asked about rather than settled up front.
   */
  eventDate?: string;
};

/**
 * The two request dialogs a vendor page can raise. Each form lives inside its
 * Dialog so MUI's unmount-on-close clears react-hook-form's state — reopening
 * after a cancel starts from a blank request, not a stale draft. That is also
 * what makes `eventDate` a plain default rather than something to sync: the form
 * is built fresh each time it opens, so the seed is always the current one.
 */
export default function VendorRequestDialogs({ vendorId, open, onClose, eventDate }: Props) {
  return (
    <>
      <Dialog open={open === 'quote'} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle>Request a quotation</DialogTitle>
        <QuoteRequestForm vendorId={vendorId} onCancel={onClose} onSuccess={onClose} />
      </Dialog>

      <Dialog open={open === 'booking'} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle>Request a booking</DialogTitle>
        <BookingRequestForm
          vendorId={vendorId}
          eventDate={eventDate}
          onCancel={onClose}
          onSuccess={onClose}
        />
      </Dialog>
    </>
  );
}
