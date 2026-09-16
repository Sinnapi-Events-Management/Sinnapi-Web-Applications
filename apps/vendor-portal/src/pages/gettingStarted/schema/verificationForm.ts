import { z } from 'zod';
import { nullIfEmpty } from '@/lib/vendorFieldOptions';
import type { VendorOnboardingModel } from '../hooks/useOnboardingStatus';

export { ALUMNI_OPTIONS } from '@/lib/vendorFieldOptions';

/**
 * The registered-business particulars beside the documents.
 *
 * All optional: an individual trading under their own name has no registration
 * number or TIN, and demanding one would exclude exactly the vendors the shorter
 * application was meant to welcome.
 */
export const verificationSchema = z.object({
  business_reg_number: z.string().trim().max(60, 'Keep this under 60 characters.'),
  tax_id: z.string().trim().max(60, 'Keep this under 60 characters.'),
  icandy_alumni: z.string(),
});

export type VerificationValues = z.infer<typeof verificationSchema>;

export function toVerificationValues(vendor: VendorOnboardingModel | null): VerificationValues {
  return {
    business_reg_number: vendor?.business_reg_number ?? '',
    tax_id: vendor?.tax_id ?? '',
    icandy_alumni: vendor?.icandy_alumni == null ? '' : vendor.icandy_alumni ? 'yes' : 'no',
  };
}

export function toVerificationPatch(values: VerificationValues) {
  return {
    business_reg_number: nullIfEmpty(values.business_reg_number),
    tax_id: nullIfEmpty(values.tax_id),
    icandy_alumni: values.icandy_alumni === '' ? null : values.icandy_alumni === 'yes',
  };
}
