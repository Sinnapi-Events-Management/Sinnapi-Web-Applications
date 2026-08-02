import { z } from 'zod';
import { optionalAmountField } from '@/lib/schema';

export const serviceFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Service title must be at least 3 characters.')
    .max(140, 'Service title must be 140 characters or fewer.'),
  description: z.string().trim().max(2000, 'Description must be 2000 characters or fewer.'),
  base_price: optionalAmountField('Base price'),
});

export type ServiceFormValues = z.infer<typeof serviceFormSchema>;

export const emptyServiceValues: ServiceFormValues = {
  title: '',
  description: '',
  base_price: '',
};

/** The `vendor_services` row for a new service. */
export function toServiceInsert(values: ServiceFormValues, vendorId: string) {
  return {
    vendor_id: vendorId,
    title: values.title.trim(),
    description: values.description.trim() || null,
    base_price: values.base_price.trim() === '' ? null : Number(values.base_price),
    currency: 'UGX',
    is_active: true,
  };
}
