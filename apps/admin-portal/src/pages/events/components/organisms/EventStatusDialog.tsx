import ConfirmDialog from '@/components/ui/ConfirmDialog';
import type { EventStatus } from '@/lib/status';
import type { PendingStatusChange } from '../../hooks/useEventStatus';

type Props = {
  /** The change awaiting confirmation; null keeps the dialog closed. */
  pending: PendingStatusChange | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

// Per-target copy + button styling. Events carry no status-change reason, so
// this is a plain confirm (ConfirmDialog's `requireReason` stays off).
const COPY: Record<EventStatus, { verb: string; color: 'primary' | 'success'; effect: string }> = {
  published: {
    verb: 'Publish',
    color: 'success',
    effect: 'be visible on the public site (if marked public) and open to interest',
  },
  closed: {
    verb: 'Close',
    color: 'primary',
    effect: 'stop accepting new interest but remain visible',
  },
  archived: {
    verb: 'Archive',
    color: 'primary',
    effect: 'be hidden from the public site and moved out of the active list',
  },
  draft: {
    verb: 'Restore to draft for',
    color: 'primary',
    effect: 'be unpublished and hidden from the public site until published again',
  },
};

/**
 * Event-specific copy for a status change, rendered through the generic
 * ConfirmDialog. The message states the effect of the target status so the
 * operator confirms with the consequence in view.
 */
export default function EventStatusDialog({ pending, busy, onCancel, onConfirm }: Props) {
  const target = (pending?.status ?? 'published') as EventStatus;
  const { verb, color, effect } = COPY[target];
  const name = pending?.title ?? 'this event';

  return (
    <ConfirmDialog
      open={!!pending}
      title={`${verb} ${name}?`}
      message={
        <>
          <strong>{name}</strong> will {effect}.
        </>
      }
      confirmLabel={verb.replace(/ for$/, '')}
      confirmColor={color}
      busy={busy}
      onClose={onCancel}
      onConfirm={() => onConfirm()}
    />
  );
}
