import ConfirmDialog from '@/components/ui/ConfirmDialog';
import type { PendingDelete } from '../../hooks/useEventDelete';

type Props = {
  /** The event awaiting confirmation; null keeps the dialog closed. */
  pending: PendingDelete | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * Event-specific copy for a delete, rendered through the generic ConfirmDialog.
 * The copy says the record is retained because that is what actually happens —
 * the delete is turned into a soft delete by a database trigger (see
 * `useEventDelete`) — but it is a one-way door from the admin portal's side.
 */
export default function EventDeleteDialog({ pending, busy, onCancel, onConfirm }: Props) {
  const name = pending?.title ?? 'this event';

  return (
    <ConfirmDialog
      open={!!pending}
      title={`Delete ${name}?`}
      message={
        <>
          <strong>{name}</strong> will be removed from the admin portal and the public site. The
          record is retained for audit, but there is no way to restore the event from here.
        </>
      }
      confirmLabel="Delete event"
      confirmColor="error"
      busy={busy}
      onClose={onCancel}
      onConfirm={() => onConfirm()}
    />
  );
}
