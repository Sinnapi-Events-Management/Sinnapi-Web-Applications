import { Dialog, DialogTitle, Typography } from '@sinnapi/ui';
import PackageOrderForm from './PackageOrderForm';
import type { PackageRequest } from '../../hooks/useVendorPackages';

type Props = {
  /** The package and tier the client asked about, or null when closed. */
  request: PackageRequest | null;
  onClose: () => void;
};

/**
 * Ordering a specific package.
 *
 * WHAT CHANGED, AND WHY IT IS NOT THE SIDEBAR'S FORM ANY MORE
 * This used to render `QuoteRequestForm` — the same brief the "Request a quote"
 * button opens — on the reasoning that a vendor still needs the date, the venue
 * and the guest count before a package becomes a real quote.
 *
 * That reasoning holds for a BESPOKE request and does not hold here. A
 * published package is priced, itemised and public; the vendor has already
 * decided what it costs. Asking them to re-derive a number they published, on a
 * client who has just clicked that number, was the platform declining to sell
 * something it had put a price tag on. So this dialog now places an ORDER —
 * priced server-side at request time — and the vendor's move is to approve or
 * decline it.
 *
 * The sidebar's "Request a quote" is untouched and still opens
 * `QuoteRequestForm`. That path is for work that has no published price, which
 * is exactly the case the old reasoning described.
 *
 * `maxWidth="md"` because the form is two columns from `md` up — the brief and
 * the price side by side, so the figure stays on screen while the brief is
 * written.
 *
 * Mounted only while open, so MUI's unmount-on-close clears react-hook-form's
 * state. That matters more here than it did before: a tier switch changes the
 * price, the saving AND the date window, and a form kept alive would carry the
 * previous tier's bounds into the new one.
 */
export default function PackageQuoteDialog({ request, onClose }: Props) {
  return (
    <Dialog open={request != null} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ pb: 0.5 }}>
        Order {request?.pkg.name}
        <Typography variant="body2" color="text.secondary">
          {request?.tierName} tier — at the price shown. The vendor confirms your date.
        </Typography>
      </DialogTitle>
      {request && <PackageOrderForm request={request} onCancel={onClose} onSuccess={onClose} />}
    </Dialog>
  );
}
