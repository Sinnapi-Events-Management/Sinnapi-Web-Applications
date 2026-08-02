import { z } from 'zod';
import { newPasswordField } from '@/components/auth/schema';

/**
 * New password + confirmation for the emailed reset link.
 *
 * The mismatch check is attached to `confirm` via `path`, so it renders under
 * the confirmation box the user just left rather than as a form-level banner —
 * the whole point of validating on blur is that the message lands where the
 * problem is.
 */
export const resetPasswordSchema = z
  .object({
    password: newPasswordField(),
    confirm: z.string().min(1, 'Re-enter your new password.'),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords don't match.",
    path: ['confirm'],
  });

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export const emptyResetPasswordValues: ResetPasswordValues = {
  password: '',
  confirm: '',
};
