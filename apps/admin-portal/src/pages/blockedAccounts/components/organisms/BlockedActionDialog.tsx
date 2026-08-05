import ConfirmDialog from '@/components/ui/ConfirmDialog';
import type { PendingBlockedAction } from '../../hooks/useBlockedActions';

type Props = {
  pending: PendingBlockedAction | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

type Copy = { title: string; message: React.ReactNode; confirmLabel: string };

/**
 * One dialog for all three actions. They share a shape — name the target,
 * explain the consequence, confirm — so three near-identical components would
 * only spread the wording out.
 *
 * The wording matters more than usual here because two of these send email to a
 * real person and the third weakens a security control, so each says plainly
 * what happens next rather than "Are you sure?".
 */
function copyFor(pending: PendingBlockedAction): Copy {
  const who = <strong>{pending.email}</strong>;

  switch (pending.kind) {
    case 'unlock':
      return {
        title: `Clear the lockout for ${pending.name}?`,
        message: (
          <>
            {who} will be able to attempt sign-in again immediately, and the failed attempts stop
            counting toward the limit. The attempts stay in the security record — clearing a lockout
            does not erase it. If the lockout came from someone else guessing their password, this
            hands that person fresh attempts too.
          </>
        ),
        confirmLabel: 'Clear lockout',
      };
    case 'reset':
      return {
        title: `Send a password reset to ${pending.name}?`,
        message: (
          <>
            A reset link will be emailed to {who}. They choose the new password themselves — you
            will not see it, and their current password keeps working until they do. This does not
            clear a lockout on its own.
          </>
        ),
        confirmLabel: 'Send reset link',
      };
    case 'confirmation':
      return {
        title: `Resend the confirmation email to ${pending.name}?`,
        message: (
          <>
            A new confirmation link will be emailed to {who}, replacing any earlier one. Their
            account stays pending until they follow it — this doesn&rsquo;t activate anything on its
            own.
          </>
        ),
        confirmLabel: 'Send new link',
      };
  }
}

export default function BlockedActionDialog({ pending, busy, onCancel, onConfirm }: Props) {
  // Keep the last copy while the dialog animates out, so the text doesn't blank
  // mid-transition after a confirm clears `pending`.
  const copy = pending ? copyFor(pending) : null;

  return (
    <ConfirmDialog
      open={!!pending}
      title={copy?.title ?? ''}
      message={copy?.message ?? ''}
      confirmLabel={copy?.confirmLabel ?? 'Confirm'}
      // Clearing a lockout weakens a live security control, so it gets the
      // cautionary treatment; the two email actions are routine.
      confirmColor={pending?.kind === 'unlock' ? 'error' : 'secondary'}
      busy={busy}
      onClose={onCancel}
      onConfirm={() => onConfirm()}
    />
  );
}
