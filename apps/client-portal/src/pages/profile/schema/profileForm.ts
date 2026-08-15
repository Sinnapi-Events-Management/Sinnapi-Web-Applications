import { z } from 'zod';
import type { SelectOption } from '@sinnapi/ui/forms';
import { optionalPhoneField } from '@/lib/schema';
import type { ProfileModel } from '@/lib/types';

/** The currencies a client may be billed and quoted in. */
export const CURRENCY_OPTIONS: SelectOption[] = [
  { value: 'UGX', label: 'UGX — Ugandan Shilling' },
  { value: 'USD', label: 'USD — US Dollar' },
];

const CURRENCIES = ['UGX', 'USD'] as const;

/** The currency to fall back on when a profile has never chosen one. */
export const DEFAULT_CURRENCY = 'UGX';

/**
 * The self-editable slice of a client's profile.
 *
 * Email is deliberately absent: it is the account identity (it keys `auth.users`,
 * sign-in and every notification), so the page renders it read-only and no write
 * ever carries it. `locale` is absent for a different reason — the column exists,
 * but nothing in any portal reads it, so a language picker here would change a
 * value no screen honours.
 */
export const profileFormSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters.')
    .max(120, 'Full name must be 120 characters or fewer.'),
  phone: optionalPhoneField(),
  preferred_currency: z.enum(CURRENCIES, {
    errorMap: () => ({ message: 'Choose a currency.' }),
  }),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

/** Blank form — the shape the form starts from before the profile read resolves. */
export const emptyProfileValues: ProfileFormValues = {
  full_name: '',
  phone: '',
  preferred_currency: DEFAULT_CURRENCY,
};

/** Projects a profile row onto the form's shape. */
export function toProfileFormValues(profile: ProfileModel | null | undefined): ProfileFormValues {
  if (!profile) return emptyProfileValues;
  return {
    full_name: profile.full_name ?? '',
    phone: profile.phone ?? '',
    preferred_currency:
      CURRENCIES.find((c) => c === profile.preferred_currency) ?? DEFAULT_CURRENCY,
  };
}

/** The `profiles` patch for a save — a blank phone clears the column. */
export function toProfileUpdate(values: ProfileFormValues) {
  return {
    full_name: values.full_name.trim(),
    phone: values.phone.trim() || null,
    preferred_currency: values.preferred_currency,
  };
}
