import ConfirmDialog from '@/components/ui/ConfirmDialog';
import type { PendingStatusChange } from '../../hooks/useClientStatus';

type Props = {
  pending: PendingStatusChange | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/** Confirmation for blocking / activating a client (also bans/unbans login). */
export default function ClientStatusDialog({ pending, busy, onCancel, onConfirm }: Props) {
  const blocking = pending?.status === 'suspended';
  const name = pending?.name ?? 'this client';

  return (
    <ConfirmDialog
      open={!!pending}
      title={blocking ? `Block ${name}?` : `Activate ${name}?`}
      message={
        blocking ? (
          <>
            <strong>{name}</strong> will be signed out and blocked from signing in to the client
            portal until reactivated. Their bookings and data are kept.
          </>
        ) : (
          <>
            <strong>{name}</strong> will be able to sign in again with their existing credentials.
          </>
        )
      }
      confirmLabel={blocking ? 'Block client' : 'Activate client'}
      confirmColor={blocking ? 'secondary' : 'primary'}
      busy={busy}
      onClose={onCancel}
      onConfirm={() => onConfirm()}
    />
  );
}
