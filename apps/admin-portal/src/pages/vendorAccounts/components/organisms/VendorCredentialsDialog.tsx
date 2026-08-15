import ConfirmDialog from '@/components/ui/ConfirmDialog';
import ForwardToInboxIcon from '@mui/icons-material/ForwardToInbox';
import type { PendingCredentials } from '../../hooks/useVendorCredentials';

type Props = {
  pending: PendingCredentials | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * Confirmation for issuing fresh sign-in credentials.
 *
 * The copy leads with the consequence that is easy to miss: this does not
 * re-send the old password, it replaces it. Nothing has that password stored,
 * so there is nothing to re-send — and an admin who believes otherwise will not
 * understand why a vendor holding the original mail suddenly cannot sign in.
 */
export default function VendorCredentialsDialog({ pending, busy, onCancel, onConfirm }: Props) {
  const name = pending?.name ?? 'this vendor';

  return (
    <ConfirmDialog
      open={!!pending}
      title={`Send new credentials to ${name}?`}
      icon={<ForwardToInboxIcon />}
      message={
        <>
          A <strong>new temporary password</strong> will be generated and emailed to{' '}
          <strong>{pending?.email ?? 'their address'}</strong>. Any password sent to them before
          will stop working, and they'll be asked to choose their own the first time they sign in.
        </>
      }
      confirmLabel="Send credentials"
      confirmColor="secondary"
      busy={busy}
      onClose={onCancel}
      onConfirm={() => onConfirm()}
    />
  );
}
