import { z } from 'zod';
import { isPricingModel } from '@sinnapi/ui';
import { requiredIntField, optionalUrlField } from '@/lib/schema';
import { ADVANCE_RATE_MAX, ADVANCE_DAYS_MAX } from '@/components/quotation/schema';
import type { PackageModel, PackageTierModel, PackageLineModel } from '@/lib/types';

/**
 * The package editor's shape, and the two translations either side of it.
 *
 * Numbers are strings throughout, because that is what an `<input>` yields and
 * because a half-typed "1" must not become `NaN` on the way to a preview that
 * re-renders on every keystroke. Coercion happens once, at the boundary, in
 * `toSavePackageArgs`.
 *
 * WHY THE FORM MIRRORS THE DATABASE TREE
 * A package is header → tiers → lines, and the editor edits all three at once
 * against one RPC. Flattening it here would mean reassembling the tree at save
 * time from indices, which is exactly the kind of mapping that silently drops
 * a row when a tier is removed mid-edit.
 */

/** A money amount typed into a line: required, numeric, non-negative. */
const priceField = z
  .string()
  .trim()
  .min(1, 'Required.')
  .refine((v) => !Number.isNaN(Number(v)), 'Enter a number.')
  .refine((v) => Number(v) >= 0, 'Cannot be negative.');

/** A percentage typed into the editor: optional, 0–100. */
const rateField = (label: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === '' || !Number.isNaN(Number(v)), 'Enter a number.')
    .refine((v) => v === '' || Number(v) >= 0, `${label} cannot be negative.`)
    .refine((v) => v === '' || Number(v) <= 100, `${label} cannot exceed 100%.`);

export const packageLineSchema = z.object({
  description: z
    .string()
    .trim()
    .min(2, 'Describe this line.')
    .max(200, 'Keep lines under 200 characters.'),
  quantity: requiredIntField('Quantity', 1),
  unit_price: priceField,
  unit_label: z.string().trim().max(40, 'Keep the unit under 40 characters.'),
  notes: z.string().trim().max(200, 'Keep the note under 200 characters.'),
});

export type PackageLineValues = z.infer<typeof packageLineSchema>;

export const packageTierSchema = z.object({
  /** Empty for a tier that does not exist server-side yet. */
  id: z.string(),
  name: z.string().trim().min(2, 'Name this tier.').max(80, 'Keep tier names under 80 characters.'),
  description: z.string().trim().max(400, 'Keep the description under 400 characters.'),
  discount_rate: rateField('Discount'),
  is_recommended: z.boolean(),
  items: z.array(packageLineSchema).min(1, 'A tier needs at least one line.'),
});

export type PackageTierValues = z.infer<typeof packageTierSchema>;

export const packageFormSchema = z
  .object({
    id: z.string(),
    name: z
      .string()
      .trim()
      .min(3, 'Package name must be at least 3 characters.')
      .max(120, 'Package name must be 120 characters or fewer.'),
    summary: z.string().trim().max(300, 'Keep the summary under 300 characters.'),
    notes: z.string().trim().max(2000, 'Notes must be 2000 characters or fewer.'),
    cover_image_url: optionalUrlField('Enter a valid image URL.'),
    vendor_service_id: z.string(),
    /**
     * Required, and validated again by `save_quote_package` against the linked
     * service's set. Stated here so the vendor is told by the field they got
     * wrong rather than by a banner at the top after a round trip.
     */
    pricing_model: z
      .string()
      .min(1, 'Choose how this package is charged.')
      // The `: boolean` annotation is load-bearing — see the same note on
      // `pricing_models` in the services schema. `isPricingModel` is a type
      // predicate and TypeScript propagates it through the wrapping arrow, so
      // without the annotation zod narrows this field's OUTPUT to
      // `PricingModel` while its input stays `string`, and the two halves of
      // `Control<PackageFormValues>` stop matching.
      .refine((value): boolean => isPricingModel(value), 'That is not a way of charging.'),
    inclusions: z.array(z.string().trim().min(1)),
    exclusions: z.array(z.string().trim().min(1)),
    lead_time_days: z
      .string()
      .trim()
      .refine((v) => v === '' || /^\d+$/.test(v), 'Enter a whole number of days.')
      .refine((v) => v === '' || Number(v) <= 365, 'Lead time cannot exceed 365 days.'),
    tax_rate: rateField('Tax'),
    tax_inclusive: z.boolean(),
    valid_days: z
      .string()
      .trim()
      .refine((v) => v === '' || /^\d+$/.test(v), 'Enter a whole number of days.')
      .refine((v) => v === '' || (Number(v) >= 1 && Number(v) <= 365), 'Between 1 and 365 days.'),
    advance_rate: z
      .string()
      .trim()
      .refine((v) => v === '' || !Number.isNaN(Number(v)), 'Enter a number.')
      .refine((v) => v === '' || Number(v) >= 0, 'Cannot be negative.')
      .refine(
        (v) => v === '' || Number(v) <= ADVANCE_RATE_MAX,
        `Cannot exceed ${ADVANCE_RATE_MAX}%.`,
      ),
    advance_release_days_before: z
      .string()
      .trim()
      .refine((v) => v === '' || /^\d+$/.test(v), 'Enter a whole number of days.')
      .refine(
        (v) => v === '' || Number(v) <= ADVANCE_DAYS_MAX,
        `Cannot be more than ${ADVANCE_DAYS_MAX} days before the event.`,
      ),
    advance_terms_note: z.string().trim().max(300, 'Keep the note under 300 characters.'),
    is_active: z.boolean(),
    tiers: z.array(packageTierSchema).min(1, 'A package needs at least one tier.'),
    add_ons: z.array(packageLineSchema),
  })
  .superRefine((values, ctx) => {
    // The database has a partial unique index saying the same thing. Saying it
    // here too is what turns a 23505 the vendor cannot read into a message
    // attached to the control they clicked.
    const recommended = values.tiers.filter((tier) => tier.is_recommended);
    if (recommended.length > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tiers'],
        message: 'Only one tier can be marked as the recommended one.',
      });
    }

    // Duplicate tier names are legal in the database and useless to a client
    // choosing between them.
    const names = values.tiers.map((tier) => tier.name.trim().toLowerCase()).filter(Boolean);
    if (new Set(names).size !== names.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tiers'],
        message: 'Give each tier a different name.',
      });
    }
  });

export type PackageFormValues = z.infer<typeof packageFormSchema>;

/** A blank line — the row "Add line" appends. */
export const emptyPackageLine: PackageLineValues = {
  description: '',
  quantity: '1',
  unit_price: '0',
  unit_label: '',
  notes: '',
};

/** A blank tier, carrying the one line every tier must have. */
export function emptyPackageTier(name = 'Standard', isRecommended = true): PackageTierValues {
  return {
    id: '',
    name,
    description: '',
    discount_rate: '',
    is_recommended: isRecommended,
    items: [{ ...emptyPackageLine }],
  };
}

/**
 * A new package: one tier, one line, and the platform's default terms
 * pre-filled rather than left blank. A vendor who never opens the terms
 * section still ends up with a quote that has an advance on it.
 */
export const emptyPackageValues: PackageFormValues = {
  id: '',
  name: '',
  summary: '',
  notes: '',
  cover_image_url: '',
  vendor_service_id: '',
  // Unset rather than defaulted to `fixed`. A pre-filled answer to "how are
  // you charging for this" is the one every vendor leaves in place, and it is
  // the field a client reads first.
  pricing_model: '',
  inclusions: [],
  exclusions: [],
  lead_time_days: '',
  tax_rate: '',
  tax_inclusive: false,
  valid_days: '14',
  advance_rate: '30',
  advance_release_days_before: '7',
  advance_terms_note: '',
  is_active: true,
  tiers: [emptyPackageTier()],
  add_ons: [],
};

/** A stored numeric back into the string the field holds. */
function toField(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  return String(Number(value));
}

function lineToValues(line: PackageLineModel): PackageLineValues {
  return {
    description: line.description ?? '',
    quantity: toField(line.quantity) || '1',
    unit_price: toField(line.unit_price) || '0',
    unit_label: line.unit_label ?? '',
    notes: line.notes ?? '',
  };
}

const bySortOrder = (a: { sort_order: number | null }, b: { sort_order: number | null }) =>
  (a.sort_order ?? 0) - (b.sort_order ?? 0);

function tierToValues(tier: PackageTierModel): PackageTierValues {
  return {
    id: tier.id,
    name: tier.name,
    description: tier.description ?? '',
    discount_rate: toField(tier.discount_rate),
    is_recommended: tier.is_recommended === true,
    items: [...(tier.quote_template_items ?? [])]
      .filter((line) => !line.is_optional)
      .sort(bySortOrder)
      .map(lineToValues),
  };
}

/**
 * A stored package back into the editor's shape.
 *
 * Tier ids are carried through, and that is the whole reason this exists as a
 * mapper rather than a spread: `save_quote_package` reconciles tiers by id, so
 * a tier that loses its id on the way into the form comes back as a new tier
 * and takes every quote that referenced the old one with it.
 */
export function packageToFormValues(pkg: PackageModel): PackageFormValues {
  const tiers = [...(pkg.quote_template_tiers ?? [])].sort(bySortOrder).map(tierToValues);

  return {
    id: pkg.id,
    name: pkg.name,
    summary: pkg.summary ?? '',
    notes: pkg.notes ?? '',
    cover_image_url: pkg.cover_image_url ?? '',
    vendor_service_id: pkg.vendor_service_id ?? '',
    // Null on every package created before 0823c, and on any whose service
    // offered more than one model at migration time. Those open with the field
    // empty and the vendor answers it on this edit.
    pricing_model: pkg.pricing_model ?? '',
    inclusions: pkg.inclusions ?? [],
    exclusions: pkg.exclusions ?? [],
    lead_time_days: toField(pkg.lead_time_days),
    tax_rate: toField(pkg.tax_rate),
    tax_inclusive: pkg.tax_inclusive === true,
    valid_days: toField(pkg.valid_days),
    advance_rate: toField(pkg.advance_rate),
    advance_release_days_before: toField(pkg.advance_release_days_before),
    advance_terms_note: pkg.advance_terms_note ?? '',
    is_active: pkg.is_active !== false,
    tiers: tiers.length > 0 ? tiers : [emptyPackageTier()],
    add_ons: [...(pkg.quote_template_items ?? [])]
      .filter((line) => line.tier_id == null)
      .sort(bySortOrder)
      .map(lineToValues),
  };
}

/** A blank string field back to null, so the column holds nothing rather than "". */
const orNull = (value: string) => (value.trim() === '' ? null : value.trim());
const numOrNull = (value: string) => (value.trim() === '' ? null : Number(value));

function lineToPayload(line: PackageLineValues) {
  return {
    description: line.description.trim(),
    quantity: Number(line.quantity),
    unit_price: Number(line.unit_price),
    unit_label: orNull(line.unit_label),
    notes: orNull(line.notes),
  };
}

/**
 * Arguments for `save_quote_package`, with every number coerced at the
 * boundary and every empty string collapsed to null.
 *
 * `is_optional` is not sent on tier lines: everything the tier editor holds is
 * part of that tier's total by construction, and the add-ons array is the only
 * source of optional lines. The RPC flags those itself, so the browser cannot
 * post an "optional" line into a tier's price.
 */
export function toSavePackageArgs(values: PackageFormValues, vendorId: string) {
  return {
    p_vendor_id: vendorId,
    p_package: {
      id: values.id || null,
      name: values.name.trim(),
      summary: orNull(values.summary),
      notes: orNull(values.notes),
      currency: 'UGX',
      cover_image_url: orNull(values.cover_image_url),
      vendor_service_id: values.vendor_service_id || null,
      pricing_model: values.pricing_model || null,
      inclusions: values.inclusions.map((item) => item.trim()).filter(Boolean),
      exclusions: values.exclusions.map((item) => item.trim()).filter(Boolean),
      lead_time_days: numOrNull(values.lead_time_days),
      tax_rate: values.tax_rate.trim() === '' ? 0 : Number(values.tax_rate),
      tax_inclusive: values.tax_inclusive,
      valid_days: numOrNull(values.valid_days),
      advance_rate: numOrNull(values.advance_rate),
      advance_release_days_before: numOrNull(values.advance_release_days_before),
      advance_terms_note: orNull(values.advance_terms_note),
      is_active: values.is_active,
    },
    p_tiers: values.tiers.map((tier) => ({
      id: tier.id || null,
      name: tier.name.trim(),
      description: orNull(tier.description),
      discount_rate: tier.discount_rate.trim() === '' ? 0 : Number(tier.discount_rate),
      is_recommended: tier.is_recommended,
      items: tier.items.map(lineToPayload),
    })),
    p_add_ons: values.add_ons.map(lineToPayload),
  };
}

/**
 * The form's values as something `packagePricing` can price.
 *
 * This is what lets the preview beside the editor show the real total while
 * the vendor is still typing, rather than after a save. It builds the same
 * shape the read query returns, so the preview and the published card go
 * through one code path — a preview with its own arithmetic would be a preview
 * that can flatter what gets published.
 */
export function formValuesToPreview(values: PackageFormValues) {
  const line = (item: PackageLineValues, index: number, tierId: string | null) => ({
    id: `${tierId ?? 'add-on'}-${index}`,
    tier_id: tierId,
    description: item.description,
    quantity: Number(item.quantity) || 0,
    unit_price: Number(item.unit_price) || 0,
    unit_label: item.unit_label || null,
    notes: item.notes || null,
    is_optional: tierId === null,
    sort_order: index,
  });

  return {
    id: values.id || 'preview',
    name: values.name || 'Untitled package',
    summary: values.summary || null,
    notes: values.notes || null,
    currency: 'UGX',
    cover_image_url: values.cover_image_url || null,
    // Carried into the preview so the vendor sees the badge a client will,
    // beside the tier totals it qualifies.
    pricing_model: values.pricing_model || null,
    inclusions: values.inclusions ?? [],
    exclusions: values.exclusions ?? [],
    lead_time_days: numOrNull(values.lead_time_days),
    tax_rate: values.tax_rate.trim() === '' ? 0 : Number(values.tax_rate),
    tax_inclusive: values.tax_inclusive,
    valid_days: numOrNull(values.valid_days),
    advance_rate: numOrNull(values.advance_rate),
    advance_release_days_before: numOrNull(values.advance_release_days_before),
    advance_terms_note: orNull(values.advance_terms_note),
    is_active: values.is_active,
    // Defensive `?? []` throughout: this runs against `useWatch`'s live value on
    // every keystroke, and a preview that throws would take the editor down
    // with it — losing everything the vendor had typed.
    quote_template_tiers: (values.tiers ?? []).map((tier, tierIndex) => ({
      id: tier.id || `tier-${tierIndex}`,
      name: tier.name || `Tier ${tierIndex + 1}`,
      description: tier.description || null,
      is_recommended: tier.is_recommended,
      discount_rate: tier.discount_rate.trim() === '' ? 0 : Number(tier.discount_rate),
      sort_order: tierIndex,
      quote_template_items: (tier.items ?? []).map((item, index) =>
        line(item, index, tier.id || `tier-${tierIndex}`),
      ),
    })),
    quote_template_items: (values.add_ons ?? []).map((item, index) => line(item, index, null)),
  };
}
