import ConfirmDialog from '@/components/ui/ConfirmDialog';
import type { PendingRegionDelete } from '../../hooks/useRegionDelete';

type Props = {
  /** The region awaiting confirmation; null keeps the dialog closed. */
  pending: PendingRegionDelete | null;
  busy: boolean;
  /** Delete failure (e.g. vendors still serve this region), surfaced in the dialog. */
  err: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * Region-specific copy for a delete. The delete is permanent —
 * `service_regions` has no soft-delete column — and is blocked before it
 * ever reaches the database while a vendor still serves the region (see
 * `useRegionDelete`), since the underlying foreign key cascades rather than
 * raising an error.
 */
export default function RegionDeleteDialog({ pending, busy, err, onCancel, onConfirm }: Props) {
  const name = pending?.name ?? 'this region';

  return (
    <ConfirmDialog
      open={!!pending}
      title={`Delete ${name}?`}
      message={
        <>
          <strong>{name}</strong> will be permanently removed. This can’t be undone. If any vendor
          still serves this region, deactivate it instead.
          {err && (
            <>
              <br />
              <br />
              {err}
            </>
          )}
        </>
      }
      confirmLabel="Delete region"
      confirmColor="error"
      busy={busy}
      onClose={onCancel}
      onConfirm={() => onConfirm()}
    />
  );
}
