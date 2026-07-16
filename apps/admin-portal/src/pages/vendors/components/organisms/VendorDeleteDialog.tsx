import ConfirmDialog from '@/components/ui/ConfirmDialog';
import type { PendingDelete } from '../../hooks/useVendorDelete';

type Props = {
  /** The vendor awaiting confirmation; null keeps the dialog closed. */
  pending: PendingDelete | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * Vendor-specific copy for a delete, rendered through the generic ConfirmDialog.
 * The copy says the record is retained because that is what actually happens —
 * the delete is turned into a soft delete by a database trigger (see
 * `useVendorDelete`) — but it is a one-way door from the admin portal's side.
 */
export default function VendorDeleteDialog({ pending, busy, onCancel, onConfirm }: Props) {
  const name = pending?.businessName ?? 'this vendor';

  return (
    <ConfirmDialog
      open={!!pending}
      title={`Delete ${name}?`}
      message={
        <>
          <strong>{name}</strong> will be removed from the admin portal and the public site, and its
          slug will be freed for reuse. The record is retained for audit, but there is no way to
          restore the vendor from here.
        </>
      }
      confirmLabel="Delete vendor"
      confirmColor="error"
      busy={busy}
      onClose={onCancel}
      onConfirm={() => onConfirm()}
    />
  );
}
