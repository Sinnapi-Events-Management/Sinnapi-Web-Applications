import { z } from 'zod';

/**
 * Fallback minimum, used only when a portal does not state its own. Every
 * portal defines `PASSWORD_MIN_LENGTH` in its auth schema and passes it in, so
 * the settings dialog can never advertise a different rule from the sign-up and
 * reset screens of the same app.
 */
export const DEFAULT_PASSWORD_MIN_LENGTH = 8;

/** Supabase (GoTrue) hashes with bcrypt, which ignores anything past 72 bytes. */
const PASSWORD_MAX_LENGTH = 72;

/**
 * The settings-page password change: prove the current password, then choose a
 * new one.
 *
 * Distinct from the auth-flow schemas on purpose. `resetPassword` and the
 * vendor's forced `changePassword` both run on a session the *link* or the
 * provisioning flow just established, so there is no earlier password to prove.
 * Here the session is an ordinary one that may have been sitting open for
 * hours, and the current password is the only thing separating the account's
 * owner from whoever else reached the keyboard.
 */
export function createChangePasswordSchema(minLength = DEFAULT_PASSWORD_MIN_LENGTH) {
  return (
    z
      .object({
        currentPassword: z.string().min(1, 'Enter your current password.'),
        password: z
          .string()
          .min(1, 'Password is required.')
          .min(minLength, `Password must be at least ${minLength} characters.`)
          .max(PASSWORD_MAX_LENGTH, `Password must be ${PASSWORD_MAX_LENGTH} characters or fewer.`),
        confirm: z.string().min(1, 'Re-enter your new password.'),
      })
      // Both checks are attached to the field the user must edit to satisfy them,
      // so the message lands under that box rather than as a form-level banner.
      .refine((v) => v.password === v.confirm, {
        message: "Passwords don't match.",
        path: ['confirm'],
      })
      .refine((v) => v.password !== v.currentPassword, {
        message: 'Choose a password different from your current one.',
        path: ['password'],
      })
  );
}

export type ChangePasswordFormValues = {
  currentPassword: string;
  password: string;
  confirm: string;
};

export const emptyChangePasswordFormValues: ChangePasswordFormValues = {
  currentPassword: '',
  password: '',
  confirm: '',
};

/** Helper text for the new-password field, kept in step with the rule above. */
export function passwordHint(minLength: number): string {
  return `At least ${minLength} characters. Mix upper and lower case, a number and a symbol for a stronger password.`;
}
