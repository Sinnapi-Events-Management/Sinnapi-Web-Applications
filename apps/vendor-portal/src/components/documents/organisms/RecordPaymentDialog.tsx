import { Dialog, DialogContent, DialogTitle, useMediaQuery, useTheme } from '@sinnapi/ui';
import type { LinkedInvoice } from '../hooks/useReceiptForm';
import ReceiptForm from './ReceiptForm';

type Props = {
  open: boolean;
  invoice: LinkedInvoice | null;
  onClose: () => void;
  onRecorded: (documentNo: string) => void;
};

/**
 * "Record payment" on an invoice. Mounted only while open, so each open
 * starts with a fresh form — and a fresh idempotency key.
 */
export default function RecordPaymentDialog({ open, invoice, onClose, onRecorded }: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" fullScreen={fullScreen}>
      <DialogTitle>Record a payment{invoice ? ` for ${invoice.documentNo}` : ''}</DialogTitle>
      <DialogContent>
        {open && invoice && (
          <ReceiptForm
            linked={invoice}
            onCancel={onClose}
            onDone={(r) => onRecorded(r.documentNo)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
