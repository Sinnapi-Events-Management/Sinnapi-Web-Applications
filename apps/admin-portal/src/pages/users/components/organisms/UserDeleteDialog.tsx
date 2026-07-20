import PersonRemoveRoundedIcon from '@mui/icons-material/PersonRemoveRounded';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import type { PendingDelete } from '../../hooks/useUserDelete';

type Props = {
  /** The user awaiting confirmation; null keeps the dialog closed. */
  pending: PendingDelete | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * Confirmation for removing a staff user. The copy states what actually happens:
 * the profile is soft-deleted (retained for audit, email freed for reuse) and
 * the login is permanently banned. It's a one-way door from the admin portal.
 */
export default function UserDeleteDialog({ pending, busy, onCancel, onConfirm }: Props) {
  const name = pending?.name ?? 'this user';

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
      icon={<PersonRemoveRoundedIcon />}
      confirmLabel="Remove user"
      confirmColor="secondary"
      busy={busy}
      onClose={onCancel}
      onConfirm={() => onConfirm()}
    />
  );
}
