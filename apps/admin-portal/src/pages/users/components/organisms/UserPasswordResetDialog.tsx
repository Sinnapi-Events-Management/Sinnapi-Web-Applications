import LockResetRoundedIcon from '@mui/icons-material/LockResetRounded';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import type { PendingReset } from '../../hooks/useUserPasswordReset';

type Props = {
  /** The user awaiting confirmation; null keeps the dialog closed. */
  pending: PendingReset | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * Confirmation for an admin-initiated password reset. The new password is never
 * shown here — it's generated server-side and emailed — so the copy sets that
 * expectation and warns that the current password stops working immediately.
 */
export default function UserPasswordResetDialog({ pending, busy, onCancel, onConfirm }: Props) {
  const name = pending?.name ?? 'this user';

  return (
    <ConfirmDialog
      open={!!pending}
      title={`Reset password for ${name}?`}
      message={
        <>
          A new one-time password will be emailed to{' '}
          <strong>{pending?.email ?? 'their address'}</strong>. Their current password stops working
          immediately, and they'll be asked to set a new one the next time they sign in.
        </>
      }
      icon={<LockResetRoundedIcon />}
      confirmLabel="Send reset email"
      confirmColor="secondary"
      busy={busy}
      onClose={onCancel}
      onConfirm={() => onConfirm()}
    />
  );
}
