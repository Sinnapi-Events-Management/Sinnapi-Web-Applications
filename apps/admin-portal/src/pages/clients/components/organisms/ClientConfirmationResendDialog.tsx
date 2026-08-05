import ConfirmDialog from '@/components/ui/ConfirmDialog';
import type { PendingConfirmationResend } from '../../hooks/useClientConfirmationResend';

type Props = {
  pending: PendingConfirmationResend | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * Confirmation for re-issuing a client's email-confirmation link. Offered for
 * pending clients only — a confirmed account has nothing left to confirm.
 */
export default function ClientConfirmationResendDialog({
  pending,
  busy,
  onCancel,
  onConfirm,
}: Props) {
  const name = pending?.name ?? 'this client';

  return (
    <ConfirmDialog
      open={!!pending}
      title={`Resend confirmation to ${name}?`}
      message={
        <>
          A new confirmation link will be emailed to{' '}
          <strong>{pending?.email ?? 'their address'}</strong>, replacing any earlier one. Their
          account stays pending until they follow it — this doesn&rsquo;t activate anything on its
          own.
        </>
      }
      confirmLabel="Send new link"
      confirmColor="secondary"
      busy={busy}
      onClose={onCancel}
      onConfirm={() => onConfirm()}
    />
  );
}
