import type { VendorProfileFormValues } from './vendorProfileForm';

/**
 * The Business tab's sections, mirrored into the URL (`?section=coverage`) so a
 * completeness chip, a support message or a reload lands on the right panel.
 *
 * Ordered the way a client reads a listing: who you are, how you work, what you
 * charge, where to find you online, where you travel. Logo and verification come
 * last because they save on their own rather than through the save bar.
 */
export const BUSINESS_SECTIONS = [
  'basics',
  'operations',
  'pricing',
  'presence',
  'coverage',
  'logo',
  'verification',
] as const;

export type BusinessSectionKey = (typeof BUSINESS_SECTIONS)[number];

/** The Personal tab's sections. */
export const PERSONAL_SECTIONS = ['details', 'photo', 'account'] as const;

export type PersonalSectionKey = (typeof PERSONAL_SECTIONS)[number];

/** Query-string key for both tabs' sections. */
export const SECTION_PARAM = 'section';

type FormField = keyof VendorProfileFormValues;

/**
 * Which business form fields each section renders.
 *
 * Drives the unsaved/error dots in the section menu, and the jump to the first
 * invalid section on save — needed because the field that failed may be on a
 * panel that isn't showing. Coverage, logo and verification own no form fields.
 */
export const BUSINESS_SECTION_FIELDS: Partial<Record<BusinessSectionKey, readonly FormField[]>> = {
  basics: ['business_name', 'base_city', 'biography'],
  operations: ['business_location', 'years_in_operation', 'lead_time'],
  pricing: ['pricing_model', 'starting_price', 'currency'],
  presence: ['website', 'instagram_url', 'tiktok_url', 'linkedin_url', 'facebook_url'],
};

/** Whether any of `section`'s fields appears in a react-hook-form field map. */
export function sectionTouches(
  section: BusinessSectionKey,
  fieldMap: Partial<Record<FormField, unknown>>,
): boolean {
  return (BUSINESS_SECTION_FIELDS[section] ?? []).some((field) => Boolean(fieldMap[field]));
}
