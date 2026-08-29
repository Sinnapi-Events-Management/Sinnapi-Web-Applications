import { Dialog, DialogTitle, Typography } from '@sinnapi/ui';
import QuoteRequestForm from '@/components/vendor/components/molecules/QuoteRequestForm';
import type { PackageRequest } from '../../hooks/useVendorPackages';

type Props = {
  vendorId: string;
  /** The package and tier the client asked about, or null when closed. */
  request: PackageRequest | null;
  onClose: () => void;
};

/**
 * Asking for a specific package.
 *
 * The same form as the sidebar's "Request a quote", carrying the package and
 * tier. Deliberately the same form and not a shorter one: the vendor still has
 * to know the date, the venue and the guest count to turn a package into a real
 * quote, and a one-click request that skips all of that just moves the
 * conversation to the message thread.
 *
 * Mounted only while open, so MUI's unmount-on-close clears react-hook-form's
 * state — picking a different tier afterwards opens a brief seeded with the new
 * one rather than the previous draft.
 */
export default function PackageQuoteDialog({ vendorId, request, onClose }: Props) {
  return (
    <Dialog open={request != null} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ pb: 0.5 }}>
        Request {request?.pkg.name}
        <Typography variant="body2" color="text.secondary">
          {request?.tierName} tier — tell them about your event and they will price it.
        </Typography>
      </DialogTitle>
      {request && (
        <QuoteRequestForm
          vendorId={vendorId}
          onCancel={onClose}
          onSuccess={onClose}
          pkg={{
            templateId: request.pkg.id,
            tierId: request.tierId,
            packageName: request.pkg.name,
            tierName: request.tierName,
          }}
        />
      )}
    </Dialog>
  );
}
