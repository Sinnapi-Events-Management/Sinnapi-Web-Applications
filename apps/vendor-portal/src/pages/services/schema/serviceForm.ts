import { z } from 'zod';
import { PRICING_MODELS, isPricingModel, toPricingModels } from '@sinnapi/ui';
import type { ServiceModel } from '@/lib/types';

/**
 * What a vendor says about one line of their catalogue.
 *
 * NOTE WHAT IS NOT HERE: a price.
 *
 * A service is what a vendor DOES; a package is what it COSTS. `base_price`
 * used to live on this form and went nowhere — no client, no search RPC and no
 * public page has ever read it — while the figure the market actually sees
 * comes from the tiers of the packages hanging off the service. Two editable
 * numbers for one offer is a contradiction the vendor cannot see and the
 * client can, so the service now states only what it is, and the card derives
 * its "from" figure from the cheapest published package tier.
 *
 * `category_id` IS here, and it is required. It was the omission that made
 * every create fail: the column has been `not null` since 0004 and the form
 * never sent one, so the vendor got a Postgres message about a field they had
 * never been shown. The database now also defaults it from the vendor's
 * primary category, but the form asks anyway — a silent default is how a
 * caterer's decor service ends up filed under catering.
 */
export const serviceFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Service title must be at least 3 characters.')
    .max(140, 'Service title must be 140 characters or fewer.'),
  description: z.string().trim().max(2000, 'Description must be 2000 characters or fewer.'),
  category_id: z.string().min(1, 'Choose the category this service belongs to.'),
  pricing_models: z
    .array(z.string())
    .min(1, 'Choose at least one way you charge for this.')
    // Belt and braces against a value the picker cannot produce but a stale
    // bundle or a hand-edited payload could. The database enum would reject it
    // too, with a message nobody can read.
    //
    // The `: boolean` annotation is load-bearing. TypeScript 5.5 INFERS type
    // predicates for arrows like this one, so without it the callback becomes
    // `models is PricingModel[]`, zod picks the narrowing overload of
    // `refine`, and the field infers as `string[]` going in and
    // `PricingModel[]` coming out. A form whose input and output types
    // disagree cannot be bound to a `Control`, and the error it produces names
    // react-hook-form internals rather than this line.
    .refine(
      (models): boolean => models.every((model) => isPricingModel(model)),
      'One of those is not a way of charging.',
    ),
  is_active: z.boolean(),
});

export type ServiceFormValues = z.infer<typeof serviceFormSchema>;

export const emptyServiceValues: ServiceFormValues = {
  title: '',
  description: '',
  category_id: '',
  // Nothing pre-ticked. A default here would be the platform answering a
  // question about the vendor's business on their behalf, and `fixed` is the
  // one every vendor would leave in place.
  pricing_models: [],
  is_active: true,
};

/**
 * The form, seeded from a service the vendor already has.
 *
 * `toPricingModels` rather than the raw column: it drops anything the picker
 * cannot render and puts the rest in presentation order, so a legacy row with
 * a value this build does not know about opens as an editable form rather than
 * as a control stuck on a value it cannot display. A service predating 0823c
 * has an empty set and opens with nothing ticked — which is the truth, and the
 * save will ask for one.
 *
 * `category_id` falls back to '' rather than to the vendor's primary category.
 * The default belongs to a NEW service; applying it while editing would file
 * an old service somewhere the vendor never chose, silently, on a save they
 * made for an unrelated reason.
 */
export function serviceToFormValues(service: ServiceModel): ServiceFormValues {
  return {
    title: service.title,
    description: service.description ?? '',
    category_id: service.category_id ?? '',
    pricing_models: toPricingModels(service.pricing_models),
    is_active: service.is_active !== false,
  };
}

/**
 * The `vendor_services` row for a new service.
 *
 * `pricing_models` is written through the shared order rather than the click
 * order, so the same two models render in the same sequence on every card.
 * `base_price` and `currency` are deliberately absent: the columns remain, and
 * this portal no longer writes them.
 */
export function toServiceInsert(values: ServiceFormValues, vendorId: string) {
  return { vendor_id: vendorId, ...toServiceFields(values) };
}

/**
 * The same row, on the way back out of the editor.
 *
 * `vendor_id` is not in here and must not be: the row's owner is not something
 * an edit can change, and `vsvc_write`'s `with check` would refuse it anyway —
 * loudly, in the middle of a save the vendor made to fix a typo.
 */
export function toServiceUpdate(values: ServiceFormValues) {
  return toServiceFields(values);
}

/** The columns both writes share, shaped once so they cannot drift apart. */
function toServiceFields(values: ServiceFormValues) {
  const chosen = new Set(values.pricing_models);
  return {
    category_id: values.category_id,
    title: values.title.trim(),
    description: values.description.trim() || null,
    pricing_models: PRICING_MODELS.filter((model) => chosen.has(model)),
    is_active: values.is_active,
  };
}
