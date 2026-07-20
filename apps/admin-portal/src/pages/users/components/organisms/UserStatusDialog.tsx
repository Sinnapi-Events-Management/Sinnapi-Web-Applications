import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import type { PendingStatusChange } from '../../hooks/useUserStatus';

type Props = {
  /** The change awaiting confirmation; null keeps the dialog closed. */
  pending: PendingStatusChange | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * Confirmation for blocking / activating a staff user, rendered through the
 * generic ConfirmDialog. Blocking bans the auth login, so the copy is explicit
 * that the user is locked out everywhere, not just hidden from a list.
 */
export default function UserStatusDialog({ pending, busy, onCancel, onConfirm }: Props) {
  const blocking = pending?.status === 'suspended';
  const name = pending?.name ?? 'this user';

  return (
    <ConfirmDialog
      open={!!pending}
      title={blocking ? `Block ${name}?` : `Activate ${name}?`}
      message={
        blocking ? (
          <>
            <strong>{name}</strong> will be signed out and blocked from signing in to any Sinnapi
            app until reactivated. Their data and roles are kept.
          </>
        ) : (
          <>
            <strong>{name}</strong> will be able to sign in again with their existing credentials.
          </>
        )
      }
      icon={blocking ? <BlockRoundedIcon /> : <CheckCircleOutlineRoundedIcon />}
      confirmLabel={blocking ? 'Block user' : 'Activate user'}
      confirmColor={blocking ? 'secondary' : 'primary'}
      busy={busy}
      onClose={onCancel}
      onConfirm={() => onConfirm()}
    />
  );
}
