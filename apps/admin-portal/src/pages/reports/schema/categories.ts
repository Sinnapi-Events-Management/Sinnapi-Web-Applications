// The report categories the page is split into — one panel per value, surfaced
// as the top-level nav tabs. Pure data so it can be imported anywhere; the tab
// organism maps each value to its icon.
export type ReportCategory = 'revenue' | 'vendors' | 'subscriptions' | 'operations';

export type CategoryDef = {
  value: ReportCategory;
  label: string;
  /** One-line summary shown under the active tab / in exports. */
  description: string;
};

export const REPORT_CATEGORIES: CategoryDef[] = [
  {
    value: 'revenue',
    label: 'Revenue & payments',
    description: 'Gross revenue, commission earned, refunds and payment mix.',
  },
  {
    value: 'vendors',
    label: 'Vendors & growth',
    description: 'Vendor signups, lifecycle status and marketplace growth.',
  },
  {
    value: 'subscriptions',
    label: 'Subscriptions & churn',
    description: 'Recurring revenue, plan distribution and churn.',
  },
  {
    value: 'operations',
    label: 'Operations & trust',
    description: 'Bookings volume, escrow flow and dispute resolution.',
  },
];

export const DEFAULT_CATEGORY: ReportCategory = 'revenue';
