import ConfirmDialog from '@/components/ui/ConfirmDialog';
import type { PendingEventTypeDelete } from '../../hooks/useEventTypeDelete';

type Props = {
  /** The type awaiting confirmation; null keeps the dialog closed. */
  pending: PendingEventTypeDelete | null;
  busy: boolean;
  /** Delete failure (events still filed under it), surfaced in the dialog. */
  err: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * Event-type-specific copy for a delete. The delete is permanent —
 * `event_types` has no soft-delete column — and the database blocks it while
 * any event still references the type (see `useEventTypeDelete`).
 */
export default function EventTypeDeleteDialog({ pending, busy, err, onCancel, onConfirm }: Props) {
  const name = pending?.name ?? 'this event type';

  return (
    <ConfirmDialog
      open={!!pending}
      title={`Delete ${name}?`}
      message={
        <>
          <strong>{name}</strong> will be permanently removed and will disappear from every occasion
          picker and filter. This can’t be undone. If events are already filed under it, deactivate
          it instead.
          {err && (
            <>
              <br />
              <br />
              {err}
            </>
          )}
        </>
      }
      confirmLabel="Delete event type"
      confirmColor="error"
      busy={busy}
      onClose={onCancel}
      onConfirm={() => onConfirm()}
    />
  );
}
