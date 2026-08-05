import { z } from 'zod';
import { newPasswordField } from '@/components/auth/schema';

/**
 * The forced first-sign-in password change.
 *
 * The mismatch check is attached to `confirm` via `path`, so it renders under
 * the confirmation box the user just left rather than as a form-level banner —
 * the whole point of validating on blur is that the message lands where the
 * problem is.
 */
export const changePasswordSchema = z
  .object({
    password: newPasswordField(),
    confirm: z.string().min(1, 'Re-enter your new password.'),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords don't match.",
    path: ['confirm'],
  });

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export const emptyChangePasswordValues: ChangePasswordValues = {
  password: '',
  confirm: '',
};
