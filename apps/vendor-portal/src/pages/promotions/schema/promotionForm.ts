import { z } from 'zod';
import { requiredDateField } from '@/lib/schema';

export const promotionFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, 'Title must be at least 3 characters.')
      .max(140, 'Title must be 140 characters or fewer.'),
    description: z.string().trim().max(2000, 'Description must be 2000 characters or fewer.'),
    starts_at: requiredDateField('Start date'),
    ends_at: requiredDateField('End date'),
  })
  // Attached to `ends_at`: that's the field the vendor would change to fix it.
  .refine((v) => v.ends_at >= v.starts_at, {
    message: 'The end date must be on or after the start date.',
    path: ['ends_at'],
  });

export type PromotionFormValues = z.infer<typeof promotionFormSchema>;

export const emptyPromotionValues: PromotionFormValues = {
  title: '',
  description: '',
  starts_at: '',
  ends_at: '',
};

/** The `promotions` row for a new promotion. */
export function toPromotionInsert(values: PromotionFormValues, vendorId: string) {
  return {
    vendor_id: vendorId,
    title: values.title.trim(),
    description: values.description.trim() || null,
    starts_at: values.starts_at,
    ends_at: values.ends_at,
    is_active: true,
  };
}
