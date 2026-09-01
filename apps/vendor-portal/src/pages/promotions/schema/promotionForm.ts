import { z } from 'zod';
import { requiredDateField, optionalUrlField } from '@/lib/schema';
import type { PromotionModel } from '@/lib/types';

export const promotionFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, 'Title must be at least 3 characters.')
      .max(140, 'Title must be 140 characters or fewer.'),
    description: z.string().trim().max(2000, 'Description must be 2000 characters or fewer.'),
    // The fine print, shown to clients under the saving. Capped shorter than
    // the description: terms nobody finishes reading are terms that protect
    // nobody, and this renders as a caption on a package card.
    terms: z.string().trim().max(600, 'Terms must be 600 characters or fewer.'),
    // Not typed by hand — the banner field writes the URL the upload returned.
    // Validated anyway, so a bad value can never be persisted silently.
    banner_url: optionalUrlField('Enter a valid image URL.'),
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
  terms: '',
  banner_url: '',
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
  // opens a campaign to edit it should not find its dates shifted by one.
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Seeds the editor from a campaign the list already holds. */
export function toPromotionValues(promotion: PromotionModel): PromotionFormValues {
  return {
    title: promotion.title,
    description: promotion.description ?? '',
    terms: promotion.terms ?? '',
    banner_url: promotion.banner_url ?? '',
    starts_at: toDateInput(promotion.starts_at),
    ends_at: toDateInput(promotion.ends_at),
  };
}

/**
 * The columns a promotion write sets, shared by the insert and the update.
 *
 * Blank optional fields go back as `null` rather than `''` so "no banner" is
 * one value in the database instead of two — an empty string would satisfy
 * every `banner_url && ...` check on the card and render a broken image.
 */
function toPromotionColumns(values: PromotionFormValues) {
  return {
    title: values.title.trim(),
    description: values.description.trim() || null,
    terms: values.terms.trim() || null,
    banner_url: values.banner_url.trim() || null,
    starts_at: values.starts_at,
    ends_at: values.ends_at,
  };
}

/** The `promotions` row for a new promotion. */
export function toPromotionInsert(values: PromotionFormValues, vendorId: string) {
  return { vendor_id: vendorId, ...toPromotionColumns(values), is_active: true };
}

/**
 * The patch for an existing promotion.
 *
 * Deliberately does not carry `is_active`: pausing is its own action with its
 * own affordance on the card, and folding it into the editor would let a vendor
 * who opened the dialog to fix a typo silently republish a campaign they had
 * paused.
 */
export function toPromotionUpdate(values: PromotionFormValues) {
  return toPromotionColumns(values);
}
