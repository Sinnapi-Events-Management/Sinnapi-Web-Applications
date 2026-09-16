import { z } from 'zod';
import { optionalUrlField } from '@/lib/schema';
import type { VendorOnboardingModel } from '../hooks/useOnboardingStatus';

const socialUrl = optionalUrlField('Enter a full URL, e.g. https://instagram.com/yourbusiness.');

/** Every field here is optional — this whole step can be skipped. */
export const showcaseSchema = z.object({
  instagram_url: socialUrl,
  tiktok_url: socialUrl,
  linkedin_url: socialUrl,
  facebook_url: socialUrl,
});

export type ShowcaseValues = z.infer<typeof showcaseSchema>;

export function toShowcaseValues(vendor: VendorOnboardingModel | null): ShowcaseValues {
  return {
    instagram_url: vendor?.instagram_url ?? '',
    tiktok_url: vendor?.tiktok_url ?? '',
    linkedin_url: vendor?.linkedin_url ?? '',
    facebook_url: vendor?.facebook_url ?? '',
  };
}

const nullIfEmpty = (value: string) => (value.trim() === '' ? null : value.trim());

export function toShowcasePatch(values: ShowcaseValues) {
  return {
    instagram_url: nullIfEmpty(values.instagram_url ?? ''),
    tiktok_url: nullIfEmpty(values.tiktok_url ?? ''),
    linkedin_url: nullIfEmpty(values.linkedin_url ?? ''),
    facebook_url: nullIfEmpty(values.facebook_url ?? ''),
  };
}
