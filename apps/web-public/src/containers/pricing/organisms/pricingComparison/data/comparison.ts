// Plan-by-feature matrix for the comparison table. Derived from the same source
// of truth as the plan cards (see pricingPlans/data/plans.ts) but expanded so
// buyers can justify a tier line by line. Cell values are either a boolean
// (✓ / —) or a short string (e.g. a tier or a limit).
export type CellValue = boolean | string;

/** Plan column headers, in display order. The flagged one is visually lifted. */
export const COMPARISON_COLUMNS = [
  { key: 'starter', name: 'Starter', highlight: false },
  { key: 'professional', name: 'Professional', highlight: true },
  { key: 'elite', name: 'Elite', highlight: false },
];

export type ComparisonRow = {
  label: string;
  /** Values aligned to COMPARISON_COLUMNS order: [Starter, Professional, Elite]. */
  values: [CellValue, CellValue, CellValue];
};

export type ComparisonGroup = {
  title: string;
  rows: ComparisonRow[];
};

export const COMPARISON_GROUPS: ComparisonGroup[] = [
  {
    title: 'Profile & portfolio',
    rows: [
      { label: 'Verified Vendor Badge', values: [true, true, true] },
      { label: 'Portfolio images', values: ['Up to 10', 'Unlimited', 'Unlimited'] },
      { label: 'Portfolio video', values: [false, true, true] },
    ],
  },
  {
    title: 'Visibility',
    rows: [
      { label: 'Search placement', values: ['Standard', 'Priority', 'Top-tier'] },
      { label: 'Homepage featured spot', values: [false, false, true] },
    ],
  },
  {
    title: 'Clients & support',
    rows: [
      { label: 'Direct messaging', values: [true, true, true] },
      { label: 'Quote request system', values: [true, true, true] },
      { label: 'Client analytics', values: [false, true, true] },
      { label: 'Dedicated account manager', values: [false, false, true] },
    ],
  },
];
