/**
 * How a vendor charges — the vocabulary, written once.
 *
 * `pricing_model` has been an enum in the database since 0001 and meant
 * nothing to anybody until 0823c, because nothing wrote it. It now carries a
 * real question a client asks before they read a single line item: *am I
 * buying a job, or am I buying time?*
 *
 * Two shapes hold it, deliberately:
 *
 *   `vendor_services.pricing_models`   a SET — what this vendor will do for
 *                                      this kind of work. A photographer takes
 *                                      fixed-price weddings and hourly
 *                                      corporate jobs; both are true at once.
 *   `quote_templates.pricing_model`    ONE — how this package in particular is
 *                                      sold. A package is a single offer, so a
 *                                      package that hedged would be a
 *                                      configurator, not a price.
 *
 * Pure (no React/MUI) for the same reason `packagePricing` is: the marketing
 * site imports it from a Next.js server component and the portals import it
 * from a Vite SPA.
 *
 * THE COPY IS DATA
 * Each model is described from both sides. A vendor picking models on their
 * service is answering "what will I do"; a client reading a package badge is
 * answering "what am I committing to". Those are different sentences about the
 * same enum value, and writing them at the call sites is how one portal ends
 * up promising something another does not.
 */

/** `pricing_model` — the four ways a vendor can charge. */
export type PricingModel = 'fixed' | 'hourly' | 'custom' | 'combination';

/**
 * Presentation order, and it is not the enum's order.
 *
 * Fixed first because it is the one a client understands without explanation
 * and the one most bookings settle on. Custom last because "we'll work it out"
 * is the least committal thing a vendor can say, and leading with it would
 * invite every vendor to pick it and nothing else.
 */
export const PRICING_MODELS: readonly PricingModel[] = ['fixed', 'hourly', 'combination', 'custom'];

export function isPricingModel(value: string | null | undefined): value is PricingModel {
  return value === 'fixed' || value === 'hourly' || value === 'custom' || value === 'combination';
}

export type PricingModelSpec = {
  model: PricingModel;
  /** What a client calls it. Never the database's word on its own. */
  label: string;
  /** One line under the label wherever the model is being chosen. */
  tagline: string;
  /**
   * What it commits the client to, in their own voice. This is the sentence
   * that belongs on a package card's tooltip — a client reading "Hourly" wants
   * to know the total can move, and saying so is the difference between a
   * badge and a warning nobody reads.
   */
  clientNote: string;
  /**
   * The same model from the vendor's side, for the picker on their service.
   * Not derivable from `clientNote`: the client's risk is the total changing,
   * and the vendor's is quoting a job they have not scoped.
   */
  vendorNote: string;
  /**
   * Whether a package sold this way can show a total a client may rely on.
   * `custom` cannot, and a card that showed one anyway would be quoting a
   * figure the vendor never agreed to.
   */
  hasFirmTotal: boolean;
  /** How a chip should read against the theme's palette. */
  tone: 'secondary' | 'info' | 'default';
};

const SPECS: Record<PricingModel, PricingModelSpec> = {
  fixed: {
    model: 'fixed',
    label: 'Fixed price',
    tagline: 'One agreed figure for the whole job',
    clientNote:
      'The total on this package is what you pay. It does not move with how long the day runs.',
    vendorNote:
      'You quote one figure and absorb the overrun. Best for work you have done enough times to scope.',
    hasFirmTotal: true,
    tone: 'secondary',
  },
  hourly: {
    model: 'hourly',
    label: 'Hourly rate',
    tagline: 'Charged for the time you book',
    clientNote:
      'The figure shown covers the hours listed. Extra hours on the day are charged at the same rate.',
    vendorNote:
      'You are paid for the time you actually give. Best for coverage whose length the client controls.',
    hasFirmTotal: true,
    tone: 'info',
  },
  combination: {
    model: 'combination',
    label: 'Base fee + variable',
    tagline: 'A base fee plus what scales with your event',
    clientNote:
      'A fixed base covers the work itself; the rest moves with your numbers — guests, hours or units.',
    vendorNote:
      'Your fixed costs are covered before headcount is known. Best for catering and anything per-guest.',
    hasFirmTotal: true,
    tone: 'info',
  },
  custom: {
    model: 'custom',
    label: 'Custom quote',
    tagline: 'Priced per event, after you have talked',
    clientNote:
      'Any figure here is indicative. The vendor prices your event once they know what it involves.',
    vendorNote:
      'Nothing is committed until you send a quote. Best for work that is different every time.',
    hasFirmTotal: false,
    tone: 'default',
  },
};

/** The full description of one model. */
export function pricingModelSpec(model: PricingModel): PricingModelSpec {
  return SPECS[model];
}

/**
 * A stored value as a label, for a row that may hold anything.
 *
 * Falls back to `null` rather than to the raw enum value: a chip reading
 * `combination` in the database's voice is worse than no chip.
 */
export function pricingModelLabel(value: string | null | undefined): string | null {
  return isPricingModel(value) ? SPECS[value].label : null;
}

/**
 * A `pricing_model[]` column as an ordered, de-duplicated, validated list.
 *
 * PostgREST hands enum arrays back as `string[]`, legacy rows hold `{}`, and
 * nothing stops an older row carrying a value the front end has not heard of.
 * Every reader wants the same three guarantees, so they are made once here
 * rather than re-derived per card.
 */
export function toPricingModels(value: readonly string[] | null | undefined): PricingModel[] {
  const present = new Set((value ?? []).filter(isPricingModel));
  return PRICING_MODELS.filter((model) => present.has(model));
}

/**
 * The models a package may declare, given the service it hangs off.
 *
 * Mirrors the rule `save_quote_package` enforces, so the editor offers exactly
 * what the server will accept. An empty set means the service has not stated
 * its models — a legacy row — and everything is allowed, which is the RPC's
 * behaviour too. Getting this wrong in either direction produces the worst
 * kind of form: one that offers a choice and then refuses it on save.
 */
export function allowedPricingModels(
  serviceModels: readonly string[] | null | undefined,
): PricingModel[] {
  const offered = toPricingModels(serviceModels);
  return offered.length > 0 ? offered : [...PRICING_MODELS];
}

/** `Fixed price · Hourly rate` — the set as one line of prose. */
export function pricingModelsSummary(value: readonly string[] | null | undefined): string | null {
  const labels = toPricingModels(value).map((model) => SPECS[model].label);
  return labels.length > 0 ? labels.join(' · ') : null;
}
