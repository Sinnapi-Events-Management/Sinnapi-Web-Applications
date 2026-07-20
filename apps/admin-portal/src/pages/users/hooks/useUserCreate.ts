import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { invokeFunction } from '@/lib/functions';
import { toCreatePayload, type UserFormValues } from '../schema';

/** Turn a raw handler error into copy an operator can act on. */
function friendlyCreateError(message: string): string {
  if (/already|exists|registered|duplicate/i.test(message)) {
    return 'A user with that email already exists.';
  }
  if (message.startsWith('non_staff_role') || message.includes('invalid:roleIds')) {
    return 'One or more selected roles are not valid staff roles.';
  }
  return message || 'Failed to create user.';
}

/**
 * Owns the create-user drawer and the call to the `create-staff` Edge Function,
 * which provisions the account, assigns roles, and emails a one-time password.
 * `notice` carries a post-create toast so the page can confirm the outcome (and
 * warn if the credential email didn't go out).
 */
export function useUserCreate() {
  const qc = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const open = useCallback(() => {
    setErr(null);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setErr(null);
  }, []);

  const save = useCallback(
    async (values: UserFormValues): Promise<boolean> => {
      setBusy(true);
      setErr(null);
      const { data, error } = await invokeFunction<{ emailSent?: boolean }>(
        'create-staff',
        toCreatePayload(values),
      );
      setBusy(false);
      if (error) {
        setErr(friendlyCreateError(error));
        return false;
      }
      setIsOpen(false);
      setNotice(
        data?.emailSent === false
          ? 'User created, but the welcome email could not be sent. Use “Reset password” to resend their credentials.'
          : 'User created — sign-in details have been emailed.',
      );
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['user-status-counts'] });
      return true;
    },
    [qc],
  );

  return { isOpen, busy, err, notice, clearNotice: () => setNotice(null), open, close, save };
}
