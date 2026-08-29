/**
 * What a quote package costs, derived once and read by all four apps.
 *
 * Pure (no React/MUI), for the same reason `quotationPricing` is its sibling:
 * a vendor building a package, a client comparing tiers in the portal, a
 * visitor reading the same tiers on the marketing site and an operator
 * moderating them are looking at ONE offer. A tier that reads `UGX 1,350,000`
 * on the vendor's editor and `UGX 1,593,000` on the public card is not a
 * formatting difference — it is the platform quoting two prices for the same
 * thing.
 *
 * THE FORMULA, AND WHY IT IS WRITTEN TWICE
 * `send_quotation` computes the same arithmetic in SQL. That is deliberate and
 * it is not duplication for its own sake: this module decides what a reader is
 * SHOWN, and the RPC decides what a client is CHARGED. The charged figure is
 * computed server-side from the items as sent, because a total that arrives
 * from a browser is a total a browser can edit — and this one flows into
 * escrow. The two must agree, so both follow:
 *
 *     base     = Σ (quantity × unit_price)      over the tier's included lines
 *     discount = round(base × discount_rate/100)
 *     net      = base − discount
 *     exclusive:  tax = round(net × rate/100)      total = net + tax
 *     inclusive:  tax = round(net − net/(1+rate/100))
 *                                                  total = net
 *
 * Inclusive pricing does not change what is paid — that is the whole point of
 * it. It changes what the breakdown says the tax component was, which a
 * VAT-registered vendor needs to be right even though it was never added on.
 *
 * ADD-ONS ARE NEVER IN A TOTAL
 * Optional lines are quoted alongside a tier, not inside it. A client reading
 * a package card must be able to trust that the number under the tier is the
 * number for that tier — the moment add-ons silently join the sum, the price
 * on the card stops being the price of anything. The vendor decides which
 * add-ons a given client is getting when they build the quote, and the client
 * receives one settled figure rather than a configurator.
 */

/** One priced line, as loosely as PostgREST may hand one back. */
export type PackageLineLike = {
  id?: string | null;
  description?: string | null;
  quantity?: number | string | null;
  unit_price?: number | string | null;
  /** "per hour", "per guest" — the unit the quantity counts. */
  unit_label?: string | null;
  notes?: string | null;
  is_optional?: boolean | null;
  sort_order?: number | null;
  tier_id?: string | null;
};

/** One tier of a package — Silver, Gold, Half-day. */
export type PackageTierLike = {
  id: string;
  name: string;
  description?: string | null;
  is_recommended?: boolean | null;
  discount_rate?: number | string | null;
  sort_order?: number | null;
  quote_template_items?: readonly PackageLineLike[] | null;
};

/** A package header with its tiers and its shared add-ons embedded. */
export type QuotePackageLike = {
  id: string;
  name: string;
  summary?: string | null;
  notes?: string | null;
  currency?: string | null;
  cover_image_url?: string | null;
  /**
   * `quote_templates.pricing_model` — how THIS package is sold, one of the
   * models its service offers. Read as a loose string because PostgREST hands
   * enums back as text and a pre-0823c row holds null; `isPricingModel` is
   * what turns it into something renderable.
   */
  pricing_model?: string | null;
  inclusions?: readonly string[] | null;
  exclusions?: readonly string[] | null;
  lead_time_days?: number | null;
  tax_rate?: number | string | null;
  tax_inclusive?: boolean | null;
  valid_days?: number | null;
  advance_rate?: number | string | null;
  advance_release_days_before?: number | null;
  advance_terms_note?: string | null;
  visibility?: 'private' | 'public' | null;
  is_active?: boolean | null;
  published_at?: string | null;
  admin_unpublished_at?: string | null;
  admin_unpublished_reason?: string | null;
  sort_order?: number | null;
  quote_template_tiers?: readonly PackageTierLike[] | null;
  /**
   * Every line of the package, tier lines included, when read flat — or only
   * the shared add-ons when the read scoped it with `tier_id=is.null`.
   * `packageAddOns` filters rather than trusting the shape, so one accessor
   * works against both reads.
   */
  quote_template_items?: readonly PackageLineLike[] | null;
};

export type PackageTierPricing = {
  currency: string;
  /** The included lines before discount and tax. */
  base: number;
  discountRate: number;
  /** Always positive. Presentation decides whether to render it as a minus. */
  discount: number;
  net: number;
  taxRate: number;
  taxInclusive: boolean;
  tax: number;
  /** What the client pays for this tier. */
  total: number;
  /** The lines that make up `base`, in the vendor's order. */
  includedLines: PackageLineLike[];
  /** Priced alongside, never inside `total`. */
  optionalLines: PackageLineLike[];
  /** At least one included line. An empty tier is not a free tier. */
  isPriced: boolean;
};

/** Money to the cent, so a rate applied to a base cannot drift by a fraction. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * A stored numeric as a number.
 *
 * PostgREST returns `numeric` as a JSON number, but one that has been through
 * a form, a URL or a jsonb round-trip arrives as a string. Anything unreadable
 * is 0, never `NaN`: a price that formats as `UGX NaN` is worse than one that
 * is wrong.
 */
function toAmount(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Ascending by `sort_order`, with a stable fallback for rows that lack one. */
function bySortOrder<T extends { sort_order?: number | null }>(a: T, b: T): number {
  return (a.sort_order ?? 0) - (b.sort_order ?? 0);
}

/** What one line is worth. Quantity defaults to 1, never to 0. */
export function packageLineAmount(line: PackageLineLike): number {
  const quantity =
    line.quantity === null || line.quantity === undefined ? 1 : toAmount(line.quantity);
  return round2(quantity * toAmount(line.unit_price));
}

/** The package's tiers in the order the vendor arranged them. */
export function packageTiers(pkg: QuotePackageLike | null | undefined): PackageTierLike[] {
  return [...(pkg?.quote_template_tiers ?? [])].sort(bySortOrder);
}

/**
 * The add-ons offered across every tier.
 *
 * Filtered on `tier_id == null` rather than taken as given, so this works
 * whether the caller read the package's items flat or scoped the read to the
 * shared ones. A line that belongs to no tier is an add-on by construction —
 * the database has a check constraint saying so.
 */
export function packageAddOns(pkg: QuotePackageLike | null | undefined): PackageLineLike[] {
  return [...(pkg?.quote_template_items ?? [])]
    .filter((line) => line.tier_id == null)
    .sort(bySortOrder);
}

/**
 * What a tier costs, and what it is made of.
 *
 * Tax comes from the package and the discount from the tier, because that is
 * how vendors actually price: VAT status is a fact about the business, while a
 * discount is a lever pulled on the one tier being pushed.
 */
export function packageTierPricing(
  pkg: QuotePackageLike | null | undefined,
  tier: PackageTierLike | null | undefined,
): PackageTierPricing {
  const currency = pkg?.currency ?? 'UGX';
  const lines = [...(tier?.quote_template_items ?? [])].sort(bySortOrder);
  const includedLines = lines.filter((line) => !line.is_optional);
  const optionalLines = lines.filter((line) => line.is_optional);

  const base = round2(includedLines.reduce((sum, line) => sum + packageLineAmount(line), 0));
  const discountRate = Math.max(0, toAmount(tier?.discount_rate));
  const discount = round2((base * discountRate) / 100);
  const net = round2(base - discount);

  const taxRate = Math.max(0, toAmount(pkg?.tax_rate));
  const taxInclusive = pkg?.tax_inclusive === true;
  const tax = taxInclusive
    ? round2(net - net / (1 + taxRate / 100))
    : round2((net * taxRate) / 100);

  return {
    currency,
    base,
    discountRate,
    discount,
    net,
    taxRate,
    taxInclusive,
    tax,
    total: taxInclusive ? net : round2(net + tax),
    includedLines,
    optionalLines,
    isPriced: includedLines.length > 0,
  };
}

/**
 * The tier a reader should land on.
 *
 * The vendor's recommended tier when there is one — anchoring the middle
 * option is the whole reason tiered pricing works — and otherwise the first.
 */
export function defaultPackageTier(
  pkg: QuotePackageLike | null | undefined,
): PackageTierLike | null {
  const tiers = packageTiers(pkg);
  return tiers.find((tier) => tier.is_recommended) ?? tiers[0] ?? null;
}

/**
 * The "from" price: the cheapest tier a client could buy.
 *
 * Null rather than 0 when nothing is priced, so a card can omit the line
 * instead of advertising a package as free.
 */
export function packageFromPrice(
  pkg: QuotePackageLike | null | undefined,
): { amount: number; currency: string; tierName: string } | null {
  const priced = packageTiers(pkg)
    .map((tier) => ({ tier, pricing: packageTierPricing(pkg, tier) }))
    .filter((entry) => entry.pricing.isPriced);
  if (priced.length === 0) return null;

  const cheapest = priced.reduce((low, entry) =>
    entry.pricing.total < low.pricing.total ? entry : low,
  );
  return {
    amount: cheapest.pricing.total,
    currency: cheapest.pricing.currency,
    tierName: cheapest.tier.name,
  };
}

/** The span a package's prices cover, for a header that shows a range. */
export function packagePriceRange(
  pkg: QuotePackageLike | null | undefined,
): { low: number; high: number; currency: string } | null {
  const totals = packageTiers(pkg)
    .map((tier) => packageTierPricing(pkg, tier))
    .filter((pricing) => pricing.isPriced)
    .map((pricing) => pricing.total);
  if (totals.length === 0) return null;
  return {
    low: Math.min(...totals),
    high: Math.max(...totals),
    currency: pkg?.currency ?? 'UGX',
  };
}

/**
 * Is this package on the market right now?
 *
 * Mirrors `quote_package_is_public` in SQL minus the vendor check, which the
 * database does and a client cannot. Used to label a package in the vendor's
 * own list and in the console — never as a substitute for the read policy.
 */
export function isPackagePublished(pkg: QuotePackageLike | null | undefined): boolean {
  return (
    pkg?.visibility === 'public' && pkg?.is_active !== false && pkg?.admin_unpublished_at == null
  );
}

/** Why a package is not on the market, in one phrase, or null when it is. */
export function packageWithheldReason(pkg: QuotePackageLike | null | undefined): string | null {
  if (!pkg) return null;
  if (pkg.admin_unpublished_at != null) {
    return pkg.admin_unpublished_reason
      ? `Taken down by a moderator — ${pkg.admin_unpublished_reason}`
      : 'Taken down by a moderator';
  }
  if (pkg.is_active === false) return 'Archived';
  if (pkg.visibility !== 'public') return 'Draft — only you can see this';
  return null;
}

/** `2 × per guest` → the quantity as a reader says it aloud. */
export function packageQuantityLabel(line: PackageLineLike): string {
  const quantity =
    line.quantity === null || line.quantity === undefined ? 1 : toAmount(line.quantity);
  const unit = line.unit_label?.trim();
  return unit ? `${quantity} × ${unit}` : `${quantity}`;
}
