import ConfirmDialog from '@/components/ui/ConfirmDialog';
import LockResetIcon from '@mui/icons-material/LockReset';
import type { PendingReset } from '../../hooks/useVendorPasswordReset';

type Props = {
  pending: PendingReset | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * Confirmation for an admin-triggered vendor password reset. The vendor follows
 * a secure link and chooses their own password — nothing is shown here, and
 * their current password keeps working until they act, which is what separates
 * this from re-issuing credentials.
 */
export default function VendorPasswordResetDialog({ pending, busy, onCancel, onConfirm }: Props) {
  const name = pending?.name ?? 'this vendor';

  return (
    <ConfirmDialog
      open={!!pending}
      title={`Reset password for ${name}?`}
      icon={<LockResetIcon />}
      message={
        <>
          A password reset link will be emailed to{' '}
          <strong>{pending?.email ?? 'their address'}</strong>, pointing at the Vendor Portal.
          They'll follow it to choose a new password themselves — their current password keeps
          working until they do.
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
