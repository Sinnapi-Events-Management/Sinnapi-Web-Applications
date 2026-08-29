import { z } from 'zod';
import type { SelectOption } from '@sinnapi/ui/forms';
import { requiredDateField, optionalAmountField } from '@/lib/schema';
import type { DiscountModel, PromotionModel } from '@/lib/types';

/** Discount codes are matched case-insensitively upstream; keep them terse. */
const CODE_RE = /^[A-Za-z0-9][A-Za-z0-9-]{1,23}$/;

/** The column's own ceiling, so a copy suffix can never overrun it. */
const CODE_MAX = 24;

export const DISCOUNT_TYPES = ['percentage', 'fixed'] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export const DISCOUNT_TYPE_OPTIONS: SelectOption[] = [
  { value: 'percentage', label: 'Percentage' },
  { value: 'fixed', label: 'Fixed (UGX)' },
];

/** The "no campaign" entry. A standalone code is the common case, so it leads. */
export const NO_PROMOTION_OPTION: SelectOption = { value: '', label: 'No campaign' };

/**
 * The vendor's campaigns as the attach picker's options.
 *
 * Built from the same read the Promotions screen uses, so a campaign created
 * there is attachable here without a second definition of what a campaign is.
 *
 * `attached` is the code being edited, if it already points at one. A campaign
 * can be deleted while a code still names it — removal there is a soft delete
 * and deliberately leaves the discounts that pointed at it alone — so the id on
 * the row is not guaranteed to be in the list. A select handed a value with no
 * matching option renders empty, which would show a vendor "No campaign" and
 * then quietly make that true the moment they saved a typo fix. The missing
 * campaign is given an option of its own instead: the link stays visible, stays
 * intact through an unrelated edit, and says plainly why it cannot be chosen
 * again.
 */
export function toPromotionOptions(
  promotions: PromotionModel[],
  attached?: string | null,
): SelectOption[] {
  const options = [
    NO_PROMOTION_OPTION,
    ...promotions.map((promotion) => ({ value: promotion.id, label: promotion.title })),
  ];

  if (attached && !options.some((option) => option.value === attached)) {
    options.push({ value: attached, label: 'Deleted campaign' });
  }
  return options;
}

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
    min_amount: optionalAmountField('Minimum booking amount'),
    /** A promotion id, or '' for a code that stands on its own. */
    promotion_id: z.string(),
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
  // A fixed discount at or above the floor that qualifies for it would settle
  // the booking to nothing — the two terms have to leave something to pay.
  .refine(
    (v) =>
      v.type !== 'fixed' || v.min_amount.trim() === '' || Number(v.value) < Number(v.min_amount),
    {
      message: 'The discount must be less than the minimum booking amount.',
      path: ['value'],
    },
  )
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
  min_amount: '',
  promotion_id: '',
  starts_at: '',
  ends_at: '',
};

/** `<input type="date">` speaks `YYYY-MM-DD`; the column is a timestamp. */
function toDateInput(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  // Local parts rather than `toISOString().slice(0, 10)`: a timestamp stored at
  // UTC midnight is the *previous* day west of Greenwich, and a vendor who
  // opens a code to edit it should not find its dates shifted by one.
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Seeds the editor from a code the list already holds. */
export function toDiscountValues(discount: DiscountModel): DiscountFormValues {
  return {
    code: discount.code ?? '',
    type: discount.type === 'fixed' ? 'fixed' : 'percentage',
    value: String(discount.value),
    max_uses: discount.max_uses == null ? '' : String(discount.max_uses),
    min_amount: discount.min_amount == null ? '' : String(discount.min_amount),
    promotion_id: discount.promotion_id ?? '',
    starts_at: toDateInput(discount.starts_at),
    ends_at: toDateInput(discount.ends_at),
  };
}

/**
 * The columns a discount write sets, shared by the insert and the update.
 *
 * Blank optional fields go back as `null` rather than `''` or `0`, so "no cap"
 * and "no floor" are one value in the database instead of three — and so a
 * blank minimum can never be read as "only on bookings over nothing", which a
 * zero would satisfy on every comparison downstream.
 *
 * `currency` is only meaningful for a fixed amount: a percentage carries none,
 * which is how the column has always distinguished the two. It is rewritten on
 * every save rather than left alone, so a code switched from fixed to
 * percentage does not keep a stale UGX behind a value that is now a ratio.
 */
function toDiscountColumns(values: DiscountFormValues) {
  return {
    code: values.code.trim() || null,
    type: values.type,
    value: Number(values.value),
    currency: values.type === 'fixed' ? 'UGX' : null,
    max_uses: values.max_uses.trim() === '' ? null : Number(values.max_uses),
    min_amount: values.min_amount.trim() === '' ? null : Number(values.min_amount),
    promotion_id: values.promotion_id || null,
    starts_at: values.starts_at,
    ends_at: values.ends_at,
  };
}

/** The `discounts` row for a new code. */
export function toDiscountInsert(values: DiscountFormValues, vendorId: string) {
  return { vendor_id: vendorId, ...toDiscountColumns(values), is_active: true };
}

/**
 * The patch for an existing code.
 *
 * Deliberately does not carry `is_active`: pausing is its own action with its
 * own affordance on the card, and folding it into the editor would let a vendor
 * who opened the dialog to fix a typo silently republish a code they had
 * switched off. `used_count` is never written from here either — it is the
 * server's tally of what clients did, not a field.
 */
export function toDiscountUpdate(values: DiscountFormValues) {
  return toDiscountColumns(values);
}

/**
 * A free code string for a copy of `code`.
 *
 * Codes are unique across the whole table while they are alive, so a duplicate
 * cannot reuse the original's string — and a vendor duplicating "EARLY-BIRD"
 * for next season should not have to invent a name before they can see the
 * copy. Any existing copy marker is stripped first, so duplicating a duplicate
 * yields `EARLY-BIRD-COPY2` rather than `EARLY-BIRD-COPY-COPY`.
 *
 * `taken` is the vendor's own live codes, which is all this can check from the
 * browser; a collision with another vendor's code still comes back from the
 * unique index, which the action hook turns into a sentence.
 *
 * A code of null stays null — an automatic discount has no string to clash.
 */
export function toDuplicateCode(code: string | null, taken: Iterable<string>): string | null {
  if (!code) return null;

  const base = code.replace(/-COPY\d*$/i, '');
  const used = new Set(Array.from(taken, (value) => value.toUpperCase()));

  for (let attempt = 1; attempt <= 50; attempt += 1) {
    const suffix = attempt === 1 ? '-COPY' : `-COPY${attempt}`;
    const candidate = `${base.slice(0, CODE_MAX - suffix.length)}${suffix}`;
    if (!used.has(candidate.toUpperCase())) return candidate;
  }

  // Fifty copies of one code is not a real vendor; let the index decide.
  return `${base.slice(0, CODE_MAX - 5)}-COPY`;
}
