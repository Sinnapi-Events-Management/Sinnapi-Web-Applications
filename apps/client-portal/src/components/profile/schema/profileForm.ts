import { z } from 'zod';
import type { SelectOption } from '@sinnapi/ui/forms';
import { optionalPhoneField } from '@/lib/schema';

/** The currencies a client may be billed and quoted in. */
export const CURRENCY_OPTIONS: SelectOption[] = [
  { value: 'UGX', label: 'UGX — Ugandan Shilling' },
  { value: 'USD', label: 'USD — US Dollar' },
];

const CURRENCIES = ['UGX', 'USD'] as const;

/** The currency to fall back on when a profile has never chosen one. */
export const DEFAULT_CURRENCY = 'UGX';

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

/** The slice of a profile row this form owns. */
export type ProfileFormSource = {
  full_name: string | null;
  phone: string | null;
  preferred_currency: string | null;
};

/** Projects a profile row onto the form's shape. */
export function toProfileFormValues(profile: ProfileFormSource): ProfileFormValues {
  const currency = CURRENCIES.find((c) => c === profile.preferred_currency) ?? DEFAULT_CURRENCY;
  return {
    full_name: profile.full_name ?? '',
    phone: profile.phone ?? '',
    preferred_currency: currency,
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
