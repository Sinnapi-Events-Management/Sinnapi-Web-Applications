import { ConfirmDialog } from '@sinnapi/ui';
import type { PendingDecision } from '../../hooks/useEventVendorDecision';

type Props = {
  pending: PendingDecision | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/** Confirms an approve/reject decision before the write runs. */
export default function EventVendorDecisionDialog({ pending, busy, onCancel, onConfirm }: Props) {
  const isReject = pending?.decision === 'reject';
  const name = pending?.businessName ?? 'this vendor';

  return (
    <ConfirmDialog
      open={pending !== null}
      title={isReject ? 'Reject vendor?' : 'Approve vendor?'}
      description={
        isReject
          ? `Decline ${name}'s interest and any open quotation for this event. They'll be notified.`
          : `Shortlist ${name} and accept their open quotation for this event. They'll be notified.`
      }
      confirmLabel={isReject ? 'Reject' : 'Approve'}
      destructive={isReject}
      loading={busy}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
