import { z } from 'zod';
import type { SelectOption } from '@sinnapi/ui/forms';
import { requiredDateField, optionalAmountField } from '@/lib/schema';

/** Discount codes are matched case-insensitively upstream; keep them terse. */
const CODE_RE = /^[A-Za-z0-9][A-Za-z0-9-]{1,23}$/;

export const DISCOUNT_TYPES = ['percentage', 'fixed'] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export const DISCOUNT_TYPE_OPTIONS: SelectOption[] = [
  { value: 'percentage', label: 'Percentage' },
  { value: 'fixed', label: 'Fixed (UGX)' },
];

export const discountFormSchema = z
  .object({
    code: z.union([
      z.string().trim().regex(CODE_RE, 'Use 2–24 letters, numbers or hyphens, e.g. EARLY-BIRD.'),
      z.literal(''),
    ]),
    type: z.enum(DISCOUNT_TYPES, { errorMap: () => ({ message: 'Choose a discount type.' }) }),
    value: z
      .string()
      .trim()
      .min(1, 'Value is required.')
      .refine((v) => !Number.isNaN(Number(v)), 'Enter a number.')
      .refine((v) => Number(v) > 0, 'Value must be greater than zero.'),
    max_uses: optionalAmountField('Max uses'),
    starts_at: requiredDateField('Start date'),
    ends_at: requiredDateField('End date'),
  })
  // A percentage over 100 would pay the client to book — the fixed branch has
  // no ceiling here because the cap depends on the booking it's applied to.
  .refine((v) => v.type !== 'percentage' || Number(v.value) <= 100, {
    message: 'A percentage discount cannot exceed 100.',
    path: ['value'],
  })
  .refine((v) => v.max_uses.trim() === '' || Number(v.max_uses) >= 1, {
    message: 'Max uses must be at least 1.',
    path: ['max_uses'],
  })
  .refine((v) => v.ends_at >= v.starts_at, {
    message: 'The end date must be on or after the start date.',
    path: ['ends_at'],
  });

export type DiscountFormValues = z.infer<typeof discountFormSchema>;

export const emptyDiscountValues: DiscountFormValues = {
  code: '',
  type: 'percentage',
  value: '',
  max_uses: '',
  starts_at: '',
  ends_at: '',
};

/**
 * The `discounts` row for a new discount. `currency` is only meaningful for a
 * fixed amount — a percentage carries none, which is how the column has always
 * distinguished the two.
 */
export function toDiscountInsert(values: DiscountFormValues, vendorId: string) {
  return {
    vendor_id: vendorId,
    code: values.code.trim() || null,
    type: values.type,
    value: Number(values.value),
    currency: values.type === 'fixed' ? 'UGX' : null,
    max_uses: values.max_uses.trim() === '' ? null : Number(values.max_uses),
    starts_at: values.starts_at,
    ends_at: values.ends_at,
    is_active: true,
  };
}
