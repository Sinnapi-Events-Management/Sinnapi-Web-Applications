import { z } from 'zod';

/**
 * Minimum length for a self-chosen password. Matches the forced first-sign-in
 * change (`pages/auth/changePassword`) so the two flows never disagree about
 * what an acceptable password is.
 */
export const PASSWORD_MIN_LENGTH = 10;

/** A single, individually-checkable password requirement. */
export type PasswordRule = {
  key: string;
  label: string;
  test: (value: string) => boolean;
  /** Required rules block the save; the rest only feed the strength meter. */
  required: boolean;
};

/**
 * The live checklist shown under the new-password field. Stating the rules
 * up-front and ticking them as they're met beats rejecting the password on
 * submit — the user never has to guess what went wrong.
 */
export const PASSWORD_RULES: PasswordRule[] = [
  {
    key: 'length',
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    test: (v) => v.length >= PASSWORD_MIN_LENGTH,
    required: true,
  },
  {
    key: 'case',
    label: 'Upper and lower case letters',
    test: (v) => /[a-z]/.test(v) && /[A-Z]/.test(v),
    required: true,
  },
  { key: 'number', label: 'At least one number', test: (v) => /\d/.test(v), required: true },
  {
    key: 'symbol',
    label: 'A symbol, e.g. ! ? $ # (recommended)',
    test: (v) => /[^A-Za-z0-9]/.test(v),
    required: false,
  },
];

/** Strength buckets, weakest first — index doubles as the meter's value. */
export const PASSWORD_STRENGTH_LABELS = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'];

/**
 * A 0–4 score from the rules met plus a length bonus. Intentionally simple and
 * transparent — it mirrors the visible checklist rather than a black-box
 * entropy estimate the user can't reason about.
 */
export function passwordScore(value: string): number {
  if (!value) return 0;
  const met = PASSWORD_RULES.filter((r) => r.test(value)).length;
  const lengthBonus = value.length >= PASSWORD_MIN_LENGTH + 6 ? 1 : 0;
  return Math.min(4, met + lengthBonus);
}

/** Rules that must pass before the form will submit. */
const requiredRules = PASSWORD_RULES.filter((r) => r.required);

export const passwordFormSchema = z
  .object({
    current_password: z.string().min(1, 'Enter your current password.'),
    password: z.string().superRefine((value, ctx) => {
      for (const rule of requiredRules) {
        if (!rule.test(value)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${rule.label}.` });
        }
      }
    }),
    confirm_password: z.string().min(1, 'Re-enter your new password.'),
  })
  .refine((v) => v.password === v.confirm_password, {
    message: "Passwords don't match.",
    path: ['confirm_password'],
  })
  .refine((v) => !v.password || v.password !== v.current_password, {
    message: 'Choose a password different from your current one.',
    path: ['password'],
  });

export type PasswordFormValues = z.infer<typeof passwordFormSchema>;

export const emptyPasswordValues: PasswordFormValues = {
  current_password: '',
  password: '',
  confirm_password: '',
};
