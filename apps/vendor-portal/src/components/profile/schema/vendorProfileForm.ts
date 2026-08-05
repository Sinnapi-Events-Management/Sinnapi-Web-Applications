import { z } from 'zod';
import type { SelectOption } from '@sinnapi/ui/forms';
import { optionalAmountField, optionalUrlField } from '@/lib/schema';

/** The currencies a vendor may advertise a starting price in. */
export const CURRENCY_OPTIONS: SelectOption[] = [
  { value: 'UGX', label: 'UGX' },
  { value: 'USD', label: 'USD' },
];

const CURRENCIES = ['UGX', 'USD'] as const;

/** The currency to fall back on when a vendor has never chosen one. */
export const DEFAULT_CURRENCY = 'UGX';

export const vendorProfileFormSchema = z.object({
  business_name: z
    .string()
    .trim()
    .min(2, 'Business name must be at least 2 characters.')
    .max(140, 'Business name must be 140 characters or fewer.'),
  base_city: z.string().trim().max(80, 'Base city must be 80 characters or fewer.'),
  website: optionalUrlField('Enter a full URL, e.g. https://yourbusiness.com.'),
  biography: z.string().trim().max(2000, 'Business bio must be 2000 characters or fewer.'),
  starting_price: optionalAmountField('Starting price'),
  currency: z.enum(CURRENCIES, { errorMap: () => ({ message: 'Choose a currency.' }) }),
});

export type VendorProfileFormValues = z.infer<typeof vendorProfileFormSchema>;

/** The slice of a vendor row this form owns. */
export type VendorProfileSource = {
  business_name: string;
  biography: string | null;
  base_city: string | null;
  website: string | null;
  starting_price: number | null;
  starting_price_currency: string | null;
};

/** Projects a vendor row onto the form's all-strings shape. */
export function toVendorProfileValues(vendor: VendorProfileSource): VendorProfileFormValues {
  const currency = CURRENCIES.find((c) => c === vendor.starting_price_currency) ?? DEFAULT_CURRENCY;
  return {
    business_name: vendor.business_name ?? '',
    base_city: vendor.base_city ?? '',
    website: vendor.website ?? '',
    biography: vendor.biography ?? '',
    starting_price: vendor.starting_price == null ? '' : String(vendor.starting_price),
    currency,
  };
}

const nullIfEmpty = (s: string) => (s.trim() === '' ? null : s.trim());

/** The `vendors` patch for a save — blanks clear their columns. */
export function toVendorProfileUpdate(values: VendorProfileFormValues) {
  return {
    business_name: values.business_name.trim(),
    biography: nullIfEmpty(values.biography),
    base_city: nullIfEmpty(values.base_city),
    website: nullIfEmpty(values.website),
    starting_price: values.starting_price.trim() === '' ? null : Number(values.starting_price),
    starting_price_currency: values.currency,
  };
}
