import ConfirmDialog from '@/components/ui/ConfirmDialog';
import type { PendingReset } from '../../hooks/useClientPasswordReset';

type Props = {
  pending: PendingReset | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * Confirmation for an admin-triggered client password reset. Sends Supabase's
 * standard recovery email so the client sets their own password via a secure
 * link — nothing is shown here.
 */
export default function ClientPasswordResetDialog({ pending, busy, onCancel, onConfirm }: Props) {
  const name = pending?.name ?? 'this client';

  return (
    <ConfirmDialog
      open={!!pending}
      title={`Reset password for ${name}?`}
      message={
        <>
          A password reset link will be emailed to{' '}
          <strong>{pending?.email ?? 'their address'}</strong>. They'll follow it to choose a new
          password themselves — their current password keeps working until they do.
        </>
      }
      confirmLabel="Send reset link"
      confirmColor="secondary"
      busy={busy}
      onClose={onCancel}
      onConfirm={() => onConfirm()}
    />
  );
}
