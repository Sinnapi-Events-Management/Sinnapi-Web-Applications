import { z } from 'zod';
import { requiredDateField } from '@/lib/schema';

export const blockDateFormSchema = z.object({
  blocked_date: requiredDateField('Date'),
  reason: z.string().trim().max(200, 'Reason must be 200 characters or fewer.'),
});

export type BlockDateFormValues = z.infer<typeof blockDateFormSchema>;

export const emptyBlockDateValues: BlockDateFormValues = {
  blocked_date: '',
  reason: '',
};

/**
 * The `vendor_blocked_dates` row for a manual block. `source: 'manual'` is what
 * separates these from the rows a confirmed booking inserts — only manual ones
 * can be removed from this page.
 */
export function toBlockedDateInsert(values: BlockDateFormValues, vendorId: string) {
  return {
    vendor_id: vendorId,
    blocked_date: values.blocked_date,
    reason: values.reason.trim() || null,
    source: 'manual',
  };
}
