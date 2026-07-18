import ConfirmDialog from '@/components/ui/ConfirmDialog';
import type { PendingPlanDelete } from '../../hooks/usePlanDelete';

type Props = {
  /** The plan awaiting confirmation; null keeps the dialog closed. */
  pending: PendingPlanDelete | null;
  busy: boolean;
  /** Delete failure (e.g. subscriptions still attached), surfaced in the dialog. */
  err: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * Plan-specific copy for a delete. The delete is permanent — `pricing_plans`
 * has no soft-delete column — and is blocked by the database while any
 * subscription still references the plan (see `usePlanDelete`).
 */
export default function PlanDeleteDialog({ pending, busy, err, onCancel, onConfirm }: Props) {
  const name = pending?.name ?? 'this plan';

  return (
    <ConfirmDialog
      open={!!pending}
      title={`Delete ${name}?`}
      message={
        <>
          <strong>{name}</strong> and its features will be permanently removed. This can’t be
          undone. If any vendor is subscribed to it, deactivate the plan instead.
          {err && (
            <>
              <br />
              <br />
              {err}
            </>
          )}
        </>
      }
      confirmLabel="Delete plan"
      confirmColor="error"
      busy={busy}
      onClose={onCancel}
      onConfirm={() => onConfirm()}
    />
  );
}
