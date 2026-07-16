import ConfirmDialog from '@/components/ui/ConfirmDialog';
import type { PendingStatusChange } from '@/hooks/useVendorStatus';

type Props = {
  /** The change awaiting confirmation; null keeps the dialog closed. */
  pending: PendingStatusChange | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
};

/**
 * Vendor-specific copy for a status change, rendered through the generic
 * ConfirmDialog. Both transitions require a reason, which is stored on the
 * vendor as `status_change_reason`.
 */
export default function VendorStatusDialog({ pending, busy, onCancel, onConfirm }: Props) {
  const suspending = pending?.status === 'suspended';
  const name = pending?.businessName ?? 'this vendor';

  return (
    <ConfirmDialog
      open={!!pending}
      title={suspending ? `Suspend ${name}?` : `Activate ${name}?`}
      message={
        suspending ? (
          <>
            <strong>{name}</strong> will be hidden from the public site and cannot take new
            bookings. Existing bookings are unaffected. Give a reason for the suspension.
          </>
        ) : (
          <>
            <strong>{name}</strong> will be listed publicly again and can take new bookings. Give a
            reason for the reactivation.
          </>
        )
      }
      confirmLabel={suspending ? 'Suspend vendor' : 'Activate vendor'}
      confirmColor={suspending ? 'error' : 'success'}
      busy={busy}
      requireReason
      reasonLabel={suspending ? 'Reason for suspension' : 'Reason for reactivation'}
      onClose={onCancel}
      onConfirm={onConfirm}
    />
  );
}
