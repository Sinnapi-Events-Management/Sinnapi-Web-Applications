import ConfirmDialog from '@/components/ui/ConfirmDialog';
import type { PendingDelete } from '../../hooks/useClientDelete';

type Props = {
  pending: PendingDelete | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/** Confirmation for removing a client (soft-delete + permanent login ban). */
export default function ClientDeleteDialog({ pending, busy, onCancel, onConfirm }: Props) {
  const name = pending?.name ?? 'this client';

  return (
    <ConfirmDialog
      open={!!pending}
      title={`Remove ${name}?`}
      message={
        <>
          <strong>{name}</strong> will be removed from the portal and permanently blocked from
          signing in. The record is retained for audit and their email is freed for reuse, but there
          is no way to restore the account from here.
        </>
      }
      confirmLabel="Remove client"
      confirmColor="secondary"
      busy={busy}
      onClose={onCancel}
      onConfirm={() => onConfirm()}
    />
  );
}
