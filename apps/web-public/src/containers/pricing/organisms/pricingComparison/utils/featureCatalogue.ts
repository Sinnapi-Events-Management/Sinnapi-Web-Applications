import type { PlanFeatureValue } from '@/lib/types';

/**
 * How the structured flags in `plan_features` are presented.
 *
 * The database stores capabilities in machine-readable form — `true`, `10`,
 * `-1`, `"top_tier"` — because that is what enforcement code needs to read.
 * Turning `-1` into "Unlimited" is a copy decision, so it lives here, next to
 * the table that renders it, rather than in the RPC where every future consumer
 * would inherit one page's wording.
 *
 * This also fixes the display *order* and grouping, which the DB has no opinion
 * about: `plan_features` is an unordered bag of key/value pairs per plan.
 */

/** A rendered cell: a tick/dash, or a short string like "Unlimited". */
export type CellValue = boolean | string;

type FeatureSpec = { key: string; label: string };

type FeatureGroup = { title: string; features: FeatureSpec[] };

/**
 * The curated matrix, in display order. A feature key absent from a plan is a
 * "not included" dash — the seed only writes rows for capabilities a plan has
 * an opinion on.
 */
export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    title: 'Profile & portfolio',
    features: [
      { key: 'verified_badge', label: 'Verified Vendor Badge' },
      { key: 'max_portfolio_images', label: 'Portfolio images' },
      { key: 'portfolio_video', label: 'Portfolio video' },
    ],
  },
  {
    title: 'Visibility',
    features: [
      { key: 'search_placement', label: 'Search placement' },
      { key: 'homepage_featured', label: 'Homepage featured spot' },
    ],
  },
  {
    title: 'Clients & support',
    features: [
      { key: 'direct_messaging', label: 'Direct messaging' },
      { key: 'quote_requests', label: 'Quote request system' },
      { key: 'client_analytics', label: 'Client analytics' },
      { key: 'account_manager', label: 'Dedicated account manager' },
    ],
  },
];

/** Where feature keys nobody has curated yet end up. See `buildGroups`. */
export const UNCATALOGUED_GROUP_TITLE = 'More features';

/** Display names for the search-placement tiers, which are tokens in the DB. */
const PLACEMENT_LABELS: Record<string, string> = {
  standard: 'Standard',
  priority: 'Priority',
  top_tier: 'Top-tier',
};

/** `max_portfolio_images` → "Portfolio images"; the fallback for unknown keys. */
export function humanise(key: string): string {
  const words = key.replace(/_/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Renders one stored value as a cell.
 *
 * `-1` is the schema's "unlimited" sentinel (see the 0012 seed, where
 * Professional and Elite carry `max_portfolio_images: -1`); a positive count
 * reads as a ceiling, because every numeric capability we store is one. `0`
 * collapses to a dash rather than the literal "0", which would otherwise be the
 * only cell claiming a plan includes a feature it cannot use.
 */
export function toCellValue(value: PlanFeatureValue | undefined): CellValue {
  if (value === undefined || value === null) return false;
  if (typeof value === 'boolean') return value;

  if (typeof value === 'number') {
    if (value < 0) return 'Unlimited';
    if (value === 0) return false;
    return `Up to ${value.toLocaleString('en-US')}`;
  }

  return PLACEMENT_LABELS[value] ?? humanise(value);
}
