import { z } from 'zod';
import { optionalPhoneField } from '@/lib/schema';
import type { ProfileModel } from '@/lib/types';

/**
 * The self-editable slice of a vendor's account. Email is deliberately absent:
 * it is the account identity (it keys `auth.users`, sign-in and every
 * notification), so the page renders it read-only and no write carries it.
 */
export const accountFormSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, 'Your name must be at least 2 characters.')
    .max(120, 'Your name must be 120 characters or fewer.'),
  phone: optionalPhoneField(),
});

export type AccountFormValues = z.infer<typeof accountFormSchema>;

/** Projects a profile row onto the form's shape. */
export function toAccountFormValues(profile: ProfileModel): AccountFormValues {
  return {
    full_name: profile.full_name ?? '',
    phone: profile.phone ?? '',
  };
}

/** The `profiles` patch for a save — a blank phone clears the column. */
export function toAccountUpdate(values: AccountFormValues) {
  return {
    full_name: values.full_name.trim(),
    phone: values.phone.trim() || null,
  };
}
