import { z } from 'zod';
import { NOT_SET, nullIfEmpty } from '@/lib/vendorFieldOptions';
import type { VendorOnboardingModel } from '../hooks/useOnboardingStatus';

// Option lists live in `@/lib/vendorFieldOptions`, shared with the profile page.
export {
  CURRENCY_OPTIONS,
  LEAD_TIME_OPTIONS,
  PRICING_OPTIONS,
  YEARS_OPTIONS,
} from '@/lib/vendorFieldOptions';

// --- Step 1: business basics ------------------------------------------------

export const basicsSchema = z.object({
  primary_category_id: z.string().min(1, 'Choose the category clients should find you under.'),
  base_city: z.string().trim().min(2, 'Enter the city you work from.'),
  business_location: z.string().trim().max(160, 'Keep this under 160 characters.'),
  years_in_operation: z.string(),
});

export type BasicsValues = z.infer<typeof basicsSchema>;

export function toBasicsValues(vendor: VendorOnboardingModel | null): BasicsValues {
  return {
    primary_category_id: vendor?.primary_category_id ?? '',
    base_city: vendor?.base_city ?? '',
    business_location: vendor?.business_location ?? '',
    years_in_operation: vendor?.years_in_operation ?? NOT_SET,
  };
}

export function toBasicsPatch(values: BasicsValues) {
  return {
    primary_category_id: values.primary_category_id,
    base_city: values.base_city.trim(),
    business_location: nullIfEmpty(values.business_location),
    years_in_operation: nullIfEmpty(values.years_in_operation),
  };
}

// --- Step 2: story & pricing ------------------------------------------------

export const BIOGRAPHY_MIN = 20;
export const BIOGRAPHY_MAX = 2000;

export const storySchema = z.object({
  biography: z
    .string()
    .trim()
    .min(BIOGRAPHY_MIN, `Tell clients a little more (${BIOGRAPHY_MIN}+ characters).`)
    .max(BIOGRAPHY_MAX, `Keep your bio under ${BIOGRAPHY_MAX} characters.`),
  starting_price: z
    .string()
    .trim()
    .refine(
      (v) => v !== '' && Number.isFinite(Number(v)) && Number(v) >= 0,
      'Enter the lowest amount you would take.',
    ),
  currency: z.enum(['UGX', 'USD'], { errorMap: () => ({ message: 'Choose a currency.' }) }),
  pricing_model: z.string(),
  lead_time: z.string(),
});

export type StoryValues = z.infer<typeof storySchema>;

export function toStoryValues(vendor: VendorOnboardingModel | null): StoryValues {
  return {
    biography: vendor?.biography ?? '',
    starting_price: vendor?.starting_price == null ? '' : String(vendor.starting_price),
    currency: vendor?.starting_price_currency === 'USD' ? 'USD' : 'UGX',
    pricing_model: vendor?.pricing_model ?? NOT_SET,
    lead_time: vendor?.lead_time ?? NOT_SET,
  };
}

export function toStoryPatch(values: StoryValues) {
  return {
    biography: values.biography.trim(),
    starting_price: Number(values.starting_price),
    starting_price_currency: values.currency,
    pricing_model: nullIfEmpty(values.pricing_model),
    lead_time: nullIfEmpty(values.lead_time),
  };
}
