import { z } from 'zod';
import { optionalAmountField, optionalUrlField } from '@/lib/schema';
import { NOT_SET, nullIfEmpty } from '@/lib/vendorFieldOptions';
import type { VendorProfileEditModel } from '@/lib/types';

// The option lists live in `@/lib/vendorFieldOptions`, shared with the onboarding
// wizard, which collects these same columns before the vendor ever reaches here.
export {
  CURRENCY_OPTIONS,
  LEAD_TIME_OPTIONS,
  PRICING_OPTIONS,
  YEARS_OPTIONS,
} from '@/lib/vendorFieldOptions';

const CURRENCIES = ['UGX', 'USD'] as const;

/** The currency to fall back on when a vendor has never chosen one. */
export const DEFAULT_CURRENCY = 'UGX';

/** Longest bio the form accepts — mirrored in the live counter under the field. */
export const BIOGRAPHY_MAX = 2000;

const socialUrl = optionalUrlField('Enter a full URL, e.g. https://instagram.com/yourbusiness.');

/**
 * The self-editable slice of a vendor's business listing.
 *
 * `slug`, `status`, `visibility` and the primary image are all absent: the first
 * is what every public URL to this vendor is built from, the next two are owned by
 * the admin review flow, and the image has its own upload card because it is a
 * storage write rather than a column edit.
 *
 * The verification columns are absent for a stronger reason: they are written
 * through a private bucket and an encrypting RPC, so they are reported here as
 * facts and edited in the setup wizard that owns those writes.
 */
export const vendorProfileFormSchema = z.object({
  business_name: z
    .string()
    .trim()
    .min(2, 'Business name must be at least 2 characters.')
    .max(140, 'Business name must be 140 characters or fewer.'),
  base_city: z.string().trim().max(80, 'Base city must be 80 characters or fewer.'),
  business_location: z.string().trim().max(160, 'Location must be 160 characters or fewer.'),
  website: optionalUrlField('Enter a full URL, e.g. https://yourbusiness.com.'),
  biography: z
    .string()
    .trim()
    .max(BIOGRAPHY_MAX, `Business bio must be ${BIOGRAPHY_MAX} characters or fewer.`),
  starting_price: optionalAmountField('Starting price'),
  currency: z.enum(CURRENCIES, { errorMap: () => ({ message: 'Choose a currency.' }) }),
  years_in_operation: z.string(),
  pricing_model: z.string(),
  lead_time: z.string(),
  instagram_url: socialUrl,
  tiktok_url: socialUrl,
  linkedin_url: socialUrl,
  facebook_url: socialUrl,
});

export type VendorProfileFormValues = z.infer<typeof vendorProfileFormSchema>;

/** The slice of a vendor row this form owns. */
export type VendorProfileSource = Pick<
  VendorProfileEditModel,
  | 'business_name'
  | 'biography'
  | 'base_city'
  | 'business_location'
  | 'website'
  | 'starting_price'
  | 'starting_price_currency'
  | 'years_in_operation'
  | 'pricing_model'
  | 'lead_time'
  | 'instagram_url'
  | 'tiktok_url'
  | 'linkedin_url'
  | 'facebook_url'
>;

/** Blank form — the shape the form starts from before the read resolves. */
export const emptyVendorProfileValues: VendorProfileFormValues = {
  business_name: '',
  base_city: '',
  business_location: '',
  website: '',
  biography: '',
  starting_price: '',
  currency: DEFAULT_CURRENCY,
  years_in_operation: NOT_SET,
  pricing_model: NOT_SET,
  lead_time: NOT_SET,
  instagram_url: '',
  tiktok_url: '',
  linkedin_url: '',
  facebook_url: '',
};

/** Projects a vendor row onto the form's all-strings shape. */
export function toVendorProfileValues(
  vendor: VendorProfileSource | null | undefined,
): VendorProfileFormValues {
  if (!vendor) return emptyVendorProfileValues;
  return {
    business_name: vendor.business_name ?? '',
    base_city: vendor.base_city ?? '',
    business_location: vendor.business_location ?? '',
    website: vendor.website ?? '',
    biography: vendor.biography ?? '',
    starting_price: vendor.starting_price == null ? '' : String(vendor.starting_price),
    currency: CURRENCIES.find((c) => c === vendor.starting_price_currency) ?? DEFAULT_CURRENCY,
    years_in_operation: vendor.years_in_operation ?? NOT_SET,
    pricing_model: vendor.pricing_model ?? NOT_SET,
    lead_time: vendor.lead_time ?? NOT_SET,
    instagram_url: vendor.instagram_url ?? '',
    tiktok_url: vendor.tiktok_url ?? '',
    linkedin_url: vendor.linkedin_url ?? '',
    facebook_url: vendor.facebook_url ?? '',
  };
}

/** The `vendors` patch for a save — blanks clear their columns. */
export function toVendorProfileUpdate(values: VendorProfileFormValues) {
  return {
    business_name: values.business_name.trim(),
    biography: nullIfEmpty(values.biography),
    base_city: nullIfEmpty(values.base_city),
    business_location: nullIfEmpty(values.business_location),
    website: nullIfEmpty(values.website),
    starting_price: values.starting_price.trim() === '' ? null : Number(values.starting_price),
    starting_price_currency: values.currency,
    years_in_operation: nullIfEmpty(values.years_in_operation),
    pricing_model: nullIfEmpty(values.pricing_model),
    lead_time: nullIfEmpty(values.lead_time),
    instagram_url: nullIfEmpty(values.instagram_url ?? ''),
    tiktok_url: nullIfEmpty(values.tiktok_url ?? ''),
    linkedin_url: nullIfEmpty(values.linkedin_url ?? ''),
    facebook_url: nullIfEmpty(values.facebook_url ?? ''),
  };
}
